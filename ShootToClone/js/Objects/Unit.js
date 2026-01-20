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

        // 메쉬 (Drone Style)
        this.mesh = new THREE.Group();

        // 1. Core (Diamond)
        const coreGeo = new THREE.OctahedronGeometry(0.4);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            emissive: 0x0044ff,
            emissiveIntensity: 0.4  // 발광 강도 감소
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        this.mesh.add(core);

        // 2. Ring (Floating)
        const ringGeo = new THREE.TorusGeometry(0.6, 0.05, 8, 16);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        this.mesh.add(ring);

        // Animation logic setup
        this.ringRaw = ring;

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // 사격 타이머 (초기값 랜덤으로 분산)
        this.shootTimer = Math.random() * GameConfig.FIRE_RATE;
    }

    update(dt, leaderPos) {
        if (!this.alive) return null;

        // 플레이어와 같은 속도로 함께 이동 (오프셋 유지)
        this.position.x = leaderPos.x + this.offset.x; // 플레이어 X 기준
        this.position.z = leaderPos.z + this.offset.z; // 플레이어 Z 기준

        this.mesh.position.copy(this.position);

        // Ring Spin
        if (this.ringRaw) {
            this.ringRaw.rotation.z += dt * 10;
            this.ringRaw.rotation.x = Math.sin(Date.now() * 0.005) * 0.5;
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
