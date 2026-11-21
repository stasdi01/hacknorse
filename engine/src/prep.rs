//! Pre-processing: expand line items, look up products, deduplicate orders
//! into signatures, and work out the annualization factor.

use crate::config::MAX_ITEMS_PER_ORDER;
use crate::packer::Dims;
use crate::types::{Annualization, OptimizeInput, Product, SignatureItem};
use std::collections::HashMap;

/// Max order ids kept per signature (for reports).
const MAX_ORDER_IDS: usize = 20;

/// A deduplicated order shape.
#[derive(Debug, Clone, PartialEq)]
pub struct Signature {
    /// Rank by frequency (0 = most frequent).
    pub id: u32,
    /// (product index, quantity), sorted by SKU.
    pub lines: Vec<(usize, u32)>,
    /// One entry per physical item.
    pub item_dims: Vec<Dims>,
    /// Product index per physical item (parallel to `item_dims`).
    pub item_products: Vec<usize>,
    pub volume_in3: f64,
    pub weight_lb: f64,
    pub count: u32,
    pub order_ids: Vec<String>,
}

/// An excluded group of orders (same shape, too many items).
#[derive(Debug, Clone, PartialEq)]
pub struct TooLarge {
    pub lines: Vec<(usize, u32)>,
    pub count: u32,
    pub order_ids: Vec<String>,
}

/// Result of pre-processing.
#[derive(Debug, Clone)]
pub struct Prepared {
    pub products: Vec<Product>,
    pub signatures: Vec<Signature>,
    pub too_large: Vec<TooLarge>,
    pub line_items: u32,
    pub line_items_skipped: u32,
    pub orders_total: u32,
    pub orders_used: u32,
    pub orders_too_large: u32,
    pub annualization: Annualization,
}

impl Prepared {
    /// Signature items as SKU/quantity pairs.
    pub fn items_of(&self, lines: &[(usize, u32)]) -> Vec<SignatureItem> {
        lines
            .iter()
            .map(|&(p, q)| SignatureItem {
                sku: self.products[p].sku.clone(),
                quantity: q,
            })
            .collect()
    }
}

fn product_ok(p: &Product) -> bool {
    [p.length_in, p.width_in, p.height_in]
        .iter()
        .all(|v| v.is_finite() && *v > 0.0)
        && p.weight_lb.is_finite()
        && p.weight_lb >= 0.0
}

/// Parse `YYYY-MM-DD` (time part ignored) into days since 1970-01-01.
pub fn parse_date_days(s: &str) -> Option<i64> {
    let s = s.trim();
    let date = s.get(..10)?;
    let mut parts = date.split('-');
    let y: i64 = parts.next()?.parse().ok()?;
    let m: i64 = parts.next()?.parse().ok()?;
    let d: i64 = parts.next()?.parse().ok()?;
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) || !(1900..=9999).contains(&y) {
        return None;
    }
    // Days from civil (Howard Hinnant's algorithm).
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some(era * 146_097 + doe - 719_468)
}

#[derive(Default)]
struct OrderAcc {
    qty: HashMap<usize, u32>,
    date: Option<i64>,
}

