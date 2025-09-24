// frontend/js/SmartHologram.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Класс SmartHologram - основной компонент для создания и управления голографическими объектами
 * Теперь работает с жестами вместо текстового ввода
 */
export class SmartHologram {
    constructor(container, gestureManager, aiEngine, renderer = null) {
        this.container = container;
        this.gestureManager = gestureManager;
        this.ai = aiEngine;

        // Three.js компоненты
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Используем переданный рендерер или создаем новый (только если WebGL доступен)
        if (renderer) {
            this.renderer = renderer;
        } else {
            try {
                this.renderer = new THREE.WebGLRenderer({ antialias: true });
            } catch (error) {
                console.error('SmartHologram: WebGL не доступен, создаем fallback');
                // Создаем простой fallback рендерер
                const canvas = document.createElement('canvas');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                this.renderer = {
                    domElement: canvas,
                    setSize: () => {},
                    render: () => {}
                };
            }
        }
        
        this.controls = this.renderer.domElement ? new OrbitControls(this.camera, this.renderer.domElement) : null;

        // Голографические объекты
        this.hologramObjects = new THREE.Group();

        // Состояние жестов
        this.currentGesture = null;
        this.gestureSequence = [];
        this.lastGestureTime = 0;

        // Настройки анимации
        this.animationSpeed = 0.01;
        this.pulseIntensity = 0.5;
    }

    /**
     * Инициализация голографической системы
     */
    async init() {
        console.log('Инициализация SmartHologram с поддержкой жестов...');

        // Настройка рендерера
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Настройка сцены
        this.scene.background = new THREE.Color(0x101020);
        this.scene.add(this.hologramObjects);

        // Освещение
        this.setupLighting();
        this.setupCamera();

        // Интерфейс для жестов
        this.setupGestureInterface();

        // Запуск анимации
        this.animate();

        // Обработчики событий
        window.addEventListener('resize', () => this.onWindowResize());

        // Подписка на события жестов
        this.setupGestureListeners();

        console.log('SmartHologram инициализирован с поддержкой жестов');
    }

    /**
     * Настройка освещения сцены
     */
    setupLighting() {
        // Основное освещение
        this.scene.add(new THREE.AmbientLight(0x404040, 1.2));

        // Направленный свет
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // Точечный свет для эффектов
        const pointLight = new THREE.PointLight(0x00ffff, 0.8, 100);
        pointLight.position.set(0, 5, 5);
        this.scene.add(pointLight);
    }

    /**
     * Настройка камеры
     */
    setupCamera() {
        this.camera.position.set(0, 5, 15);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.update();
    }

    /**
     * Настройка интерфейса для отображения информации о жестах
     */
    setupGestureInterface() {
        const gestureUI = document.createElement('div');
        gestureUI.id = 'gesture-ui';
        gestureUI.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 14px;
            z-index: 1000;
            min-width: 200px;
        `;

        gestureUI.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">Распознанные жесты:</div>
            <div id="current-gesture" style="margin-bottom: 10px;">Ожидание...</div>
            <div id="gesture-sequence" style="font-size: 12px; color: #ccc;"></div>
            <div style="margin-top: 10px; font-size: 12px;">
                <div>Создано объектов: <span id="object-count">0</span></div>
            </div>
        `;

        document.body.appendChild(gestureUI);
    }

    /**
     * Настройка слушателей событий жестов
     */
    setupGestureListeners() {
        console.log('SmartHologram: gestureManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.gestureManager)));

        // Слушаем события от gestureManager
        if (this.gestureManager) {
            this.gestureManager.addEventListener('gestureDetected', (event) => {
                this.handleGestureDetected(event.detail);
            });

            this.gestureManager.addEventListener('gestureSequence', (event) => {
                this.handleGestureSequence(event.detail);
            });
        }

        // Дополнительные обработчики для мыши/тач
        this.setupMouseControls();
    }

    /**
     * Настройка управления мышью для создания объектов
     */
    setupMouseControls() {
        let isMouseDown = false;
        let startPosition = null;

        this.renderer.domElement.addEventListener('mousedown', (event) => {
            isMouseDown = true;
            startPosition = this.getMousePosition(event);
        });

        this.renderer.domElement.addEventListener('mouseup', (event) => {
            if (isMouseDown && startPosition) {
                const endPosition = this.getMousePosition(event);
                const distance = Math.sqrt(
                    Math.pow(endPosition.x - startPosition.x, 2) +
                    Math.pow(endPosition.y - startPosition.y, 2)
                );

                if (distance < 10) {
                    // Клик - создать объект
                    this.createObjectAtPosition(endPosition);
                }
            }
            isMouseDown = false;
            startPosition = null;
        });
    }

    /**
     * Получение позиции мыши в мировых координатах
     */
    getMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);

