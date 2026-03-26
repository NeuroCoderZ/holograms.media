commit f017328d93ade210cfd34b1d4f21d0f9f51ee8db
Author: NeuroCoder <neorh@holograms.media>
Date:   Thu Mar 26 15:45:28 2026 +0300

    DEPLOY: v0.20.218 - fix: rollback HologramRenderer to 10-days old to fix freezing; remove white box-shadows from UI; disable dynamic FPS to protect WASM CWT buffer from deadlocking

diff --git a/index.html b/index.html
index 77c5d7e..e61729a 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.217 - feat: colorful glass specular from BasilaQ-128 — semitone colors, demo glints, press dimming, scroll refresh");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.218 - fix: rollback HologramRenderer to 10-days old to fix freezing; remove white box-shadows from UI; disable dynamic FPS to protect WASM CWT buffer from deadlocking");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 70dc3dba80446e5b656507f8d8921d5fd5bfeab3
Author: NeuroCoder <neorh@holograms.media>
Date:   Thu Mar 26 12:57:50 2026 +0300

    DEPLOY: v0.20.217 - feat: colorful glass specular from BasilaQ-128 — semitone colors, demo glints, press dimming, scroll refresh

diff --git a/index.html b/index.html
index d1ae255..77c5d7e 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.216 - Sync context and verify script");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.217 - feat: colorful glass specular from BasilaQ-128 — semitone colors, demo glints, press dimming, scroll refresh");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 1a55be4cb5240aae5fa0a29e8482473924af08fa
Author: NeuroCoder <neorh@holograms.media>
Date:   Thu Mar 26 11:57:54 2026 +0300

    DEPLOY: v0.20.216 - Sync context and verify script

diff --git a/index.html b/index.html
index 16654ad..d1ae255 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.215 - Hotfix: EyeLoader v3.0, BasilaQ falsy bug, Koyeb secret syntax");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.216 - Sync context and verify script");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit d6c6537f09ead76014843d9063b1a8b609813dc6
Author: NeuroCoder <neorh@holograms.media>
Date:   Thu Mar 26 11:52:14 2026 +0300

    DEPLOY: v0.20.215 - Hotfix: EyeLoader v3.0, BasilaQ falsy bug, Koyeb secret syntax

diff --git a/index.html b/index.html
index 860ada8..16654ad 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.214 - Hotfix: Koyeb Secrets Sync, AstraDB chunk sizes, WebGL columns & glints");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.215 - Hotfix: EyeLoader v3.0, BasilaQ falsy bug, Koyeb secret syntax");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 537bdb873261055cd9e77b90c1407ecb42a5e196
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 18:02:27 2026 +0300

    DEPLOY: v0.20.214 - Hotfix: Koyeb Secrets Sync, AstraDB chunk sizes, WebGL columns & glints

diff --git a/index.html b/index.html
index 6e2c3a1..860ada8 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.213 - Tria Zen, Koyeb Secrets, OpenClaw architecture");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.214 - Hotfix: Koyeb Secrets Sync, AstraDB chunk sizes, WebGL columns & glints");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit eeec54608241f834f097f52a952e8b74ae36bf41
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 17:20:39 2026 +0300

    DEPLOY: v0.20.213 - Tria Zen, Koyeb Secrets, OpenClaw architecture

diff --git a/index.html b/index.html
index 1504127..6e2c3a1 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.212 - fix: scuttle eye saccade error, HologramRenderer setColorAt, GEMINI_EMBEDDING_2 mandated v0.20.212");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.213 - Tria Zen, Koyeb Secrets, OpenClaw architecture");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit f862d69f055bb61ff8c59fc094c22867cf167fc5
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 01:56:10 2026 +0300

    DEPLOY: v0.20.212 - fix: scuttle eye saccade error, HologramRenderer setColorAt, GEMINI_EMBEDDING_2 mandated v0.20.212

diff --git a/index.html b/index.html
index 42f0cf1..1504127 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.211 - fix: official Gemini Embedding 2 integration, scuttling eye v0.20.211");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.212 - fix: scuttle eye saccade error, HologramRenderer setColorAt, GEMINI_EMBEDDING_2 mandated v0.20.212");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit c2de9020a1f425ec1c53fa9230b648ccef7e91c9
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 01:52:19 2026 +0300

    DEPLOY: v0.20.211 - fix: official Gemini Embedding 2 integration, scuttling eye v0.20.211

diff --git a/index.html b/index.html
index 3370961..42f0cf1 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.210 - fix: resolve CI/CD token waste, intensive scuttling eye v0.20.210");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.211 - fix: official Gemini Embedding 2 integration, scuttling eye v0.20.211");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit bac4d0d0ac2acab8eb3c2497412d2849c10c9bb8
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 01:45:13 2026 +0300

    DEPLOY: v0.20.210 - fix: resolve CI/CD token waste, intensive scuttling eye v0.20.210

diff --git a/index.html b/index.html
index 64955a3..3370961 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.209 - fix: scuttling eye effect, Gemini Embedding 2 integration v0.20.209");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.210 - fix: resolve CI/CD token waste, intensive scuttling eye v0.20.210");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit d87f0b2d1a3b1dc5de0e6a3e20024f76aa5123c9
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 01:39:44 2026 +0300

    DEPLOY: v0.20.209 - fix: scuttling eye effect, Gemini Embedding 2 integration v0.20.209

diff --git a/index.html b/index.html
index 004133c..64955a3 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.208 - fix: spring-physics EyeLoader, advanced liquid glints, pure emissive hologram v0.20.208");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.209 - fix: scuttling eye effect, Gemini Embedding 2 integration v0.20.209");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 49e10d34a68015c4f8dfa4004972620e8704bcf7
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 01:38:29 2026 +0300

    DEPLOY: v0.20.208 - fix: spring-physics EyeLoader, advanced liquid glints, pure emissive hologram v0.20.208

diff --git a/index.html b/index.html
index 9898eb3..004133c 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.207 - fix: AstraDB connection, pure emissive columns, per-element glints v0.20.207");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.208 - fix: spring-physics EyeLoader, advanced liquid glints, pure emissive hologram v0.20.208");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 5bfef702c0109821c386fdf2535902041fb63e81
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 01:29:08 2026 +0300

    DEPLOY: v0.20.207 - fix: AstraDB connection, pure emissive columns, per-element glints v0.20.207

diff --git a/index.html b/index.html
index 7053423..9898eb3 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.206 - fix: ultra-performance instancing, glint visibility boost, eye contrast v0.20.206");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.207 - fix: AstraDB connection, pure emissive columns, per-element glints v0.20.207");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -573,11 +573,7 @@
     </div>
   </div>
 
-  <!-- Спектральный слой бликов (поверх панелей с opacity 0.4) -->
-  <div id="spectral-glint-overlay" style="position:fixed;inset:0;pointer-events:none;z-index:1003;display:none;">
-    <div id="spectral-glint-spot" style="position:absolute;width:100%;height:100%;transition:background 0.12s ease-out;"></div>
-  </div>
-
+  <!-- Спектральный слой бликов (удален в пользу индивидуальных бликов на элементах) -->
   <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
   <script type="module" src="/js/main.js"></script>
 

commit 65fdaa44819c345848189144362c5414c4f5e0b5
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 01:10:51 2026 +0300

    DEPLOY: v0.20.206 - fix: ultra-performance instancing, glint visibility boost, eye contrast v0.20.206

diff --git a/index.html b/index.html
index e2eadff..7053423 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.205 - fix: EyeLoader eyelids semi-transparent (alpha 0.85-0.7), eye visible through lids");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.206 - fix: ultra-performance instancing, glint visibility boost, eye contrast v0.20.206");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 9c031dae8e5c71d788a679f7f6303eeb040887a3
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 00:27:46 2026 +0300

    DEPLOY: v0.20.205 - fix: EyeLoader eyelids semi-transparent (alpha 0.85-0.7), eye visible through lids

diff --git a/index.html b/index.html
index 1503cf5..e2eadff 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.204 - fix: EyeLoader - remove blur on eyelids, increase eye size 2x, sharper gradients");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.205 - fix: EyeLoader eyelids semi-transparent (alpha 0.85-0.7), eye visible through lids");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit d361818b859923725497fa6070c9ba00a6bef1cc
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 25 00:00:38 2026 +0300

    DEPLOY: v0.20.204 - fix: EyeLoader - remove blur on eyelids, increase eye size 2x, sharper gradients

diff --git a/index.html b/index.html
index 5fc5d18..1503cf5 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.203 - fix: spectral glint overlay, glass eyelids, volumetric eye");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.204 - fix: EyeLoader - remove blur on eyelids, increase eye size 2x, sharper gradients");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 440e413bef56c33a06fdcede819e4adee2b552d5
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 23:38:48 2026 +0300

    DEPLOY: v0.20.203 - fix: spectral glint overlay, glass eyelids, volumetric eye

diff --git a/index.html b/index.html
index 14d2e8b..5fc5d18 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.202 - fix: accountSettingsButton visibility (CSS !important), sync_knowledge_base batch delete limit");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.203 - fix: spectral glint overlay, glass eyelids, volumetric eye");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -573,6 +573,11 @@
     </div>
   </div>
 
+  <!-- Спектральный слой бликов (поверх панелей с opacity 0.4) -->
+  <div id="spectral-glint-overlay" style="position:fixed;inset:0;pointer-events:none;z-index:1003;display:none;">
+    <div id="spectral-glint-spot" style="position:absolute;width:100%;height:100%;transition:background 0.12s ease-out;"></div>
+  </div>
+
   <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
   <script type="module" src="/js/main.js"></script>
 

commit 07a4c7b4de46f242122f025f5f6b6d7d95f4d080
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 18:24:59 2026 +0300

    DEPLOY: v0.20.202 - fix: accountSettingsButton visibility (CSS !important), sync_knowledge_base batch delete limit

diff --git a/index.html b/index.html
index 2135a2d..14d2e8b 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.201 - fix: EyeLoader visibility, spectral glints pipeline, remove old CSS eye");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.202 - fix: accountSettingsButton visibility (CSS !important), sync_knowledge_base batch delete limit");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 03a0e904386c28a896f74b402dfe86344faab140
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 17:49:53 2026 +0300

    DEPLOY: v0.20.201 - fix: EyeLoader visibility, spectral glints pipeline, remove old CSS eye

diff --git a/index.html b/index.html
index dc465ad..2135a2d 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.200 - feat: PII sanitization pipeline, repomix config, perf optimizations LightingManager/HologramRenderer");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.201 - fix: EyeLoader visibility, spectral glints pipeline, remove old CSS eye");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -449,8 +449,8 @@
   <video id="camera-view" autoplay playsinline style="display: none;"></video>
   <canvas id="previewCanvas" style="display: none;"></canvas>
 
-  <!-- Прелоадер -->
-  <div id="loading-spinner"><div class="eye-loader"><div class="eye-loader-inner"></div></div></div>
+  <!-- Прелоадер (EyeLoader canvas replaces legacy CSS spinner) -->
+  <div id="loading-spinner" style="display:none"></div>
 
   <!-- Toggle Panels Button -->
   <button id="togglePanelsButton" class="control-button" title="Скрыть панели">

commit cd81ae503065cabbbb988419278e632d9aca72b8
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 16:39:15 2026 +0300

    DEPLOY: v0.20.200 - feat: PII sanitization pipeline, repomix config, perf optimizations LightingManager/HologramRenderer

diff --git a/index.html b/index.html
index ec8a7e3..dc465ad 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.199 - fix: resolve right grid freeze (NaN) and restore glint directionality v0.20.199");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.200 - feat: PII sanitization pipeline, repomix config, perf optimizations LightingManager/HologramRenderer");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit e7bedd7c9cbfdc62b3575c8059f3a5f37bf10a06
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 00:38:21 2026 +0300

    DEPLOY: v0.20.199 - fix: resolve right grid freeze (NaN) and restore glint directionality v0.20.199

diff --git a/index.html b/index.html
index 21dc213..ec8a7e3 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.198 - fix: hard reset audio worklet and boost glint intensity v0.20.198");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.199 - fix: resolve right grid freeze (NaN) and restore glint directionality v0.20.199");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 75b260b2d2fb08e7d86425765fe1884d1fbb721c
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 00:24:43 2026 +0300

    DEPLOY: v0.20.198 - fix: hard reset audio worklet and boost glint intensity v0.20.198

diff --git a/index.html b/index.html
index 80db5bf..21dc213 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.197 - fix: AstraDB connection protocol and RAG service sync");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.198 - fix: hard reset audio worklet and boost glint intensity v0.20.198");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit e9d5095aa1a4a71dedcdc7ccd693036f322bcf61
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 00:15:22 2026 +0300

    DEPLOY: v0.20.197 - fix: AstraDB connection protocol and RAG service sync

diff --git a/index.html b/index.html
index a7f7bbd..80db5bf 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.196 - fix: reset audio worklet correctly on stop to prevent data stall v0.20.196");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.197 - fix: AstraDB connection protocol and RAG service sync");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 5dfbac745dfe930a812743f9958c480e80050b2e
Author: NeuroCoder <neorh@holograms.media>
Date:   Tue Mar 24 00:03:22 2026 +0300

    DEPLOY: v0.20.196 - fix: reset audio worklet correctly on stop to prevent data stall v0.20.196

diff --git a/index.html b/index.html
index 8fd22d7..a7f7bbd 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.195 - fix: debug lighting manager data flow v0.20.195");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.196 - fix: reset audio worklet correctly on stop to prevent data stall v0.20.196");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 3e34a493a536af5e2dfc7192929b5a5fa94656fd
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 23:55:03 2026 +0300

    DEPLOY: v0.20.195 - fix: debug lighting manager data flow v0.20.195

diff --git a/index.html b/index.html
index d1d5d62..8fd22d7 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.194 - fix: remove glassSpecularManager call from HologramRenderer to prevent crash v0.20.194");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.195 - fix: debug lighting manager data flow v0.20.195");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit f22133c4ee17a4354ca50e28274a596aa6c74523
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 23:39:57 2026 +0300

    DEPLOY: v0.20.194 - fix: remove glassSpecularManager call from HologramRenderer to prevent crash v0.20.194

diff --git a/index.html b/index.html
index d5869d8..d1d5d62 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.193 - fix: add init method to GlassSpecularManager to prevent startup crash v0.20.193");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.194 - fix: remove glassSpecularManager call from HologramRenderer to prevent crash v0.20.194");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 99ca6f8a6273f88ebad43a8b78478616a5adae11
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 23:30:02 2026 +0300

    DEPLOY: v0.20.193 - fix: add init method to GlassSpecularManager to prevent startup crash v0.20.193

