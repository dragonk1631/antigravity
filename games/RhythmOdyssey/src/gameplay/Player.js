/**
 * Player - 플레이어 캐릭터 (횡스크롤 버전)
 * 쿠키런 스타일 캐릭터, 점프/슬라이드
 * 
 * 모든 수치는 GameConfig에서 관리
 */

import * as THREE from 'three';
import { CONFIG } from '../config/GameConfig.js';

export class Player {
    constructor(sceneManager, debug = null) {
        this.sceneManager = sceneManager;
        this.debug = debug;

        // 플레이어 상태
        this.state = 'running'; // running, jumping, sliding, doubleJump
        this.mesh = null;
        this.group = null;

        // 위치 (CONFIG에서 가져옴)
        this.screenX = CONFIG.PLAYER.SCREEN_X;
        this.position = new THREE.Vector3(0, CONFIG.PLAYER.GROUND_Y, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);

        // 물리 파라미터 (CONFIG에서 가져옴)
        this.groundY = CONFIG.PLAYER.GROUND_Y;
        this.jumpForce = CONFIG.PLAYER.JUMP_FORCE;
        this.gravity = CONFIG.PLAYER.GRAVITY;
        this.maxJumps = CONFIG.PLAYER.MAX_JUMPS;
        this.jumpCount = 0;

        // 슬라이드 (CONFIG에서 가져옴)
        this.slideDuration = CONFIG.PLAYER.SLIDE_DURATION;
        this.slideHeightRatio = CONFIG.PLAYER.SLIDE_HEIGHT_RATIO;
        this.slideTimer = 0;

        // 애니메이션
        this.runCycle = 0;
        this.bpm = CONFIG.GAME.DEFAULT_BPM;

        // 무적 상태 (CONFIG에서 가져옴)
        this.isInvincible = false;
        this.invincibleDuration = CONFIG.PLAYER.INVINCIBLE_DURATION;
        this.invincibleTimer = 0;

        // 공격 (Melee Attack)
        this.isAttacking = false;
        this.attackDuration = CONFIG.PLAYER.ATTACK_DURATION || 0.3;
        this.attackTimer = 0;

        // 액션 콜백 (Game 클래스에서 할당)
        this.onJump = null;
        this.onSlide = null;
        this.onAttack = null;
    }

    /**
     * 초기화 (재시작 시 호출)
     */
    reset() {
        this.state = 'running';
        this.position.set(0, this.groundY, 0);
        this.velocity.set(0, 0, 0);
        this.jumpCount = 0;
        this.slideTimer = 0;
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.isAttacking = false;
        this.attackTimer = 0;

        if (this.group) {
            this.group.position.copy(this.position);
            this.group.scale.set(1, 1, 1); // 슬라이드 후 스케일 복구
        }

        this.log('Player 초기화 완료');
    }

