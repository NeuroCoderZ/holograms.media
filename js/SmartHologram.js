// frontend/js/SmartHologram.js
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export class SmartHologram {
    constructor(container, aiEngine) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.ai = aiEngine; // Принимаем экземпляр AI-движка извне
        this.hologramObjects = new THREE.Group();
    }

    async init() {
        console.log('Initializing SmartHologram...');
        // Renderer setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        console.log('Renderer created and appended.');

        // Scene setup
        this.scene.background = new THREE.Color(0x101020);
        this.scene.add(this.hologramObjects);
        this.setupLighting();
        this.setupCamera();
        console.log('Scene, lighting, and camera setup complete.');

        // UI
        this.setupInterface();
        console.log('UI setup complete.');

        // Start animation loop
        this.animate();

        // Handle window resizing
        window.addEventListener('resize', () => this.onWindowResize());
        console.log('SmartHologram initialization complete.');
    }

    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0x404040, 2));
        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(10, 10, 10);
        this.scene.add(light);
    }

    setupCamera() {
        this.camera.position.set(0, 5, 15);
        this.controls.update();
    }

    setupInterface() {
        const uiContainer = document.createElement('div');
        uiContainer.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 100; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px;';
        uiContainer.innerHTML = `
            <input type="text" id="hologram-command" placeholder="Describe the hologram..." style="width: 300px; padding: 8px;">
            <button id="generate-hologram" style="padding: 8px;">Generate</button>
            <button id="clear-hologram" style="padding: 8px;">Clear</button>
        `;
        document.body.appendChild(uiContainer);

        document.getElementById('generate-hologram').addEventListener('click', () => this.handleUserCommand());
        document.getElementById('clear-hologram').addEventListener('click', () => this.clearHologram());
        document.getElementById('hologram-command').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserCommand();
        });
    }

    async handleUserCommand() {
        const input = document.getElementById('hologram-command');
        const commandText = input.value.trim();
        if (!commandText) return;

        console.log(`Sending to AI: "${commandText}"`);
        const aiCommand = await this.ai.generateHologramCommand(commandText);
        if (aiCommand) {
            console.log('Received command from AI:', aiCommand);
            this.executeHologramCommand(aiCommand);
        }
        input.value = '';
    }

    executeHologramCommand(command) {
        const { action, parameters } = command;
        if (action === 'clear') {
            this.clearHologram();
            return;
        }
        if (action === 'create') {
            let geometry;
            switch (parameters.type) {
                case 'BoxGeometry':
                    geometry = new THREE.BoxGeometry(parameters.width || 1, parameters.height || 1, parameters.depth || 1);
                    break;
                case 'SphereGeometry':
                default:
                    geometry = new THREE.SphereGeometry(parameters.radius || 1, 32, 16);
            }
            const material = new THREE.MeshStandardMaterial({ color: parameters.color || '#ffffff', roughness: 0.5 });
            const mesh = new THREE.Mesh(geometry, material);
            if (parameters.position) mesh.position.set(...parameters.position);
            this.hologramObjects.add(mesh);
        }
    }

    clearHologram() {
        while (this.hologramObjects.children.length > 0) {
            this.hologramObjects.remove(this.hologramObjects.children[0]);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.hologramObjects.rotation.y += 0.002;
        this.renderer.render(this.scene, this.camera);
    }
}
