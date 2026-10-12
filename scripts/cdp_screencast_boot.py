#!/usr/bin/env python3
"""Захват boot-анимации глаза с dev через Page.startScreencast + коллаж для Qwen3.5-4B NPU.

Зачем: Page.captureScreenshot НЕ успевает за быстрым boot (первый кадр приходит ~2.05с,
а цикл глаза fly-in 520ms -> fly-out ~1.5-2с пролетает раньше). startScreencast
отдаёт кадры СОБЫТИЙНО на каждом frame (~60fps) прямо из Chrome, минуя окно —
ловит P1 (EYE) с самого t=0.

Требования: Chrome запущен на dev.holograms.media с --remote-debugging-port=9222.

Использование:
  python3 cdp_screencast_boot.py                # reload + ловит boot с t=0
  python3 cdp_screencast_boot.py --server :52625  # плюс шлёт коллаж в Qwen3.5-4B NPU

Выход: /tmp/eye_frames/screencast_<N>/ — PNG-кадры (+collage_3x3.png, +flm_analysis.txt)
"""
import json, time, base64, io, glob, os, sys, urllib.request
import websocket  # pip install websocket-client
from PIL import Image

CDP = "http://127.0.0.1:9222"
FLM = ":52625"

def get_page():
    tabs = json.load(urllib.request.urlopen(f"{CDP}/json/list"))
    return next(t for t in tabs if t["type"] == "page" and "holograms" in t.get("url", ""))

def main():
    flm = False
    if "--server" in sys.argv:
        flm = sys.argv[sys.argv.index("--server") + 1]
    page = get_page()
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30)
    ws.send(json.dumps({"id": 1, "method": "Page.startScreencast",
                        "params": {"format": "png", "quality": 80, "everyNthFrame": 1}}))
    ws.send(json.dumps({"id": 2, "method": "Page.enable"}))
    ws.send(json.dumps({"id": 3, "method": "Page.reload", "params": {"ignoreCache": True}}))

    outdir = "/tmp/eye_frames/screencast_%d" % int(time.time())
    os.makedirs(outdir, exist_ok=True)
    deadline = time.time() + 12          # 12с хватает на boot P1-P4
    n = 0
    while time.time() < deadline:
        msg = ws.recv()
        j = json.loads(msg)
        if j.get("method") == "Page.screencastFrame":
            data = base64.b64decode(j["params"]["data"])
            Image.open(io.BytesIO(data)).convert("RGB").save(f"{outdir}/f{n:03d}.png")
            n += 1
            ws.send(json.dumps({"id": 900 + n, "method": "Page.screencastFrameAck",
                                "params": {"sessionId": j["params"]["sessionId"]}}))
    ws.close()
    print(f"снято кадров: {n} -> {outdir}")

    # --- коллаж 3x3 из НЕЧЁРНЫХ кадров (попарно уникальных по размеру) ---
    import numpy as np
    seen, uniq = {}, []
    for f in sorted(glob.glob(f"{outdir}/f*.png")):
        seen.setdefault(os.path.getsize(f), f)
    lives = [f for f in seen.values()
             if len(np.unique(np.asarray(Image.open(f).convert("L")))) > 40]  # не чёрный
    src = (lives if len(lives) >= 9 else (lives + uniq))[:9]
    import math
    sel = (src * math.ceil(9 / max(1, len(src))))[:9] if src else []
    if sel:
        th, cols = 170, 3
        c = Image.new("RGB", (th * cols, th * (math.ceil(len(sel) / cols))), (0, 0, 0))
        for i, p in enumerate(sel):
            c.paste(Image.open(p).convert("RGB").resize((th, th)), (i % cols * th, i // cols * th))
        cp = f"{outdir}/collage_3x3.png"
        c.save(cp)
        print("коллаж:", cp)

    # --- опционально: анализ через Qwen3.5-4B NPU ---
    if flm and sel:
        cp = f"{outdir}/collage_3x3.png"
        b64 = base64.b64encode(open(cp, "rb").read()).decode()
        payload = json.dumps({"model": "qwen3.5:4b", "messages": [{"role": "user", "content": [
            {"type": "text", "text": "Это коллаж 3x3 кадров boot-анимации UI. Опиши что происходит, есть ли движение/фазы между кадрами, что меняется. Кратко и по делу."},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}}]}],
            "max_tokens": 300}).encode()
        req = urllib.request.Request(f"http://localhost{flm}/v1/chat/completions",
                                     data=payload, headers={"Content-Type": "application/json"})
        r = json.load(urllib.request.urlopen(req, timeout=120))
        txt = (r["choices"][0].get("message", {}).get("content")
               or r["choices"][0].get("message", {}).get("reasoning_content") or "")
        open(f"{outdir}/flm_analysis.txt", "w").write(txt)
        print("=== Qwen3.5-4B NPU анализ ===\n", txt)

if __name__ == "__main__":
    main()
