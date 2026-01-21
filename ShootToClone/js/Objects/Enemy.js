import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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

        // 위치 - 도로 전체에서 스폰, 단 패널(X=7.2) 위치만 피함
        // 도로: -10 ~ +10, 패널: X = 7.2 (폭 4m)
        let xMode;
        const panelX = 7.2; // GameConfig.WALL_X_POS
        const avoidRadius = 2.5; // 패널 폭의 절반(2m) + 여유

        do {
            xMode = (Math.random() * 18) - 9; // -9 ~ +9 (도로 거의 전체)
        } while (Math.abs(xMode - panelX) < avoidRadius); // 패널(7.2) 주변만 피함

        this.position = new THREE.Vector3(xMode, 1, zPosition);

        // 🎨 Cute Low-Poly Character (Kawaii Style!)
        this.mesh = new THREE.Group();
        this.createCuteCharacter();

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    createCuteCharacter() {
        // ⚡ OPTIMIZED: Merge all geometries into single mesh (7 meshes → 1 mesh)
        // This reduces draw calls by 85% for massive performance improvement!

        const baseSize = (this.type === 'NORMAL') ? 0.8 : (this.type === 'MINI_BOSS') ? 1.2 : 1.8;

        // Color selection
        let bodyColor;
        if (this.type === 'BOSS') {
            bodyColor = new THREE.Color(0xff6b9d);
        } else if (this.type === 'MINI_BOSS') {
            bodyColor = new THREE.Color(0xffa500);
        } else {
            const cuteColors = [0xffb3e6, 0xb3d9ff, 0xffffb3, 0xb3ffb3];
            bodyColor = new THREE.Color(cuteColors[Math.floor(Math.random() * cuteColors.length)]);
        }

        // ⚡ Helper: Apply vertex colors to geometry
        const applyVertexColors = (geometry, color) => {
            const colors = [];
            const count = geometry.attributes.position.count;
            for (let i = 0; i < count; i++) {
                colors.push(color.r, color.g, color.b);
            }
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            return geometry;
        };

        // Create all geometries
        const geometries = [];
        const eyeSize = baseSize * 0.2;
        const eyeOffset = baseSize * 0.3;

        // 1. Body (pastel color)
        const bodyGeo = new THREE.SphereGeometry(baseSize, 12, 10);
        bodyGeo.scale(1, 0.7, 1);
        bodyGeo.translate(0, baseSize * 0.3, 0);
        applyVertexColors(bodyGeo, bodyColor);
        geometries.push(bodyGeo);

        // 2. Eye whites (white)
        const whiteColor = new THREE.Color(0xffffff);
        const eyeWhiteGeo = new THREE.SphereGeometry(eyeSize, 8, 8);
        const leftEyeGeo = eyeWhiteGeo.clone();
        leftEyeGeo.translate(-eyeOffset, baseSize * 0.6, baseSize * 0.5);
        applyVertexColors(leftEyeGeo, whiteColor);
        geometries.push(leftEyeGeo);

        const rightEyeGeo = eyeWhiteGeo.clone();
        rightEyeGeo.translate(eyeOffset, baseSize * 0.6, baseSize * 0.5);
        applyVertexColors(rightEyeGeo, whiteColor);
        geometries.push(rightEyeGeo);

        // 3. Pupils (black)
        const blackColor = new THREE.Color(0x000000);
        const pupilGeo = new THREE.SphereGeometry(eyeSize * 0.5, 6, 6);
        const leftPupilGeo = pupilGeo.clone();
        leftPupilGeo.translate(-eyeOffset, baseSize * 0.6, baseSize * 0.7);
        applyVertexColors(leftPupilGeo, blackColor);
        geometries.push(leftPupilGeo);

        const rightPupilGeo = pupilGeo.clone();
        rightPupilGeo.translate(eyeOffset, baseSize * 0.6, baseSize * 0.7);
        applyVertexColors(rightPupilGeo, blackColor);
        geometries.push(rightPupilGeo);

        // 4. Eye highlights (bright white)
        const shineGeo = new THREE.SphereGeometry(eyeSize * 0.3, 4, 4);
        const leftShineGeo = shineGeo.clone();
        leftShineGeo.translate(-eyeOffset + eyeSize * 0.15, baseSize * 0.7, baseSize * 0.75);
        applyVertexColors(leftShineGeo, whiteColor);
        geometries.push(leftShineGeo);

        const rightShineGeo = shineGeo.clone();
        rightShineGeo.translate(eyeOffset + eyeSize * 0.15, baseSize * 0.7, baseSize * 0.75);
        applyVertexColors(rightShineGeo, whiteColor);
        geometries.push(rightShineGeo);

        // 5. Boss extras
        if (this.type === 'BOSS') {
            const goldColor = new THREE.Color(0xffd700);
            const crownGeo = new THREE.CylinderGeometry(baseSize * 0.3, baseSize * 0.5, baseSize * 0.3, 6);
            crownGeo.translate(0, baseSize * 1.2, 0);
            applyVertexColors(crownGeo, goldColor);
            geometries.push(crownGeo);
        } else if (this.type === 'MINI_BOSS') {
            const browGeo = new THREE.BoxGeometry(eyeSize * 1.5, eyeSize * 0.2, eyeSize * 0.2);

            const leftBrowGeo = browGeo.clone();
            leftBrowGeo.rotateZ(0.3);
            leftBrowGeo.translate(-eyeOffset, baseSize * 0.95, baseSize * 0.5);
            applyVertexColors(leftBrowGeo, blackColor);
            geometries.push(leftBrowGeo);

            const rightBrowGeo = browGeo.clone();
            rightBrowGeo.rotateZ(-0.3);
            rightBrowGeo.translate(eyeOffset, baseSize * 0.95, baseSize * 0.5);
            applyVertexColors(rightBrowGeo, blackColor);
            geometries.push(rightBrowGeo);
        }

        // ⚡ MERGE ALL GEOMETRIES INTO ONE
        const mergedGeometry = mergeGeometries(geometries);

        // Material with vertex colors ENABLED for full color detail
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,  // ⚡ This preserves all color details!
            roughness: 0.6,
            metalness: 0.1,
            emissive: bodyColor,
            emissiveIntensity: 0.05
        });

        // Create single optimized mesh with LIMITED shadows for performance
        this.coreMesh = new THREE.Mesh(mergedGeometry, material);
        // ⚡ Only cast shadows for normal enemies to save performance
        // Bosses can have shadows since they're rare
        if (this.type !== 'NORMAL') {
            this.coreMesh.castShadow = true;
        }
        this.coreMesh.receiveShadow = false; // Don't receive shadows for better FPS
        this.mesh.add(this.coreMesh);

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

        // ⚡ Only update if HP actually changed (avoid expensive canvas operations)
        const currentHp = Math.ceil(this.hp);
        if (this._lastRenderedHp === currentHp) return;
        this._lastRenderedHp = currentHp;

        const ctx = this.hpContext;
        ctx.clearRect(0, 0, 256, 64);

        // HP 텍스트만
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${currentHp}`, 128, 32);

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

        // Spin effect for visual interest
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