diff --git a/index.html b/index.html
index d8939b8..d5869d8 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.192 - fix: resolve LightingManager duplication and syntax error v0.20.192");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.193 - fix: add init method to GlassSpecularManager to prevent startup crash v0.20.193");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 2c6de8c2b85eebdd4a53409c10d31bca5d030d49
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 23:17:04 2026 +0300

    DEPLOY: v0.20.192 - fix: resolve LightingManager duplication and syntax error v0.20.192

diff --git a/index.html b/index.html
index 52a3edc..d8939b8 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.191 - fix: visual regressions (Hologram crash, Eye visibility, Tooltips) v0.20.191");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.192 - fix: resolve LightingManager duplication and syntax error v0.20.192");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 027d79e525a4753fb65bc7fccf2066c8cbd72741
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 23:08:16 2026 +0300

    DEPLOY: v0.20.191 - fix: visual regressions (Hologram crash, Eye visibility, Tooltips) v0.20.191

diff --git a/index.html b/index.html
index 10ede60..52a3edc 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.190 - fix: style.css encoding and unified scrollbars v0.20.186");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.191 - fix: visual regressions (Hologram crash, Eye visibility, Tooltips) v0.20.191");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -243,7 +243,7 @@
           <path
             d="M320-280v-23q0-44 44-70.5T480-400q72 0 116 26.5t44 70.5v23H320Zm160-160q-33 0-56.5-23.5T400-520q0-33 23.5-56.5T480-600q33 0 56.5 23.5T560-520q0 33-23.5 56.5T480-440ZM120-592v306q14 13 34 22.5t46 14.5v-317q-22-5-42.5-11.5T120-592Zm720-1q-17 8-37 14.5T760-567v318q26-5 46-14.5t34-22.5v-307ZM280-154q-115-14-177.5-47T40-280v-400q0-57 113.5-88T480-799q213 0 326.5 31T920-680v400q0 46-62.5 79T680-154v-480q51-8 90.5-19.5T827-676q-43-17-147-30.5T480-720q-96 0-200 13.5T133-676q17 12 56.5 23t90.5 19v480ZM120-592v343-343Zm720-1v344-344Z" />
         </svg></button>
-      <button id="synthButton" class="control-button panel-button" title="Жестовый синтезатор">
+      <button id="synthButton" class="control-button panel-button" data-tooltip="Жестовый синтезатор">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
           <path
             d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z" />
@@ -251,18 +251,18 @@
       </button>
       <!-- myGesturesButton hidden per previous instructions, keeping cleaner layout -->
 
-      <button id="scanButton" class="control-button panel-button" title="Сканировать голограмму"><svg
+      <button id="scanButton" class="control-button panel-button" data-tooltip="Сканировать голограмму"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M40-120v-200h80v120h120v80H40Zm680 0v-80h120v-120h80v200H720ZM160-240v-480h80v480h-80Zm120 0v-480h40v480h-40Zm120 0v-480h80v480h-80Zm120 0v-480h120v480H520Zm160 0v-480h40v480h-40Zm80 0v-480h40v480h-40ZM40-640v-200h200v80H120v120H40Zm800 0v-120H720v-80h200v200h-80Z" />
         </svg></button>
-      <button id="bluetoothButton" class="control-button panel-button" title="Эхолокация"><svg
+      <button id="bluetoothButton" class="control-button panel-button" data-tooltip="Эхолокация"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M440-80v-304L256-200l-56-56 224-224-224-224 56-56 184 184v-304h40l228 228-172 172 172 172L480-80h-40Zm80-496 76-76-76-74v150Zm0 342 76-74-76-76v150Z" />
         </svg></button>
 
-      <button id="triaButton" class="control-button panel-button" title="Обучение Триа">
+      <button id="triaButton" class="control-button panel-button" data-tooltip="Обучение Триа">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z" />

commit 283bcb12392ae714742eb337165a65a723bec8dc
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 22:59:29 2026 +0300

    DEPLOY: v0.20.190 - fix: style.css encoding and unified scrollbars v0.20.186

diff --git a/index.html b/index.html
index bd8c4ea..10ede60 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.189 - feat: BasilaQ-128 spectral glints - 7 color zones with panX and HSL colors from Semitones_Angles.md");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.190 - fix: style.css encoding and unified scrollbars v0.20.186");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 7fc9fe061fac5c0af7d4ed059ffe9785f4f4bb4d
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 15:18:49 2026 +0300

    DEPLOY: v0.20.189 - feat: BasilaQ-128 spectral glints - 7 color zones with panX and HSL colors from Semitones_Angles.md

diff --git a/index.html b/index.html
index 375c8c0..bd8c4ea 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.188 - fix: critical - hologram disappear bug, EyeLoader visibility, Gemini migration script");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.189 - feat: BasilaQ-128 spectral glints - 7 color zones with panX and HSL colors from Semitones_Angles.md");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 9cc9903c7893c2a52858c9a651eba3828e6251ba
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 14:03:01 2026 +0300

    DEPLOY: v0.20.188 - fix: critical - hologram disappear bug, EyeLoader visibility, Gemini migration script

diff --git a/index.html b/index.html
index dd0682e..375c8c0 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.187 - Phase 20.9.10: Spectral glints fix, Glass tooltips, EyeLoader grayscale, Gemini Embedding 2 migration");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.188 - fix: critical - hologram disappear bug, EyeLoader visibility, Gemini migration script");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit c61921d3d60384ac9882584acdef1ed1eac7748d
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 13:45:29 2026 +0300

    DEPLOY: v0.20.187 - Phase 20.9.10: Spectral glints fix, Glass tooltips, EyeLoader grayscale, Gemini Embedding 2 migration

diff --git a/index.html b/index.html
index c815337..dd0682e 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.186 - fix: style.css encoding repair v0.20.190");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.187 - Phase 20.9.10: Spectral glints fix, Glass tooltips, EyeLoader grayscale, Gemini Embedding 2 migration");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit f8afba9e582fcd46eff95c64dcfb64f0e01e2e4c
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 12:40:50 2026 +0300

    DEPLOY: v0.20.186 - fix: style.css encoding repair v0.20.190

diff --git a/index.html b/index.html
index 3202d9c..c815337 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.185 - fix: AstraDB protocol and unified UI v0.20.189");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.186 - fix: style.css encoding repair v0.20.190");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 650e5f9dd356640e150af5077c1f570b2ea2a5a7
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 02:03:02 2026 +0300

    DEPLOY: v0.20.185 - fix: AstraDB protocol and unified UI v0.20.189

diff --git a/index.html b/index.html
index bcb2fde..3202d9c 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.184 - fix: AstraDB RAG recovery and chat UX polish v0.20.188");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.185 - fix: AstraDB protocol and unified UI v0.20.189");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit fc534718699c3431896a0b14877636fec134df30
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 01:42:52 2026 +0300

    DEPLOY: v0.20.184 - fix: AstraDB RAG recovery and chat UX polish v0.20.188

diff --git a/index.html b/index.html
index ce44318..bcb2fde 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.183 - fix: Tria brain activation and UI glints v0.20.187");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.184 - fix: AstraDB RAG recovery and chat UX polish v0.20.188");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit fca7b94afde5ba219f4692d3dba2d934f65b14f4
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 01:23:44 2026 +0300

    DEPLOY: v0.20.183 - fix: Tria brain activation and UI glints v0.20.187

diff --git a/index.html b/index.html
index 7ea9f65..ce44318 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.182 - fix: UI layout, chat spacing and model select v0.20.186");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.183 - fix: Tria brain activation and UI glints v0.20.187");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 04d39cb007fe4174ae010311fd08c119dd64e497
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 00:59:46 2026 +0300

    DEPLOY: v0.20.182 - fix: UI layout, chat spacing and model select v0.20.186

diff --git a/index.html b/index.html
index aeffbad..7ea9f65 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.181 - fix: rollback to stable v0.20.180 and apply minimal P0 fixes");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.182 - fix: UI layout, chat spacing and model select v0.20.186");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -238,27 +238,19 @@
             d="M320-120v-120H200v-80h200v200h-80Zm320 0v-200h200v80H720v120h-80ZM200-640v-120h120v-80H120v200h80Zm440 0v-80h120v-120h80v200H640Z" />
         </svg>
       </button>
-      <button id="xrModeButton" class="control-button panel-button" data-tooltip="XR-режим"><svg
+      <button id="xrButton" class="control-button panel-button" data-tooltip="XR-режим"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M320-280v-23q0-44 44-70.5T480-400q72 0 116 26.5t44 70.5v23H320Zm160-160q-33 0-56.5-23.5T400-520q0-33 23.5-56.5T480-600q33 0 56.5 23.5T560-520q0 33-23.5 56.5T480-440ZM120-592v306q14 13 34 22.5t46 14.5v-317q-22-5-42.5-11.5T120-592Zm720-1q-17 8-37 14.5T760-567v318q26-5 46-14.5t34-22.5v-307ZM280-154q-115-14-177.5-47T40-280v-400q0-57 113.5-88T480-799q213 0 326.5 31T920-680v400q0 46-62.5 79T680-154v-480q51-8 90.5-19.5T827-676q-43-17-147-30.5T480-720q-96 0-200 13.5T133-676q17 12 56.5 23t90.5 19v480ZM120-592v343-343Zm720-1v344-344Z" />
         </svg></button>
-      <button id="myGesturesButton" class="control-button panel-button" data-tooltip="Мои жесты"><svg
-          xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
-          <path
-            d="M527-640 303-807q-14-10-16-26t8-30q10-14 26-16.5t30 7.5l224 168-48 64Zm-153-64-36 37q-5 5-9.5 10.5T320-645l-57-42q-14-10-16-26t8-30q10-14 26-16t30 8l63 47Zm284 123Zm85-48L439-856q-14-10-16.5-26t7.5-30q10-14 26-16t30 8l196 146 9-69q3-24 19-41t39-21l40-6 94 316q8 27 3 55t-22 51l-85 113q-2-24-10.5-46.5T746-465l54-72q6-8 7-17t-1-18l-48-163-15 106Zm-473 96-14-10q-14-10-16.5-26t7.5-30q10-14 26-16t30 8l1 1q-5 18-3.5 36.5T308-533h-38ZM80-280q-17 0-28.5-11.5T40-320q0-17 11.5-28.5T80-360h280v80H80Zm40 120q-17 0-28.5-11.5T80-200q0-17 11.5-28.5T120-240h240v80H120Zm80 120q-17 0-28.5-11.5T160-80q0-17 11.5-28.5T200-120h400q17 0 28.5-11.5T640-160v-200q0-10-4-18t-12-14L488-494l52 94H160q-17 0-28.5-11.5T120-440q0-17 11.5-28.5T160-480h244l-34-60q-12-21-9.5-44.5T380-625l28-28 264 197q23 17 35.5 42t12.5 54v200q0 50-35 85t-85 35H200Zm281-223Z" />
-        </svg></button>
       <button id="synthButton" class="control-button panel-button" title="Жестовый синтезатор">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
           <path
             d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z" />
         </svg>
       </button>
-      <button id="myHologramsButton" class="control-button panel-button" data-tooltip="Мои голограммы"><svg
-          xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
-          <path
-            d="M440-181 240-296q-19-11-29.5-29T200-365v-230q0-22 10.5-40t29.5-29l200-115q19-11 40-11t40 11l200 115q19 11 29.5 29t10.5 40v230q0 22-10.5 40T720-296L520-181q-19 11-40 11t-40-11Zm0-92v-184l-160-93v185l160 92Zm80 0 160-92v-185l-160 93v184ZM80-680v-120q0-33 23.5-56.5T160-880h120v80H160v120H80ZM280-80H160q-33 0-56.5-23.5T80-160v-120h80v120h120v80Zm400 0v-80h120v-120h80v200H680Zm120-600v-120H680v-80h120q33 0 56.5 23.5T880-800v120h-80ZM480-526l158-93-158-91-158 91 158 93Zm0 45Zm0-45Zm40 69Zm-80 0Z" />
-        </svg></button>
+      <!-- myGesturesButton hidden per previous instructions, keeping cleaner layout -->
+
       <button id="scanButton" class="control-button panel-button" title="Сканировать голограмму"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
@@ -269,6 +261,7 @@
           <path
             d="M440-80v-304L256-200l-56-56 224-224-224-224 56-56 184 184v-304h40l228 228-172 172 172 172L480-80h-40Zm80-496 76-76-76-74v150Zm0 342 76-74-76-76v150Z" />
         </svg></button>
+
       <button id="triaButton" class="control-button panel-button" title="Обучение Триа">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
@@ -390,12 +383,11 @@
            <!-- Icon removed -->
         </button>
         
-        <div id="modelSelectContainer" style="flex-grow: 1; display: flex; align-items: center;">
+        <div id="modelSelectContainer" style="flex-grow: 1; display: flex; align-items: center;" data-tooltip="Выбор модели">
           <select id="modelSelect"
             style="width: 100%; background: rgba(0,0,0,0.6); color: #ccc; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; outline: none; font-size: 14px; cursor: pointer; padding: 6px 10px; backdrop-filter: blur(10px);">
             <option value="gemini/gemini-3-flash" style="background: #1a1a1a; color: #ddd;">Gemini 3 Flash</option>
-            <option value="mistral/mistral-large-latest" style="background: #1a1a1a; color: #ddd;">Mistral Large 3
-            </option>
+            <option value="mistral/mistral-large-latest" style="background: #1a1a1a; color: #ddd;">Mistral Small 4</option>
           </select>
         </div>
         <!-- Кнопка отправить (видима в режиме чата) -->

commit 1755d3c6fbb25cd9fcba65074482bf2a56e32f9c
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 00:42:43 2026 +0300

    DEPLOY: v0.20.181 - fix: rollback to stable v0.20.180 and apply minimal P0 fixes

diff --git a/index.html b/index.html
index 9397abd..aeffbad 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.180 - fix: remove invalid CSS syntax causing build failure");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.181 - fix: rollback to stable v0.20.180 and apply minimal P0 fixes");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 469c572343a303fd2507f6c80f1cea05fd82793a
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 23 00:42:41 2026 +0300

    fix: rollback to stable v0.20.180 and apply minimal P0 fixes

diff --git a/index.html b/index.html
index febb2dc..9397abd 100644
--- a/index.html
+++ b/index.html
@@ -359,6 +359,7 @@
         <div id="chatMessages">
           <!-- Legacy loadingIndicator removed in favor of EyeLoader.js -->
           <div id="conversations"></div>
+          <div id="loadingIndicator" style="display:none;"><span>...</span></div>
           <!-- Сюда будут добавляться сообщения чата -->
         </div>
       </div>

commit c4139fdce56afd60fab76aca62b2fa6dea73844e
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 22 21:09:03 2026 +0300

    DEPLOY: v0.20.180 - fix: remove invalid CSS syntax causing build failure

