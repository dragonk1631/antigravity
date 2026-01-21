import * as THREE from 'three';
import { GameConfig } from '../Data/GameConfig.js';

export class Unit {
    constructor(scene, leaderPosition) {
        this.scene = scene;
        this.alive = true;

        // 유닛별 고유 오프셋 (플레이어 주변에 퍼지도록)
        // X: -2 ~ +2 (좌우로 퍼짐, 더 응집력 있게)
        // Z: +1 ~ +4 (플레이어 뒤쪽에 위치, 더 가까이)
        this.offset = new THREE.Vector3(
            (Math.random() - 0.5) * 4, // X: -2 ~ +2
            0,
            Math.random() * 3 + 1      // Z: +1 ~ +4
        );

        // 플레이어 주변에서 스폰
        this.position = new THREE.Vector3(
            leaderPosition.x + this.offset.x, // 플레이어 X 위치 기준
            1,
            leaderPosition.z + this.offset.z
        );

        // 🎨 Cute Ally Character (Smaller version of player, different color!)
        this.mesh = new THREE.Group();
        this.createCuteAlly();

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // 사격 타이머 (초기값 랜덤으로 분산)
        this.shootTimer = Math.random() * GameConfig.FIRE_RATE;
    }

    createCuteAlly() {
        const baseSize = 0.6; // Smaller than player

        // 1. BODY - Green ally color
        const bodyGeo = new THREE.SphereGeometry(baseSize, 10, 8);
        bodyGeo.scale(1, 0.75, 1);

        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x90ee90, // Light green
            roughness: 0.6,
            metalness: 0.1,
            emissive: 0x90ee90,
            emissiveIntensity: 0.15
        });

        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = baseSize * 0.4;
        this.mesh.add(body);

        // 2. SMALL EARS
        const earGeo = new THREE.ConeGeometry(baseSize * 0.12, baseSize * 0.4, 5);
        const earMat = new THREE.MeshStandardMaterial({ color: 0xadffad, roughness: 0.5 });

        const leftEar = new THREE.Mesh(earGeo, earMat);
        leftEar.position.set(-baseSize * 0.32, baseSize * 1.0, 0);
        leftEar.rotation.z = 0.15;
        this.mesh.add(leftEar);

        const rightEar = new THREE.Mesh(earGeo, earMat);
        rightEar.position.set(baseSize * 0.32, baseSize * 1.0, 0);
        rightEar.rotation.z = -0.15;
        this.mesh.add(rightEar);

        // 3. EYES
        const eyeSize = baseSize * 0.15;
        const eyeOffset = baseSize * 0.25;

        const eyeWhiteGeo = new THREE.SphereGeometry(eyeSize, 8, 8);
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

        const leftEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        leftEye.position.set(-eyeOffset, baseSize * 0.65, baseSize * 0.5);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
        rightEye.position.set(eyeOffset, baseSize * 0.65, baseSize * 0.5);
        this.mesh.add(rightEye);

        // Pupils
        const pupilGeo = new THREE.SphereGeometry(eyeSize * 0.5, 6, 6);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-eyeOffset, baseSize * 0.65, baseSize * 0.7);
        this.mesh.add(leftPupil);

        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(eyeOffset, baseSize * 0.65, baseSize * 0.7);
        this.mesh.add(rightPupil);

        // Eye highlights
        const shineGeo = new THREE.SphereGeometry(eyeSize * 0.2, 4, 4);
        const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const leftShine = new THREE.Mesh(shineGeo, shineMat);
        leftShine.position.set(-eyeOffset + eyeSize * 0.1, baseSize * 0.72, baseSize * 0.75);
        this.mesh.add(leftShine);

        const rightShine = new THREE.Mesh(shineGeo, shineMat);
        rightShine.position.set(eyeOffset + eyeSize * 0.1, baseSize * 0.72, baseSize * 0.75);
        this.mesh.add(rightShine);

        // Enable Shadows
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    update(dt, leaderPos) {
        if (!this.alive) return null;

        // 플레이어와 같은 속도로 함께 이동 (오프셋 유지)
        this.position.x = leaderPos.x + this.offset.x; // 플레이어 X 기준
        this.position.z = leaderPos.z + this.offset.z; // 플레이어 Z 기준

        this.mesh.position.copy(this.position);

        // Tail Wag
        if (this.tail) {
            this.tail.rotation.x = Math.sin(Date.now() * 0.005 + this.position.x) * 0.3; // Randomize phase by position
            this.tail.rotation.y = Math.cos(Date.now() * 0.005) * 0.1;
        }

        // 발사 타이머 (플레이어 절반 속도)
        this.shootTimer += dt;
        if (this.shootTimer >= GameConfig.UNIT_FIRE_RATE) {
            this.shootTimer = 0;

            // 발사 정보 리턴
            const targetPos = this.position.clone();
            targetPos.z -= 50; // 정면 사격

            return {
                startPos: this.position.clone(),
                targetPos: targetPos,
                targetType: 'ENEMY'
            };
        }
        return null;
    }

    kill() {
        this.alive = false;
        this.scene.remove(this.mesh);
    }
}
