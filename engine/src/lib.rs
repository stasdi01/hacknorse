//! Box-set optimizer engine.
//!
//! The public API (also exported to WebAssembly) is JSON in, JSON out:
//! [`optimize`], [`validate`] and [`version`].

use wasm_bindgen::prelude::*;

/// Engine version string (crate version).
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_matches_crate() {
        assert_eq!(version(), env!("CARGO_PKG_VERSION"));
    }
}
