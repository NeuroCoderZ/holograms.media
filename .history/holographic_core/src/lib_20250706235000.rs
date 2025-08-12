
use wasm_bindgen::prelude::*;
mod audio_processor;

use audio_processor::{CwtProcessor};

#[wasm_bindgen]
pub struct HoloAnalyzer {
    processor: CwtProcessor,
}

#[wasm_bindgen]
impl HoloAnalyzer {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, num_bins: usize, chunk_size: usize) -> Self {{
        let processor = CwtProcessor::new(sample_rate, num_bins, chunk_size);
        Self { processor }
    }}

    pub fn process(&self, left_channel: &[f32], right_channel: &[f32]) -> Result<JsValue, JsValue> {
        let output = self.processor.process(left_channel, right_channel);
        Ok(serde_wasm_bindgen::to_value(&output).unwrap())
    }
}
