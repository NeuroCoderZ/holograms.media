#!/usr/bin/env python3
"""
vision_overlays.py — генерация diff- и code-spec оверлеев для подачи кадров голограммы в Qwen3-VL.
Работает на numpy+PIL (без cv2), изображения png.

Diff: threshold+normalize, красная маска изменённых пикселей, альфа-блендинг.
Code-spec: зелёный контур ожидания (bbox/opacity) поверх кадра, подпись фазы.

Вход: пары кадров (t0/t1) или список с ключ-кадром. Выход: оверлеи в overlays/.
"""
import os, sys, json, math
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def _load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.uint8)

def _to_img(a):
    a = a.astype(np.uint8)
    mode = "RGB" if a.ndim == 3 else "L"
    return Image.fromarray(a, mode)

def _norm255(x):
    x = x.astype(np.float32)
    mn, mx = x.min(), x.max()
    if mx - mn < 1e-6: return np.zeros_like(x, dtype=np.uint8)
    return ((x - mn) / (mx - mn) * 255).astype(np.uint8)

def make_diff_overlay(base_rgb, next_rgb, thresh=8, alpha=0.35):
    """diff-оверлей: красная маска поверх базового кадра + normalized diff."""
    d = np.abs(base_rgb.astype(np.float32) - next_rgb.astype(np.float32)).sum(axis=2)
    mask = d > thresh
    overlay = base_rgb.copy()
    overlay[mask] = [255, 30, 30]
    res = (base_rgb * (1 - alpha) + overlay * alpha).astype(np.uint8)
    norm = _norm255(d)
    return res, norm, float(mask.mean())

def make_codespec_overlay(base_rgb, bbox, label="", alpha=0.3, color=(30,255,30)):
    """code-spec оверлей: зелёный контур ожидания (bbox dict или None)."""
    overlay = base_rgb.copy()
    if bbox:
        x1,y1,x2,y2 = int(bbox['x']), int(bbox['y']), int(bbox['x']+bbox['w']), int(bbox['y']+bbox['h'])
        x1=max(0,x1); y1=max(0,y1); x2=min(base_rgb.shape[1],x2); y2=min(base_rgb.shape[0],y2)
        overlay[y1:y2, x1:x1+3] = color; overlay[y1:y2, x2-3:x2] = color
        overlay[y1:y1+3, x1:x2] = color; overlay[y2-3:y2, x1:x2] = color
    res = (base_rgb * (1 - alpha) + overlay * alpha).astype(np.uint8)
    return res

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="базовый кадр (t0)")
    ap.add_argument("--next", required=True, help="следующий кадр (t1)")
    ap.add_argument("--out", default="overlays", help="папка выхода")
    ap.add_argument("--bbox", default=None, help="JSON-строка ожидаемого bbox: {\"x\":..,\"y\":..,\"w\":..,\"h\":..}")
    ap.add_argument("--thresh", type=int, default=8)
    ap.add_argument("--label", default="")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    b=_load(args.base); n=_load(args.next)
    if b.shape != n.shape:
        n = np.asarray(Image.fromarray(n).resize((b.shape[1], b.shape[0])), dtype=np.uint8)
    bbox = json.loads(args.bbox) if args.bbox else None
    diff_img, norm, frac = make_diff_overlay(b, n, thresh=args.thresh)
    spec_img = make_codespec_overlay(b, bbox, args.label)
    _to_img(diff_img).save(os.path.join(args.out, "diff_overlay.png"))
    _to_img(norm).save(os.path.join(args.out, "diff_normalized.png"))
    _to_img(spec_img).save(os.path.join(args.out, "code_spec_overlay.png"))
    print(json.dumps({"diff_frac_pct": round(frac*100,3), "out": args.out}))

if __name__ == "__main__":
    main()
