/** CSV templates users can download and fill in. */
import type { FileKind } from "./mapping";

export const TEMPLATES: Record<FileKind, { filename: string; text: string }> = {
  products: {
    filename: "products_template.csv",
    text:
      "sku,name,length_in,width_in,height_in,weight_lb\n" +
      "CND-08,Amber Candle 8oz,3.2,3.2,3.6,0.9\n" +
      "MUG-12,Oatmeal Mug 12oz,5.0,3.6,4.2,0.9\n",
  },
  orders: {
    filename: "orders_template.csv",
    text:
      "order_id,sku,quantity,order_date\n" +
      "10001,CND-08,2,2025-03-14\n" +
      "10001,MUG-12,1,2025-03-14\n" +
      "10002,MUG-12,1,2025-03-15\n",
  },
  boxes: {
    filename: "current_boxes_template.csv",
    text: "box_id,length_in,width_in,height_in,unit_cost_usd\n" + "A,10,8,6,1.10\n",
  },
};

export const FILE_LABELS: Record<FileKind, { title: string; required: boolean; hint: string }> = {
  products: {
    title: "products.csv",
    required: true,
    hint: "One row per SKU with packed dimensions and weight.",
  },
  orders: {
    title: "orders.csv",
    required: true,
    hint: "One row per line item: order ID, SKU, quantity (optional date).",
  },
  boxes: {
    title: "current_boxes.csv",
    required: false,
    hint: "The boxes you use today (optional). Used for the before/after.",
  },
};
