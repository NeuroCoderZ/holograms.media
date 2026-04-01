// js/ui/GestureUIManager.js
// Manages the gesture recording panel with two lanes (left hand / right hand)
// and click-to-record functionality with a moving red line.

class GestureUIManager {
    constructor(eventBus, state) {
        this.gestureAreaElement = document.getElementById('gesture-area');
        this.eventBus = eventBus;
        this.state = state;
        this.currentAnimation = null;

        if (!this.gestureAreaElement) {
            console.error("GestureUIManager: #gesture-area element not found!");
            return;
        }

        // Recording state
        this.isRecording = false;
        this.recordingStartTime = 0;
        this.recordingDuration = 20000; // 20 seconds in ms
        this.redLinePosition = 0; // 0 to 1 (normalized)

        // Canvas for visualization
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;
        this.detectedHands = { count: 0, handedness: [] };
        // Latest hand positions for locking to the red line: Map of handId -> {y, z}
        this.currentHandState = new Map();
        // Persistent recording paths: Map of handId -> Array of {x, y, r}
        this.recordedPaths = new Map();

        // Constants for dot sizes (radii)
        this.minDotRadius = 1.5; // 3px diameter
        this.maxDotRadius = 5.0; // 10px diameter


        this.setInitialState();

        this.initialize();
    }

    setInitialState() {
        // Панель жестов всегда центрирована по экрану, НЕ зависит от состояния панелей
        const w = window.innerWidth;
        const h = window.innerHeight;
        const targetScale = Math.min((w * 0.90) / 256, (h * 0.90) / 256);
        const targetWidthPx = targetScale * 256;

        this.gestureAreaElement.style.left = '50%';
        this.gestureAreaElement.style.transform = 'translateX(-50%)';
        this.gestureAreaElement.style.width = `${targetWidthPx}px`;
        this.gestureAreaElement.style.height = '6px';
        this.gestureAreaElement.style.position = 'fixed';
        this.gestureAreaElement.style.bottom = '2dvh';

        // Initialize tab handlers
        this.initTabHandlers();
    }