diff --git a/index.html b/index.html
index bb08873..febb2dc 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.179 - fix: deploy script NaN bug, Tria version format");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.180 - fix: remove invalid CSS syntax causing build failure");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit c38aeff02e1711e37b468b3ec4f822887853e9f9
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 22 20:51:41 2026 +0300

    DEPLOY: v0.20.179 - fix: deploy script NaN bug, Tria version format

diff --git a/index.html b/index.html
index ccab6ce..bb08873 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: NaN.20.178 - fix: chatMessages import, UI polish (icons, tooltip, tria spark)");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.179 - fix: deploy script NaN bug, Tria version format");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -407,7 +407,7 @@
     </div>
     <div id="triaVersionLabelContainer" class="tria-version-footer" style="text-align: right; width: 100%;">
       <span style="color: #666; font-size: 10px; font-weight: normal; margin-right: 0;">
-        <span id="triaVersion">TRIA: v0.03</span>
+        <span id="triaVersion">TRIA: v0.003</span>
       </span>
     </div>
   </div>

commit bdd0dfcdf4abbd77bf7cade73a3a33f9d32c7a56
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 22 20:17:28 2026 +0300

    DEPLOY: vNaN.20.178 - fix: chatMessages import, UI polish (icons, tooltip, tria spark)

diff --git a/index.html b/index.html
index 735490e..ccab6ce 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.175 - Phase 20.9.2: Liquid Glass & Spectral Optics");</script>
+  <script>console.log("DEPLOY VERSION: NaN.20.178 - fix: chatMessages import, UI polish (icons, tooltip, tria spark)");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit fdf7516860787d0c3d6a07a02e85d56058f6071c
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 22 20:17:18 2026 +0300

    fix: chatMessages import, UI polish (icons, tooltip, tria spark)

diff --git a/index.html b/index.html
index cebad59..735490e 100644
--- a/index.html
+++ b/index.html
@@ -296,7 +296,7 @@
           <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
         </svg>
       </a>
-      <button id="treasuryButton" class="control-button" title="Кастодиан (Custodian) Obolos">
+      <button id="treasuryButton" class="control-button" title="Кастодиан">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z"/></svg>
       </button>
       <button id="installPwaButton" class="control-button" title="Установить">

commit d48be9a41e58254a40a0c687c4e8cd7aa9842a6d
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 22 16:57:50 2026 +0300

    feat(ui): refactor right panel with tabs (Chat, Gestures, Holograms, Versions)
    
    - Hide legacy buttons in left panel.
    
    - Implement tabbed interface in right panel.
    
    - Rewrite RightPanelManager.js to handle view switching.

diff --git a/index.html b/index.html
index aecb905..cebad59 100644
--- a/index.html
+++ b/index.html
@@ -326,27 +326,36 @@
 
   <!-- Правая панель: Таймлайн и Промпт -->
   <div id="right-panel" class="panel right-panel">
-    <!-- Header for panel views -->
-    <div id="rightPanelHeader">ЧАТ</div>
+    <!-- Header replaced by Tabs -->
+    <div class="right-panel-tabs">
+        <button class="rp-tab active" data-view="chat">ЧАТ</button>
+        <button class="rp-tab" data-view="gestures">ЖЕСТЫ</button>
+        <button class="rp-tab" data-view="holograms">ГОЛОГРАММЫ</button>
+        <button class="rp-tab" data-view="versions">ВЕРСИИ</button>
+    </div>
 
     <!-- Верхняя разделительная линия правой панели -->
-    <hr class="panel-hr" style="flex-shrink: 0; margin-top: 5px !important; margin-bottom: 0 !important;">
+    <hr class="panel-hr" style="flex-shrink: 0; margin-top: 0px !important; margin-bottom: 0 !important;">
 
     <!-- Контейнер для содержимого - переключаемые области -->
     <div class="content-container" style="flex: 1; overflow-y: auto; padding-top: 10px;">
-      <!-- Таймлайн (Режим по умолчанию) -->
-      <div id="versionTimeline" class="panel-section default-mode" style="display: none;">
+      <!-- Таймлайн (Режим Versions) -->
+      <div id="versionTimeline" class="panel-section right-panel-view" style="display: none;">
         <div id="versionFrames"></div>
       </div>
 
-      <!-- История чата с Триа (Режим чата) -->
+      <!-- Список жестов (Режим Gestures) -->
       <div id="myGesturesView" class="right-panel-view" style="display: none;">
         <!-- Сюда будет добавляться список жестов -->
       </div>
+
+      <!-- Список голограмм (Режим Holograms) -->
       <div id="myHologramsView" class="right-panel-view" style="display: none;">
         <!-- Сюда будет добавляться список голограмм -->
       </div>
-      <div id="chatHistory" class="panel-section chat-mode" style="display: none;">
+
+      <!-- История чата с Триа (Режим Chat - Default) -->
+      <div id="chatHistory" class="panel-section right-panel-view chat-mode" style="display: block;">
         <div id="chatMessages">
           <!-- Legacy loadingIndicator removed in favor of EyeLoader.js -->
           <div id="conversations"></div>
@@ -360,13 +369,13 @@
 
     <!-- Контейнер для ввода - переключаемые области -->
     <div class="input-container">
-      <!-- Поле ввода промпта (Режим по умолчанию) -->
-      <div id="promptBar" class="panel-section default-mode" style="display: none;">
+      <!-- Поле ввода промпта (Режим Versions) -->
+      <div id="promptBar" class="panel-section right-panel-view" style="display: none;">
         <textarea id="topPromptInput" rows="3" placeholder="Что бы вы хотели изменить?"></textarea>
       </div>
 
-      <!-- Поле ввода чата (Режим чата) -->
-      <div id="chatInputBar" class="panel-section chat-mode">
+      <!-- Поле ввода чата (Режим Chat) -->
+      <div id="chatInputBar" class="panel-section right-panel-view chat-mode" style="display: block;">
         <textarea id="chatInput" rows="3" placeholder="Введите сообщение для Триа ..."></textarea>
       </div>
     </div>
@@ -375,13 +384,11 @@
     <div class="controls-container">
       <div class="prompt-controls"
         style="display: flex; flex-direction: row; align-items: center; width: 100%; gap: 10px;">
-        <button id="promptModeButton" class="control-button" title="Промпт" style="flex-shrink: 0;">
-          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
-            fill="currentColor">
-            <path
-              d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm140-40-56-56 103-104-104-104 57-56 160 160-160 160Zm180 0v-80h240v80H480Z" />
-          </svg>
+        <!-- Legacy Prompt Mode Button Hidden -->
+        <button id="promptModeButton" class="control-button" style="display: none !important;">
+           <!-- Icon removed -->
         </button>
+        
         <div id="modelSelectContainer" style="flex-grow: 1; display: flex; align-items: center;">
           <select id="modelSelect"
             style="width: 100%; background: rgba(0,0,0,0.6); color: #ccc; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; outline: none; font-size: 14px; cursor: pointer; padding: 6px 10px; backdrop-filter: blur(10px);">

commit 840aa05adcb144ee771a737716c8e699aec422ef
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 22 00:18:21 2026 +0300

    DEPLOY: v0.20.175 - Phase 20.9.2: Liquid Glass & Spectral Optics

diff --git a/index.html b/index.html
index 9281eb8..aecb905 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.174 - v0.20.174 — Phase 20.9.1: CORS Fix + EyeLoader 2.1 + Sync 5vh + Prank Ironclad");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.175 - Phase 20.9.2: Liquid Glass & Spectral Optics");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -275,7 +275,7 @@
             d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z" />
         </svg>
       </button>
-      <button id="chatModeButton" class="control-button panel-button" data-tooltip="Чатрумы">
+      <button id="hubButton" class="control-button panel-button" data-tooltip="Чатрумы">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M155-75q-35-35-35-85t35-85q35-35 85-35 14 0 26 3t23 8l57-71q-28-31-39-70t-5-78l-81-27q-17 25-43 40t-58 15q-50 0-85-35T0-580q0-50 35-85t85-35q50 0 85 35t35 85v8l81 28q20-36 53.5-61t75.5-32v-87q-39-11-64.5-42.5T360-840q0-50 35-85t85-35q50 0 85 35t35 85q0 42-26 73.5T510-724v87q42 7 75.5 32t53.5 61l81-28v-8q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-32 0-58.5-15T739-515l-81 27q6 39-5 77.5T614-340l57 70q11-5 23-7.5t26-2.5q50 0 85 35t35 85q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-20 6.5-38.5T624-232l-57-71q-41 23-87.5 23T392-303l-56 71q11 15 17.5 33.5T360-160q0 50-35 85t-85 35q-50 0-85-35Zm-35-465q17 0 28.5-11.5T160-580q0-17-11.5-28.5T120-620q-17 0-28.5 11.5T80-580q0 17 11.5 28.5T120-540Zm148.5 408.5Q280-143 280-160t-11.5-28.5Q257-200 240-200t-28.5 11.5Q200-177 200-160t11.5 28.5Q223-120 240-120t28.5-11.5Zm240-680Q520-823 520-840t-11.5-28.5Q497-880 480-880t-28.5 11.5Q440-857 440-840t11.5 28.5Q463-800 480-800t28.5-11.5ZM480-360q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm268.5 228.5Q760-143 760-160t-11.5-28.5Q737-200 720-200t-28.5 11.5Q680-177 680-160t11.5 28.5Q703-120 720-120t28.5-11.5Zm120-420Q880-563 880-580t-11.5-28.5Q857-620 840-620t-28.5 11.5Q800-597 800-580t11.5 28.5Q823-540 840-540t28.5-11.5ZM480-840ZM120-580Zm360 120Zm360-120ZM240-160Zm480 0Z"/></svg>
       </button>
       <!-- The existing left-panel-icon-group and telegramLinkButton will be moved/restructured -->
@@ -296,7 +296,7 @@
           <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
         </svg>
       </a>
-      <button id="treasuryButton" class="control-button" title="Казначейство Obolos">
+      <button id="treasuryButton" class="control-button" title="Кастодиан (Custodian) Obolos">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z"/></svg>
       </button>
       <button id="installPwaButton" class="control-button" title="Установить">
@@ -465,7 +465,7 @@
   <div id="treasury-modal" class="modal">
     <div class="modal-content" style="max-width:380px;">
       <span class="close" onclick="document.getElementById('treasury-modal').classList.remove('active')">&times;</span>
-      <h2 style="text-align:center;font-size:1.3em;">&#127963; Казначейство Obolos</h2>
+      <h2 id="treasury-modal-title">Кастодиан (Custodian) Obolos</h2>
       <div style="text-align:center;padding:20px 0;">
         <div id="obolos-balance" style="font-size:2.4em;font-weight:bold;color:#00ff88;text-shadow:0 0 15px rgba(0,255,136,0.4);">0.000000</div>
         <div style="font-size:0.85em;color:#888;margin-top:6px;">Базовый токен • Дробление: 10<sup>-6</sup></div>

commit eab470e99dddcc7b3da25234ea5c29bc70b281ed
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 22:56:34 2026 +0300

    DEPLOY: v0.20.174 - v0.20.174 — Phase 20.9.1: CORS Fix + EyeLoader 2.1 + Sync 5vh + Prank Ironclad

diff --git a/index.html b/index.html
index c10c818..9281eb8 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.173 - v0.20.173 — EyeLoader 2.0 + Portal + Reload Prank");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.174 - v0.20.174 — Phase 20.9.1: CORS Fix + EyeLoader 2.1 + Sync 5vh + Prank Ironclad");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -238,12 +238,12 @@
             d="M320-120v-120H200v-80h200v200h-80Zm320 0v-200h200v80H720v120h-80ZM200-640v-120h120v-80H120v200h80Zm440 0v-80h120v-120h80v200H640Z" />
         </svg>
       </button>
-      <button id="xrButton" class="control-button panel-button" title="VR/AR режим"><svg
+      <button id="xrModeButton" class="control-button panel-button" data-tooltip="XR-режим"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M320-280v-23q0-44 44-70.5T480-400q72 0 116 26.5t44 70.5v23H320Zm160-160q-33 0-56.5-23.5T400-520q0-33 23.5-56.5T480-600q33 0 56.5 23.5T560-520q0 33-23.5 56.5T480-440ZM120-592v306q14 13 34 22.5t46 14.5v-317q-22-5-42.5-11.5T120-592Zm720-1q-17 8-37 14.5T760-567v318q26-5 46-14.5t34-22.5v-307ZM280-154q-115-14-177.5-47T40-280v-400q0-57 113.5-88T480-799q213 0 326.5 31T920-680v400q0 46-62.5 79T680-154v-480q51-8 90.5-19.5T827-676q-43-17-147-30.5T480-720q-96 0-200 13.5T133-676q17 12 56.5 23t90.5 19v480ZM120-592v343-343Zm720-1v344-344Z" />
         </svg></button>
-      <button id="gestureRecordButton" class="control-button panel-button" title="Ваши жесты"><svg
+      <button id="myGesturesButton" class="control-button panel-button" data-tooltip="Мои жесты"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M527-640 303-807q-14-10-16-26t8-30q10-14 26-16.5t30 7.5l224 168-48 64Zm-153-64-36 37q-5 5-9.5 10.5T320-645l-57-42q-14-10-16-26t8-30q10-14 26-16t30 8l63 47Zm284 123Zm85-48L439-856q-14-10-16.5-26t7.5-30q10-14 26-16t30 8l196 146 9-69q3-24 19-41t39-21l40-6 94 316q8 27 3 55t-22 51l-85 113q-2-24-10.5-46.5T746-465l54-72q6-8 7-17t-1-18l-48-163-15 106Zm-473 96-14-10q-14-10-16.5-26t7.5-30q10-14 26-16t30 8l1 1q-5 18-3.5 36.5T308-533h-38ZM80-280q-17 0-28.5-11.5T40-320q0-17 11.5-28.5T80-360h280v80H80Zm40 120q-17 0-28.5-11.5T80-200q0-17 11.5-28.5T120-240h240v80H120Zm80 120q-17 0-28.5-11.5T160-80q0-17 11.5-28.5T200-120h400q17 0 28.5-11.5T640-160v-200q0-10-4-18t-12-14L488-494l52 94H160q-17 0-28.5-11.5T120-440q0-17 11.5-28.5T160-480h244l-34-60q-12-21-9.5-44.5T380-625l28-28 264 197q23 17 35.5 42t12.5 54v200q0 50-35 85t-85 35H200Zm281-223Z" />
@@ -254,7 +254,7 @@
             d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z" />
         </svg>
       </button>
