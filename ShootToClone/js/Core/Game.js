import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as CANNON from 'cannon-es';
import { Level } from '../World/Level.js';
import { Player } from '../Objects/Player.js';
import { Enemy } from '../Objects/Enemy.js';
import { Bullet } from '../Objects/Bullet.js';
import { Unit } from '../Objects/Unit.js';
import { GameConfig } from '../Data/GameConfig.js';
import { SoundManager } from '../Utils/SoundManager.js';

export class Game {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();
        this.soundManager = new SoundManager();

        this.init();
        this.animate();
    }

    init() {
        // 1. 카메라 & 렌더러
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 25, 35); // 플레이어가 화면 하단에 보이도록
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // --- POST PROCESSING (BLOOM) ---
        const renderScene = new RenderPass(this.scene, this.camera);

        // Resolution, Strength, Radius, Threshold
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.3;   // 더 높은 임계값 (밝은 것만 발광)
        bloomPass.strength = 0.8;    // 강도 대폭 감소 (2.0 → 0.8)
        bloomPass.radius = 0.3;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);

        // 배경색 (더 밝게 - 가시성 향상)
        this.scene.background = new THREE.Color(0x1a1a2e); // 이전: 0x0a0a15
        // Fog 제거 - 적이 잘 안 보이는 문제 해결

        // 2. 조명
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2); // 밝기 증가
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // 3. 물리 엔진 설정
        this.world.gravity.set(0, -9.82, 0);

        // 4. 레벨(바닥, 벽) 생성
        this.level = new Level(this.scene, this.world);

        // 5. 플레이어 생성
        this.player = new Player(this.scene, this.world, this.level);

        // 6. 오브젝트 관리
        this.enemies = [];
        this.bullets = [];
        this.units = [];
        this.score = 0; // 점수 시스템

        // 7. 이벤트
        window.addEventListener('resize', () => this.onResize());

        // 8. UI 리셋
        const existingUI = this.container.querySelectorAll('.game-ui');
        existingUI.forEach(el => el.remove());

        // 유닛 카운트 (왼쪽 상단)
        const unitDiv = document.createElement('div');
        unitDiv.className = 'game-ui';
        unitDiv.id = 'unit-count';
        unitDiv.style.position = 'absolute';
        unitDiv.style.top = '20px';
        unitDiv.style.left = '20px';
        unitDiv.style.color = '#00ffff';
        unitDiv.style.fontSize = '32px';
        unitDiv.style.fontWeight = 'bold';
        unitDiv.style.textShadow = '0 0 10px #00ffff, 2px 2px 4px rgba(0,0,0,0.9)';
        unitDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        unitDiv.style.padding = '10px 20px';
        unitDiv.style.borderRadius = '8px';
        unitDiv.style.border = '2px solid #00ffff';
        unitDiv.innerHTML = 'UNITS: 1';
        this.container.appendChild(unitDiv);

        // 점수 (오른쪽 상단)
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'game-ui';
        scoreDiv.id = 'score';
        scoreDiv.style.position = 'absolute';
        scoreDiv.style.top = '20px';
        scoreDiv.style.right = '20px';
        scoreDiv.style.color = '#ffff00';
        scoreDiv.style.fontSize = '32px';
        scoreDiv.style.fontWeight = 'bold';
        scoreDiv.style.textShadow = '0 0 10px #ffff00, 2px 2px 4px rgba(0,0,0,0.9)';
        scoreDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        scoreDiv.style.padding = '10px 20px';
        scoreDiv.style.borderRadius = '8px';
        scoreDiv.style.border = '2px solid #ffff00';
        scoreDiv.innerHTML = 'SCORE: 0';
        this.container.appendChild(scoreDiv);

        // 레벨 (오른쪽 상단, 점수 아래)
        const levelDiv = document.createElement('div');
        levelDiv.className = 'game-ui';
        levelDiv.id = 'game-level';
        levelDiv.style.position = 'absolute';
        levelDiv.style.top = '80px';
        levelDiv.style.right = '20px';
        levelDiv.style.color = '#ff00ff';
        levelDiv.style.fontSize = '28px';
        levelDiv.style.fontWeight = 'bold';
        levelDiv.style.textShadow = '0 0 10px #ff00ff, 2px 2px 4px rgba(0,0,0,0.9)';
        levelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        levelDiv.style.padding = '8px 16px';
        levelDiv.style.borderRadius = '8px';
        levelDiv.style.border = '2px solid #ff00ff';
        levelDiv.innerHTML = 'LEVEL: 1';
        this.container.appendChild(levelDiv);

        // 레벨업 플래시 효과용 오버레이
        this.flashOverlay = document.createElement('div');
        this.flashOverlay.style.position = 'absolute';
        this.flashOverlay.style.top = '0';
        this.flashOverlay.style.left = '0';
        this.flashOverlay.style.width = '100%';
        this.flashOverlay.style.height = '100%';
        this.flashOverlay.style.backgroundColor = 'white';
        this.flashOverlay.style.opacity = '0';
        this.flashOverlay.style.pointerEvents = 'none';
        this.flashOverlay.style.transition = 'opacity 0.5s';
        this.container.appendChild(this.flashOverlay);
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 게임 오버 시 정지
        if (this.stopped) return;

        const dt = 1 / 60;

        // 레벨 시스템
        this.levelTimer = (this.levelTimer || 0) + dt;
        if (this.levelTimer >= GameConfig.LEVEL_UP_INTERVAL) {
            this.gameLevel = (this.gameLevel || 1) + 1;
            this.hpMultiplier = Math.pow(GameConfig.LEVEL_HP_MULT_BASE, this.gameLevel - 1);
            this.levelTimer = 0;

            // 레벨 업 효과 (플래시)
            this.flashOverlay.style.opacity = '0.5';
            setTimeout(() => { this.flashOverlay.style.opacity = '0'; }, 100);

            // 레벨 업 알림
            this.createFloatingText(this.player.position, `LEVEL ${this.gameLevel}!`);
            this.playSound('unitGain');

            // UI 업데이트
            const levelDiv = document.getElementById('game-level');
            if (levelDiv) levelDiv.innerHTML = `LEVEL: ${this.gameLevel}`;
        }

        // 물리 업데이트
        this.world.step(dt);

        // --- 게임 로직 ---
        if (!this.player) return;

        // 1. 레벨 무한 스크롤 업데이트
        this.level.update(this.player.position.z);

        // 2. 플레이어 업데이트 및 사격
        const shootRequest = this.player.update(dt, this.enemies);
        if (shootRequest) {
            // 플레이어 발사 (리더는 무조건 발사)
            this.spawnBullet(shootRequest, 'PLAYER');
        }

        // 3. 적군 생성 및 업데이트
        this.updateEnemies(dt);

        // 4. 총알 업데이트 및 충돌 처리
        this.updateBullets(dt);

        // 5. 유닛 업데이트
        this.updateUnits(dt);

        // 6. SideTouch 로직 (벽 접촉 & 아이템)
        this.checkWallContact(dt);
        this.checkItemCollisions();

        // 7. 적과 아군 충돌 체크 (유닛 손실)
        this.checkEnemyUnitCollisions();

        // 카메라 흔들림 효과
        if (this.cameraShake && this.cameraShake.time > 0) {
            this.cameraShake.time -= dt;
            const shake = this.cameraShake.intensity;
            this.camera.position.x = (Math.random() - 0.5) * shake;
            this.camera.position.y = 25 + (Math.random() - 0.5) * shake;
        } else {
            // 원위치
            this.camera.position.x = 0;
            this.camera.position.y = 25;
        }

        // this.renderer.render(this.scene, this.camera);
        this.composer.render();
    }

    spawnBullet(req, ownerType = 'PLAYER', damage = 1) {
        if (this.bullets.length > 500) {
            const oldBullet = this.bullets.shift();
            oldBullet.kill();
        }

        const bullet = new Bullet(this.scene, req.startPos, req.targetPos, ownerType);
        bullet.damage = damage;

        // 총알 VFX 개선 (이미 Bullet.js에서 설정됨)
        bullet.targetType = req.targetType;
        this.bullets.push(bullet);

        // 사운드
        this.playSound('shoot');
    }

    playSound(type) {
        if (!this.soundManager) return;

        try {
            if (type === 'shoot') this.soundManager.playShoot();
            else if (type === 'kill') this.soundManager.playKill();
            else if (type === 'unitGain') this.soundManager.playUnitGain();
        } catch (e) {
            // 사운드 재생 실패 무시
        }
    }

    updateUnits(dt) {
        // 유닛 개별 업데이트 (각자 타이머로 발사)
        // 성능 방어를 위해 한 프레임에 너무 많은 유닛이 동시에 쏘는 것만 방지
        const maxShotsPerFrame = 20;
        let shotsThisFrame = 0;

        for (let i = this.units.length - 1; i >= 0; i--) {
            const u = this.units[i];

            // Unit.js가 스스로 타이머 체크 후 발사 필요시 객체 리턴함
            const shootReq = u.update(dt, this.player.position);

            if (shootReq && shotsThisFrame < maxShotsPerFrame) {
                this.spawnBullet(shootReq, 'UNIT');
                shotsThisFrame++;
            }
        }
    }

    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(dt);

            if (!b.alive) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 1. 적군 총알 -> 플레이어/유닛
            if (b.ownerType === 'ENEMY') {
                // 플레이어 충돌
                if (this.player.position.distanceTo(b.mesh.position) < 1.0) {
                    this.loseUnits(b.damage); // 총알의 데미지 만큼 유닛 손실
                    b.kill();
                    continue;
                }

                // 유닛 충돌
                for (let j = this.units.length - 1; j >= 0; j--) {
                    const unit = this.units[j];
                    if (unit.position.distanceTo(b.mesh.position) < 1.0) {
                        unit.kill();
                        this.units.splice(j, 1);
                        this.updateUnitCountUI();
                        b.kill();
                        break;
                    }
                }
                continue;
            }

            // 2. 아군 총알 -> 적/아이템
            if (b.ownerType === 'PLAYER' || b.ownerType === 'UNIT') {
                for (const enemy of this.enemies) {
                    // ... 기존 로직 복사 ...
                    if (enemy.alive && b.mesh.position.distanceTo(enemy.position) < 1.5) {
                        const killed = enemy.hit(1);
                        if (killed) {
                            this.score++;
                            const scoreDiv = document.getElementById('score');
                            if (scoreDiv) scoreDiv.innerText = `SCORE: ${this.score}`;
                            this.playSound('kill');
                        }
                        b.kill();
                        break;
                    }
                }

                // 아이템 충돌
                for (const item of this.level.items) {
                    if (item.alive && b.mesh.position.distanceTo(item.position) < 2) {
                        const destroyed = item.hit(1);
                        if (destroyed) {
                            this.activatePowerUp(item.getPowerUpType());
                        }
                        b.kill();
                        break;
                    }
                }
            }
        }
    }

    checkWallContact(dt) {
        // 무식하게 X 좌표로만 하던 방식에서 실제 패널과의 거리 체크로 변경
        if (!this.level.panels) return;

        const playerPos = this.player.position;
        const radius = 2.5; // 인식 반경 크게

        for (const panel of this.level.panels) {
            // 아직 처리가 안 된 패널이고 플레이어와 가까우면 인식
            if (!panel.hit && playerPos.distanceTo(panel.mesh.position) < radius) {
                panel.hit = true; // 패널 하나당 한 명씩 준다고 가정 (혹은 비비는 동안 계속)

                // 패널 속으로 "들어가는" 느낌이 들면 유닛 +1
                this.spawnUnit(this.player.position);

                // 시각적 피드백 (패널 색상 변경 등)
                panel.mesh.material.emissiveIntensity = 2.0;
                setTimeout(() => { if (panel.mesh) panel.mesh.material.emissiveIntensity = 0.2; }, 100);
            }
        }
    }

    activatePowerUp(type) {
        if (type === 'FIRE_RATE') {
            // 연사속도 증가
            this.createFloatingText(this.player.position, "FIRE RATE UP!");
            this.fireRateBoost = true;
            this.originalFireRate = GameConfig.FIRE_RATE;
            GameConfig.FIRE_RATE = this.originalFireRate * GameConfig.ITEM_FIRE_RATE_MULT;

            setTimeout(() => {
                GameConfig.FIRE_RATE = this.originalFireRate;
                this.fireRateBoost = false;
            }, GameConfig.ITEM_DURATION);
        } else if (type === 'SHIELD') {
            // 방어벽
            this.createFloatingText(this.player.position, "SHIELD ACTIVATED!");
            this.shieldActive = true;

            // 방어벽 비주얼
            const shieldGeo = new THREE.SphereGeometry(8, 16, 16);
            const shieldMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.3,
                wireframe: true
            });
            this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
            this.shieldMesh.position.copy(this.player.position);
            this.scene.add(this.shieldMesh);

            setTimeout(() => {
                this.shieldActive = false;
                if (this.shieldMesh) {
                    this.scene.remove(this.shieldMesh);
                    this.shieldMesh = null;
                }
            }, GameConfig.ITEM_DURATION);
        }
    }

    checkItemCollisions() {
        // 아이템 업데이트 (회전 등)
        if (!this.level.items) return;

        for (const item of this.level.items) {
            if (item.alive) {
                item.update(1 / 60);
            }
        }

        // 방어벽 위치 업데이트
        if (this.shieldMesh) {
            this.shieldMesh.position.copy(this.player.position);
        }
    }

    spawnUnit(pos) {
        if (this.units.length >= GameConfig.MAX_UNITS) return;

        const unit = new Unit(this.scene, pos);

        // 다른 유닛과 너무 가까우면 위치 조정 (최소 거리 1.5m 유지)
        const minDistance = 1.5;
        let attempts = 0;
        while (attempts < 10) {
            let tooClose = false;
            for (const other of this.units) {
                if (unit.position.distanceTo(other.position) < minDistance) {
                    tooClose = true;
                    // 랜덤하게 위치 조정
                    unit.position.x += (Math.random() - 0.5) * 2;
                    unit.position.z += (Math.random() - 0.5) * 2;
                    unit.mesh.position.copy(unit.position);
                    break;
                }
            }
            if (!tooClose) break;
            attempts++;
        }

        this.units.push(unit);

        // UI 업데이트
        const countSpan = document.getElementById('unit-count');
        if (countSpan) countSpan.innerText = `UNITS: ${this.units.length + 1}`;

        // +1 팝업 효과
        this.createFloatingText(pos, "+1");

        // 사운드
        this.playSound('unitGain');
    }

    createFloatingText(pos3d, text) {
        const div = document.createElement('div');
        div.className = 'floating-text';
        div.innerText = text;
        document.body.appendChild(div);

        // 3D 좌표 -> 2D 화면 좌표 변환
        const vec = pos3d.clone();
        vec.project(this.camera);

        const x = (vec.x * .5 + .5) * this.container.clientWidth;
        const y = (-(vec.y * .5) + .5) * this.container.clientHeight;

        div.style.left = `${x}px`;
        div.style.top = `${y}px`;

        // 애니메이션 후 삭제
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateY(-50px)';
        }, 50);

        setTimeout(() => {
            div.remove();
        }, 1000);
    }

    checkEnemyUnitCollisions() {
        const collisionRadius = 1.5;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy.alive) continue;

            // 방어막 효과 - 적을 밀어냄
            if (this.shieldActive) {
                const distToPlayer = enemy.position.distanceTo(this.player.position);
                if (distToPlayer < 8) {
                    // 밀어내기
                    enemy.position.z -= 0.5;
                    continue; // 충돌 판정 건너뜀
                }
            }

            // 적이 화면 아래(플레이어 뒤)로 지나가면 유닛 손실
            if (enemy.position.z > this.player.position.z + 5) {
                this.loseUnit();
                enemy.kill();
                this.enemies.splice(i, 1);
                continue;
            }

            // 적과 플레이어 충돌
            if (this.player.position.distanceTo(enemy.position) < collisionRadius) {
                this.loseUnit();
                enemy.kill();
                this.enemies.splice(i, 1);
                continue;
            }

            // 적과 아군 유닛 충돌
            for (let j = this.units.length - 1; j >= 0; j--) {
                const unit = this.units[j];
                if (unit.position.distanceTo(enemy.position) < collisionRadius) {
                    unit.kill();
                    this.units.splice(j, 1);
                    enemy.kill();
                    this.enemies.splice(i, 1);
                    this.updateUnitCountUI();
                    break;
                }
            }
        }
    }

    loseUnit() {
        if (this.units.length > 0) {
            const unit = this.units.pop();
            unit.kill();
            this.updateUnitCountUI();
        }
    }

    updateUnitCountUI() {
        const countSpan = document.getElementById('unit-count');
        if (countSpan) countSpan.innerText = `UNITS: ${this.units.length + 1}`;
    }

    updateEnemies(dt) {
        // 보스 타이머 (30초마다)
        this.bossTimer = (this.bossTimer || 0) + dt;
        if (this.bossTimer >= GameConfig.BOSS_INTERVAL) {
            this.spawnBoss();
            this.bossTimer = 0;
        }

        // 중간보스 (3초마다 랜덤)
        this.miniBossTimer = (this.miniBossTimer || 0) + dt;
        if (this.miniBossTimer >= 3 && Math.random() < 0.3) {
            this.spawnMiniBoss();
            this.miniBossTimer = 0;
        }

        // 일반 적 생성 (매우 촘촘하게) - 화면 위쪽 보이지 않는 곳에서 생성
        if (Math.random() < GameConfig.ENEMY_SPAWN_RATE) {
            const spawnZ = this.player.position.z - 60; // 화면 바깥
            const enemy = new Enemy(this.scene, spawnZ, 'NORMAL');

            // 레벨에 따른 HP 적용 (일반 적은 배수, 보스는 +10씩)
            const multiplier = this.hpMultiplier || 1;
            const levelBonus = (this.gameLevel || 1) - 1;
            enemy.hp *= multiplier;
            enemy.maxHp *= multiplier;

            const safeX = (Math.random() * 10) - 5;
            enemy.mesh.position.x = safeX;
            enemy.position.x = safeX;
            this.enemies.push(enemy);
        }

        // 업데이트 (보스 공격 콜백 전달 - 총알 발사)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, this.player.position, (enemy, damage) => {
                // 시각적 발사 (총알 생성)
                const startPos = enemy.position.clone();
                const targetPos = this.player.position.clone();
                // 예측 사격이나 약간의 랜덤성 추가 가능

                const req = {
                    startPos: startPos,
                    targetPos: targetPos,
                    targetType: 'PLAYER'
                };
                this.spawnBullet(req, 'ENEMY', damage);
            });

            if (!e.alive) {
                this.enemies.splice(i, 1);
            }
        }
    }

    loseUnits(count) {
        // 여러 유닛을 한 번에 잃음
        for (let i = 0; i < count; i++) {
            if (this.units.length > 0) {
                const unit = this.units.pop();
                unit.kill();
            } else {
                // 유닛이 없으면 게임 오버
                this.gameOver();
                return;
            }
        }
        this.updateUnitCountUI();

        // 데미지 효과
        this.triggerDamageEffect();
    }

    triggerDamageEffect() {
        // 빨간 플래시
        this.flashOverlay.style.backgroundColor = 'red';
        this.flashOverlay.style.opacity = '0.4';
        setTimeout(() => {
            this.flashOverlay.style.backgroundColor = 'white';
            this.flashOverlay.style.opacity = '0';
        }, 150);

        // 카메라 흔들림
        this.cameraShake = { time: 0.3, intensity: 0.5 };
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        // 게임 오버 화면
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'absolute';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.color = 'white';
        gameOverDiv.style.fontSize = '64px';
        gameOverDiv.style.fontWeight = 'bold';
        gameOverDiv.style.textShadow = '4px 4px 8px rgba(0,0,0,0.8)';
        gameOverDiv.style.textAlign = 'center';
        gameOverDiv.innerHTML = `GAME OVER<br><span style="font-size:32px">SCORE: ${this.score}</span>`;
        document.body.appendChild(gameOverDiv);

        // 게임 정지
        this.stopped = true;
    }

    spawnMiniBoss() {
        const bossZ = this.player.position.z - 40;
        const miniBoss = new Enemy(this.scene, bossZ, 'MINI_BOSS');
        miniBoss.position.x = (Math.random() - 0.5) * 6;
        miniBoss.mesh.scale.set(2, 2, 2);
        miniBoss.mesh.position.copy(miniBoss.position);
        this.enemies.push(miniBoss);
        this.createFloatingText(miniBoss.position, "MINI BOSS!");
    }

    spawnBoss() {
        const bossZ = this.player.position.z - 30;
        const boss = new Enemy(this.scene, bossZ, 'BOSS');
        boss.position.x = 0;
        boss.mesh.scale.set(4, 4, 4);
        boss.mesh.position.copy(boss.position);
        this.enemies.push(boss);
        this.createFloatingText(boss.position, "⚠️ BOSS ⚠️");
    }
}
