/**
 * SceneManager - Three.js 씬 관리 (횡스크롤 뷰)
 * 
 * 모든 수치는 GameConfig에서 관리
 */

import * as THREE from 'three';
import { CONFIG } from '../config/GameConfig.js';

export class SceneManager {
    constructor(container, debug = null) {
        this.container = container;
        this.debug = debug;

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // CONFIG에서 설정 가져오기
        this.scrollSpeed = CONFIG.GAME.SCROLL_SPEED;
        this.cameraX = 0;

        this.backgroundLayers = [];
        this.groundTiles = [];
        this.tileWidth = 10;

        // CONFIG에서 색상 가져오기
        this.colors = CONFIG.VISUAL.COLORS;
    }

    init() {
        this.log('Three.js 횡스크롤 씬 초기화');

        this.scene = new THREE.Scene();

        // 직교 카메라 (CONFIG에서 뷰 높이 가져옴)
        const aspect = window.innerWidth / window.innerHeight;
        const viewHeight = CONFIG.VISUAL.CAMERA_VIEW_HEIGHT;
        this.camera = new THREE.OrthographicCamera(
            -viewHeight * aspect / 2,
            viewHeight * aspect / 2,
            viewHeight / 2,
            -viewHeight / 2,
            0.1,
            1000
        );
        this.camera.position.set(0, CONFIG.VISUAL.CAMERA_Y, 10);
        this.camera.lookAt(0, CONFIG.VISUAL.CAMERA_Y, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(this.colors.SKY);

        this.container.appendChild(this.renderer.domElement);

        this.setupLighting();
        this.createBackground();
        this.createGround();

        window.addEventListener('resize', () => this.onResize());

        this.log('씬 초기화 완료');

        return this;
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x9966cc, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(this.colors.ACCENT, 0.3);
        backLight.position.set(-5, 5, -5);
        this.scene.add(backLight);
    }

    createBackground() {
        const bgGeometry = new THREE.PlaneGeometry(100, 20);
        const bgMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(this.colors.SKY) },
                bottomColor: { value: new THREE.Color(this.colors.SKY_BOTTOM) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
                }
            `,
            side: THREE.DoubleSide
        });

        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.position.set(0, 5, -20);
        this.scene.add(bgMesh);

        this.createParallaxLayer(-15, 0.2, 0x1a1a2e);
        this.createParallaxLayer(-10, 0.4, this.colors.SKY);
        this.createParallaxLayer(-5, 0.6, this.colors.GROUND);
    }

    createParallaxLayer(zPos, speedRatio, color) {
        const layer = new THREE.Group();

        for (let x = -30; x < 60; x += 4 + Math.random() * 4) {
            const height = 2 + Math.random() * 5;
            const width = 1 + Math.random() * 2;

            let geometry;
            if (Math.random() > 0.5) {
                geometry = new THREE.ConeGeometry(width, height, 4);
            } else {
                geometry = new THREE.BoxGeometry(width, height, width);
            }

            const material = new THREE.MeshStandardMaterial({
                color: color,
                flatShading: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, -1 + height / 2, 0);
            layer.add(mesh);
        }

        layer.position.z = zPos;
        layer.userData.speedRatio = speedRatio;
        layer.userData.originalX = 0;

        this.scene.add(layer);
        this.backgroundLayers.push(layer);
    }

    createGround() {
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.GROUND,
            flatShading: true
        });

        for (let i = 0; i < 10; i++) {
            const tileGroup = new THREE.Group();

            const groundGeometry = new THREE.BoxGeometry(this.tileWidth, 1, 4);
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.position.y = -0.5;
            tileGroup.add(ground);

            const lineGeometry = new THREE.BoxGeometry(this.tileWidth, 0.15, 4.1);
            const lineMaterial = new THREE.MeshStandardMaterial({
                color: this.colors.GROUND_LIGHT,
                flatShading: true
            });
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.y = 0.07;
            tileGroup.add(line);

            const neonGeometry = new THREE.BoxGeometry(this.tileWidth, 0.05, 0.1);
            const neonMaterial = new THREE.MeshStandardMaterial({
                color: this.colors.ACCENT,
                emissive: this.colors.ACCENT,
                emissiveIntensity: 0.5
            });
            const neon = new THREE.Mesh(neonGeometry, neonMaterial);
            neon.position.set(0, 0.15, 2);
            tileGroup.add(neon);

            tileGroup.position.x = i * this.tileWidth - this.tileWidth * 2;
            tileGroup.position.z = 0;

            this.scene.add(tileGroup);
            this.groundTiles.push(tileGroup);
        }
    }

    updateScrollFromTime(musicTime) {
        // 이론적 위치로 즉시 보정 (누적 오차 제거)
        this.cameraX = musicTime * this.scrollSpeed;
        this.camera.position.x = this.cameraX;

        this.backgroundLayers.forEach(layer => {
            layer.position.x = this.cameraX * layer.userData.speedRatio;
        });

        const tileStart = Math.floor(this.cameraX / this.tileWidth) - 2;
        this.groundTiles.forEach((tile, i) => {
            tile.position.x = (tileStart + i) * this.tileWidth;
        });
    }

    updateScroll(deltaTime) {
        // 이 메서드는 더 이상 주 위치 업데이트에 사용하지 않거나, 
        // 음악이 없는 경우를 위한 fallback으로만 사용
        const scrollAmount = this.scrollSpeed * deltaTime;
        this.cameraX += scrollAmount;
        this.camera.position.x = this.cameraX;
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        const viewHeight = CONFIG.VISUAL.CAMERA_VIEW_HEIGHT;

        this.camera.left = -viewHeight * aspect / 2;
        this.camera.right = viewHeight * aspect / 2;
        this.camera.top = viewHeight / 2;
        this.camera.bottom = -viewHeight / 2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    getCameraX() {
        return this.cameraX;
    }

    log(message, type = 'info') {
        if (this.debug) {
            this.debug.log(`[Scene] ${message}`, type);
        }
        console.log(`[SceneManager] ${message}`);
    }
}
