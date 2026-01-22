import * as THREE from 'three';
import { GameConfig } from '../Data/GameConfig.js';

export class Bullet {
    constructor(scene, startPos, targetPos, ownerType = 'PLAYER') {
        this.scene = scene;
        this.ownerType = ownerType;

        this.speed = GameConfig.BULLET_SPEED;
        this.alive = true;

        // 방향 계산
        this.direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();

        // 메쉬
        const geo = new THREE.SphereGeometry(ownerType === 'PLAYER' ? 0.3 : 0.2); // 유닛 총알은 좀 작게
        const color = ownerType === 'PLAYER' ? 0xffff00 : 0x00ffff;
        const mat = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(startPos);

        this.scene.add(this.mesh);

        // 수명 (너무 멀리 가면 삭제)
        this.lifeTime = 0;
    }

    update(dt) {
        if (!this.alive) return;

        // 이동
        this.mesh.position.addScaledVector(this.direction, this.speed * dt);
        this.lifeTime += dt;

        // 소멸 조건 (거리 or 시간)
        if (this.lifeTime > 2.0) {
            this.kill();
        }
    }

    kill() {
        this.alive = false;
        this.scene.remove(this.mesh);
    }
}
