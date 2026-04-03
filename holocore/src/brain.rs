// ============================================================
// brain.rs — Enkephalon: Hebbian Associative Memory
// Tria Cortex v2.6 | holograms.media
//
// Терминология (из глоссария проекта):
//   Enkephalon  — нейронное ядро Триа (этот модуль)
//   Synapsis    — веса (поля proj + assoc)
//   Lethe       — механизм затухания (метод decay_all)
//   Obolos      — единица полезности, растёт при использовании весов
//
// Pure WASM: #[no_mangle] extern "C", без wasm-bindgen, без serde.
// ============================================================

use std::slice;

// --- Simple LCG для Xavier Init (без rand crate) ---
struct SimpleLCG {
    state: u64,
}

impl SimpleLCG {
    fn new(seed: u64) -> Self {
        Self {
            state: if seed == 0 { 1 } else { seed },
        }
    }

    /// Возвращает f32 в диапазоне [0.0, 1.0)
    fn next_f32(&mut self) -> f32 {
        self.state = self
            .state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.state >> 33) as f32) / (u32::MAX as f32 / 2.0)
    }
}

fn xavier_init(n_in: usize, n_out: usize, seed: u64) -> Vec<f32> {
    let limit = (6.0 / (n_in + n_out) as f32).sqrt();
    let mut rng = SimpleLCG::new(seed);
    (0..(n_in * n_out))
        .map(|_| (rng.next_f32() * 2.0 - 1.0) * limit)
        .collect()
}

// --- Enkephalon ---
pub struct Brain {
    proj: Vec<f32>,       // Synapsis: матрица проекции [embedding_dim × input_dim]
    assoc: Vec<f32>,      // Synapsis: матрица ассоциации [intent_dim × embedding_dim]
    input_dim: usize,     // 63 (21 точка × 3 координаты)
    embedding_dim: usize, // 64
    intent_dim: usize,    // 25
    lr: f32,              // скорость обучения 0.01
    decay: f32,           // Lethe: коэффициент затухания 0.001
}

impl Brain {
    pub fn new(input_dim: usize, embedding_dim: usize, intent_dim: usize, seed: u64) -> Self {
        Self {
            proj: xavier_init(input_dim, embedding_dim, seed),
            assoc: xavier_init(embedding_dim, intent_dim, seed.wrapping_add(7)),
            input_dim,
            embedding_dim,
            intent_dim,
            lr: 0.01,
            decay: 0.001,
        }
    }

    /// Проекция жеста в эмбеддинг: input[63] → output[64]
    pub fn encode(&self, input: &[f32], output: &mut [f32]) {
        for i in 0..self.embedding_dim {
            let mut sum = 0.0f32;
            let row_offset = i * self.input_dim;
            for j in 0..self.input_dim {
                sum += self.proj[row_offset + j] * input[j];
            }
            output[i] = sum;
        }
    }

    /// Восстановление намерения из эмбеддинга: embedding[64] → output[25]
    pub fn recall(&self, embedding: &[f32], output: &mut [f32]) {
        for i in 0..self.intent_dim {
            let mut sum = 0.0f32;
            let row_offset = i * self.embedding_dim;
            for j in 0..self.embedding_dim {
                sum += self.assoc[row_offset + j] * embedding[j];
            }
            output[i] = sum;
        }
    }

    /// Hebbian update (Мнезис активен):
    /// assoc[i][j] += η * intent[i] * embedding[j] − λ * assoc[i][j]
    pub fn learn(&mut self, embedding: &[f32], intent: &[f32]) {
        for i in 0..self.intent_dim {
            let row_offset = i * self.embedding_dim;
            for j in 0..self.embedding_dim {
                let idx = row_offset + j;
                self.assoc[idx] +=
                    self.lr * intent[i] * embedding[j] - self.decay * self.assoc[idx];
            }
        }
    }