/// Run pre-processing.
pub fn prepare(input: &OptimizeInput) -> Prepared {
    // Products: first valid row per SKU wins.
    let mut products: Vec<Product> = Vec::new();
    let mut by_sku: HashMap<&str, usize> = HashMap::new();
    for p in &input.products {
        if product_ok(p) && !by_sku.contains_key(p.sku.as_str()) {
            by_sku.insert(p.sku.as_str(), products.len());
            products.push(p.clone());
        }
    }

    // Group line items by order (first-seen order).
    let mut order_index: HashMap<&str, usize> = HashMap::new();
    let mut orders: Vec<(&str, OrderAcc)> = Vec::new();
    let mut skipped = 0u32;
    for line in &input.orders {
        let oi = *order_index
            .entry(line.order_id.as_str())
            .or_insert_with(|| {
                orders.push((line.order_id.as_str(), OrderAcc::default()));
                orders.len() - 1
            });
        let acc = &mut orders[oi].1;
        if acc.date.is_none() {
            acc.date = line.date.as_deref().and_then(parse_date_days);
        }
        match by_sku.get(line.sku.as_str()) {
            Some(&pi) if line.quantity > 0 => {
                let q = acc.qty.entry(pi).or_insert(0);
                *q = q.saturating_add(line.quantity);
            }
            _ => skipped += 1,
        }
    }

    // Annualization from order dates.
    let dates: Vec<i64> = orders.iter().filter_map(|(_, a)| a.date).collect();
    let annualization = match (dates.iter().min(), dates.iter().max()) {
        (Some(&lo), Some(&hi)) => {
            let period = (hi - lo + 1) as f64;
            Annualization {
                factor: 365.0 / period,
                period_days: Some(period),
                assumed_one_year: false,
            }
        }
        _ => Annualization {
            factor: 1.0,
            period_days: None,
            assumed_one_year: true,
        },
    };

    // Deduplicate into signatures.
    let mut sig_index: HashMap<Vec<(usize, u32)>, usize> = HashMap::new();
    let mut sigs: Vec<Signature> = Vec::new();
    let mut large_index: HashMap<Vec<(usize, u32)>, usize> = HashMap::new();
    let mut too_large: Vec<TooLarge> = Vec::new();
    let mut orders_used = 0u32;
    let mut orders_too_large = 0u32;

    for (order_id, acc) in &orders {
        if acc.qty.is_empty() {
            continue;
        }
        let mut lines: Vec<(usize, u32)> = acc.qty.iter().map(|(&p, &q)| (p, q)).collect();
        lines.sort_by(|a, b| products[a.0].sku.cmp(&products[b.0].sku));
        let n_items: u64 = lines.iter().map(|&(_, q)| u64::from(q)).sum();

        if n_items > u64::from(MAX_ITEMS_PER_ORDER) {
            orders_too_large += 1;
            let i = *large_index.entry(lines.clone()).or_insert_with(|| {
                too_large.push(TooLarge {
                    lines: lines.clone(),
                    count: 0,
                    order_ids: Vec::new(),
                });
                too_large.len() - 1
            });
            too_large[i].count += 1;
            if too_large[i].order_ids.len() < MAX_ORDER_IDS {
                too_large[i].order_ids.push((*order_id).to_string());
            }
            continue;
        }

        orders_used += 1;
        let i = *sig_index.entry(lines.clone()).or_insert_with(|| {
            let mut item_dims = Vec::new();
            let mut item_products = Vec::new();
            let mut volume = 0.0;
            let mut weight = 0.0;
            for &(p, q) in &lines {
                let pr = &products[p];
                let d = [pr.length_in, pr.width_in, pr.height_in];
                for _ in 0..q {
                    item_dims.push(d);
                    item_products.push(p);
                }
                volume += f64::from(q) * d[0] * d[1] * d[2];
                weight += f64::from(q) * pr.weight_lb;
            }
            sigs.push(Signature {
                id: 0,
                lines: lines.clone(),
                item_dims,
                item_products,
                volume_in3: volume,
                weight_lb: weight,
                count: 0,
                order_ids: Vec::new(),
            });
            sigs.len() - 1
        });
        sigs[i].count += 1;
        if sigs[i].order_ids.len() < MAX_ORDER_IDS {
            sigs[i].order_ids.push((*order_id).to_string());
        }
    }

    // Most frequent first; ties by SKU list for determinism.
    let key = |s: &Signature| -> Vec<(String, u32)> {
        s.lines
            .iter()
            .map(|&(p, q)| (products[p].sku.clone(), q))
            .collect()
    };
    sigs.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| key(a).cmp(&key(b))));
    for (i, s) in sigs.iter_mut().enumerate() {
        s.id = i as u32;
    }

    Prepared {
        line_items: input.orders.len() as u32,
        line_items_skipped: skipped,
        orders_total: orders.len() as u32,
        orders_used,
        orders_too_large,
        products,
        signatures: sigs,
        too_large,
        annualization,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn product(sku: &str, d: f64) -> Product {
        Product {
            sku: sku.into(),
            name: sku.into(),
            length_in: d,
            width_in: d,
            height_in: d,
            weight_lb: 1.0,
        }
    }

    fn line(o: &str, sku: &str, q: u32, date: Option<&str>) -> OrderLine {
        OrderLine {
            order_id: o.into(),
            sku: sku.into(),
            quantity: q,
            date: date.map(String::from),
        }
    }

    fn input(orders: Vec<OrderLine>) -> OptimizeInput {
        OptimizeInput {
            products: vec![product("A", 2.0), product("B", 3.0)],
            orders,
            current_boxes: vec![],
            settings: Settings {
                mode: Mode::Stock,
                k: 4,
                padding_in: 0.5,
                carrier: CarrierPreset::UpsFedex,
                rate_table: RateTable {
                    base_usd: 8.5,
                    per_lb_usd: 0.95,
                    max_lb: 70.0,
                },
                allow_current_boxes: false,
            },
        }
    }

    #[test]
    fn dedupes_identical_orders_regardless_of_line_order() {
        let p = prepare(&input(vec![
            line("1", "A", 1, None),
            line("1", "B", 2, None),
            line("2", "B", 2, None),
            line("2", "A", 1, None),
            line("3", "A", 1, None),
        ]));
        assert_eq!(p.signatures.len(), 2);
        assert_eq!(p.signatures[0].count, 2);
        assert_eq!(p.signatures[0].item_dims.len(), 3);
        assert_eq!(p.orders_used, 3);
        assert!(p.annualization.assumed_one_year);
    }

    #[test]
    fn skips_unknown_skus_and_flags_large_orders() {
        let p = prepare(&input(vec![
            line("1", "A", 41, None),
            line("2", "ZZZ", 1, None),
            line("3", "A", 40, None),
        ]));
        assert_eq!(p.orders_too_large, 1);
        assert_eq!(p.too_large.len(), 1);
        assert_eq!(p.line_items_skipped, 1);
        assert_eq!(p.orders_used, 1);
        assert_eq!(p.signatures[0].item_dims.len(), 40);
    }

    #[test]
    fn annualizes_from_dates() {
        let p = prepare(&input(vec![
            line("1", "A", 1, Some("2025-01-01")),
            line("2", "A", 1, Some("2025-06-30")),
        ]));
        assert_eq!(p.annualization.period_days, Some(181.0));
        assert!((p.annualization.factor - 365.0 / 181.0).abs() < 1e-12);
    }

    #[test]
    fn parses_dates() {
        assert_eq!(parse_date_days("1970-01-01"), Some(0));
        assert_eq!(parse_date_days("2025-01-01T10:00:00Z"), Some(20_089));
        assert_eq!(parse_date_days("01/02/2025"), None);
        assert_eq!(parse_date_days(""), None);
    }
}