        return intersection;
    }

    /**
     * Обработка распознанного жеста
     */
    handleGestureDetected(gestureData) {
        this.currentGesture = gestureData;
        this.lastGestureTime = Date.now();

        // Обновление UI
        const gestureElement = document.getElementById('current-gesture');
        if (gestureElement) {
            gestureElement.textContent = `Жест: ${gestureData.name} (${Math.round(gestureData.confidence * 100)}%)`;
        }

        // Создание объекта на основе жеста
        this.createObjectFromGesture(gestureData);

        console.log('Распознан жест:', gestureData);
    }

    /**
     * Обработка последовательности жестов
     */
    handleGestureSequence(sequenceData) {
        this.gestureSequence = sequenceData.gestures;

        // Обновление UI
        const sequenceElement = document.getElementById('gesture-sequence');
        if (sequenceElement) {
            sequenceElement.textContent = `Последовательность: ${sequenceData.gestures.map(g => g.name).join(' → ')}`;
        }

        // Создание сложного объекта на основе последовательности
        this.createComplexObjectFromSequence(sequenceData);

        console.log('Распознана последовательность:', sequenceData);
    }

    /**
     * Создание объекта на основе распознанного жеста
     */
    createObjectFromGesture(gestureData) {
        let geometry;
        let material;
        let position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            Math.random() * 5,
            (Math.random() - 0.5) * 10
        );

        switch (gestureData.name.toLowerCase()) {
            case 'open_hand':
            case 'palm':
                // Создаем сферу
                geometry = new THREE.SphereGeometry(1, 32, 16);
                material = new THREE.MeshStandardMaterial({
                    color: 0x00ff88,
                    emissive: 0x002211,
                    roughness: 0.3
                });
                break;

            case 'fist':
            case 'closed_hand':
                // Создаем куб
                geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                material = new THREE.MeshStandardMaterial({
                    color: 0xff6600,
                    emissive: 0x221100,
                    roughness: 0.5
                });
                break;

            case 'point':
            case 'index_finger':
                // Создаем цилиндр
                geometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
                material = new THREE.MeshStandardMaterial({
                    color: 0x0088ff,
                    emissive: 0x001122,
                    roughness: 0.2
                });
                break;

            case 'peace':
            case 'v_sign':
                // Создаем тор
                geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
                material = new THREE.MeshStandardMaterial({
                    color: 0xff0088,
                    emissive: 0x220011,
                    roughness: 0.4
                });
                break;

            default:
                // Создаем икосаэдр по умолчанию
                geometry = new THREE.IcosahedronGeometry(1, 0);
                material = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    emissive: 0x111111,
                    roughness: 0.6
                });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Добавляем анимацию
        mesh.userData = {
            originalY: position.y,
            phase: Math.random() * Math.PI * 2,
            amplitude: 0.5 + Math.random() * 0.5
        };

        this.hologramObjects.add(mesh);
        this.updateObjectCount();

        console.log(`Создан объект типа ${gestureData.name} на позиции`, position);
    }

    /**
     * Создание объекта в указанной позиции (для клика мышью)
     */
    createObjectAtPosition(position) {
        const geometry = new THREE.OctahedronGeometry(0.8, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0x222200,
            roughness: 0.3
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y += 1; // Поднимаем над плоскостью

        mesh.userData = {
            originalY: mesh.position.y,
            phase: Math.random() * Math.PI * 2,
            amplitude: 0.3
        };

        this.hologramObjects.add(mesh);
        this.updateObjectCount();

        console.log('Создан объект по клику на позиции', position);
    }

    /**
     * Создание сложного объекта на основе последовательности жестов
     */
    createComplexObjectFromSequence(sequenceData) {
        if (sequenceData.gestures.length < 3) return;

        // Создаем группу связанных объектов
        const group = new THREE.Group();
        const basePosition = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            2,
            (Math.random() - 0.5) * 8
        );

        // Создаем несколько связанных объектов
        for (let i = 0; i < sequenceData.gestures.length; i++) {
            const offset = new THREE.Vector3(
                (i - 1) * 2,
                Math.sin(i) * 0.5,
                Math.cos(i) * 0.5
            );

            const geometry = new THREE.DodecahedronGeometry(0.6, 0);
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(i / sequenceData.gestures.length, 0.8, 0.6),
                emissive: new THREE.Color().setHSL(i / sequenceData.gestures.length, 0.3, 0.2),
                roughness: 0.4
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(basePosition).add(offset);

            mesh.userData = {
                originalPosition: mesh.position.clone(),
                phase: i * Math.PI / 3,
                amplitude: 0.8
            };

            group.add(mesh);
        }

        this.hologramObjects.add(group);
        this.updateObjectCount();

        console.log(`Создан комплексный объект из ${sequenceData.gestures.length} элементов`);
    }

    /**
     * Обновление счетчика объектов в UI
     */
    updateObjectCount() {
        const countElement = document.getElementById('object-count');
        if (countElement) {
            const totalObjects = this.hologramObjects.children.reduce((count, child) => {
                return count + (child.children ? child.children.length : 1);
            }, 0);
            countElement.textContent = totalObjects;
        }
    }

    /**
     * Очистка всех голографических объектов
     */
    clearHologram() {
        while (this.hologramObjects.children.length > 0) {
            const child = this.hologramObjects.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            this.hologramObjects.remove(child);
        }
        this.updateObjectCount();
        console.log('Все объекты очищены');
    }

    /**
     * Обработка изменения размера окна
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Основной цикл анимации
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;

        // Анимация объектов
        this.hologramObjects.traverse((object) => {
            if (object.userData && object.userData.originalY !== undefined) {
                object.position.y = object.userData.originalY +
                    Math.sin(time + object.userData.phase) * object.userData.amplitude;
                object.rotation.y += this.animationSpeed;
            }
        });

        // Обновление элементов управления
        this.controls.update();

        // Рендеринг сцены
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Уничтожение экземпляра и очистка ресурсов
     */
    dispose() {
        // Очистка геометрий и материалов
        this.hologramObjects.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });

        // Удаление из DOM
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }

        // Очистка рендерера
        this.renderer.dispose();

        // Удаление UI
        const gestureUI = document.getElementById('gesture-ui');
        if (gestureUI) {
            gestureUI.remove();
        }

        console.log('SmartHologram уничтожен');
    }
}
