// ============================================================
// bio_auth.rs — Skelet Profile & BioHash
// Tria Cortex v2.6 | holograms.media
//
// Генерирует уникальный хэш на основе пропорций скелета.
// Используется для подписи Soma-блоков (Proof of Identity).
// ============================================================

use std::slice;

// Простейшая реализация хэширования (djb2) для избежания внешних зависимостей (sha2)
// в рамках жестких ограничений WASM. В Phase 3 заменить на SHA-256.
fn djb2_hash(data: &[u8]) -> u32 {
    let mut hash: u32 = 5381;
    for &b in data {
        hash = ((hash << 5).wrapping_add(hash)).wrapping_add(b as u32);
    }
    hash
}

pub struct BioProfile {
    // Длины основных костей (нормализованные к росту)
    // [плечо_Л, предплечье_Л, плечо_П, предплечье_П, бедро_Л, голень_Л, бедро_П, голень_П]
    bone_ratios: [f32; 8],
}

impl BioProfile {
    pub fn new(bones: &[f32; 8]) -> Self {
        Self {
            bone_ratios: *bones,
        }
    }

    /// Генерация BioHash (32 байта - пока заглушка, возвращаем u32 как hex string)
    pub fn compute_hash(&self, buffer: &mut [u8]) {
        let mut raw_bytes = Vec::with_capacity(32);
        for &ratio in &self.bone_ratios {
            // Преобразуем float в байты
            raw_bytes.extend_from_slice(&ratio.to_le_bytes());
        }

        let hash = djb2_hash(&raw_bytes);

        // Записываем хэш в начало буфера (как строку hex)
        let hash_str = format!("{:08x}", hash);
        let bytes = hash_str.as_bytes();
        for (i, &b) in bytes.iter().enumerate() {
            if i < buffer.len() {
                buffer[i] = b;
            }
        }
    }
}

// === PURE WASM EXPORTS ===

#[no_mangle]
pub extern "C" fn bio_compute_hash(bones_ptr: *const f32, output_ptr: *mut u8, output_len: usize) {
    let bones_slice = unsafe { slice::from_raw_parts(bones_ptr, 8) };
    let mut bones_arr = [0.0; 8];
    bones_arr.copy_from_slice(bones_slice);

    let profile = BioProfile::new(&bones_arr);
    let output = unsafe { slice::from_raw_parts_mut(output_ptr, output_len) };

    // Очистка буфера
    for b in output.iter_mut() {
        *b = 0;
    }

    profile.compute_hash(output);
}
