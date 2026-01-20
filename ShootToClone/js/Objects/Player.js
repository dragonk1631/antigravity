import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameConfig } from '../Data/GameConfig.js';

export class Player {
    constructor(scene, world, level) {
        this.scene = scene;
        this.world = world;
        this.level = level;

        this.position = new THREE.Vector3(0, 1, 15); // 화면 하단 (90%)
        this.targetX = 0;
        this.unitCount = 1;

        this.init();
        this.setupInput();
    }

    init() {
        // 플레이어 메쉬 (Fighter Jet Style)
        this.mesh = new THREE.Group();

        // 1. Main Body (Fuselage)
        const bodyGeo = new THREE.ConeGeometry(0.5, 2, 8);
        bodyGeo.rotateX(Math.PI / 2); // Point forward
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,      // 밝은 녹색 (패널과 구별)
            roughness: 0.4,
            metalness: 0.8,
            emissive: 0x00ff00,   // 녹색 발광
            emissiveIntensity: 0.3  // 발광 강도 감소
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.mesh.add(body);

        // 2. Wings (Swept Back)
        const wingGeo = new THREE.BoxGeometry(3, 0.1, 1.5);
        const wingMat = new THREE.MeshStandardMaterial({
            color: 0x00aa00,      // 진한 녹샄
            roughness: 0.4,
            metalness: 0.8
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.z = 0.5;
        this.mesh.add(wings);

        // 3. Engine Glow (Rear)
        const engineGeo = new THREE.CylinderGeometry(0.3, 0.1, 0.5, 8);
        engineGeo.rotateX(Math.PI / 2);
        const engineMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // 녹색 엔진 불꽃
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.z = 1.2;
        this.mesh.add(engine);

        this.mesh.position.y = 1.0;
        this.scene.add(this.mesh);
    }

    setupInput() {
        this.isDragging = false;
        this.startX = 0;

        window.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            // 화면 폭 대비 민감도
            const deltaX = (e.clientX - this.startX) * 0.02;
            this.targetX += deltaX;
            // 이동 제한
            this.targetX = Math.max(-8, Math.min(8, this.targetX));

            this.startX = e.clientX;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    update(dt, enemies) {
        // Fever Timer
        if (this.feverTimer > 0) {
            this.feverTimer -= dt;
        }

        // 1. 자동 전진
        this.position.z -= GameConfig.PLAYER_SPEED * dt;

        // 2. 좌우 이동 (부드럽게)
        this.position.x = THREE.MathUtils.lerp(this.position.x, this.targetX, 0.1);

        // 메쉬 업데이트
        this.mesh.position.copy(this.position);

        // 3. 자동 조준 및 사격
        return this.handleShooting(dt, enemies);
    }

    handleShooting(dt, enemies) {
        // 발사 속도 결정 (피버 모드면 2배)
        let rate = GameConfig.FIRE_RATE;
        if (this.feverTimer > 0) rate /= 2;

        this.shootTimer = (this.shootTimer || 0) + dt;
        if (this.shootTimer < rate) return null;
        this.shootTimer = 0;

        // 타겟 선정: 무조건 정면 (One Unit One Attack)
        let targetPos = this.position.clone();
        targetPos.z -= 50;
        let type = 'ENEMY'; // 적 충돌 체크용

        // 총알 발사 데이터 리턴
        return {
            startPos: this.position.clone(),
            targetPos: targetPos,
            targetType: type
        };
    }

    activateFever(duration) {
        this.feverTimer = duration;
    }
}