-      <button id="hologramListButton" class="control-button panel-button" title="Ваши голограммы"><svg
+      <button id="myHologramsButton" class="control-button panel-button" data-tooltip="Мои голограммы"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M440-181 240-296q-19-11-29.5-29T200-365v-230q0-22 10.5-40t29.5-29l200-115q19-11 40-11t40 11l200 115q19 11 29.5 29t10.5 40v230q0 22-10.5 40T720-296L520-181q-19 11-40 11t-40-11Zm0-92v-184l-160-93v185l160 92Zm80 0 160-92v-185l-160 93v184ZM80-680v-120q0-33 23.5-56.5T160-880h120v80H160v120H80ZM280-80H160q-33 0-56.5-23.5T80-160v-120h80v120h120v80Zm400 0v-80h120v-120h80v200H680Zm120-600v-120H680v-80h120q33 0 56.5 23.5T880-800v120h-80ZM480-526l158-93-158-91-158 91 158 93Zm0 45Zm0-45Zm40 69Zm-80 0Z" />
@@ -275,7 +275,7 @@
             d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z" />
         </svg>
       </button>
-      <button id="hubButton" class="control-button panel-button" title="Чатрумы / Созвон">
+      <button id="chatModeButton" class="control-button panel-button" data-tooltip="Чатрумы">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M155-75q-35-35-35-85t35-85q35-35 85-35 14 0 26 3t23 8l57-71q-28-31-39-70t-5-78l-81-27q-17 25-43 40t-58 15q-50 0-85-35T0-580q0-50 35-85t85-35q50 0 85 35t35 85v8l81 28q20-36 53.5-61t75.5-32v-87q-39-11-64.5-42.5T360-840q0-50 35-85t85-35q50 0 85 35t35 85q0 42-26 73.5T510-724v87q42 7 75.5 32t53.5 61l81-28v-8q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-32 0-58.5-15T739-515l-81 27q6 39-5 77.5T614-340l57 70q11-5 23-7.5t26-2.5q50 0 85 35t35 85q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-20 6.5-38.5T624-232l-57-71q-41 23-87.5 23T392-303l-56 71q11 15 17.5 33.5T360-160q0 50-35 85t-85 35q-50 0-85-35Zm-35-465q17 0 28.5-11.5T160-580q0-17-11.5-28.5T120-620q-17 0-28.5 11.5T80-580q0 17 11.5 28.5T120-540Zm148.5 408.5Q280-143 280-160t-11.5-28.5Q257-200 240-200t-28.5 11.5Q200-177 200-160t11.5 28.5Q223-120 240-120t28.5-11.5Zm240-680Q520-823 520-840t-11.5-28.5Q497-880 480-880t-28.5 11.5Q440-857 440-840t11.5 28.5Q463-800 480-800t28.5-11.5ZM480-360q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm268.5 228.5Q760-143 760-160t-11.5-28.5Q737-200 720-200t-28.5 11.5Q680-177 680-160t11.5 28.5Q703-120 720-120t28.5-11.5Zm120-420Q880-563 880-580t-11.5-28.5Q857-620 840-620t-28.5 11.5Q800-597 800-580t11.5 28.5Q823-540 840-540t28.5-11.5ZM480-840ZM120-580Zm360 120Zm360-120ZM240-160Zm480 0Z"/></svg>
       </button>
       <!-- The existing left-panel-icon-group and telegramLinkButton will be moved/restructured -->

commit 61b1b4a4146b51cba2973534428dc191fa24ab87
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 21:29:36 2026 +0300

    DEPLOY: v0.20.173 - v0.20.173 — EyeLoader 2.0 + Portal + Reload Prank

diff --git a/index.html b/index.html
index 3b96d1f..c10c818 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.172 - v0.20.172 — EyeLoader + Typing + Model fix + Skills");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.173 - v0.20.173 — EyeLoader 2.0 + Portal + Reload Prank");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -327,9 +327,7 @@
   <!-- Правая панель: Таймлайн и Промпт -->
   <div id="right-panel" class="panel right-panel">
     <!-- Header for panel views -->
-    <div id="rightPanelHeader"
-      style="text-align: center; color: #888888; margin: 2px 0 5px 0; font-size: 14px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">
-      ЧАТ</div>
+    <div id="rightPanelHeader">ЧАТ</div>
 
     <!-- Верхняя разделительная линия правой панели -->
     <hr class="panel-hr" style="flex-shrink: 0; margin-top: 5px !important; margin-bottom: 0 !important;">
@@ -350,7 +348,7 @@
       </div>
       <div id="chatHistory" class="panel-section chat-mode" style="display: none;">
         <div id="chatMessages">
-          <div id="loadingIndicator"><div class="eye-loader"><div class="eye-loader-inner"></div></div></div>
+          <!-- Legacy loadingIndicator removed in favor of EyeLoader.js -->
           <div id="conversations"></div>
           <!-- Сюда будут добавляться сообщения чата -->
         </div>

commit 2d95c5ee7ed75e1fb15f429f7faa0c958fae4e1c
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 19:01:52 2026 +0300

    DEPLOY: v0.20.172 - v0.20.172 — EyeLoader + Typing + Model fix + Skills

diff --git a/index.html b/index.html
index 0a6e24c..3b96d1f 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.171 - Phase 20.6: Streaming & Healthcheck fix [Distilled Skills]");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.172 - v0.20.172 — EyeLoader + Typing + Model fix + Skills");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -392,10 +392,6 @@
             </option>
           </select>
         </div>
-        <!-- Кнопка применить (видима в режиме по умолчанию) -->
-        <button id="submitTopPrompt" class="control-button default-mode" style="display: none; flex-shrink: 0;">
-          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
-        </button>
         <!-- Кнопка отправить (видима в режиме чата) -->
         <button id="submitChatMessage" class="chat-mode control-button" title="Отправить сообщение">
           <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">

commit 021091ad286957e563f2fe8351debb67d5e529df
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 15:12:47 2026 +0300

    DEPLOY: v0.20.171 - Phase 20.6: Streaming & Healthcheck fix [Distilled Skills]

diff --git a/index.html b/index.html
index c8bfb34..0a6e24c 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.170 - Phase 20.7: UX Refinement - Strict Headers, White Glow, Square Send Button, and Physics Fixes");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.171 - Phase 20.6: Streaming & Healthcheck fix [Distilled Skills]");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit bb943e07c32114d84ae2c71a3d43a2367ff20d82
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 14:23:14 2026 +0300

    DEPLOY: v0.20.170 - Phase 20.7: UX Refinement - Strict Headers, White Glow, Square Send Button, and Physics Fixes

diff --git a/index.html b/index.html
index fabbeed..c8bfb34 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.169 - Tria v0.03 - Deployment Protocol Refinement");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.170 - Phase 20.7: UX Refinement - Strict Headers, White Glow, Square Send Button, and Physics Fixes");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -393,10 +393,12 @@
           </select>
         </div>
         <!-- Кнопка применить (видима в режиме по умолчанию) -->
-        <button id="submitTopPrompt" class="default-mode" style="display: none; flex-shrink: 0;">Применить</button>
+        <button id="submitTopPrompt" class="control-button default-mode" style="display: none; flex-shrink: 0;">
+          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>
+        </button>
         <!-- Кнопка отправить (видима в режиме чата) -->
-        <button id="submitChatMessage" class="chat-mode glass-send-btn" title="Отправить сообщение">
-          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#E3E3E3">
+        <button id="submitChatMessage" class="chat-mode control-button" title="Отправить сообщение">
+          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
             <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
           </svg>
         </button>

commit 031c121749f8a06bdd2967b3d3e26e297ae5c37c
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 13:06:02 2026 +0300

    DEPLOY: v0.20.169 - Tria v0.03 - Deployment Protocol Refinement

diff --git a/index.html b/index.html
index 9cdebf1..fabbeed 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.168 - Hotfix: v0.20.168 - Final Mouse Glow for Panels");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.169 - Tria v0.03 - Deployment Protocol Refinement");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 5c85c7c437681ab6a69ffdf3f81a024ef31f6ec0
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 13:02:22 2026 +0300

    DEPLOY: v0.20.168 - Hotfix: v0.20.168 - Final Mouse Glow for Panels

diff --git a/index.html b/index.html
index e562583..9cdebf1 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.167 - Hotfix: v0.20.167 - Mouse Glow on Panels Fix");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.168 - Hotfix: v0.20.168 - Final Mouse Glow for Panels");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit 253177000ae06f0e501de6d69e559a4a3f69be33
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 13:01:53 2026 +0300

    DEPLOY: v0.20.167 - Hotfix: v0.20.167 - Mouse Glow on Panels Fix

diff --git a/index.html b/index.html
index ff7c428..e562583 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.166 - Final Polish: v0.20.166 - Mouse Glow and Header Alignment");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.167 - Hotfix: v0.20.167 - Mouse Glow on Panels Fix");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit cf18ab64a9b951f37044bb594aabd1c1ed3c3587
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 13:00:55 2026 +0300

    DEPLOY: v0.20.166 - Final Polish: v0.20.166 - Mouse Glow and Header Alignment

diff --git a/index.html b/index.html
index eef8ade..ff7c428 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.165 - Hotfix: v0.20.165 - Phase 20.6 Tria v0.03 Real-time Streaming & Premium UI Polish");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.166 - Final Polish: v0.20.166 - Mouse Glow and Header Alignment");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -328,7 +328,7 @@
   <div id="right-panel" class="panel right-panel">
     <!-- Header for panel views -->
     <div id="rightPanelHeader"
-      style="text-align: center; color: #888888; margin: 5px 0; font-size: 14px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">
+      style="text-align: center; color: #888888; margin: 2px 0 5px 0; font-size: 14px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">
       ЧАТ</div>
 
     <!-- Верхняя разделительная линия правой панели -->

commit 01c187cc2a0e1d9dc861ffc91cd03c69702d3f44
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 13:00:34 2026 +0300

    DEPLOY: v0.20.165 - Hotfix: v0.20.165 - Phase 20.6 Tria v0.03 Real-time Streaming & Premium UI Polish

diff --git a/index.html b/index.html
index 41a56f8..eef8ade 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.164 - Feature: v0.20.164 - Phase 20.5 Premium UI Polish");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.165 - Hotfix: v0.20.165 - Phase 20.6 Tria v0.03 Real-time Streaming & Premium UI Polish");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -404,7 +404,7 @@
     </div>
     <div id="triaVersionLabelContainer" class="tria-version-footer" style="text-align: right; width: 100%;">
       <span style="color: #666; font-size: 10px; font-weight: normal; margin-right: 0;">
-        TRIA VERSION: <span id="triaVersion">TRIA: v0.02</span>
+        <span id="triaVersion">TRIA: v0.03</span>
       </span>
     </div>
   </div>

commit 782329c2070535d0b7feb750eb913afb95530fba
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 21 01:25:29 2026 +0300

    DEPLOY: v0.20.164 - Feature: v0.20.164 - Phase 20.5 Premium UI Polish

diff --git a/index.html b/index.html
index 5da48b5..41a56f8 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.163 - Hotfix: v0.20.162 - Final Restored CSS and JS links");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.164 - Feature: v0.20.164 - Phase 20.5 Premium UI Polish");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -328,8 +328,8 @@
   <div id="right-panel" class="panel right-panel">
     <!-- Header for panel views -->
     <div id="rightPanelHeader"
-      style="text-align: center; color: #888888; margin-top: 10px; margin-bottom: 15px; font-size: 16px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">
-      ИСТОРИЯ ЧАТА</div>
+      style="text-align: center; color: #888888; margin: 5px 0; font-size: 14px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">
+      ЧАТ</div>
 
     <!-- Верхняя разделительная линия правой панели -->
     <hr class="panel-hr" style="flex-shrink: 0; margin-top: 5px !important; margin-bottom: 0 !important;">
@@ -404,7 +404,7 @@
     </div>
     <div id="triaVersionLabelContainer" class="tria-version-footer" style="text-align: right; width: 100%;">
       <span style="color: #666; font-size: 10px; font-weight: normal; margin-right: 0;">
-        TRIA VERSION: <span id="triaVersion">v0.01 (Gesture-LM)</span>
+        TRIA VERSION: <span id="triaVersion">TRIA: v0.02</span>
       </span>
     </div>
   </div>

commit a5a304f3cc7b0de4a3a99c1d0a731cee74764711
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 22:24:00 2026 +0300

    DEPLOY: v0.20.163 - Hotfix: v0.20.162 - Final Restored CSS and JS links

diff --git a/index.html b/index.html
index 5160540..5da48b5 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.162 - Hotfix: v0.20.162 - Restored CSS and JS links in index.html");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.163 - Hotfix: v0.20.162 - Final Restored CSS and JS links");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"

commit c71b2896967235ef43f4c561ac11d95111efa78f
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 22:18:28 2026 +0300

    DEPLOY: v0.20.162 - Hotfix: v0.20.162 - Restored CSS and JS links in index.html

diff --git a/index.html b/index.html
index 4098f28..5160540 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.161 - Hotfix: v0.20.161 - Restored Deploy Version Marker in index.html");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.162 - Hotfix: v0.20.162 - Restored CSS and JS links in index.html");</script>
   <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
@@ -75,6 +75,41 @@
   <meta property="og:type" content="website">
   <meta name="twitter:card" content="summary_large_image">
 
+  <link rel="stylesheet" href="style.css">
+  <link rel="stylesheet" href="/css/fontawesome.css">
+
+  <!-- Favicon and Manifest -->
+  <link rel="icon" type="image/x-icon" href="/favicon.ico">
+  <link rel="manifest" href="/manifest.json">
+  <meta name="theme-color" content="#121212">
+  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
+
+  <!-- Core Scripts -->
+  <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
+  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
+
+  <script type="application/ld+json">
+  {
+    "@context": "https://schema.org",
+    "@type": "SoftwareApplication",
+    "name": "Holograms.media",
+    "applicationCategory": "MultimediaApplication",
+    "operatingSystem": "Web, XR, AR, VR",
+    "description": "Экосистема смешанного сознания для жестового синтеза реальностей. Прокачка символьного мышления ИИ через несимвольный ввод: смысловые цепочки жестов преобразуются в векторные эмбеддинги аудиальной и визуальной среды.",
+    "keywords": "BasilaQ-128, Триа, XR, Голограммы, Смешанное сознание, Жестовый синтез, Несимвольное мышление, Тензорные эмбеддинги",
+    "softwareVersion": "1.18.7",
+    "author": {
+      "@type": "Organization",
+      "name": "NeuroCoderZ"
+    },
+    "mainEntityOfPage": {
+      "@type": "TechArticle",
+      "headline": "Протокол аудиального мышления Триа",
+      "description": "Переход от кнопочного и голосового интерфейса к прямому управлению реальностью через тензорные данные жестов. Интеграция биологического и цифрового разума."
+    }
+  }
+  </script>
+
   <meta http-equiv="Content-Security-Policy"
     content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: https://*.googleusercontent.com https://accounts.google.com; worker-src 'self' blob: https://cdnjs.cloudflare.com; connect-src 'self' https://holograms.media https://dev.holograms.media https://*.koyeb.app wss://*.koyeb.app wss://holograms.media wss://www.holograms.media ws://localhost:* http://localhost:* https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com https://api.github.com blob: data:; frame-src 'self' https://accounts.google.com;">
 

