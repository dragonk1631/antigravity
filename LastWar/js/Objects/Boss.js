import * as THREE from 'three';
import { GameConfig } from '../Core/GameConfig.js';

export class Boss {
    constructor(scene, zPosition) {
        this.scene = scene;
        this.unitCount = GameConfig.BOSS_HP_BASE; // 초기 체력
        this.maxHp = this.unitCount;

        this.position = new THREE.Vector3(0, 1.5, zPosition); // 중앙 배치

        this.init();
        this.createLabel();
    }

    init() {
        // 보스는 거대한 보라색 큐브
        const size = GameConfig.BOSS_SIZE;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
            color: 0x800080, // 보라색 
            roughness: 0.2,
            metalness: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.scene.add(this.mesh);
    }

    createLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // 초기 그리기
        this.updateLabelCanvas(ctx);

        const texture = new THREE.CanvasTexture(canvas);
        this.texture = texture; // 나중에 업데이트 위해 저장

        const material = new THREE.SpriteMaterial({ map: texture });
        this.label = new THREE.Sprite(material);

        this.label.position.copy(this.position);
        this.label.position.y += GameConfig.BOSS_SIZE; // 머리 위
        this.label.scale.set(5, 2.5, 1);

        this.scene.add(this.label);
        this.ctx = ctx; // 컨텍스트 저장
        this.labelCanvas = canvas;
    }

    updateLabelCanvas(ctx) {
        ctx.clearRect(0, 0, 256, 128);

        // 배경 (체력바 느낌)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 256, 128);

        // 텍스트
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("BOSS " + this.unitCount, 128, 64);
    }

    hit(damage) {
        this.unitCount -= damage;
        if (this.unitCount < 0) this.unitCount = 0;

        // 라벨 업데이트 (텍스처 갱신)
        this.updateLabelCanvas(this.ctx);
        this.texture.needsUpdate = true;

        // 피격 효과 (빨간색 깜빡임)
        this.mesh.material.color.setHex(0xff0000);
        setTimeout(() => {
            if (this.mesh) this.mesh.material.color.setHex(0x800080);
        }, 100);

        return this.unitCount <= 0;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.scene.remove(this.label);
    }
}