    /**
     * 플레이어 생성
     */
    create() {
        this.group = new THREE.Group();

        const colors = CONFIG.VISUAL.COLORS;

        // --- 몸체 구성 ---
        const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac, flatShading: true }); // 피부색
        const clothesMaterial = new THREE.MeshStandardMaterial({ color: colors.PLAYER_BODY, flatShading: true }); // 옷 색상

        // 몸통 (Torso)
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
        this.body = new THREE.Mesh(torsoGeo, clothesMaterial);
        this.body.position.y = 0.35;
        this.body.castShadow = true;
        this.group.add(this.body);

        // 머리 (Head)
        const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        this.head = new THREE.Mesh(headGeo, skinMaterial);
        this.head.position.y = 0.9;
        this.group.add(this.head);

        // 팔 (Arms)
        const armGeo = new THREE.BoxGeometry(0.12, 0.6, 0.12);

        this.leftArm = new THREE.Mesh(armGeo, skinMaterial);
        this.leftArm.position.set(-0.35, 0.6, 0);
        this.leftArm.geometry.translate(0, -0.25, 0); // 회전축을 어깨로 이동
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, skinMaterial);
        this.rightArm.position.set(0.35, 0.6, 0);
        this.rightArm.geometry.translate(0, -0.25, 0);
        this.group.add(this.rightArm);

        // 다리 (Legs)
        const legGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const pantsMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: true });

        this.leftLeg = new THREE.Mesh(legGeo, pantsMaterial);
        this.leftLeg.position.set(-0.15, 0, 0);
        this.leftLeg.geometry.translate(0, -0.3, 0); // 회전축을 골반으로 이동
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, pantsMaterial);
        this.rightLeg.position.set(0.15, 0, 0);
        this.rightLeg.geometry.translate(0, -0.3, 0);
        this.group.add(this.rightLeg);

        // 눈 (간단하게)
        const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 0.95, 0.18);
        this.group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 0.95, 0.18);
        this.group.add(rightEye);

        // 위치 및 방향 설정
        this.position.y = this.groundY;
        this.group.position.copy(this.position);
        this.group.rotation.y = Math.PI / 2; // 오른쪽을 바라보게 회전 (+X 진행 방향)

        this.sceneManager.add(this.group);
        this.setupInput();

        this.log('플레이어 생성 완료');

        return this;
    }

    /**
     * 입력 설정
     */
    setupInput() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));

        const jumpBtn = document.getElementById('jump-btn');
        const slideBtn = document.getElementById('slide-btn');

        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.jump();
            });
            jumpBtn.addEventListener('mousedown', () => this.jump());
        }

        if (slideBtn) {
            slideBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.slide();
            });
            slideBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.endSlide();
            });
            slideBtn.addEventListener('mousedown', () => this.slide());
            slideBtn.addEventListener('mouseup', () => this.endSlide());
            slideBtn.addEventListener('mouseleave', () => this.endSlide());
        }

        // 공격 버튼 (모바일용은 추후 추가 가능, 현재는 키보드 위주)

        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    /**
     * 키보드 뗌
     */
    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowDown':
            case 'KeyS':
                if (this.state === 'sliding') {
                    this.endSlide();
                }
                break;
        }
    }

    /**
     * 키보드 입력
     */
    onKeyDown(event) {
        switch (event.code) {
            case 'Space':
            case 'ArrowUp':
            case 'KeyW':
                this.jump();
                event.preventDefault();
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.slide();
                event.preventDefault();
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.attack();
                event.preventDefault();
                break;
        }
    }

    /**
     * 점프
     */
    jump() {
        if (this.state === 'sliding') {
            this.endSlide();
        }

        if (this.jumpCount < this.maxJumps) {
            this.velocity.y = this.jumpForce;
            this.jumpCount++;

            if (this.jumpCount === 1) {
                this.state = 'jumping';
            } else {
                this.state = 'doubleJump';
            }

            this.log(`점프! (${this.jumpCount}/${this.maxJumps})`);

            // 판정 콜백 실행
            if (this.onJump) this.onJump();
        }
    }

    /**
     * 슬라이드
     */
    slide() {
        if (this.state === 'jumping' || this.state === 'doubleJump' || this.state === 'sliding') return;

        this.state = 'sliding';
        this.log('슬라이드! (키를 떼면 종료)');

        // 판정 콜백 실행 (최초 발동 시에만)
        if (this.onSlide) this.onSlide();
    }

    /**
     * 근접 공격 (오른쪽 방향키)
     */
    attack() {
        // 쿨타임 삭제: 공격 중이어도 다시 공격하면 타이머 리셋
        // if (this.isAttacking) return;

        this.isAttacking = true;
        this.attackTimer = this.attackDuration;
        this.log('근접 공격!');

        // 판정 콜백 실행
        if (this.onAttack) this.onAttack();
    }

    /**
     * 슬라이드 종료
     */
    endSlide() {
        if (this.state !== 'sliding') return;
        this.state = 'running';

        // 슬라이드(태클) 시 변형된 각도와 위치 복구
        this.body.rotation.x = 0;
        this.leftLeg.rotation.z = 0;
        this.rightLeg.rotation.z = 0;
        this.leftArm.rotation.z = 0;
        this.rightArm.rotation.z = 0;
        this.group.position.y = this.groundY;

        // 각 파츠 가시성 복구
        this.leftLeg.visible = true;
        this.rightLeg.visible = true;
        this.leftArm.visible = true;
        this.rightArm.visible = true;
    }

    /**
     * BPM 설정
     */
    setBPM(bpm) {
        this.bpm = bpm;
    }

    /**
     * 매 프레임 업데이트
     */
    update(deltaTime, elapsedTime) {
        if (!this.group) return;

        const cameraX = this.sceneManager.getCameraX();
        this.position.x = cameraX + this.screenX;

        switch (this.state) {
            case 'jumping':
            case 'doubleJump':
                this.updateJump(deltaTime);
                break;
            case 'sliding':
                this.updateSlide(deltaTime);
                break;
            case 'running':
                this.updateRunning(deltaTime, elapsedTime);
                break;
        }

        // 공격 업데이트 (상태와 별개로 동작 가능하게)
        if (this.isAttacking) {
            this.updateAttack(deltaTime);
        }

        this.group.position.copy(this.position);

        if (this.state === 'running') {
            this.animateRunning(elapsedTime);
        }

        // 무적 상태 처리
        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            this.group.visible = Math.floor(this.invincibleTimer * CONFIG.PLAYER.INVINCIBLE_BLINK_SPEED) % 2 === 0;

            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.group.visible = true;
            }
        }

    }

    /**
     * 점프 업데이트
     */
    updateJump(deltaTime) {
        this.velocity.y -= this.gravity * deltaTime;
        this.position.y += this.velocity.y * deltaTime;

        if (this.position.y <= this.groundY) {
            this.position.y = this.groundY;
            this.velocity.y = 0;
            this.state = 'running';
            this.jumpCount = 0;

            // 점프 포즈 복구
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            this.rightArm.rotation.x = 0;
        }

        if (this.state === 'doubleJump') {
            this.group.rotation.z -= deltaTime * 10; // 공중제비 (회전 중심이 group이므로 자연스러움)
        } else {
            // 점프 포즈 (팔은 위로, 무릎은 살짝 굽힘)
            const jumpProgress = Math.min(1, Math.abs(this.velocity.y) / this.jumpForce);

            this.leftArm.rotation.x = -Math.PI * 0.8;
            this.rightArm.rotation.x = -Math.PI * 0.8;
            this.leftLeg.rotation.x = 0.5;
            this.rightLeg.rotation.x = 0.8;

            this.group.rotation.z = 0; // 공중제비 아닐땐 정렬
        }
    }

    /**
     * 슬라이드 업데이트
     */
    updateSlide(deltaTime) {
        // 축구 슬라이딩 태클 모션
        // 몸을 뒤로 젖히고 한쪽 다리는 뻗고 다른 쪽은 굽힘
        this.position.y = this.groundY - 0.4;
        this.body.rotation.x = 0.5; // 뒤로 살짝 젖힘

        this.leftLeg.visible = true;
        this.rightLeg.visible = true;
        this.leftArm.visible = true;
        this.rightArm.visible = true;

        // 왼쪽 다리 (앞으로 쭉 뻗음)
        this.leftLeg.rotation.x = -Math.PI / 2.5;
        this.leftLeg.rotation.z = 0.2;

        // 오른쪽 다리 (뒤로 굽힘)
        this.rightLeg.rotation.x = Math.PI / 4;
        this.rightLeg.rotation.z = -0.2;

        // 팔은 균형 잡기
        this.leftArm.rotation.x = Math.PI / 3;
        this.rightArm.rotation.x = -Math.PI / 3;
    }

    /**
     * 달리기 업데이트
     */
    updateRunning(deltaTime, elapsedTime) {
        this.position.y = this.groundY;
        this.body.rotation.z = 0;
        this.body.rotation.x = 0;
        this.group.rotation.z = 0;
    }

    /**
     * 공격 업데이트 (애니메이션)
     */
    updateAttack(deltaTime) {
        this.attackTimer -= deltaTime;

        // 공격 모션: 살짝 앞으로 대시하며 팔을 휘두름
        const progress = 1 - (this.attackTimer / this.attackDuration);

        // 1. 앞으로 살짝 튕겨나가는 효과
        const dashOffset = Math.sin(progress * Math.PI) * 0.5;
        this.body.position.z = dashOffset;

        // 2. 팔 휘두르기 (오른팔을 앞으로 크게 휘두름)
        this.rightArm.rotation.x = -Math.PI / 2 - Math.sin(progress * Math.PI) * Math.PI / 2;
        this.leftArm.rotation.x = Math.PI / 4; // 왼팔은 뒤로

        if (this.attackTimer <= 0) {
            this.isAttacking = false;
            this.body.position.z = 0;
            // 팔 회전은 다음 updateRunning 등에서 복구됨
        }
    }

    /**
     * 달리기 애니메이션
     */
    animateRunning(elapsedTime) {
        const speed = this.bpm / 60 * 2;
        this.runCycle = elapsedTime * speed;

        const swingAngle = Math.sin(this.runCycle * Math.PI) * 0.8;

        // 팔 교차 스윙
        this.leftArm.rotation.x = swingAngle;
        this.rightArm.rotation.x = -swingAngle;

        // 다리 교차 스윙
        this.leftLeg.rotation.x = -swingAngle;
        this.rightLeg.rotation.x = swingAngle;

        // 몸체 바운스
        const bounce = Math.abs(Math.sin(this.runCycle * Math.PI)) * CONFIG.PLAYER.RUN_BOUNCE_AMPLITUDE;
        this.body.position.y = 0.35 + bounce;
        this.head.position.y = 0.9 + bounce;
    }

    /**
     * 충돌 박스
     */
    getBoundingBox() {
        const halfWidth = 0.4;
        // 슬라이드 시 높이를 대폭 낮춤
        const height = this.state === 'sliding' ? 0.4 : 1.2;
        const baseY = this.state === 'sliding' ? -0.4 : 0;

        return new THREE.Box3(
            new THREE.Vector3(
                this.position.x - halfWidth,
                this.position.y + baseY,
                this.position.z - 0.3
            ),
            new THREE.Vector3(
                this.position.x + halfWidth,
                this.position.y + baseY + height,
                this.position.z + 0.3
            )
        );
    }

    getWorldX() {
        return this.position.x;
    }

    /**
     * 피격 데미지 처리
     */
    takeDamage(amount) {
        if (this.isInvincible) return;

        // 피격 효과 애니메이션 실행
        this.playHitEffect();

        // 무적 상태 전환 (CONFIG 기반)
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;

        this.log(`데미지 피격: ${amount}`, 'warn');
    }

    /**
     * 피격 효과
     */
    playHitEffect() {
        // this.isInvincible = true; // UserReq: 무적 시간 삭제
        // this.invincibleTimer = this.invincibleDuration;

        // 시각적 효과만 남김 (빨간색 점멸 등은 유지하되 충돌 무시는 해제)
        if (this.body) {
            const originalColor = this.body.material.color.getHex();
            this.body.material.color.setHex(CONFIG.VISUAL.HIT_FLASH_COLOR);
            setTimeout(() => {
                this.body.material.color.setHex(originalColor);
            }, CONFIG.VISUAL.HIT_FLASH_DURATION);
        }
    }

    /**
     * 아이템 획득 효과
     */
    playCollectEffect() {
        // 아이템 획득 시 시각 효과 (추후 파티클 등 추가 가능)
    }

    log(message, type = 'info') {
        if (this.debug) {
            this.debug.log(`[Player] ${message}`, type);
        }
    }
}