commit 5c5348fb19ea97244cb1fea2cb3c94360f754058
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 21:33:11 2026 +0300

    DEPLOY: v0.20.161 - Hotfix: v0.20.161 - Restored Deploy Version Marker in index.html

diff --git a/index.html b/index.html
index 4c16486..4098f28 100644
--- a/index.html
+++ b/index.html
@@ -6,6 +6,9 @@
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   <title>ГОЛОГРАФИЧЕСКИЕ МЕДИА | Holograms Media</title>
+  <!-- DEPLOY_VERSION_START -->
+  <script>console.log("DEPLOY VERSION: 0.20.161 - Hotfix: v0.20.161 - Restored Deploy Version Marker in index.html");</script>
+  <!-- DEPLOY_VERSION_END -->
   <script>
     // Глобальная функция-спасатель для кнопки "Принимаю"
     window.syncConsent = function () {

commit 097acaa718779e2fa2df2f4784017e96b850bace
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 21:32:52 2026 +0300

    DEPLOY: v0.20.160 - Hotfix: v0.20.160 - Resolving NameError and CSS unclosed block

diff --git a/index.html b/index.html
index 00da53e..4c16486 100644
--- a/index.html
+++ b/index.html
@@ -47,65 +47,23 @@
       }
     };
   </script>
+  <script type="importmap">
+  {
+    "imports": {
+      "three": "https://unpkg.com/three@0.165.0/build/three.module.js",
+      "three/examples/jsm/controls/OrbitControls.js": "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js",
+      "three/examples/jsm/lines/Line2.js": "https://unpkg.com/three@0.165.0/examples/jsm/lines/Line2.js",
+      "three/examples/jsm/lines/LineGeometry.js": "https://unpkg.com/three@0.165.0/examples/jsm/lines/LineGeometry.js",
+      "three/examples/jsm/lines/LineMaterial.js": "https://unpkg.com/three@0.165.0/examples/jsm/lines/LineMaterial.js",
+      "three/examples/jsm/renderers/webgpu/WebGPURenderer.js": "https://unpkg.com/three@0.165.0/examples/jsm/renderers/webgpu/WebGPURenderer.js"
+    }
+  }
+  </script>
   <script type="module">
     import * as THREE from 'three';
     window.THREE = THREE;
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
-  <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.159 - Evolution Phase 20.4: Supervisor Agent (Tool Calling) & Incremental RAG Implementation (Secrets Removed)");</script>
-  <!-- DEPLOY_VERSION_END -->
-
-
-
-  <link rel="stylesheet" href="style.css">
-  <!-- Font Awesome for icons (add if not already present) -->
-  <link rel="stylesheet" href="/css/fontawesome.css">
-
-  <!-- Favicon and Manifest -->
-  <link rel="icon" type="image/x-icon" href="/favicon.ico">
-  <link rel="manifest" href="/manifest.json">
-  <meta name="theme-color" content="#121212">
-  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
-
-  <!-- Core Scripts -->
-  <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
-  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
-  <!-- Main Script -->
-  <script type="application/ld+json">
-  {
-    "@context": "https://schema.org",
-    "@type": "SoftwareApplication",
-    "name": "Holograms.media",
-    "applicationCategory": "MultimediaApplication",
-    "operatingSystem": "Web, XR, AR, VR",
-    "description": "Экосистема смешанного сознания для жестового синтеза реальностей. Прокачка символьного мышления ИИ через несимвольный ввод: смысловые цепочки жестов преобразуются в векторные эмбеддинги аудиальной и визуальной среды.",
-    "keywords": "BasilaQ-128, Триа, XR, Голограммы, Смешанное сознание, Жестовый синтез, Несимвольное мышление, Тензорные эмбеддинги",
-    "softwareVersion": "1.18.7",
-    "author": {
-      "@type": "Organization",
-      "name": "NeuroCoderZ"
-    },
-    "mainEntityOfPage": {
-      "@type": "TechArticle",
-      "headline": "Протокол аудиального мышления Триа",
-      "description": "Переход от кнопочного и голосового интерфейса к прямому управлению реальностью через тензорные данные жестов. Интеграция биологического и цифрового разума."
-    }
-  }
-  </script>
-
-  <script type="importmap">
-{
-  "imports": {
-    "three": "https://unpkg.com/three@0.165.0/build/three.module.js",
-    "three/examples/jsm/controls/OrbitControls.js": "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js",
-    "three/examples/jsm/lines/Line2.js": "https://unpkg.com/three@0.165.0/examples/jsm/lines/Line2.js",
-    "three/examples/jsm/lines/LineGeometry.js": "https://unpkg.com/three@0.165.0/examples/jsm/lines/LineGeometry.js",
-    "three/examples/jsm/lines/LineMaterial.js": "https://unpkg.com/three@0.165.0/examples/jsm/lines/LineMaterial.js",
-    "three/examples/jsm/renderers/webgpu/WebGPURenderer.js": "https://unpkg.com/three@0.165.0/examples/jsm/renderers/webgpu/WebGPURenderer.js"
-  }
-}
-</script>
 
   <meta property="og:title" content="ГОЛОГРАФИЧЕСКИЕ МЕДИА">
   <meta property="og:description" content="Interactive 3D Audio Visualizations">

commit 6a36611d7796b4f090d5f9a7d9869cef491cff05
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 21:14:10 2026 +0300

    DEPLOY: v0.20.159 - Evolution Phase 20.4: Supervisor Agent (Tool Calling) & Incremental RAG Implementation (Secrets Removed)

diff --git a/index.html b/index.html
index 305d590..00da53e 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.157 - FIX: Renaming to OPENCLAW_GATEWAY_TOKEN, ensured push reach GitHub");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.159 - Evolution Phase 20.4: Supervisor Agent (Tool Calling) & Incremental RAG Implementation (Secrets Removed)");</script>
   <!-- DEPLOY_VERSION_END -->
 
 
@@ -399,7 +399,11 @@
         <!-- Кнопка применить (видима в режиме по умолчанию) -->
         <button id="submitTopPrompt" class="default-mode" style="display: none; flex-shrink: 0;">Применить</button>
         <!-- Кнопка отправить (видима в режиме чата) -->
-        <button id="submitChatMessage" class="chat-mode" style="flex-shrink: 0;">Отправить</button>
+        <button id="submitChatMessage" class="chat-mode glass-send-btn" title="Отправить сообщение">
+          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#E3E3E3">
+            <path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z"/>
+          </svg>
+        </button>
       </div>
     </div>
     <div id="triaVersionLabelContainer" class="tria-version-footer" style="text-align: right; width: 100%;">

commit 23d170d90c739732f955ee51f92620accec019f1
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 19:24:03 2026 +0300

    DEPLOY: v0.20.157 - FIX: Renaming to OPENCLAW_GATEWAY_TOKEN, ensured push reach GitHub

diff --git a/index.html b/index.html
index 7628976..305d590 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.156 - FIX: Tria 503 fix (ImportError), OpenClaw full instance, LLM models (Gemini-3, Mistral-Small), cleaned tria_agents");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.157 - FIX: Renaming to OPENCLAW_GATEWAY_TOKEN, ensured push reach GitHub");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 982a1625723017a6ed618f042c4b54153e1d4d14
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 19:16:36 2026 +0300

    DEPLOY: v0.20.156 - FIX: Tria 503 fix (ImportError), OpenClaw full instance, LLM models (Gemini-3, Mistral-Small), cleaned tria_agents

diff --git a/index.html b/index.html
index 81fc916..7628976 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.155 - FINAL FIX: Set correct model names (gemini-3-flash-preview, mistral-large-2512) and shrink context");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.156 - FIX: Tria 503 fix (ImportError), OpenClaw full instance, LLM models (Gemini-3, Mistral-Small), cleaned tria_agents");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 9aa9bf599d6c5295e5d75ab10f0356df6f318f56
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 16:52:32 2026 +0300

    DEPLOY: v0.20.155 - FINAL FIX: Set correct model names (gemini-3-flash-preview, mistral-large-2512) and shrink context

diff --git a/index.html b/index.html
index aa7a5bd..81fc916 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.154 - UPDATE: Model -> gemini-3.1-flash-lite-preview & Enable Robust Mistral Fallback");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.155 - FINAL FIX: Set correct model names (gemini-3-flash-preview, mistral-large-2512) and shrink context");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit b219f55dcc5cefae64f95b50b4e9567815df7661
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 15:57:15 2026 +0300

    DEPLOY: v0.20.154 - UPDATE: Model -> gemini-3.1-flash-lite-preview & Enable Robust Mistral Fallback

diff --git a/index.html b/index.html
index 50a6bc0..aa7a5bd 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.153 - FIX: Set model to gemini-flash-latest (Explicit User Request)");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.154 - UPDATE: Model -> gemini-3.1-flash-lite-preview & Enable Robust Mistral Fallback");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 3447cf5fac9b0a864b8c925dcaec357e7bd81091
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 15:38:49 2026 +0300

    DEPLOY: v0.20.153 - FIX: Set model to gemini-flash-latest (Explicit User Request)

diff --git a/index.html b/index.html
index 4b28163..50a6bc0 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.152 - FIX: Auto-fallback to Mistral if Gemini fails (detect [Gemini Error])");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.153 - FIX: Set model to gemini-flash-latest (Explicit User Request)");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit a4ac4b7e7d0f3d2b1eb354b5006633dc21461a59
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 15:37:26 2026 +0300

    DEPLOY: v0.20.152 - FIX: Auto-fallback to Mistral if Gemini fails (detect [Gemini Error])

diff --git a/index.html b/index.html
index 3f83831..4b28163 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.151 - FIX: Downgrade Gemini model to 2.0 Flash (Stable) to fix 404 Error");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.152 - FIX: Auto-fallback to Mistral if Gemini fails (detect [Gemini Error])");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit a6615da7007f98439624865ef6377d5233c83e4a
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 15:32:19 2026 +0300

    DEPLOY: v0.20.151 - FIX: Downgrade Gemini model to 2.0 Flash (Stable) to fix 404 Error

diff --git a/index.html b/index.html
index c465e40..3f83831 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.150 - UPDATE: Relax Patrol rules for text chat (No Gesture DNA required)");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.151 - FIX: Downgrade Gemini model to 2.0 Flash (Stable) to fix 404 Error");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit f8fb609c422b1c8bc6d1bf763aa01680ed50ebae
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 15:25:55 2026 +0300

    DEPLOY: v0.20.150 - UPDATE: Relax Patrol rules for text chat (No Gesture DNA required)

diff --git a/index.html b/index.html
index e76ba02..c465e40 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.149 - FIX: Relax Pydantic ID types to allow UUIDs (Fixes 500 in Mock Mode)");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.150 - UPDATE: Relax Patrol rules for text chat (No Gesture DNA required)");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 68cdffc89c3859055ad3d25be86a890e11c17bac
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 15:02:50 2026 +0300

    DEPLOY: v0.20.149 - FIX: Relax Pydantic ID types to allow UUIDs (Fixes 500 in Mock Mode)

diff --git a/index.html b/index.html
index 1bc4abb..e76ba02 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.148 - FEATURE: In-Memory Fallback for Chat (Fixes 503 if DB is down)");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.149 - FIX: Relax Pydantic ID types to allow UUIDs (Fixes 500 in Mock Mode)");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit ac104ed57d6f50089f1a30d795953e24006eb977
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 14:54:39 2026 +0300

    DEPLOY: v0.20.148 - FEATURE: In-Memory Fallback for Chat (Fixes 503 if DB is down)

diff --git a/index.html b/index.html
index 794397e..1bc4abb 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.147 - REFACTOR: Switch to OPENCLAW_GATEWAY_TOKEN & Localhost Agent");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.148 - FEATURE: In-Memory Fallback for Chat (Fixes 503 if DB is down)");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 9553c967d590afa858a53d9aa897cbc2e3d93b29
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 14:46:53 2026 +0300

    DEPLOY: v0.20.147 - REFACTOR: Switch to OPENCLAW_GATEWAY_TOKEN & Localhost Agent

diff --git a/index.html b/index.html
index 1f63fbd..794397e 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.146 - SETUP: Add start.sh for OpenClaw/FastAPI & Verbose Astra DB Logs");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.147 - REFACTOR: Switch to OPENCLAW_GATEWAY_TOKEN & Localhost Agent");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 57ca964bb188da7d796578729a0dcb1461251fd4
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 14:30:43 2026 +0300

    DEPLOY: v0.20.146 - SETUP: Add start.sh for OpenClaw/FastAPI & Verbose Astra DB Logs

diff --git a/index.html b/index.html
index 8ebc881..1f63fbd 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.145 - FIX: Chat 500 error via UserStub in auth (fixes .user_id crash)");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.146 - SETUP: Add start.sh for OpenClaw/FastAPI & Verbose Astra DB Logs");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit c57e5757d4026c975b4a52595d5004482e08d650
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 14:17:06 2026 +0300

    DEPLOY: v0.20.145 - FIX: Chat 500 error via UserStub in auth (fixes .user_id crash)

diff --git a/index.html b/index.html
index c306847..8ebc881 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.144 - FINALIZE: Fix model labels and history truncation; gemini-3-flash & mistral-large-latest confirmed");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.145 - FIX: Chat 500 error via UserStub in auth (fixes .user_id crash)");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 1dff4bee39f58c51125dc273d7b413bc622047f2
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 13:41:18 2026 +0300

    DEPLOY: v0.20.144 - FINALIZE: Fix model labels and history truncation; gemini-3-flash & mistral-large-latest confirmed

diff --git a/index.html b/index.html
index a3aba2c..c306847 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.143 - FINALIZE: OpenClaw integration; gemini-3-flash & mistral-large-latest; Robust Astra DB; UI glassy eye animation");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.144 - FINALIZE: Fix model labels and history truncation; gemini-3-flash & mistral-large-latest confirmed");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit c2396a77784c8e498551fae75c5811f9d1ac7822
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 13:17:23 2026 +0300

    DEPLOY: v0.20.143 - FINALIZE: OpenClaw integration; gemini-3-flash & mistral-large-latest; Robust Astra DB; UI glassy eye animation

