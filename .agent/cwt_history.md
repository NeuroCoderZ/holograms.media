commit 1b1828d71f5bb1c0b7b92291bebe7c415d498925
Author: NeuroCoder <neorh@holograms.media>
Date:   Thu Mar 26 11:50:20 2026 +0300

    fix: Koyeb ASTRA secret syntax, BasilaQ || falsy bug, EyeLoader v3.0 XR saccadic

diff --git a/js/audio/audioProcessing.js b/js/audio/audioProcessing.js
index c83896b..9373cb0 100644
--- a/js/audio/audioProcessing.js
+++ b/js/audio/audioProcessing.js
@@ -71,13 +71,13 @@ eventBus.on('audio:spectralData', (data) => {
 
     // ПРИНУДИТЕЛЬНЫЙ ЛОГ (раз в секунду)
     // Периодический лог для проверки данных (раз в секунду)
-    // if (!window._lastAudioLog || Date.now() - window._lastAudioLog > 1000) {
-    //     const max = Math.max(...payload.levels);
-    //     const min = Math.min(...payload.levels);
-    //     const first5 = Array.from(payload.levels.slice(0, 5)).map(v => v.toFixed(2)).join(', ');
-    //     console.log(`[Flow Check] data: max=${max.toFixed(2)}, min=${min.toFixed(2)}, first5=[${first5}]`);
-    //     window._lastAudioLog = Date.now();
-    // }
+    if (!window._lastAudioLog || Date.now() - window._lastAudioLog > 1000) {
+        const max = Math.max(...payload.levels);
+        const min = Math.min(...payload.levels);
+        const first5 = Array.from(payload.levels.slice(0, 5)).map(v => v.toFixed(2)).join(', ');
+        console.log(`[Flow Check] data: max=${max.toFixed(2)}, min=${min.toFixed(2)}, first5=[${first5}]`);
+        window._lastAudioLog = Date.now();
+    }
 
     // Отправляем в рендерер
     eventBus.emit('audioData', payload);

commit e7bedd7c9cbfdc62b3575c8059f3a5f37bf10a06
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 00:38:21 2026 +0300

    DEPLOY: v0.20.199 - fix: resolve right grid freeze (NaN) and restore glint directionality v0.20.199

diff --git a/js/audio/audioProcessing.js b/js/audio/audioProcessing.js
index da7b5a8..c83896b 100644
--- a/js/audio/audioProcessing.js
+++ b/js/audio/audioProcessing.js
@@ -54,7 +54,20 @@ eventBus.on('audio:spectralData', (data) => {
         fullPans.set(modulated.pans);
     }
 
-    const payload = { levels: modulated.levels, pans: fullPans };
+    // FIX: Ensure Levels are also 256 length (Stereo duplication if Mono)
+    // The Renderer expects indices i+128 to exist.
+    const fullLevels = new Float32Array(256).fill(-128); // Default silence
+    if (modulated.levels.length === 128) {
+        fullLevels.set(modulated.levels, 0);
+        fullLevels.set(modulated.levels, 128);
+    } else if (modulated.levels.length === 256) {
+        fullLevels.set(modulated.levels);
+    } else {
+        // Fallback for unexpected lengths
+        fullLevels.set(modulated.levels.slice(0, 256));
+    }
+
+    const payload = { levels: fullLevels, pans: fullPans };
 
     // ПРИНУДИТЕЛЬНЫЙ ЛОГ (раз в секунду)
     // Периодический лог для проверки данных (раз в секунду)

commit 75b260b2d2fb08e7d86425765fe1884d1fbb721c
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 00:24:43 2026 +0300

    DEPLOY: v0.20.198 - fix: hard reset audio worklet and boost glint intensity v0.20.198

diff --git a/js/audio/audioProcessing.js b/js/audio/audioProcessing.js
index 235f319..da7b5a8 100644
--- a/js/audio/audioProcessing.js
+++ b/js/audio/audioProcessing.js
@@ -113,11 +113,9 @@ export async function setupAudioProcessing(sourceNode, audioContext, connectToOu
 /**
  * Сбрасывает буферы CWT-анализатора в WASM.
  * Вызывается при смене трека или нажатии Stop.
+ * Performs a hard reset by destroying the WorkletNode via AudioService.
  */
 export function resetCwtAnalyzer() {
-    const node = audioService.workletNode;
-    if (node && node.port) {
-        node.port.postMessage({ type: 'RESET' });
-        console.log('[AudioProcessing] 🔄 Reset signal sent to CWT Worklet.');
-    }
+    console.log('[AudioProcessing] 🔄 Performing Hard Reset of CWT Analyzer...');
+    audioService.resetWorklet();
 }

commit b4d87e678abcea3444898203ed63865dd6655fd5
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 18 23:21:25 2026 +0300

    fix: critical WASM bugs, P0 wallet security, and Tria functional enhancements (G-NEXT) v6.2

diff --git a/js/audio/cwtAudioWorklet.js b/js/audio/cwtAudioWorklet.js
index 76fd9e9..bfaf712 100644
--- a/js/audio/cwtAudioWorklet.js
+++ b/js/audio/cwtAudioWorklet.js
@@ -198,27 +198,32 @@ class CwtProcessor extends AudioWorkletProcessor {
                 return true;
             }
 
-            const levels = new Float32Array(mem.buffer, ptrs.levels, 256).slice(); // .slice() to copy data out of shared memory
-            const angles = new Float32Array(mem.buffer, ptrs.pans, 128).slice();
-            const confidence = new Float32Array(mem.buffer, ptrs.confidence, 128).slice();
-
-            // DEBUG: Логи вывода WASM (раз в секунду)
-            // if (this._hb % 60 === 0) {
-            //     this.port.postMessage({
-            //         type: 'LOG',
-            //         msg: `DATA_OUT: L[0]=${levels[0].toFixed(1)}dB, max=${Math.max(...levels).toFixed(1)}dB, P[0]=${angles[0].toFixed(2)}`
-            //     });
-            // }
-
-            // ✅ ГЛАВНОЕ: Отправка данных в рендерер
-            // Мы убрали performance.now() и Math.max, так как они вызывали ошибки в Worklet
-            this.port.postMessage({
-                type: 'AUDIO_DATA',
-                levels,
-                angles,
-                confidence,
-                timestamp: (typeof currentTime !== 'undefined') ? currentTime : 0
-            });
+            // ЗДЕСЬ БЫЛА УТЕЧКА FPS (PostMessage 375 раз в секунду при 48kHz / 128 сэмплов).
+            // Оптимизируем отправку: используем накопитель, чтобы точно попадать в targetFps (Sample-Accurate)
+            if (this._sampleAccumulator === undefined) this._sampleAccumulator = 0;
+            this._sampleAccumulator += len; // len обычно 128
+
+            const samplesPerFrame = this._sampleRate / this._targetFps;
+
+            if (this._sampleAccumulator >= samplesPerFrame) {
+                // Вычитаем ровно столько, сколько "потребил" один кадр отрисовки,
+                // сохраняя остаток для следующего цикла (jitter protection)
+                this._sampleAccumulator -= samplesPerFrame;
+                
+                // Рендерим слайсы ТОЛЬКО когда пора отправлять
+                const levels = new Float32Array(mem.buffer, ptrs.levels, 256).slice(); 
+                const angles = new Float32Array(mem.buffer, ptrs.pans, 128).slice();
+                const confidence = new Float32Array(mem.buffer, ptrs.confidence, 128).slice();
+
+                // ✅ ТОЧНАЯ СИНХРОНИЗАЦИЯ: Отправка данных в рендерер в ритме частоты экрана
+                this.port.postMessage({
+                    type: 'AUDIO_DATA',
+                    levels,
+                    angles,
+                    confidence,
+                    timestamp: (typeof currentTime !== 'undefined') ? currentTime : 0
+                });
+            }
 
         } catch (e) {
             // Молчаливая обработка ошибок: логируем раз в 5 секунд, чтобы не спамить
