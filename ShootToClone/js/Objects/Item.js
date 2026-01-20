import * as THREE from 'three';
import { GameConfig } from '../Data/GameConfig.js';

export class Item {
    constructor(scene, position, type = 'FIRE_RATE') {
        this.scene = scene;
        this.alive = true;
        this.position = position.clone();
        this.type = type; // 'FIRE_RATE', 'SHIELD'
        this.hp = GameConfig.ITEM_HP;
        this.maxHp = this.hp;

        // 타입별 색상
        const colors = {
            'FIRE_RATE': 0xffff00, // 노란색
            'SHIELD': 0x00ffff     // 청록색
        };

        // 큐브 메쉬
        const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const mat = new THREE.MeshStandardMaterial({
            color: colors[type] || 0xffff00,
            emissive: colors[type] || 0xffaa00,
            emissiveIntensity: 0.7
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 1;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        // HP 표시
        this.createHpText();
    }

    createHpText() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        this.hpCanvas = canvas;
        this.hpContext = canvas.getContext('2d');

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        this.hpSprite = new THREE.Sprite(spriteMat);
        this.hpSprite.scale.set(4, 1, 1);
        this.hpSprite.position.set(0, 2.5, 0);
        this.mesh.add(this.hpSprite);

        this.updateHpText();
    }

    updateHpText() {
        if (!this.hpCanvas) return;
        const ctx = this.hpContext;
        ctx.clearRect(0, 0, 256, 64);

        // 아이콘 (타입에 따라)
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        const icon = this.type === 'FIRE_RATE' ? '🔫' : '🛡️';
        ctx.fillText(`${icon} HP: ${Math.ceil(this.hp)}`, 128, 32);
        this.hpSprite.material.map.needsUpdate = true;
    }

    hit(damage) {
        this.hp -= damage;
        this.updateHpText();

        // 피격 효과
        this.mesh.material.emissiveIntensity = 1.5;
        setTimeout(() => {
            if (this.mesh) this.mesh.material.emissiveIntensity = 0.7;
        }, 50);

        if (this.hp <= 0) {
            this.kill();
            return true; // 파괴됨
        }
        return false;
    }

    update(dt) {
        if (!this.alive) return;

        // 아래로 스크롤 (적과 같은 속도)
        this.position.z += GameConfig.ENEMY_SPEED * dt;
        this.mesh.position.copy(this.position);

        // 제자리 회전
        this.mesh.rotation.y += dt;
    }

    kill() {
        this.alive = false;
        this.scene.remove(this.mesh);
    }

    getPowerUpType() {
        return this.type;
    }
}