diff --git a/index.html b/index.html
index d51b7b7..a3aba2c 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.142 - FIX: NameError in chat router; Add smart Astra DB URL parsing for Database ID/Region");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.143 - FINALIZE: OpenClaw integration; gemini-3-flash & mistral-large-latest; Robust Astra DB; UI glassy eye animation");</script>
   <!-- DEPLOY_VERSION_END -->
 
 
@@ -354,7 +354,7 @@
       </div>
       <div id="chatHistory" class="panel-section chat-mode" style="display: none;">
         <div id="chatMessages">
-          <div id="loadingIndicator"></div>
+          <div id="loadingIndicator"><div class="eye-loader"><div class="eye-loader-inner"></div></div></div>
           <div id="conversations"></div>
           <!-- Сюда будут добавляться сообщения чата -->
         </div>
@@ -454,7 +454,7 @@
   <canvas id="previewCanvas" style="display: none;"></canvas>
 
   <!-- Прелоадер -->
-  <div id="loading-spinner"></div>
+  <div id="loading-spinner"><div class="eye-loader"><div class="eye-loader-inner"></div></div></div>
 
   <!-- Toggle Panels Button -->
   <button id="togglePanelsButton" class="control-button" title="Скрыть панели">

commit 8f1aa564dde224efe28cf3baf6fed469176251ea
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 03:00:40 2026 +0300

    DEPLOY: v0.20.142 - FIX: NameError in chat router; Add smart Astra DB URL parsing for Database ID/Region

diff --git a/index.html b/index.html
index 152a0af..d51b7b7 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.141 - FIX: Robust Astra DB connection (via ID/Region) and strict whitespace stripping in config");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.142 - FIX: NameError in chat router; Add smart Astra DB URL parsing for Database ID/Region");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 4c891950e10041fbf8cea86047f87a59c69064e0
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 02:57:01 2026 +0300

    DEPLOY: v0.20.141 - FIX: Robust Astra DB connection (via ID/Region) and strict whitespace stripping in config

diff --git a/index.html b/index.html
index dc798e4..152a0af 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.140 - DEBUG: add heavy logging and full traceback to chat endpoint");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.141 - FIX: Robust Astra DB connection (via ID/Region) and strict whitespace stripping in config");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 356986382e75bb3b359f5a7fd5c0688f19ace60f
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 02:53:06 2026 +0300

    DEPLOY: v0.20.140 - DEBUG: add heavy logging and full traceback to chat endpoint

diff --git a/index.html b/index.html
index a0fd459..dc798e4 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.139 - FIX: backend config validation for Astra DB endpoint (add https:// protocol)");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.140 - DEBUG: add heavy logging and full traceback to chat endpoint");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit e2dd6946aeeb50d5dddbed5835eea59bcdb7d633
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 02:47:32 2026 +0300

    DEPLOY: v0.20.139 - FIX: backend config validation for Astra DB endpoint (add https:// protocol)

diff --git a/index.html b/index.html
index 3ecf344..a0fd459 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.138 - UI: glass eye loading indicator and gray blink overlay; Fix version auto-update");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.139 - FIX: backend config validation for Astra DB endpoint (add https:// protocol)");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit c2e55bea6a993485f857a54593cfd2bbf2c37c95
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 02:35:47 2026 +0300

    DEPLOY: v0.20.138 - UI: glass eye loading indicator and gray blink overlay; Fix version auto-update

diff --git a/index.html b/index.html
index 950aad5..3ecf344 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.135 - UX: dynamic shadows, thiner borders, blink fix, scanner hardware fix");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.138 - UI: glass eye loading indicator and gray blink overlay; Fix version auto-update");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit 98cbccfd0ccba69c13374f517a48e872640312cd
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 01:15:30 2026 +0300

    UX: manual version bump v0.20.135

diff --git a/index.html b/index.html
index fcce6e1..950aad5 100644
--- a/index.html
+++ b/index.html
@@ -53,7 +53,7 @@
     console.log("THREE registered globally for XR/TorusVOM");
   </script>
   <!-- DEPLOY_VERSION_START -->
-  <script>console.log("DEPLOY VERSION: 0.20.133 - Fix ChatRepository structure, THREE imports, WebXR resilience, and AutoReload cache-buster");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.135 - UX: dynamic shadows, thiner borders, blink fix, scanner hardware fix");</script>
   <!-- DEPLOY_VERSION_END -->
 
 

commit cd5e15290b6da399d2e17d12b9f78f40114fe1bd
Author: NeuroCoder <neorh@holograms.media>
Date:   Fri Mar 20 01:15:05 2026 +0300

    UX: dynamic shadows, thiner borders, blink fix, scanner hardware fix, v0.20.135

diff --git a/index.html b/index.html
index 1316d8f..fcce6e1 100644
--- a/index.html
+++ b/index.html
@@ -47,7 +47,14 @@
       }
     };
   </script>
-  <script>console.log("DEPLOY VERSION: 0.20.125 - HYPERBRAIN, TriaFS, REINTEGRATOR");</script>
+  <script type="module">
+    import * as THREE from 'three';
+    window.THREE = THREE;
+    console.log("THREE registered globally for XR/TorusVOM");
+  </script>
+  <!-- DEPLOY_VERSION_START -->
+  <script>console.log("DEPLOY VERSION: 0.20.133 - Fix ChatRepository structure, THREE imports, WebXR resilience, and AutoReload cache-buster");</script>
+  <!-- DEPLOY_VERSION_END -->
 
 
 

commit b4d87e678abcea3444898203ed63865dd6655fd5
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 18 23:21:25 2026 +0300

    fix: critical WASM bugs, P0 wallet security, and Tria functional enhancements (G-NEXT) v6.2

diff --git a/index.html b/index.html
index 60ec670..1316d8f 100644
--- a/index.html
+++ b/index.html
@@ -464,13 +464,13 @@
       <span class="close" onclick="document.getElementById('treasury-modal').classList.remove('active')">&times;</span>
       <h2 style="text-align:center;font-size:1.3em;">&#127963; Казначейство Obolos</h2>
       <div style="text-align:center;padding:20px 0;">
-        <div style="font-size:2.4em;font-weight:bold;color:#00ff88;text-shadow:0 0 15px rgba(0,255,136,0.4);">1.000000</div>
+        <div id="obolos-balance" style="font-size:2.4em;font-weight:bold;color:#00ff88;text-shadow:0 0 15px rgba(0,255,136,0.4);">0.000000</div>
         <div style="font-size:0.85em;color:#888;margin-top:6px;">Базовый токен • Дробление: 10<sup>-6</sup></div>
       </div>
       <div style="display:flex;flex-direction:column;gap:10px;">
-        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Жестовые блоки</span><span style="color:#fff;">0</span></div>
-        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Аренда мощностей</span><span style="color:#fff;">—</span></div>
-        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Статус</span><span style="color:#00ff88;">🙂 Новичок</span></div>
+        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Жестовые блоки</span><span id="treasury-block-count" style="color:#fff;">0</span></div>
+        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Аренда мощностей</span><span id="compute-rental-status" style="color:#fff;">—</span></div>
+        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Статус DAO</span><span id="dao-utility-status" style="color:#00ff88;">&#128578; Новичок</span></div>
       </div>
     </div>
   </div>
@@ -480,12 +480,20 @@
     <div class="modal-content" style="max-width:420px;">
       <span class="close" onclick="document.getElementById('hub-modal').classList.remove('active')">&times;</span>
       <h2 style="text-align:center;font-size:1.3em;">Чатрумы</h2>
-      <div style="display:flex;flex-direction:column;gap:8px;margin-top:15px;">
-        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎹 Синтезатор <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
-        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🔧 Мастерская <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
-        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎵 Концерт <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
-        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎥 Студия <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
-        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎓 Обучение <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
+      <div style="margin-top:15px; text-align:left;">
+        <label for="hub-env-select" style="font-size:0.9em;color:#aaa;">Среда окружения:</label>
+        <select id="hub-env-select" style="width:100%;margin-top:5px;padding:10px;background:var(--color-pure-black);color:#fff;border:1px solid var(--panel-border);border-radius:8px;outline:none;">
+          <option value="void">🌌 Черный вакуум (Void)</option>
+          <option value="grid">🔲 Сетка (Grid-floor)</option>
+          <option value="panoramic">🏔️ Панорама (Panoramic)</option>
+        </select>
+      </div>
+      <div style="display:flex;flex-direction:column;gap:8px;margin-top:15px;" id="hub-room-list">
+        <button class="hub-room-btn" data-mode="synth" style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;cursor:pointer;text-align:left;font-size:0.95em;transition:all 0.2s ease;">🎹 Синтезатор <span style="float:right;font-size:0.8em;color:#00ff88;">войти</span></button>
+        <button class="hub-room-btn" data-mode="workshop" style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;cursor:pointer;text-align:left;font-size:0.95em;transition:all 0.2s ease;">🔧 Мастерская <span style="float:right;font-size:0.8em;color:#00ff88;">войти</span></button>
+        <button class="hub-room-btn" data-mode="concert" style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;cursor:pointer;text-align:left;font-size:0.95em;transition:all 0.2s ease;">🎵 Концерт <span style="float:right;font-size:0.8em;color:#00ff88;">войти</span></button>
+        <button class="hub-room-btn" data-mode="studio" style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;cursor:pointer;text-align:left;font-size:0.95em;transition:all 0.2s ease;">🎥 Студия <span style="float:right;font-size:0.8em;color:#00ff88;">войти</span></button>
+        <button class="hub-room-btn" data-mode="edu" style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#fff;cursor:pointer;text-align:left;font-size:0.95em;transition:all 0.2s ease;">🎓 Обучение <span style="float:right;font-size:0.8em;color:#00ff88;">войти</span></button>
       </div>
     </div>
   </div>

commit 2623e7d57fa091f2230a83d9d9e304c275b7484e
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 18 16:48:06 2026 +0300

    Fix XR camera, preserve torus columns X coordinates, update chat LLM selection, and change Test icon

diff --git a/index.html b/index.html
index 997f80e..60ec670 100644
--- a/index.html
+++ b/index.html
@@ -315,7 +315,7 @@
         <button class="gesture-tab" data-mode="edit"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>правка</button>
         <button class="gesture-tab" data-mode="action"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/></svg>действие</button>
         <button class="gesture-tab" data-mode="chain"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>сцепка</button>
-        <button class="gesture-tab" data-mode="test"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480h80q0 134 93 227t227 93q134 0 227-93t93-227q0-134-93-227t-227-93v-80q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>тест</button>
+        <button class="gesture-tab" data-mode="test"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M320-200v-560l440 280-440 280Z"/></svg>тест</button>
       </div>
       <div id="gesture-line"></div>
     </div>

commit 569d680303791b9102b1d2902e85e0d55f19686b
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 18 16:00:55 2026 +0300

    fix(ui): bottom-group 2x2, treasury/hub modals, gesture icons, tria spark pulse, no green hover

diff --git a/index.html b/index.html
index a885b90..997f80e 100644
--- a/index.html
+++ b/index.html
@@ -275,32 +275,30 @@
       <button id="hubButton" class="control-button panel-button" title="Чатрумы / Созвон">
         <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M155-75q-35-35-35-85t35-85q35-35 85-35 14 0 26 3t23 8l57-71q-28-31-39-70t-5-78l-81-27q-17 25-43 40t-58 15q-50 0-85-35T0-580q0-50 35-85t85-35q50 0 85 35t35 85v8l81 28q20-36 53.5-61t75.5-32v-87q-39-11-64.5-42.5T360-840q0-50 35-85t85-35q50 0 85 35t35 85q0 42-26 73.5T510-724v87q42 7 75.5 32t53.5 61l81-28v-8q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-32 0-58.5-15T739-515l-81 27q6 39-5 77.5T614-340l57 70q11-5 23-7.5t26-2.5q50 0 85 35t35 85q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-20 6.5-38.5T624-232l-57-71q-41 23-87.5 23T392-303l-56 71q11 15 17.5 33.5T360-160q0 50-35 85t-85 35q-50 0-85-35Zm-35-465q17 0 28.5-11.5T160-580q0-17-11.5-28.5T120-620q-17 0-28.5 11.5T80-580q0 17 11.5 28.5T120-540Zm148.5 408.5Q280-143 280-160t-11.5-28.5Q257-200 240-200t-28.5 11.5Q200-177 200-160t11.5 28.5Q223-120 240-120t28.5-11.5Zm240-680Q520-823 520-840t-11.5-28.5Q497-880 480-880t-28.5 11.5Q440-857 440-840t11.5 28.5Q463-800 480-800t28.5-11.5ZM480-360q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm268.5 228.5Q760-143 760-160t-11.5-28.5Q737-200 720-200t-28.5 11.5Q680-177 680-160t11.5 28.5Q703-120 720-120t28.5-11.5Zm120-420Q880-563 880-580t-11.5-28.5Q857-620 840-620t-28.5 11.5Q800-597 800-580t11.5 28.5Q823-540 840-540t28.5-11.5ZM480-840ZM120-580Zm360 120Zm360-120ZM240-160Zm480 0Z"/></svg>
       </button>
-      <button id="installPwaButton" class="control-button panel-button" title="Установить"><svg
-          xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
-          <path
-            d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
-        </svg></button>
       <!-- The existing left-panel-icon-group and telegramLinkButton will be moved/restructured -->
     </div>
 
     <hr class="panel-hr">
 
-    <!-- Bottom Group -->
+    <!-- Bottom Group: 2x2 grid -->
     <div class="left-panel-group bottom-group">
       <a href="#" id="telegramLinkButton" class="panel-icon-link control-button" title="Telegram-чат">
-        <!-- Re-using existing ID and control-button class for consistency -->
         <svg width="24px" height="24px" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
           <circle fill="transparent" cx="500" cy="500" r="500" />
