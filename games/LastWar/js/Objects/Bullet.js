import * as THREE from 'three';

/**
 * 총알 클래스
 * 플레이어 위치에서 발사되어 전방으로 날아가는 노란색 구체
 */
export class Bullet {
    constructor(scene, startPos) {
        this.scene = scene;
        this.speed = 40; // 총알 속도 (플레이어보다 빨라야 함)

        // 위치 초기화
        this.position = startPos.clone();

        // 메쉬 생성
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // 노란색
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);

        this.scene.add(this.mesh);

        // 수명 (너무 멀리가면 삭제)
        this.alive = true;
        this.maxDistance = 100; // 화면 끝까지 (100m)
        this.traveled = 0;
    }

    update(dt) {
        if (!this.alive) return;

        const moveZ = this.speed * dt;
        this.mesh.position.z -= moveZ; // -Z 방향으로 발사
        this.traveled += moveZ;

        // 수명 체크
        if (this.traveled > this.maxDistance) {
            this.kill();
        }
    }

    kill() {
        this.alive = false;
        this.scene.remove(this.mesh);
    }
}
