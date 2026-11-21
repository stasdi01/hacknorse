//! Validation: brute force vs. greedy + local search on a reduced instance
//! (implemented in milestone M12).

use crate::types::{OptimizeInput, ValidationReport};

/// Run the validation.
pub fn run_validate(input: &OptimizeInput) -> Result<ValidationReport, String> {
    crate::pipeline::check_input(input)?;
    Err("validation is not available yet".into())
}