-          <path
-            d="M226.328419,494.722069 C372.088573,431.216685 469.284839,389.350049 517.917216,369.122161 C656.772535,311.36743 685.625481,301.334815 704.431427,301.003532 C708.567621,300.93067 717.815839,301.955743 723.806446,306.816707 C728.864797,310.92121 730.256552,316.46581 730.922551,320.357329 C731.588551,324.248848 732.417879,333.113828 731.758626,340.040666 C724.234007,419.102486 691.675104,610.964674 675.110982,699.515267 C668.10208,736.984342 654.301336,749.547532 640.940618,750.777006 C611.904684,753.448938 589.856115,731.588035 561.733393,713.153237 C517.726886,684.306416 492.866009,666.349181 450.150074,638.200013 C400.78442,605.66878 432.786119,587.789048 460.919462,558.568563 C468.282091,550.921423 596.21508,434.556479 598.691227,424.000355 C599.00091,422.680135 599.288312,417.758981 596.36474,415.160431 C593.441168,412.561881 589.126229,413.450484 586.012448,414.157198 C581.598758,415.158943 511.297793,461.625274 375.109553,553.556189 C355.154858,567.258623 337.080515,573.934908 320.886524,573.585046 C303.033948,573.199351 268.692754,563.490928 243.163606,555.192408 C211.851067,545.013936 186.964484,539.632504 189.131547,522.346309 C190.260287,513.342589 202.659244,504.134509 226.328419,494.722069 Z" />
+          <path d="M226.328419,494.722069 C372.088573,431.216685 469.284839,389.350049 517.917216,369.122161 C656.772535,311.36743 685.625481,301.334815 704.431427,301.003532 C708.567621,300.93067 717.815839,301.955743 723.806446,306.816707 C728.864797,310.92121 730.256552,316.46581 730.922551,320.357329 C731.588551,324.248848 732.417879,333.113828 731.758626,340.040666 C724.234007,419.102486 691.675104,610.964674 675.110982,699.515267 C668.10208,736.984342 654.301336,749.547532 640.940618,750.777006 C611.904684,753.448938 589.856115,731.588035 561.733393,713.153237 C517.726886,684.306416 492.866009,666.349181 450.150074,638.200013 C400.78442,605.66878 432.786119,587.789048 460.919462,558.568563 C468.282091,550.921423 596.21508,434.556479 598.691227,424.000355 C599.00091,422.680135 599.288312,417.758981 596.36474,415.160431 C593.441168,412.561881 589.126229,413.450484 586.012448,414.157198 C581.598758,415.158943 511.297793,461.625274 375.109553,553.556189 C355.154858,567.258623 337.080515,573.934908 320.886524,573.585046 C303.033948,573.199351 268.692754,563.490928 243.163606,555.192408 C211.851067,545.013936 186.964484,539.632504 189.131547,522.346309 C190.260287,513.342589 202.659244,504.134509 226.328419,494.722069 Z" />
         </svg>
       </a>
-      <a href="#" id="githubButton" class="panel-icon-link control-button" title="GitHub"> <!-- Re-using existing ID -->
+      <a href="#" id="githubButton" class="panel-icon-link control-button" title="GitHub">
         <svg width="24px" height="24px" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
-          <path fill-rule="evenodd" clip-rule="evenodd"
-            d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
+          <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
         </svg>
       </a>
+      <button id="treasuryButton" class="control-button" title="Казначейство Obolos">
+        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z"/></svg>
+      </button>
+      <button id="installPwaButton" class="control-button" title="Установить">
+        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
+      </button>
     </div>
   </div>
 
@@ -313,11 +311,11 @@
     <!-- Область жестов -->
     <div id="gesture-area">
       <div class="gesture-tabs">
-        <button class="gesture-tab active" data-mode="record"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Z"/></svg>запись</button>
-        <button class="gesture-tab" data-mode="edit"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>правка</button>
-        <button class="gesture-tab" data-mode="action"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-40-360v240h80v-240l120 120 56-56-216-216-216 216 56 56 120-120Z"/></svg>действие</button>
-        <button class="gesture-tab" data-mode="chain"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M680-280q-83 0-141.5-58.5T480-480q0-83 58.5-141.5T680-680q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280ZM280-280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680q83 0 141.5 58.5T480-480q0 83-58.5 141.5T280-280Z"/></svg>сцепка</button>
-        <button class="gesture-tab" data-mode="test"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480h80q0 134 93 227t227 93q134 0 227-93t93-227q0-134-93-227t-227-93v-80q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>тест</button>
+        <button class="gesture-tab active" data-mode="record"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 0 24 24" width="14px" fill="currentColor"><circle cx="12" cy="12" r="8" fill="#FF3B30"/></svg>запись</button>
+        <button class="gesture-tab" data-mode="edit"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>правка</button>
+        <button class="gesture-tab" data-mode="action"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/></svg>действие</button>
+        <button class="gesture-tab" data-mode="chain"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>сцепка</button>
+        <button class="gesture-tab" data-mode="test"><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480h80q0 134 93 227t227 93q134 0 227-93t93-227q0-134-93-227t-227-93v-80q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>тест</button>
       </div>
       <div id="gesture-line"></div>
     </div>
@@ -460,9 +458,37 @@
         d="M500-640v320l160-160-160-160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z" />
     </svg>
   </button>
-  <button id="treasuryButton" class="control-button" title="Казначейство Obolos">
-    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z"/></svg>
-  </button>
+  <!-- Treasury modal -->
+  <div id="treasury-modal" class="modal">
+    <div class="modal-content" style="max-width:380px;">
+      <span class="close" onclick="document.getElementById('treasury-modal').classList.remove('active')">&times;</span>
+      <h2 style="text-align:center;font-size:1.3em;">&#127963; Казначейство Obolos</h2>
+      <div style="text-align:center;padding:20px 0;">
+        <div style="font-size:2.4em;font-weight:bold;color:#00ff88;text-shadow:0 0 15px rgba(0,255,136,0.4);">1.000000</div>
+        <div style="font-size:0.85em;color:#888;margin-top:6px;">Базовый токен • Дробление: 10<sup>-6</sup></div>
+      </div>
+      <div style="display:flex;flex-direction:column;gap:10px;">
+        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Жестовые блоки</span><span style="color:#fff;">0</span></div>
+        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Аренда мощностей</span><span style="color:#fff;">—</span></div>
+        <div style="display:flex;justify-content:space-between;font-size:0.9em;color:#aaa;"><span>Статус</span><span style="color:#00ff88;">🙂 Новичок</span></div>
+      </div>
+    </div>
+  </div>
+
+  <!-- Hub modal -->
+  <div id="hub-modal" class="modal">
+    <div class="modal-content" style="max-width:420px;">
+      <span class="close" onclick="document.getElementById('hub-modal').classList.remove('active')">&times;</span>
+      <h2 style="text-align:center;font-size:1.3em;">Чатрумы</h2>
+      <div style="display:flex;flex-direction:column;gap:8px;margin-top:15px;">
+        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎹 Синтезатор <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
+        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🔧 Мастерская <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
+        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎵 Концерт <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
+        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎥 Студия <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
+        <button class="hub-room-btn" disabled style="padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#aaa;cursor:not-allowed;text-align:left;font-size:0.95em;">🎓 Обучение <span style="float:right;font-size:0.8em;color:#666;">скоро</span></button>
+      </div>
+    </div>
+  </div>
 
   <div id="account-modal" class="modal">
     <div class="modal-content">

commit 62cb4adc843b1a2cfdb311d09c30888b9a227414
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 18 15:25:09 2026 +0300

    fix(core+ui): Phase 0-2 megastack — CochlearCylinder guard, GestureSynthesizer import fix, account_balance icon, Hub button, gesture tab icons

diff --git a/index.html b/index.html
index d597ae5..a885b90 100644
--- a/index.html
+++ b/index.html
@@ -266,15 +266,15 @@
           <path
             d="M440-80v-304L256-200l-56-56 224-224-224-224 56-56 184 184v-304h40l228 228-172 172 172 172L480-80h-40Zm80-496 76-76-76-74v150Zm0 342 76-74-76-76v150Z" />
         </svg></button>
-      <div class="tria-stats-container">
-        <button id="triaButton" class="control-button panel-button" title="Обучение Триа">
-          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
-            <path
-              d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z" />
-          </svg>
-        </button>
-        <span id="at-balance-display" class="at-balance">0.00 AT</span>
-      </div>
+      <button id="triaButton" class="control-button panel-button" title="Обучение Триа">
+        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
+          <path
+            d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z" />
+        </svg>
+      </button>
+      <button id="hubButton" class="control-button panel-button" title="Чатрумы / Созвон">
+        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M155-75q-35-35-35-85t35-85q35-35 85-35 14 0 26 3t23 8l57-71q-28-31-39-70t-5-78l-81-27q-17 25-43 40t-58 15q-50 0-85-35T0-580q0-50 35-85t85-35q50 0 85 35t35 85v8l81 28q20-36 53.5-61t75.5-32v-87q-39-11-64.5-42.5T360-840q0-50 35-85t85-35q50 0 85 35t35 85q0 42-26 73.5T510-724v87q42 7 75.5 32t53.5 61l81-28v-8q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-32 0-58.5-15T739-515l-81 27q6 39-5 77.5T614-340l57 70q11-5 23-7.5t26-2.5q50 0 85 35t35 85q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-20 6.5-38.5T624-232l-57-71q-41 23-87.5 23T392-303l-56 71q11 15 17.5 33.5T360-160q0 50-35 85t-85 35q-50 0-85-35Zm-35-465q17 0 28.5-11.5T160-580q0-17-11.5-28.5T120-620q-17 0-28.5 11.5T80-580q0 17 11.5 28.5T120-540Zm148.5 408.5Q280-143 280-160t-11.5-28.5Q257-200 240-200t-28.5 11.5Q200-177 200-160t11.5 28.5Q223-120 240-120t28.5-11.5Zm240-680Q520-823 520-840t-11.5-28.5Q497-880 480-880t-28.5 11.5Q440-857 440-840t11.5 28.5Q463-800 480-800t28.5-11.5ZM480-360q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm268.5 228.5Q760-143 760-160t-11.5-28.5Q737-200 720-200t-28.5 11.5Q680-177 680-160t11.5 28.5Q703-120 720-120t28.5-11.5Zm120-420Q880-563 880-580t-11.5-28.5Q857-620 840-620t-28.5 11.5Q800-597 800-580t11.5 28.5Q823-540 840-540t28.5-11.5ZM480-840ZM120-580Zm360 120Zm360-120ZM240-160Zm480 0Z"/></svg>
+      </button>
       <button id="installPwaButton" class="control-button panel-button" title="Установить"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
@@ -313,11 +313,11 @@
     <!-- Область жестов -->
     <div id="gesture-area">
       <div class="gesture-tabs">
-        <button class="gesture-tab active" data-mode="record">запись</button>
-        <button class="gesture-tab" data-mode="edit">правка</button>
-        <button class="gesture-tab" data-mode="action">действие</button>
-        <button class="gesture-tab" data-mode="chain">сцепка</button>
-        <button class="gesture-tab" data-mode="test">тест</button>
+        <button class="gesture-tab active" data-mode="record"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Z"/></svg>запись</button>
+        <button class="gesture-tab" data-mode="edit"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Z"/></svg>правка</button>
+        <button class="gesture-tab" data-mode="action"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-40-360v240h80v-240l120 120 56-56-216-216-216 216 56 56 120-120Z"/></svg>действие</button>
+        <button class="gesture-tab" data-mode="chain"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M680-280q-83 0-141.5-58.5T480-480q0-83 58.5-141.5T680-680q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280ZM280-280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680q83 0 141.5 58.5T480-480q0 83-58.5 141.5T280-280Z"/></svg>сцепка</button>
+        <button class="gesture-tab" data-mode="test"><svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480h80q0 134 93 227t227 93q134 0 227-93t93-227q0-134-93-227t-227-93v-80q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>тест</button>
       </div>
       <div id="gesture-line"></div>
     </div>
@@ -460,11 +460,8 @@
         d="M500-640v320l160-160-160-160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z" />
     </svg>
   </button>
-  <button id="treasuryButton" class="control-button" title="Казначейство / Состояние">
-    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
-      <path
-        d="M441-120v-86q-53-12-91.5-46T293-348l74-30q15 47 45 70.5T480-284q44 0 72-18.5t28-50.5q0-81-105-115-104-33-149.5-91.5T280-692q0-73 44-124.5t117-69.5V-960h80v84q48 8 83 37t54 75l-74 32q-11-30-34-49.5T480-800q-39 0-61.5 18T396-735q0 61 106 96 106 35 152 91t46 138q0 84-46 139.5T441-204v84h-80Z" />
-    </svg>
+  <button id="treasuryButton" class="control-button" title="Казначейство Obolos">
+    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444-444Zm0 0h444L480-830 258-720Z"/></svg>
   </button>
 
   <div id="account-modal" class="modal">

commit b2f623205e642179bd7b72ab59dc9322b562bcb9
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 11 19:43:24 2026 +0300

    fix(core): remove broken dynamic three.js import and update hardcoded version

diff --git a/index.html b/index.html
index 76397d1..d597ae5 100644
--- a/index.html
+++ b/index.html
@@ -47,7 +47,7 @@
       }
     };
   </script>
-  <script>console.log("DEPLOY VERSION: 0.19.123 - LIQUID GLASS, RUNNING SPARK, UI FILL");</script>
+  <script>console.log("DEPLOY VERSION: 0.20.125 - HYPERBRAIN, TriaFS, REINTEGRATOR");</script>
 
 
 
@@ -59,7 +59,7 @@
   <link rel="icon" type="image/x-icon" href="/favicon.ico">
   <link rel="manifest" href="/manifest.json">
   <meta name="theme-color" content="#121212">
-  <link rel="apple-touch-icon" href="/public/icons/icon-192x192.png">
+  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
 
   <!-- Core Scripts -->
   <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>

commit 9ba63f91afc942bd2f1d39b08f481b2489291b90
Author: NeuroCoder <neorh@holograms.media>
Date:   Wed Mar 11 14:27:42 2026 +0300

    feat(core): Tria Hyperbrain v0.20.125 — TriaFS, Reintegration Protocol, WASM rebuild with brain.rs + bio_auth.rs
    
    - NEW: TriaFileSystem.js — resonance-based virtual FS with L/R bio-symmetry
    - NEW: ReintegrationManager.js — reverse spaghettification protocol
    - NEW: EmotionalMonitor.js — PAD emotional spectrum (Pleasure, Arousal, Dominance)
    - NEW: HRRMath.js — Holographic Reduced Representations (circular convolution)
    - NEW: TriaPulse.js, AgentWomb.js, HyperbrainSynthesizer.js
    - NEW: TorusVom.js — torus mapping for BasilaQ-128 frequencies
    - NEW: TriaEvolutionConnector.js, AttentionEconomyManager.js
    - NEW: Backend services (holochain, mistral embedding, attention economy, task stack, holoquant ingestion)
    - NEW: docs/Tria_Standard_Embedding_Procedure.md
    - NEW: tools/tria_status.py — project health diagnostics
    - REBUILD: holocore WASM (now includes brain.rs Enkephalon + bio_auth.rs BioHash)
    - FIX: eventBus.js — typeof window check for Node.js compatibility
    - UI: animations, buttons, HandsTracking improvements

diff --git a/index.html b/index.html
index 7ecac46..76397d1 100644
--- a/index.html
+++ b/index.html
@@ -62,7 +62,6 @@
   <link rel="apple-touch-icon" href="/public/icons/icon-192x192.png">
 
   <!-- Core Scripts -->
-  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
   <!-- Main Script -->
