import * as THREE from 'three';
import { GameConfig } from '../Core/GameConfig.js';

// ... (imports)

export class Enemy {
    constructor(scene, zPosition, type = 'NORMAL') {
        this.scene = scene;
        this.type = type;

        // 적 체력 (거리 비례)
        const distance = Math.abs(zPosition);
        let hpBase = GameConfig.ENEMY_NORMAL_HP;

        if (this.type === 'TANK') {
            hpBase = GameConfig.ENEMY_TANK_HP_BASE;
        }

        const hp = hpBase + (distance * GameConfig.ENEMY_HP_DIST_FACTOR);
        this.unitCount = Math.floor(hp);
        this.maxHp = this.unitCount;

        // 위치
        this.position = new THREE.Vector3(
            (Math.random() * 6) - 3,
            0,
            zPosition
        );

        this.maxUnits = (this.type === 'TANK') ? 1 : 100; // 탱크는 1개체, 일반은 군집
        this.dummy = new THREE.Object3D();

        this.init();
        this.createLabel();
    }

    init() {
        if (this.type === 'TANK') {
            // 탱크는 큰 박스 하나
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshStandardMaterial({ color: 0x880000 }); // 진한 빨강
            this.mesh = new THREE.Mesh(geometry, material); // Instanced 아님
            this.mesh.castShadow = true;
            this.scene.add(this.mesh);
        } else {
            // 일반 적은 작은 박스 군집
            const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            this.mesh = new THREE.InstancedMesh(geometry, material, this.maxUnits);
            this.mesh.castShadow = true;
            this.mesh.frustumCulled = false;
            this.scene.add(this.mesh);
        }

        this.mesh.position.copy(this.position);
        this.updateFormation();
    }

    createLabel() {
        // 숫자 표시용 캔버스 텍스처
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ff0000'; // 텍스트 배경(없음)이나 색상
        // 여기선 글자만 흰색으로
        ctx.fillStyle = 'white';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.unitCount.toString(), 128, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        this.label = new THREE.Sprite(material);

        this.label.position.copy(this.position);
        this.label.position.y = 3; // 머리 위
        this.label.scale.set(3, 1.5, 1);

        this.scene.add(this.label);
    }

    updateLabel() {
        // 캔버스를 새로 그리는 건 비용이 크므로, 
        // 실제 게임에서는 미리 숫자 텍스처 아틀라스를 쓰거나 함.
        // 프로토타입에선 매실행마다 다시 그리기 부담스러우니 일단 생략하거나
        // 필요 시 다시 그림.
    }

    updateFormation() {
        if (this.type === 'TANK') {
            // 탱크는 단일 메쉬이므로 위치만 보정하면 됨 (이미 컨테이너가 position임)
            return;
        }

        const spread = 0.6;
        const angleStep = 2.4;

        this.mesh.count = Math.min(this.unitCount, this.maxUnits);

        for (let i = 0; i < this.mesh.count; i++) {
            let x = 0;
            let z = 0;

            if (i > 0) {
                const radius = spread * Math.sqrt(i);
                const angle = i * angleStep;
                x = radius * Math.cos(angle);
                z = radius * Math.sin(angle);
            }

            this.dummy.position.set(x, 0.5, z);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.set(1, 1, 1);
            this.dummy.updateMatrix();

            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    // 외부에서 호출: 유닛 감소
    hit(damage) {
        this.unitCount -= damage;
        if (this.unitCount < 0) this.unitCount = 0;

        // 시각적 업데이트
        this.updateFormation();

        // 라벨 업데이트
        this.scene.remove(this.label);
        if (this.unitCount > 0) {
            this.createLabel();
        }

        // 탱크 피격 효과
        if (this.type === 'TANK' && this.mesh.material) {
            this.mesh.material.color.setHex(0xffffff); // 흰색 깜빡
            setTimeout(() => {
                if (this.mesh) this.mesh.material.color.setHex(0x880000);
            }, 50);
        }

        // 완전 소멸 체크는 외부(Game.js)에서
        return this.unitCount <= 0;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.scene.remove(this.label);
    }
}
