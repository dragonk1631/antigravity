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
        // 🎨 Cute Hero Character (Player - looks different from enemies!)
        this.mesh = new THREE.Group();
        this.createCuteHero();

        this.mesh.position.y = 0;
        this.scene.add(this.mesh);
    }

    createCuteHero() {
        const baseSize = 1.0; // Player size

        // 1. BODY - Blue hero color to distinguish from enemies
        const bodyGeo = new THREE.SphereGeometry(baseSize, 12, 10);
        bodyGeo.scale(1, 0.8, 1); // Slightly squished

        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x4da6ff, // Bright blue
            roughness: 0.6,
            metalness: 0.1,
            emissive: 0x4da6ff,
            emissiveIntensity: 0.2
        });

        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = baseSize * 0.4;
        this.mesh.add(body);

        // 2. CUTE EARS (like a cat/rabbit!)
        const earGeo = new THREE.ConeGeometry(baseSize * 0.15, baseSize * 0.5, 6);
        const earMat = new THREE.MeshStandardMaterial({ color: 0x6db3ff, roughness: 0.5 });

        const leftEar = new THREE.Mesh(earGeo, earMat);
        leftEar.position.set(-baseSize * 0.35, baseSize * 1.1, 0);
        leftEar.rotation.z = 0.2;
        this.mesh.add(leftEar);

        const rightEar = new THREE.Mesh(earGeo, earMat);
        rightEar.position.set(baseSize * 0.35, baseSize * 1.1, 0);
        rightEar.rotation.z = -0.2;
        this.mesh.add(rightEar);

        // 3. BIG FRIENDLY EYES
        const eyeSize = baseSize * 0.18;
        const eyeOffset = baseSize * 0.28;

        // Eye whites
        const eyeWhiteGeo = new THREE.SphereGeometry(eyeSize, 8, 8);
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

        const leftEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        leftEye.position.set(-eyeOffset, baseSize * 0.7, baseSize * 0.6);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        rightEye.position.set(eyeOffset, baseSize * 0.7, baseSize * 0.6);
        this.mesh.add(rightEye);

        // Pupils
        const pupilGeo = new THREE.SphereGeometry(eyeSize * 0.5, 6, 6);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-eyeOffset, baseSize * 0.7, baseSize * 0.8);
        this.mesh.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(eyeOffset, baseSize * 0.7, baseSize * 0.8);
        this.mesh.add(rightPupil);

        // Eye highlights
        const shineGeo = new THREE.SphereGeometry(eyeSize * 0.25, 4, 4);
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const leftShine = new THREE.Mesh(shineGeo, shineMat);
        leftShine.position.set(-eyeOffset + eyeSize * 0.12, baseSize * 0.8, baseSize * 0.85);
        this.mesh.add(leftShine);

        const rightShine = new THREE.Mesh(shineGeo, shineMat);
        rightShine.position.set(eyeOffset + eyeSize * 0.12, baseSize * 0.8, baseSize * 0.85);
        this.mesh.add(rightShine);

        // 4. CUTE NOSE
        const noseGeo = new THREE.SphereGeometry(baseSize * 0.08, 6, 6);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xff6b9d });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, baseSize * 0.55, baseSize * 0.9);
        this.mesh.add(nose);

        // 5. SMILE (simple arc using torus)
        const smileGeo = new THREE.TorusGeometry(baseSize * 0.25, baseSize * 0.03, 6, 12, Math.PI);
        const smileMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const smile = new THREE.Mesh(smileGeo, smileMat);
        smile.position.set(0, baseSize * 0.4, baseSize * 0.85);
        smile.rotation.z = Math.PI;
        smile.rotation.x = -0.3;
        this.mesh.add(smile);

        // Enable Shadows
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
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

        // Animation: Tail Wag
        if (this.tail) {
            this.tail.rotation.z = Math.sin(Date.now() * 0.01) * 0.2;
        }

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