@@ -113,11 +112,9 @@
 
 
   <!-- MediaPipe Libraries -->
-  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js"
-    crossorigin="anonymous"></script>
-  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js"
-    crossorigin="anonymous"></script>
-  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js" crossorigin="anonymous"></script>
+  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
+  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
+  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js" crossorigin="anonymous"></script>
 
   <style>
     /* Стили для кнопок аутентификации и аватара */
@@ -269,11 +266,15 @@
           <path
             d="M440-80v-304L256-200l-56-56 224-224-224-224 56-56 184 184v-304h40l228 228-172 172 172 172L480-80h-40Zm80-496 76-76-76-74v150Zm0 342 76-74-76-76v150Z" />
         </svg></button>
-      <button id="triaButton" class="control-button panel-button" title="Обучение Триа"><svg
-          xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
-          <path
-            d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z" />
-        </svg></button>
+      <div class="tria-stats-container">
+        <button id="triaButton" class="control-button panel-button" title="Обучение Триа">
+          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
+            <path
+              d="M323-160q-11 0-20.5-5.5T288-181l-78-139h58l40 80h92v-40h-68l-40-80H188l-57-100q-2-5-3.5-10t-1.5-10q0-4 5-20l57-100h104l40-80h68v-40h-92l-40 80h-58l78-139q5-10 14.5-15.5T323-800h97q17 0 28.5 11.5T460-760v160h-60l-40 40h100v120h-88l-40-80h-92l-40 40h108l40 80h112v200q0 17-11.5 28.5T420-160h-97Zm217 0q-17 0-28.5-11.5T500-200v-200h112l40-80h108l-40-40h-92l-40 80h-88v-120h100l-40-40h-60v-160q0-17 11.5-28.5T540-800h97q11 0 20.5 5.5T672-779l78 139h-58l-40-80h-92v40h68l40 80h104l57 100q2 5 3.5 10t1.5 10q0 4-5 20l-57 100H668l-40 80h-68v40h92l40-80h58l-78 139q-5 10-14.5 15.5T637-160h-97Z" />
+          </svg>
+        </button>
+        <span id="at-balance-display" class="at-balance">0.00 AT</span>
+      </div>
       <button id="installPwaButton" class="control-button panel-button" title="Установить"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
@@ -459,6 +460,12 @@
         d="M500-640v320l160-160-160-160ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z" />
     </svg>
   </button>
+  <button id="treasuryButton" class="control-button" title="Казначейство / Состояние">
+    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
+      <path
+        d="M441-120v-86q-53-12-91.5-46T293-348l74-30q15 47 45 70.5T480-284q44 0 72-18.5t28-50.5q0-81-105-115-104-33-149.5-91.5T280-692q0-73 44-124.5t117-69.5V-960h80v84q48 8 83 37t54 75l-74 32q-11-30-34-49.5T480-800q-39 0-61.5 18T396-735q0 61 106 96 106 35 152 91t46 138q0 84-46 139.5T441-204v84h-80Z" />
+    </svg>
+  </button>
 
   <div id="account-modal" class="modal">
     <div class="modal-content">

commit 467fe23ea2cc2ee8fd514f4a7b5299468dc82644
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 9 05:02:36 2026 +0300

    feat(ui): DEPLOY VERSION 0.19.123 - LIQUID GLASS, RUNNING SPARK, UI FILL

diff --git a/index.html b/index.html
index fb0521a..7ecac46 100644
--- a/index.html
+++ b/index.html
@@ -47,7 +47,7 @@
       }
     };
   </script>
-  <script>console.log("DEPLOY VERSION: 0.19.122 - AUTO-RELOAD STABILIZED, CORS FIXED");</script>
+  <script>console.log("DEPLOY VERSION: 0.19.123 - LIQUID GLASS, RUNNING SPARK, UI FILL");</script>
 
 
 

commit 49fe7093968cbeb48aec491919844c49210577fb
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 9 03:47:14 2026 +0300

    feat(ui/core): DEPLOY VERSION 0.19.122 - FIX AUTO-RELOAD ROUTING & CONSOLE ERRORS

diff --git a/index.html b/index.html
index 0616203..fb0521a 100644
--- a/index.html
+++ b/index.html
@@ -47,7 +47,7 @@
       }
     };
   </script>
-  <script>console.log("DEPLOY VERSION: 0.19.121 - GLASS FIX, TRIA PULSE, CORS FIX");</script>
+  <script>console.log("DEPLOY VERSION: 0.19.122 - AUTO-RELOAD STABILIZED, CORS FIXED");</script>
 
 
 

commit 19a6599ee3decaa66f5db27959fa1a0c45f93952
Author: NeuroCoder <neorh@holograms.media>
Date:   Mon Mar 9 02:55:19 2026 +0300

    feat(ui): DEPLOY VERSION 0.19.121 - GLASS FIX, TRIA PULSE, CORS FIX

diff --git a/index.html b/index.html
index 65c490d..0616203 100644
--- a/index.html
+++ b/index.html
@@ -47,7 +47,7 @@
       }
     };
   </script>
-  <script>console.log("DEPLOY VERSION: 0.19.050 - XR FIX, MONACO MODAL, QR HOTSWAP");</script>
+  <script>console.log("DEPLOY VERSION: 0.19.121 - GLASS FIX, TRIA PULSE, CORS FIX");</script>
 
 
 
@@ -264,7 +264,7 @@
           <path
             d="M40-120v-200h80v120h120v80H40Zm680 0v-80h120v-120h80v200H720ZM160-240v-480h80v480h-80Zm120 0v-480h40v480h-40Zm120 0v-480h80v480h-80Zm120 0v-480h120v480H520Zm160 0v-480h40v480h-40Zm80 0v-480h40v480h-40ZM40-640v-200h200v80H120v120H40Zm800 0v-120H720v-80h200v200h-80Z" />
         </svg></button>
-      <button id="bluetoothButton" class="control-button panel-button" title="Эхолокация" disabled><svg
+      <button id="bluetoothButton" class="control-button panel-button" title="Эхолокация"><svg
           xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
           <path
             d="M440-80v-304L256-200l-56-56 224-224-224-224 56-56 184 184v-304h40l228 228-172 172 172 172L480-80h-40Zm80-496 76-76-76-74v150Zm0 342 76-74-76-76v150Z" />
@@ -346,18 +346,15 @@
       <div id="myHologramsView" class="right-panel-view" style="display: none;">
         <!-- Сюда будет добавляться список голограмм -->
       </div>
-      <div id="chatHistory" class="panel-section chat-mode">
+      <div id="chatHistory" class="panel-section chat-mode" style="display: none;">
         <div id="chatMessages">
           <div id="loadingIndicator"></div>
           <div id="conversations"></div>
+          <!-- Сюда будут добавляться сообщения чата -->
         </div>
       </div>
     </div>
 
-    <div id="triaChatHistory" class="right-panel-view" style="display: none;">
-      <!-- Сюда будут добавляться сообщения чата -->
-    </div>
-
     <!-- Общая разделительная линия (всегда видимая) -->
     <hr class="panel-hr">
 
diff --git a/js/core/auth.js b/js/core/auth.js
index 93c75fd..670ceac 100644
--- a/js/core/auth.js
+++ b/js/core/auth.js
@@ -18,7 +18,7 @@ import { showNotification } from '../utils/notifications.js';
 export const getAuthConfig = () => {
   const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
   const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
-  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5173';
+  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
   const redirectUri = import.meta.env.VITE_AUTH_REDIRECT_URI;
 
   console.log(`[Auth] Environment: ${environment}`, `Client: ${clientId?.substring(0, 15)}...`);

commit 216a333a778863701b4051b085855b421572be73
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 8 07:32:55 2026 +0300

    feat(ui): v0.19.060 UI Master - hologram light, 5-tabs, auth fix, xr stable

diff --git a/index.html b/index.html
index e9ce3f2..65c490d 100644
--- a/index.html
+++ b/index.html
@@ -311,6 +311,13 @@
     </div>
     <!-- Область жестов -->
     <div id="gesture-area">
+      <div class="gesture-tabs">
+        <button class="gesture-tab active" data-mode="record">запись</button>
+        <button class="gesture-tab" data-mode="edit">правка</button>
+        <button class="gesture-tab" data-mode="action">действие</button>
+        <button class="gesture-tab" data-mode="chain">сцепка</button>
+        <button class="gesture-tab" data-mode="test">тест</button>
+      </div>
       <div id="gesture-line"></div>
     </div>
   </div>
@@ -319,11 +326,11 @@
   <div id="right-panel" class="panel right-panel">
     <!-- Header for panel views -->
     <div id="rightPanelHeader"
-      style="text-align: center; color: white; margin-top: 15px; margin-bottom: 10px; font-size: 16px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">
+      style="text-align: center; color: #888888; margin-top: 10px; margin-bottom: 15px; font-size: 16px; font-weight: normal; text-transform: uppercase; letter-spacing: 1px;">
       ИСТОРИЯ ЧАТА</div>
 
     <!-- Верхняя разделительная линия правой панели -->
-    <hr class="panel-hr" style="flex-shrink: 0; margin-bottom: 0 !important;">
+    <hr class="panel-hr" style="flex-shrink: 0; margin-top: 5px !important; margin-bottom: 0 !important;">
 
     <!-- Контейнер для содержимого - переключаемые области -->
     <div class="content-container" style="flex: 1; overflow-y: auto; padding-top: 10px;">

commit eb7c5a1ce0075a80b12e9bf8a8760c6521218e41
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 8 01:02:29 2026 +0300

    fix(ui): correct 2D grid column overlapping width, fix auth API URL, and rewrite chat to use raw API

diff --git a/js/core/auth.js b/js/core/auth.js
index b4e2c9a..93c75fd 100644
--- a/js/core/auth.js
+++ b/js/core/auth.js
@@ -9,9 +9,7 @@ import { state } from './init.js';
 import { updateAuthUI } from '../ui/uiManager.js';
 import { showNotification } from '../utils/notifications.js';
 
-// Используем полный URL для надежности при обмене токена
-// Используем полный URL для надежности при обмене токена напрямую с Koyeb
-const BACKEND_TOKEN_URL = 'https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app/api/v1/auth/token';
+// URL-ы теперь берутся динамически через getAuthConfig()
 
 /**
  * Получает конфигурацию аутентификации на основе переменных окружения.
@@ -53,7 +51,8 @@ async function handleGoogleCredentialResponse(response) {
   console.log('Получен Google ID токен:', googleIdToken);
 
   try {
-    const backendResponse = await fetch(BACKEND_TOKEN_URL, {
+    const { apiUrl } = getAuthConfig();
+    const backendResponse = await fetch(`${apiUrl}/api/v1/auth/token`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
@@ -133,8 +132,9 @@ async function checkInitialAuthState() {
   if (token) {
     try {
       // Проверяем валидность токена через запрос "кто я?"
-      // Используем /api/v1/auth/me (этот роут должен быть на бэкенде)
-      const response = await fetch('/api/v1/auth/me', {
+      // Используем полный URL из конфигурации, так как Cloudflare Pages не проксирует /api/v1 локально
+      const { apiUrl } = getAuthConfig();
+      const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
         headers: { 'Authorization': `Bearer ${token}` }
       });
 

commit 655efbbd9de1fd3d9cc8bdaf45bf603e1ae16c19
Author: NeuroCoder <neorh@holograms.media>
Date:   Sun Mar 8 00:37:12 2026 +0300

    fix: resolve XR empty screen, WS timeouts, LLM chat, and Monaco integration

diff --git a/index.html b/index.html
index c1bb1d4..e9ce3f2 100644
--- a/index.html
+++ b/index.html
@@ -109,7 +109,7 @@
   <meta name="twitter:card" content="summary_large_image">
 
   <meta http-equiv="Content-Security-Policy"
-    content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: https://*.googleusercontent.com https://accounts.google.com; worker-src 'self' blob:; connect-src 'self' https://holograms.media https://dev.holograms.media https://*.koyeb.app wss://*.koyeb.app wss://holograms.media wss://www.holograms.media ws://localhost:* http://localhost:* https://cdn.jsdelivr.net https://accounts.google.com https://api.github.com blob: data:; frame-src 'self' https://accounts.google.com;">
+    content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: https://*.googleusercontent.com https://accounts.google.com; worker-src 'self' blob: https://cdnjs.cloudflare.com; connect-src 'self' https://holograms.media https://dev.holograms.media https://*.koyeb.app wss://*.koyeb.app wss://holograms.media wss://www.holograms.media ws://localhost:* http://localhost:* https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://accounts.google.com https://api.github.com blob: data:; frame-src 'self' https://accounts.google.com;">
 
 
   <!-- MediaPipe Libraries -->
@@ -199,7 +199,6 @@
     <hr class="panel-hr">
 
     <!-- Deploy Version Tracker -->
-    <span class="version-label">v0.19.050</span>
     <!-- Central Block -->
     <div class="left-panel-group central-block">
       <!-- Existing buttons will be consolidated here. Keeping a few representative ones. -->

commit 86dcc1b347bef41cbeb865b3e2c7b2c501045f9b
Author: NeuroCoder <neorh@holograms.media>
Date:   Sat Mar 7 01:07:19 2026 +0300

    feat(ui): XR camera fix, Monaco Editor modal, QR Code and hot-swap iframe bypass

diff --git a/index.html b/index.html
index e253f81..c1bb1d4 100644
--- a/index.html
+++ b/index.html
@@ -47,7 +47,7 @@
       }
     };
   </script>
-  <script>console.log("DEPLOY VERSION: 0.19.049 - HOT RELOAD, QR THUMBNAILS, GITHUB PROXY");</script>
+  <script>console.log("DEPLOY VERSION: 0.19.050 - XR FIX, MONACO MODAL, QR HOTSWAP");</script>
 
 
 
@@ -198,6 +198,8 @@
 
     <hr class="panel-hr">
 
+    <!-- Deploy Version Tracker -->
+    <span class="version-label">v0.19.050</span>
     <!-- Central Block -->
     <div class="left-panel-group central-block">
       <!-- Existing buttons will be consolidated here. Keeping a few representative ones. -->
@@ -322,10 +324,10 @@
       ИСТОРИЯ ЧАТА</div>
 
     <!-- Верхняя разделительная линия правой панели -->
-    <hr class="panel-hr">
+    <hr class="panel-hr" style="flex-shrink: 0; margin-bottom: 0 !important;">
 
     <!-- Контейнер для содержимого - переключаемые области -->
-    <div class="content-container">
+    <div class="content-container" style="flex: 1; overflow-y: auto; padding-top: 10px;">
       <!-- Таймлайн (Режим по умолчанию) -->
       <div id="versionTimeline" class="panel-section default-mode" style="display: none;">
         <div id="versionFrames"></div>