    initTabHandlers() {
        const tabs = this.gestureAreaElement.querySelectorAll('.gesture-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering record toggle
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const mode = tab.dataset.mode;
                console.log(`[GestureUI] Switched to mode: ${mode}`);
                this.eventBus.emit('gesture:modeChange', mode);
            });
        });
    }


    initialize() {
        if (!this.eventBus) return;

        // Subscribe to hand detection events
        this.eventBus.on('handsDetected', (data) => this.handleHandsChange(true, data));
        this.eventBus.on('handsLost', () => this.handleHandsChange(false));
        this.eventBus.on('handsUpdate', (data) => this.updateHandData(data));



        // Create canvas for recording visualization
        this.initVisualization();

        // Add click handler for recording toggle
        this.gestureAreaElement.addEventListener('click', () => this.toggleRecording());
        this.gestureAreaElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleRecording();
        });

        // Initialize new UI Buttons
        const colBtn = document.getElementById('gestureCollapseButton');
        if (colBtn) {
            colBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Сброс красной линии влево
                this.redLinePosition = 0;
                // Очистка данных
                this.recordedPaths.clear(); 
                this.isRecording = false;
                // Сброс кнопки сохранения в серый
                const saveBtn = document.getElementById('gestureSaveCloudButton');
                if (saveBtn) {
                    saveBtn.style.color = '#E3E3E3';
                    saveBtn.classList.remove('active', 'has-changes');
                }
                // Возврат панели в базовое состояние
                this.animateGestureArea(false); 
            });
        }
        
        const saveBtn = document.getElementById('gestureSaveCloudButton');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.recordedPaths.size > 0) {
                    this._saveGestureToLocalStorage(Array.from(this.recordedPaths.entries()));
                    saveBtn.style.color = '#FFFFFF';
                    saveBtn.classList.add('active');
                    saveBtn.classList.remove('has-changes');
                }
            });
        }

        // Start the visualization loop
        this.startVisualizationLoop();

        // Load external gesture paths from UI
        this.eventBus.on('loadGestureToStudio', (paths) => {
            if (!paths) return;
            this.recordedPaths.clear();
            paths.forEach(([key, pts]) => {
                this.recordedPaths.set(key, pts);
            });
            this.isRecording = false;
            // Force panel to expand completely if it's currently shrunk
            this.animateGestureArea(true);
            
            // Switch tab to 'edit' mode to show it is loaded
            const editTab = document.querySelector('.gesture-tab[data-mode="edit"]');
            if (editTab) editTab.click();
            
            // Mark save button as having changes (gray)
            const saveBtn = document.getElementById('gestureSaveCloudButton');
            if (saveBtn) {
                saveBtn.style.color = '#E3E3E3';
                saveBtn.classList.remove('active');
                saveBtn.classList.add('has-changes');
            }
        });

        // Map gesture commands to real DOM UI actions
        this.eventBus.on('studio:gestureMatched', (match) => {
            if (match && match.commandId) {
                // CommandEngine is handled elsewhere or we can trigger it here if needed.
                // But GestureLiveStudio already calls commandEngine.executeCommand? 
                // Actually, let's keep it here for DIRECT gesture execution (TEST mode).
                if (window.commandEngine) {
                    window.commandEngine.executeCommand(match.commandId, match.params);
                }
            }
        });

        console.log("GestureUIManager: Initialized with recording lanes.");
    }

    handleHandsChange(present, data = null) {
        if (present && data) {
            this.detectedHands = data;
        } else if (!present) {
            this.detectedHands = { count: 0, handedness: [] };
            this.currentHandState.clear();
            // We keep recordedPaths until a new recording starts
            // User: "оставить отображение записанной траектории сразу в панели жестов"
        }
        this.animateGestureArea(present);
    }
    updateHandData(data) {
        if (!data || !data.landmarks) return;

        // Clear previous state to remove hands that are no longer present
        this.currentHandState.clear();

        const fingerIndices = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips

        data.landmarks.forEach((landmarks, index) => {
            const handedness = data.handedness[index];
            if (!handedness) return;

            const handId = handedness.label || handedness.categoryName || index;

            // Store current state for all 5 fingers
            const fingerStates = fingerIndices.map(idx => {
                const tip = landmarks[idx];
                return tip ? { y: tip.y, z: tip.z } : null;
            }).filter(s => s !== null);

            this.currentHandState.set(handId, fingerStates);
        });
    }





    animateGestureArea(present) {
        if (!this.gestureAreaElement) return;

        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }

        const w = window.innerWidth;
        const h = window.innerHeight;
        // Synchronized with sceneSetup.js logic
        const targetScale = Math.min((w * 0.9) / 256, (h * 0.9) / 256);

        // Panel height = 25dvh (ТЗ v4.5)
        const targetWidthPx = targetScale * 256;
        const targetHeightPx = present ? (window.innerHeight * 0.25) : 6;



        const currentHeightPx = this.gestureAreaElement.offsetHeight;
        const currentWidthPx = this.gestureAreaElement.offsetWidth;

        // Always center horizontally to avoid jumps during animation
        // Always center horizontally
        this.gestureAreaElement.style.left = '50%';
        this.gestureAreaElement.style.transform = 'translateX(-50%)';

        if (present) {
            this.gestureAreaElement.classList.add('hands-detected');
            document.querySelector('.main-area')?.classList.add('squashed');

            // Set dynamic offset for hologram gap (5vh panel bottom + panel height + 5vh gap)
            const root = document.documentElement;
            root.style.setProperty('--gesture-panel-height', `${targetHeightPx}px`);
        } else {
            this.gestureAreaElement.classList.remove('hands-detected');
            document.querySelector('.main-area')?.classList.remove('squashed');

            // BUGFIX: Не схлопываем панель, если идет запись ИЛИ если есть записанная траектория
            if (this.isRecording || this.recordedPaths.size > 0) {
                console.log("GestureUIManager: Hands lost but keeping panel open (recording or data present).");
                return; // Не запускаем анимацию закрытия
            }
        }

        const coords = { height: currentHeightPx, width: currentWidthPx };
        this.currentAnimation = new window.TWEEN.Tween(coords)
            .to({ height: targetHeightPx, width: targetWidthPx }, 300)
            .easing(window.TWEEN.Easing.Cubic.Out) // Faster, snappier feel like side panels
            .onUpdate(() => {


                this.gestureAreaElement.style.height = `${coords.height}px`;
                this.gestureAreaElement.style.width = `${coords.width}px`;
            })
            .onComplete(() => {
                this.currentAnimation = null;
                this.resizeCanvas();
            })
            .start();
    }

    initVisualization() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        Object.assign(this.canvas.style, {
            position: 'absolute',
            top: '32px', // Height of .gesture-tabs
            left: '0',
            width: '100%',
            height: 'calc(100% - 32px)',
            pointerEvents: 'none',
            zIndex: '1'
        });

        this.gestureAreaElement.appendChild(this.canvas);
        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.setInitialState();
            this.resizeCanvas();
        });
    }


    resizeCanvas() {
        if (!this.canvas || !this.gestureAreaElement) return;
        const dpr = window.devicePixelRatio || 1;
        const width = this.gestureAreaElement.clientWidth;
        const height = this.gestureAreaElement.clientHeight;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);
    }


    toggleRecording() {
        if (!this.gestureAreaElement.classList.contains('hands-detected') && !this.isRecording) {
            // Panel must be expanded to record, unless we are already recording (to stop)
            return;
        }

        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        if (this.isRecording) return;
        this.isRecording = true;
        this.recordingStartTime = performance.now();
        this.redLinePosition = 0;
        this.recordedPaths.clear(); // Clear previous recording paths
        this.gestureAreaElement.classList.add('recording');
        
        console.log("GestureUIManager: Recording started (20s timeout active).");
        this.eventBus?.emit('gestureRecordingStarted');

        // AUTO-STOP after 20 seconds
        this.recordingTimeout = setTimeout(() => {
            if (this.isRecording) {
                console.log("GestureUIManager: 20s limit reached. Stopping...");
                this.stopRecording();
            }
        }, 20000);
    }

    stopRecording() {
        if (!this.isRecording) return;
        
        // Clear timeout if manual stop
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }

        this.isRecording = false;
        this.gestureAreaElement.classList.remove('recording');
        // НЕ сбрасываем redLinePosition — линия остаётся на месте завершения записи

        this.eventBus?.emit('gestureRecordingStopped', {
            paths: Array.from(this.recordedPaths.entries()),
            duration: performance.now() - this.recordingStartTime
        });
        
        console.log("GestureUIManager: Recording stopped. Saving to local storage and sync...");
        
        this._saveGestureToLocalStorage(Array.from(this.recordedPaths.entries()));

        // Автоматически активируем кнопку "Ваши жесты"
        const gestButton = document.getElementById('gestureRecordButton');
        if (gestButton) {
            console.log("GestureUIManager: Auto-triggering 'Your Gestures' panel.");
            gestButton.click();
        }

        // Если рук нет, теперь можно схлопнуть панель ТРИА:
        // Убрали проверку, чтобы панель ОСТАВАЛАСЬ открытой с результатами
        console.log("GestureUIManager: Recording finished. Keeping panel open.");
    }

    /**
     * Сохранение жеста в localStorage для последующего использования
     */
    _saveGestureToLocalStorage(paths) {
        try {
            const savedGestures = JSON.parse(localStorage.getItem('tria_saved_gestures') || '[]');
            
            // ЛОГИКА FIFO 10: 11-я запись удаляет 1-ю (самую раннюю и неточную)
            if (savedGestures.length >= 10) {
                console.log("GestureUIManager: FIFO Limit reached (10). Evicting oldest gesture variation.");
                savedGestures.shift();
            }

            const newGesture = {
                id: `gesture_${Date.now()}`,
                timestamp: new Date().toISOString(),
                paths: paths,
                name: `Evolution iteration #${savedGestures.length + 1}`
            };

            savedGestures.push(newGesture);
            localStorage.setItem('tria_saved_gestures', JSON.stringify(savedGestures));
            
            // Sync current state with backend/AstraDB
            this._syncWithCloud(newGesture);

            // Оповещаем другие компоненты (например, панель "Ваши жесты")
            this.eventBus?.emit('gesturesDataUpdated', savedGestures);
        } catch (e) {
            console.error("GestureUIManager: Error saving gesture:", e);
        }
    }

    /**
     * Отправка жеста на бэкенд для обучения модели в AstraDB
     */
    async _syncWithCloud(gesture) {
        try {
            const userState = this.state?.user || {};
            const userId = userState.id || userState.sub;
            
            // Не синхронизируем если нет идентификатора пользователя
            if (!userId || userId === 'guest') {
                console.log("GestureUIManager: Cloud sync skipped — no authenticated user.");
                return;
            }
            
            // Форматируем под UserGestureModel
            const payload = {
                id: gesture.id,
                gesture_name: gesture.name,
                trajectories: gesture.paths,
                code: ""
            };

            const { API_BASE_URL } = await import('../services/apiService.js');
            const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/gestures`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                console.log("GestureUIManager: Cloud sync SUCCESS for iteration:", gesture.id);
            } else {
                console.warn(`GestureUIManager: Cloud sync returned ${response.status}`);
            }
        } catch (error) {
            console.warn("GestureUIManager: Cloud sync failed (offline mode):", error.message);
        }
    }

    startVisualizationLoop() {
        const draw = () => {
            this.animationFrameId = requestAnimationFrame(draw);

            if (!this.ctx || !this.canvas) return;

            const w = this.gestureAreaElement.clientWidth;
            const h = this.gestureAreaElement.clientHeight;

            if (w === 0 || h === 0) return;


            this.ctx.clearRect(0, 0, w, h);

            // Constants for padding
            const sidePadding = 12; // 12px horizontal padding from each side
            const effectiveWidth = w - (sidePadding * 2);
            const scannerX = sidePadding + (this.redLinePosition * effectiveWidth);

            // Draw lanes and scanner lines based on hands count
            if (this.detectedHands.count === 2) {
                const laneHeight = h / 2;
                const laneVerticalPadding = Math.max(6, laneHeight * 0.05); // Min 6px or 5%

                // Top lane - легкая прозрачная тонировка для визуального разделения
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                this.ctx.fillRect(0, 0, w, laneHeight - 1);

                // Bottom lane - легкое затемнение
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                this.ctx.fillRect(0, laneHeight + 1, w, laneHeight - 1);

                // Divider line
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(0, laneHeight);
                this.ctx.lineTo(w, laneHeight);
                this.ctx.stroke();

                // Draw TWO red scanner lines - one per lane
                this.ctx.strokeStyle = '#FF3B30';
                this.ctx.lineWidth = 1;

                // Top lane scanner line — от верхней границы вкладки до середины
                this.ctx.beginPath();
                this.ctx.moveTo(scannerX, 0);
                this.ctx.lineTo(scannerX, laneHeight);
                this.ctx.stroke();

                // Bottom lane scanner line — от середины до нижнего края
                this.ctx.beginPath();
                this.ctx.moveTo(scannerX, laneHeight);
                this.ctx.lineTo(scannerX, h);
                this.ctx.stroke();

                // Labels - fixed at bottom-right corner of each lane
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.font = '500 10px "Inter", "Segoe UI", sans-serif';
                this.ctx.textAlign = 'right';
                this.ctx.fillText('Левая рука', w - 8, laneHeight - 6);
                this.ctx.fillText('Правая рука', w - 8, h - 6);
                this.ctx.textAlign = 'left';

            } else if (this.detectedHands.count === 1) {
                const verticalPadding = Math.max(10, h * 0.05); // Min 10px or 5% for single view

                // Single lane - фон полностью прозрачный (CSS стекло работает)
                // this.ctx.fillStyle = '#333333';
                // this.ctx.fillRect(0, 0, w, h);

                // Single scanner line — от вкладок до нижнего края
                this.ctx.strokeStyle = '#FF3B30';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(scannerX, 0);
                this.ctx.lineTo(scannerX, h);
                this.ctx.stroke();

                // Label - Improved visibility
                const handedness = this.detectedHands.handedness[0];
                const isLeft = handedness && (handedness.categoryName === 'Left' || handedness.label === 'Left');
                const label = isLeft ? 'Левая рука' : 'Правая рука';

                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Increased opacity
                this.ctx.font = '500 11px "Inter", "Segoe UI", sans-serif'; // Slightly larger
                this.ctx.textAlign = 'right';
                // Ensure text is above bottom padding
                this.ctx.fillText(label, w - 8, h - 6);
                this.ctx.textAlign = 'left';
            }

            // Calculate effective height for dots (different for 1 vs 2 hands)
            const verticalPadding = this.detectedHands.count === 2
                ? Math.max(6, (h / 2) * 0.05)
                : Math.max(10, h * 0.05);
            const effectiveHeight = this.detectedHands.count === 2
                ? (h / 2) - (verticalPadding * 2)
                : h - (verticalPadding * 2);


            // 2. Draw Recorded Paths and Current Dots (Locked to Line)
            this.currentHandState.forEach((fingers, handId) => {
                // Determine lane parameters for dot positioning
                const laneHeight = this.detectedHands.count === 2 ? h / 2 : h;
                const laneVPad = laneHeight * 0.05; // 5% padding within each lane
                const laneEffectiveHeight = laneHeight - (laneVPad * 2);

                // Calculate Y offset based on which lane this hand is in
                let yOffset = laneVPad;
                if (this.detectedHands.count === 2 && handId === 'Right') {
                    yOffset = (h / 2) + laneVPad; // Start of bottom lane + padding
                }

                fingers.forEach((state, fIdx) => {
                    // Calculate current dot radius based on Z
                    const normalizedZ = Math.max(0, Math.min(1, (state.z + 0.5) * 2));
                    const radius = this.minDotRadius + (1 - normalizedZ) * (this.maxDotRadius - this.minDotRadius);
                    // Calculate Y position within the lane
                    const rawY = yOffset + (state.y * laneEffectiveHeight);
                    // Clamp within lane bounds
                    const laneTop = this.detectedHands.count === 2 && handId === 'Right' ? (h / 2) + laneVPad : laneVPad;
                    const laneBottom = this.detectedHands.count === 2 && handId === 'Right' ? h - laneVPad : (h / 2) - laneVPad;
                    const curY = this.detectedHands.count === 2
                        ? Math.max(laneTop + radius, Math.min(laneBottom - radius, rawY))
                        : Math.max(laneVPad + radius, Math.min(h - laneVPad - radius, rawY));
                    const pathKey = `${handId}_${fIdx}`;

                    // 1. Store point if recording
                    if (this.isRecording) {
                        if (!this.recordedPaths.has(pathKey)) {
                            this.recordedPaths.set(pathKey, []);
                        }
                        const path = this.recordedPaths.get(pathKey);
                        path.push({ x: scannerX, y: curY, r: radius });
                    }

                    // 2. Draw persistent recording path
                    const path = this.recordedPaths.get(pathKey);
                    if (path && path.length > 0) {
                        this.ctx.beginPath();
                        this.ctx.lineWidth = 1.2;
                        this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
                        path.forEach((pt, i) => {
                            if (i === 0) this.ctx.moveTo(pt.x, pt.y);
                            else this.ctx.lineTo(pt.x, pt.y);
                        });
                        this.ctx.stroke();
                    }

                    // 3. Draw current dot (locked to red line, ON TOP of red line)
                    this.ctx.fillStyle = '#00FF88';
                    this.ctx.shadowBlur = radius * 2;
                    this.ctx.shadowColor = '#00FF88';
                    this.ctx.beginPath();
                    this.ctx.arc(scannerX, curY, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                });
            });





            // Update red line position if recording
            if (this.isRecording) {
                const elapsed = performance.now() - this.recordingStartTime;
                this.redLinePosition = Math.min(elapsed / this.recordingDuration, 1);

                if (this.redLinePosition >= 1) {
                    this.stopRecording();
                }
            }


            // Recording indicator
            if (this.isRecording) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(w - 20, 20, 8, 0, Math.PI * 2);
                this.ctx.fill();

                // Time remaining
                const timeLeft = Math.max(0, (this.recordingDuration - (performance.now() - this.recordingStartTime)) / 1000);
                this.ctx.fillStyle = 'white';
                this.ctx.font = 'bold 14px sans-serif';
                this.ctx.fillText(`${timeLeft.toFixed(1)}s`, w - 60, 25);
            }
        };

        draw();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }
        if (this.canvas) {
            this.canvas.remove();
        }
    }
}

export default GestureUIManager;
