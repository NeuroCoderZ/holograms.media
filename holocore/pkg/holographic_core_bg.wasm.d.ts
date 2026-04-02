/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const bio_compute_hash: (a: number, b: number, c: number) => void;
export const brain_decay: (a: number) => void;
export const brain_encode: (a: number, b: number, c: number, d: number, e: number) => void;
export const brain_export_weights: (a: number, b: number, c: number) => void;
export const brain_free: (a: number) => void;
export const brain_import_weights: (a: number, b: number, c: number) => void;
export const brain_learn: (a: number, b: number, c: number, d: number, e: number) => void;
export const brain_new: (a: number, b: number, c: number, d: bigint) => number;
export const brain_recall: (a: number, b: number, c: number, d: number, e: number) => void;
export const brain_total_params: (a: number) => number;
export const cwtanalyzer_free: (a: number) => void;
export const cwtanalyzer_new: (a: number, b: number, c: number) => number;
export const cwtanalyzer_process: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
export const cwtanalyzer_reset: (a: number) => void;
export const cwtanalyzer_set_fps: (a: number, b: number) => void;
export const free: (a: number, b: number) => void;
export const malloc: (a: number) => number;
