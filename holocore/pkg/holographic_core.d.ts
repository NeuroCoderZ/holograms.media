/* tslint:disable */
/* eslint-disable */

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly bio_compute_hash: (a: number, b: number, c: number) => void;
    readonly brain_decay: (a: number) => void;
    readonly brain_encode: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly brain_export_weights: (a: number, b: number, c: number) => void;
    readonly brain_free: (a: number) => void;
    readonly brain_import_weights: (a: number, b: number, c: number) => void;
    readonly brain_learn: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly brain_new: (a: number, b: number, c: number, d: bigint) => number;
    readonly brain_recall: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly brain_total_params: (a: number) => number;
    readonly cwtanalyzer_free: (a: number) => void;
    readonly cwtanalyzer_new: (a: number, b: number, c: number) => number;
    readonly cwtanalyzer_process: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
    readonly cwtanalyzer_reset: (a: number) => void;
    readonly cwtanalyzer_set_fps: (a: number, b: number) => void;
    readonly free: (a: number, b: number) => void;
    readonly malloc: (a: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
