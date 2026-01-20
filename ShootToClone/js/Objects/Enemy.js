import * as THREE from 'three';
import { GameConfig } from '../Data/GameConfig.js';

export class Enemy {
    constructor(scene, zPosition, type = 'NORMAL') {
        this.scene = scene;
        this.alive = true;
        this.type = type;

        // 타입별 HP
        if (this.type === 'BOSS') {
            this.hp = GameConfig.BOSS_HP;
            this.maxHp = GameConfig.BOSS_HP;
        } else if (this.type === 'MINI_BOSS') {
            this.hp = GameConfig.MINI_BOSS_HP;
            this.maxHp = GameConfig.MINI_BOSS_HP;
        } else {
            this.hp = GameConfig.ENEMY_HP;
            this.maxHp = GameConfig.ENEMY_HP;
        }

        // 위치
        const xMode = (Math.random() - 0.5) * 10;
        this.position = new THREE.Vector3(xMode, 1, zPosition);

        // 메쉬 (Cyberpunk Style)
        this.mesh = new THREE.Group();
        const size = (this.type === 'NORMAL') ? 1 : (this.type === 'MINI_BOSS') ? 2 : 3;

        // 1. Core Body
        let geo;
        if (this.type === 'NORMAL') {
            geo = new THREE.IcosahedronGeometry(0.8, 0); // Spikey
        } else {
            geo = new THREE.DodecahedronGeometry(size, 0);
        }

        const color = (this.type === 'BOSS') ? 0xaa00ff : (this.type === 'MINI_BOSS') ? 0xffaa00 : 0xff0000;
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.2,
            metalness: 0.8,
            emissive: color,
            emissiveIntensity: 0.3  // 발광 강도 감소
        });
        this.coreMesh = new THREE.Mesh(geo, mat);
        this.mesh.add(this.coreMesh);

        // 2. Extra details for Bosses
        if (this.type !== 'NORMAL') {
            const ringGeo = new THREE.TorusGeometry(size + 0.5, 0.2, 8, 16);
            ringGeo.rotateX(Math.PI / 2);
            const ringMat = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
            this.mesh.add(new THREE.Mesh(ringGeo, ringMat));
        }

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // HP 바 (보스/미니보스만)
        if (this.type !== 'NORMAL') {
            this.createHpBar();
        }
    }

    createHpBar() {
        // 숫자로 HP 표시 (보스/미니보스)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        this.hpCanvas = canvas;
        this.hpContext = ctx;

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        this.hpSprite = new THREE.Sprite(spriteMat);
        this.hpSprite.scale.set(4, 1, 1);
        this.hpSprite.position.set(0, 3, 0);
        this.mesh.add(this.hpSprite);

        this.updateHpBar();
    }

    updateHpBar() {
        if (!this.hpCanvas || !this.hpContext) return;

        const ctx = this.hpContext;
        ctx.clearRect(0, 0, 256, 64);

        // HP 텍스트만 (배경 없음)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(this.hp)}`, 128, 32);

        this.hpSprite.material.map.needsUpdate = true;
    }

    update(dt, playerPos, onAttack) {
        if (!this.alive) return;

        // 보스 AI: 근접 공격 (몸통박치기)
        if (this.type === 'BOSS') {
            const distToPlayer = this.position.distanceTo(playerPos);
            const meleeRange = 3; // 근접 공격 거리

            // 플레이어에게 돌진
            this.position.z += GameConfig.BOSS_SPEED * dt;

            // 근접 거리에 들어오면 공격
            this.shootTimer = (this.shootTimer || 0) + dt;
            if (this.shootTimer >= GameConfig.BOSS_ATTACK_INTERVAL && distToPlayer < meleeRange) {
                if (onAttack) onAttack(this, GameConfig.BOSS_ATTACK_DAMAGE);
                this.shootTimer = 0;
                // 공격 이펙트
                if (this.coreMesh) {
                    this.coreMesh.material.emissive.setHex(0xff00ff);
                    setTimeout(() => {
                        if (this.coreMesh) this.coreMesh.material.emissive.setHex(0xaa00ff);
                    }, 100);
                }
            }
        } else if (this.type === 'MINI_BOSS') {
            const distToPlayer = this.position.distanceTo(playerPos);
            const meleeRange = 3;

            // 플레이어에게 돌진
            this.position.z += GameConfig.MINI_BOSS_SPEED * dt;

            // 근접 거리에 들어오면 공격
            this.shootTimer = (this.shootTimer || 0) + dt;
            if (this.shootTimer >= GameConfig.MINI_BOSS_ATTACK_INTERVAL && distToPlayer < meleeRange) {
                if (onAttack) onAttack(this, GameConfig.MINI_BOSS_ATTACK_DAMAGE);
                this.shootTimer = 0;
                // 공격 이펙트
                if (this.coreMesh) {
                    this.coreMesh.material.emissive.setHex(0xffff00);
                    setTimeout(() => {
                        if (this.coreMesh) this.coreMesh.material.emissive.setHex(0xffaa00);
                    }, 100);
                }
            }
        } else {
            // 일반 적: 플레이어 방향으로 전진
            this.position.z += GameConfig.ENEMY_SPEED * dt;
        }

        this.mesh.position.copy(this.position);

        // Spin effect
        if (this.coreMesh) {
            this.coreMesh.rotation.x += dt;
            this.coreMesh.rotation.y += dt;
        }
    }

    hit(damage) {
        this.hp -= damage;
        this.updateHpBar();

        // 피격 효과
        if (this.coreMesh) {
            this.coreMesh.material.color.setHex(0xffffff);
            setTimeout(() => {
                if (this.alive && this.coreMesh) {
                    const color = (this.type === 'BOSS') ? 0xaa00ff : (this.type === 'MINI_BOSS') ? 0xffaa00 : 0xff0000;
                    this.coreMesh.material.color.setHex(color);
                }
            }, 50);
        }

        if (this.hp <= 0) {
            this.kill();
            return true;
        }
        return false;
    }

    kill() {
        this.alive = false;
        this.scene.remove(this.mesh);
    }
}