    /// Lethe: глобальное затухание весов. Вызывать раз в 24 часа.
    /// W *= (1 − λ). Неиспользуемые знания «тонут в Лете».
    pub fn decay_all(&mut self) {
        let factor = 1.0 - self.decay;
        for w in self.proj.iter_mut() {
            *w *= factor;
        }
        for w in self.assoc.iter_mut() {
            *w *= factor;
        }
    }

    pub fn total_params(&self) -> usize {
        self.proj.len() + self.assoc.len()
    }

    /// Экспорт весов: [proj..., assoc...] → flat buffer
    pub fn export_weights(&self, output: &mut [f32]) {
        let proj_len = self.proj.len();
        output[..proj_len].copy_from_slice(&self.proj);
        output[proj_len..proj_len + self.assoc.len()].copy_from_slice(&self.assoc);
    }

    /// Импорт весов из flat buffer
    pub fn import_weights(&mut self, data: &[f32]) {
        let proj_len = self.proj.len();
        self.proj.copy_from_slice(&data[..proj_len]);

        let assoc_len = self.assoc.len();
        self.assoc
            .copy_from_slice(&data[proj_len..proj_len + assoc_len]);
    }
}

// === PURE WASM EXPORTS ===

#[no_mangle]
pub extern "C" fn brain_new(
    input_dim: usize,
    embedding_dim: usize,
    intent_dim: usize,
    seed: u64,
) -> *mut Brain {
    Box::into_raw(Box::new(Brain::new(
        input_dim,
        embedding_dim,
        intent_dim,
        seed,
    )))
}

#[no_mangle]
pub extern "C" fn brain_encode(
    ptr: *mut Brain,
    input_ptr: *const f32,
    input_len: usize,
    output_ptr: *mut f32,
    output_len: usize,
) {
    let brain = unsafe { &*ptr };
    let input = unsafe { slice::from_raw_parts(input_ptr, input_len) };
    let output = unsafe { slice::from_raw_parts_mut(output_ptr, output_len) };
    brain.encode(input, output);
}

#[no_mangle]
pub extern "C" fn brain_recall(
    ptr: *mut Brain,
    emb_ptr: *const f32,
    emb_len: usize,
    output_ptr: *mut f32,
    output_len: usize,
) {
    let brain = unsafe { &*ptr };
    let embedding = unsafe { slice::from_raw_parts(emb_ptr, emb_len) };
    let output = unsafe { slice::from_raw_parts_mut(output_ptr, output_len) };
    brain.recall(embedding, output);
}

#[no_mangle]
pub extern "C" fn brain_learn(
    ptr: *mut Brain,
    emb_ptr: *const f32,
    emb_len: usize,
    intent_ptr: *const f32,
    intent_len: usize,
) {
    let brain = unsafe { &mut *ptr };
    let embedding = unsafe { slice::from_raw_parts(emb_ptr, emb_len) };
    let intent = unsafe { slice::from_raw_parts(intent_ptr, intent_len) };
    brain.learn(embedding, intent);
}

#[no_mangle]
pub extern "C" fn brain_decay(ptr: *mut Brain) {
    unsafe { &mut *ptr }.decay_all();
}

#[no_mangle]
pub extern "C" fn brain_total_params(ptr: *mut Brain) -> usize {
    unsafe { &*ptr }.total_params()
}

#[no_mangle]
pub extern "C" fn brain_export_weights(ptr: *mut Brain, output_ptr: *mut f32, output_len: usize) {
    let brain = unsafe { &*ptr };
    let output = unsafe { slice::from_raw_parts_mut(output_ptr, output_len) };
    brain.export_weights(output);
}

#[no_mangle]
pub extern "C" fn brain_import_weights(ptr: *mut Brain, data_ptr: *const f32, data_len: usize) {
    let brain = unsafe { &mut *ptr };
    let data = unsafe { slice::from_raw_parts(data_ptr, data_len) };
    brain.import_weights(data);
}

#[no_mangle]
pub extern "C" fn brain_free(ptr: *mut Brain) {
    if !ptr.is_null() {
        unsafe {
            drop(Box::from_raw(ptr));
        }
    }
}
