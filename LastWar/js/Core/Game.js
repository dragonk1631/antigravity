import * as THREE from 'three';
import { SceneSetup } from '../World/SceneSetup.js';
import { Level } from '../World/Level.js';
import { Player } from '../Objects/Player.js';
import { Bullet } from '../Objects/Bullet.js';
import { GameConfig } from './GameConfig.js';

/**
 * 게임의 핵심 로직과 렌더링 루프를 관리하는 클래스
 */
export class Game {
    constructor(container) {
        this.container = container;

        // 1. 초기화
        this.init();

        // 2. 루프 시작
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    init() {
        // --- 엔진 설정 (Three.js) ---
        // 렌더러 생성
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true; // 그림자 활성화
        this.container.appendChild(this.renderer.domElement);

        // --- 월드 구성 ---
        // 씬, 카메라, 조명 설정
        this.sceneSetup = new SceneSetup();
        this.scene = this.sceneSetup.scene;
        this.camera = this.sceneSetup.camera;

        // --- 게임 오브젝트 ---
        // 레벨 (바닥, 환경)
        this.level = new Level(this.scene);

        // 플레이어 (군중)
        this.player = new Player(this.scene, this.camera); // Camera 전달

        // 점수 (유닛 수) 초기화
        this.unitCount = 1;
        this.updateScoreDisplay();

        // 총알 관리
        this.bullets = [];
        this.shootTimer = 0;
        this.shootInterval = GameConfig.FIRE_RATE;

        this.isGameOver = false;
        this.shakeIntensity = 0; // 화면 흔들림 강도

        // --- 이벤트 리스너 ---
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // 로딩 화면 제거
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none'; // hidden 클래스 이슈 수정
    }

    updateScoreDisplay() {
        const scoreDiv = document.getElementById('score-display');
        if (scoreDiv) scoreDiv.innerText = this.unitCount;
    }

    applyGateEffect(gate) {
        if (gate.passed) return;
        gate.passed = true;

        const oldAmount = this.unitCount;
        let newAmount = oldAmount;

        // 수식 적용
        if (gate.operation === 'x') newAmount *= gate.value;
        else if (gate.operation === '+') newAmount += gate.value;
        else if (gate.operation === '/') newAmount /= gate.value;
        else if (gate.operation === '-') newAmount -= gate.value;

        newAmount = Math.floor(newAmount);
        if (newAmount < 0) newAmount = 0;

        // 효과음/이펙트 트리거
        if (newAmount > oldAmount) {
            // 긍정적 효과: 화면 살짝 흔들림 + 쾌감(나중에 파티클 추가)
            this.screenShake(0.5);
        } else {
            // 부정적 효과: 강한 흔들림
            this.screenShake(1.0);
        }

        this.unitCount = newAmount;
        this.updateScoreDisplay();

        if (this.player) {
            this.player.setUnitCount(this.unitCount);
        }
        console.log(`Gate Hit! ${gate.text} -> Count: ${this.unitCount}`);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(dt) {
        // 게임 상태 업데이트
        if (this.level) this.level.update(dt, this.player.position.z);
        if (this.player) this.player.update(dt);

        // 2. 총알 발사 및 업데이트
        if (this.player) {
            this.shootTimer += dt;
            // 쿨타임 증가 (유닛이 많아지면 총알도 많아지므로 텀을 둠)
            if (this.shootTimer > GameConfig.FIRE_RATE) {
                this.shootTimer = 0;

                // 각 유닛별로 총알 생성
                // 성능 방어를 위해 최대 (BULLET_LIMIT)발까지만 제한

                const positions = this.player.getUnitPositions();
                const limit = GameConfig.BULLET_LIMIT;
                const count = Math.min(positions.length, limit);

                for (let i = 0; i < count; i++) {
                    const bullet = new Bullet(this.scene, positions[i]);
                    this.bullets.push(bullet);
                }
            }
        }

        // 총알 이동 및 충돌 체크
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt);

            if (!bullet.alive) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 적군 충돌 체크
            if (this.level && this.level.enemies) {
                for (let j = this.level.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.level.enemies[j];

                    // 거리 체크 (총알 vs 적군)
                    // 적군은 무리(Group)이므로 적당한 충돌 박스(반경 2.0 정도) 가정
                    const distZ = Math.abs(bullet.mesh.position.z - (enemy.position.z + 2)); // 적 위치 보정
                    const distX = Math.abs(bullet.mesh.position.x - enemy.position.x);

                    if (distZ < 2.0 && distX < 2.0) {
                        // 명중!
                        // 총알 삭제
                        bullet.kill();
                        this.bullets.splice(i, 1);

                        // 적군 데미지 (유닛 수 1 감소)
                        const isDead = enemy.hit(1);
                        if (isDead) {
                            enemy.dispose();
                            this.level.enemies.splice(j, 1);
                        }

                        break; // 총알 하나당 적 하나만 타격 (관통 X)
                    }
                }
            }
        }

        // 충돌 감지 (Player vs Gates)
        if (this.level && this.level.gates) {
            // 역순 순회 (삭제 시 안전하게)
            for (let i = this.level.gates.length - 1; i >= 0; i--) {
                const gate = this.level.gates[i];

                // Z축 거리 체크 (지나갔는지)
                const distZ = Math.abs(gate.group.position.z - this.player.position.z);

                // 만약 Z축이 매우 가깝다면 X축 충돌 검사
                if (distZ < 1.0) {
                    const distX = Math.abs(gate.group.position.x - this.player.position.x);

                    if (distX < 2.5) {
                        this.applyGateEffect(gate);
                        this.scene.remove(gate.group);
                        this.level.gates.splice(i, 1);
                    }
                }

                // 이미 지나간 게이트 삭제
                if (gate.group.position.z > this.player.position.z + 10) {
                    this.scene.remove(gate.group);
                    this.level.gates.splice(i, 1);
                }
            }
        }

        // 충돌 감지 (Player vs Enemies)
        if (this.level && this.level.enemies) {
            for (let i = this.level.enemies.length - 1; i >= 0; i--) {
                const enemy = this.level.enemies[i];

                const distZ = Math.abs(enemy.position.z - this.player.position.z);

                // 전투 범위 (Z축 근접)
                if (distZ < 2.0) {
                    // X축 거리 (일정 범위 내에서만 전투)
                    const distX = Math.abs(enemy.position.x - this.player.position.x);

                    if (distX < 3.0) {
                        // 전투 발생 (프레임당 데미지보다는 한 번에 처리하거나, 일정 간격으로)
                        // 여기선 단순하게: 적군 수만큼 내 유닛 감소, 적은 소멸

                        // 내 유닛 감소
                        const damage = enemy.unitCount;
                        this.unitCount -= damage;

                        // 최소값 0
                        if (this.unitCount < 0) this.unitCount = 0;

                        // 적 소멸
                        enemy.dispose();
                        this.level.enemies.splice(i, 1);

                        // 업데이트
                        this.updateScoreDisplay();
                        if (this.player) this.player.setUnitCount(this.unitCount);

                        console.log(`Battle! Lost ${damage} units. Remaining: ${this.unitCount}`);
                    }
                }

                if (enemy.position.z > this.player.position.z + 10) {
                    enemy.dispose();
                    this.level.enemies.splice(i, 1);
                }
            }
        }

        // 충돌 감지 (Bullet vs Boss)
        if (this.level && this.level.bosses) {
            for (let i = this.level.bosses.length - 1; i >= 0; i--) {
                const boss = this.level.bosses[i];
                // 총알 충돌
                for (let j = this.bullets.length - 1; j >= 0; j--) {
                    const bullet = this.bullets[j];

                    const distZ = Math.abs(bullet.mesh.position.z - boss.position.z);
                    const distX = Math.abs(bullet.mesh.position.x - boss.position.x);

                    if (distZ < GameConfig.BOSS_SIZE && distX < GameConfig.BOSS_SIZE) {
                        bullet.kill();
                        this.bullets.splice(j, 1);

                        const isDead = boss.hit(1);
                        if (isDead) {
                            boss.dispose();
                            this.level.bosses.splice(i, 1);
                            // 보스 처치 보상? (일단 패스)
                        }
                        break;
                    }
                }

                // 플레이어 충돌 (게임 오버 or 대량 피해)
                const distZ = Math.abs(boss.position.z - this.player.position.z);
                if (distZ < 2.0 && boss.unitCount > 0) {
                    // 보스와 부딪히면 남은 unitCount 전부 소멸 + 게임 오버
                    this.unitCount = 0;
                    this.updateScoreDisplay();
                    if (this.player) this.player.setUnitCount(0);
                    this.gameOver();
                }
            }
        }

        // 게임 오버 체크
        if (this.unitCount <= GameConfig.GAME_OVER_CONDITION && !this.isGameOver) {
            this.gameOver();
        }

        // 카메라 추적 (Smooth Follow) + 화면 흔들림(Screen Shake)
        const targetZ = this.player.position.z + 20;

        // 기존 부드러운 이동
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.1);
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, 0, 0.1); // 중앙 유지
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 15, 0.1); // Y축도 부드럽게 이동

        // 흔들림 효과 적용
        if (this.shakeIntensity > 0) {
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.x += rx;
            this.camera.position.y += ry;

            // 감쇠
            this.shakeIntensity -= dt * 2.0;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }

        // 카메라는 항상 플레이어(의 미래 위치?)가 아닌 약간 앞쪽 땅을 바라보게
        // 플레이어 Z보다 살짝 앞을 보게 하면 시야가 좋음
        this.camera.lookAt(0, 0, this.player.position.z - 10);
    }

    // 외부에서 흔들림 유발
    screenShake(intensity) {
        this.shakeIntensity = intensity;
    }

    animate(time) {
        requestAnimationFrame(this.animate);

        const dt = 0.016; // 고정 델타타임 (약 60fps) 또는 clock.getDelta() 사용 가능

        this.update(dt);
        this.renderer.render(this.scene, this.camera);
    }
    gameOver() {
        this.isGameOver = true;

        const gameOverDiv = document.getElementById('game-over');
        if (gameOverDiv) gameOverDiv.classList.remove('hidden');

        // 움직임 멈춤
        if (this.player) this.player.speed = 0;

        console.log("GAME OVER");
    }
}
