/**
 * GameScene
 * 실제 게임플레이 로직이 돌아가는 핵심 씬입니다.
 * 플레이어 이동, 계단 생성, 충돌 체크, 점수 계산 등을 담당합니다.
 */
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.gm = new GameManager();
    }

    init(data) {
        this.mode = data.mode || 'infinite'; // 'infinite' or '100'
    }

    create() {
        this.STEP_HEIGHT = GameConfig.STAIR.HEIGHT;
        this.STEP_WIDTH = GameConfig.STAIR.WIDTH;

        this.score = 0;
        this.isGameOver = false;
        this.isCleared = false; // 중요: 재시작 시 상태 초기화
        this.combo = 0;
        this.startTime = null; // 첫 이동 시점에 설정
        this.endTime = 0;
        this.stairGroup = this.add.group();
        this.stairsData = [];
        this.stairPool = []; // 오브젝트 풀
        this.currentPattern = [];
        this.lastDirection = 1; // 계단 생성 방향 추적 (1: 우, -1: 좌)
        this.lastRhythmIndex = -1; // 이전 리듬 인덱스 (0~4)
        this.patternRepeatCount = 0;

        // 리더보드 데이터 가져오기 (순위 깃발 표시용)
        this.topRecords = this.gm.getLeaderboard(this.mode).slice(0, 10);
        this.patternIndex = 0;

        // 이전 최고 기록 가져오기 (게임 오버/클리어 시 비교용)
        this.previousBest = 0;
        if (this.topRecords.length > 0) {
            if (this.mode === 'infinite') {
                this.previousBest = this.topRecords[0].score;
            } else { // 100계단 모드
                this.previousBest = this.topRecords[0].time; // 100계단은 시간 기록이 중요
            }
        }

        // 콤보 시스템 초기화
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;

        // 난이도 및 에너지
        this.energy = GameConfig.ENERGY.MAX;
        this.maxEnergy = GameConfig.ENERGY.MAX;
        this.energyDecay = GameConfig.ENERGY.DECAY_BASE; // 초기 감소 속도

        // 배경 설정
        this.bgColor = 0x34495e; // 초기 배경색 (어두운 감청색)
        this.targetBgColor = 0x34495e;
        this.currentBgColor = new Phaser.Display.Color(52, 73, 94);

        this.backgroundRect = this.add.rectangle(0, 0, 720, 1280, this.bgColor).setOrigin(0).setScrollFactor(0);

        // 상단에 어두운 그라데이션 오버레이로 깊이감 추가
        this.gradient = this.add.graphics().setScrollFactor(0);
        this.updateGradient();

        // 파티클 이미지가 없으므로 그래픽으로 작은 사각형 생성하여 텍스처로 사용
        const particleGraphic = this.make.graphics({ x: 0, y: 0, add: false });
        particleGraphic.fillStyle(0xffffff);
        particleGraphic.fillRect(0, 0, 8, 8);
        particleGraphic.generateTexture('confetti', 8, 8);

        // 폭죽/컨페티 에미터
        this.confettiManager = this.add.particles(0, 0, 'confetti', {
            speed: { min: 100, max: 300 },
            angle: { min: 220, max: 320 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            gravityY: 400,
            emitting: false
        });

        // UI
        this.createUI();

        // 초기 계단 및 플레이어 생성
        this.initStairs();
        const startX = this.cameras.main.centerX;
        const startY = this.cameras.main.height * 0.3; // UI 버튼 바로 위 지점 (약 1000px)
        this.player = new Player(this, startX, startY);
        this.player.setScale(GameConfig.PLAYER.SCALE || 3.0);

        // 설정된 캐릭터 색상 적용
        this.player.setDepth(10);

        // 카메라 설정: 무한 풍경 지원을 위해 좌우 가로 범위를 수천 개의 계단도 수용하도록 대폭 확장
        this.cameras.main.setBounds(-1000000, -1000000, 2000000, 2000000);

        // 카메라 설정: 플레이어를 화면 위쪽 30% 지점(0.3)에 고정
        // lerpX를 1.0으로 설정하여 가로 방향으로는 항상 캐릭터가 정중앙에 오도록 함
        this.cameras.main.startFollow(this.player, true, 1.0, 0.2, 0, 256);

        // 입력 바인딩 전 이전 리스너 제거 (혹시 모를 중복 방지)
        this.input.keyboard.removeAllListeners();
        this.bindInput();

        // 사운드 초기화 (첫 상호작용 대기)
        if (window.soundManager) {
            window.soundManager.startBGM('game');
        }
    }

    createUI() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Top HUD Container
        this.hudContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

        // Energy Bar Background (Top Center)
        const barWidth = width * GameConfig.UI.BAR_WIDTH_PERCENT;
        const barHeight = GameConfig.UI.BAR_HEIGHT;
        const barX = (width - barWidth) / 2;
        const barY = GameConfig.UI.BAR_Y;

        this.energyBarBg = this.add.graphics();
        this.energyBarBg.fillStyle(0x663300, 1); // Dark border
        this.energyBarBg.fillRoundedRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8, 12);
        this.energyBarBg.fillStyle(0xFFCC99, 1); // Inner bg
        this.energyBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 8);
        this.hudContainer.add(this.energyBarBg);

        // Energy Bar Fill
        this.energyBar = this.add.graphics();
        this.hudContainer.add(this.energyBar);

        // Pause Button (Top Right)
        const pauseBtnSize = 60;
        const pauseBtnX = width - 80;
        const pauseBtnY = barY + barHeight / 2;

        const pauseBtn = this.add.container(pauseBtnX, pauseBtnY);
        const pauseBg = this.add.graphics();
        pauseBg.fillStyle(0xFFCC99, 1);
        pauseBg.lineStyle(4, 0x663300, 1);
        pauseBg.fillRoundedRect(-pauseBtnSize / 2, -pauseBtnSize / 2, pauseBtnSize, pauseBtnSize, 10);
        pauseBg.strokeRoundedRect(-pauseBtnSize / 2, -pauseBtnSize / 2, pauseBtnSize, pauseBtnSize, 10);

        // Pause Icon (||)
        const pauseIcon = this.add.graphics();
        pauseIcon.fillStyle(0xcc0000, 1); // Red color
        pauseIcon.fillRect(-10, -15, 8, 30);
        pauseIcon.fillRect(2, -15, 8, 30);

        pauseBtn.add([pauseBg, pauseIcon]);
        pauseBtn.setSize(pauseBtnSize, pauseBtnSize);
        pauseBtn.setInteractive().on('pointerdown', () => {
            // Pause logic placeholder
            console.log('Pause clicked');
            // this.scene.pause();
            // this.scene.launch('PauseScene'); 
        });
        this.hudContainer.add(pauseBtn);


        // Score Display (Below Bar) - Large, Pixel/Blocky look
        this.scoreText = this.add.text(width / 2, barY + barHeight + 40, '0', {
            fontFamily: 'Arial', // Keeping Arial but making it look bold/large
            fontSize: '80px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#330000',
            strokeThickness: 8
        }).setOrigin(0.5);
        this.hudContainer.add(this.scoreText);

        // Currency/Second Score (Optional, mimicking reference 'Coin' count)
        // For now, let's just show High Score or similar if needed. 
        // Reference has coins. We don't have coins, so we'll omit or put high score small.

        // 2. Bottom Controls
        this.createControls(width, height);

        // Combo/Timer Text (Legacy support, restyled)
        this.comboText = this.add.text(width / 2, height / 2 - 100, '', {
            fontFamily: 'Arial',
            fontSize: '60px',
            fontStyle: 'bold',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setVisible(false);

        if (this.mode === '100') {
            this.timerText = this.add.text(width / 2, height / 2 - 100, '0.00s', {
                fontFamily: 'Arial',
                fontSize: '120px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 10
            }).setOrigin(0.5).setScrollFactor(0).setDepth(110);
            this.hudContainer.add(this.timerText);
        }

        // --- Persistent Combo Counter (Below Gauge, Right Side) ---
        this.comboCounterText = this.add.text(width - barX, barY + barHeight + GameConfig.UI.COMBO_OFFSET_Y, 'COMBO: 0', {
            fontFamily: 'Arial',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#3498db',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(110).setVisible(false);
        this.hudContainer.add(this.comboCounterText);
    }

    createControls(width, height) {
        // Control Buttons Container
        this.controlsContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

        const btnSize = 180;
        const btnMargin = 40;
        const btnY = height - btnSize / 2 - btnMargin; // 버튼을 화면 최하단에 배치

        // Left Button (Turn)
        const leftBtnX = btnMargin + btnSize / 2;
        this.leftBtn = this.createButton(leftBtnX, btnY, btnSize, 'turn');

        // Right Button (Climb)
        const rightBtnX = width - btnMargin - btnSize / 2;
        this.rightBtn = this.createButton(rightBtnX, btnY, btnSize, 'climb');

        this.controlsContainer.add([this.leftBtn, this.rightBtn]);
    }

    createButton(x, y, size, type) {
        const btn = this.add.container(x, y);

        // Button Background (Rounded Square)
        const bg = this.add.graphics();
        bg.fillStyle(0xFFE4B5, 1); // Beige
        bg.lineStyle(6, 0x8B4513, 1); // Brown stroke
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 24);
        bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 24);

        // Button Shadow (3D effect)
        const shadow = this.add.graphics();
        shadow.fillStyle(0xCD853F, 1);
        shadow.fillRoundedRect(-size / 2, size / 2 - 10, size, 10, { tl: 0, tr: 0, bl: 24, br: 24 });

        // Icon Graphics
        const icon = this.add.graphics();
        icon.fillStyle(0xCC0000, 1);
        icon.lineStyle(8, 0xCC0000, 1);

        if (type === 'turn') {
            // --- Refined Broken Circular Arrow Icon ---
            const radius = 35;

            // Upper Arc
            icon.beginPath();
            icon.arc(0, 0, radius, Phaser.Math.DegToRad(-130), Phaser.Math.DegToRad(30), false);
            icon.strokePath();

            // Arrow head for Upper Arc
            const angle1 = Phaser.Math.DegToRad(30);
            icon.beginPath();
            icon.moveTo(radius * Math.cos(angle1), radius * Math.sin(angle1));
            icon.lineTo(radius * Math.cos(angle1) + 12, radius * Math.sin(angle1) - 15);
            icon.lineTo(radius * Math.cos(angle1) - 18, radius * Math.sin(angle1) - 5);
            icon.closePath();
            icon.fillPath();

            // Lower Arc
            icon.beginPath();
            icon.arc(0, 0, radius, Phaser.Math.DegToRad(50), Phaser.Math.DegToRad(210), false);
            icon.strokePath();

            // Arrow head for Lower Arc
            const angle2 = Phaser.Math.DegToRad(210);
            icon.beginPath();
            icon.moveTo(radius * Math.cos(angle2), radius * Math.sin(angle2));
            icon.lineTo(radius * Math.cos(angle2) - 12, radius * Math.sin(angle2) + 15);
            icon.lineTo(radius * Math.cos(angle2) + 18, radius * Math.sin(angle2) + 5);
            icon.closePath();
            icon.fillPath();

        } else {
            // --- Up Arrow Icon (Upward) ---
            icon.beginPath();
            icon.moveTo(0, -45); // Top peak
            icon.lineTo(40, 0);  // Right point
            icon.lineTo(15, 0);  // Right stem corner
            icon.lineTo(15, 40); // Bottom right
            icon.lineTo(-15, 40);// Bottom left
            icon.lineTo(-15, 0); // Left stem corner
            icon.lineTo(-40, 0); // Left point
            icon.closePath();
            icon.fillPath();
        }

        // Keyboard Guide Text (Below button)
        const guideText = type === 'turn' ? 'Z / ←' : 'X / →';
        const guideLabel = this.add.text(0, size / 2 + 25, guideText, {
            fontFamily: 'Arial',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        btn.add([shadow, bg, icon, guideLabel]);
        btn.setSize(size, size);

        // Interaction
        btn.setInteractive();

        // Button Animation Shared Logic
        btn.press = () => {
            if (btn.isPressing) return;
            btn.isPressing = true;

            // Visual "Push Down" + GOLD Shift
            bg.y = 5;
            icon.y = 5;
            bg.clear();
            bg.fillStyle(0xFFD700, 1); // Gold fill
            bg.lineStyle(6, 0x8B4513, 1);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 24);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 24);

            btn.setScale(0.95);

            this.time.delayedCall(100, () => {
                bg.y = 0;
                icon.y = 0;

                // Restore original Beige Color
                bg.clear();
                bg.fillStyle(0xFFE4B5, 1);
                bg.lineStyle(6, 0x8B4513, 1);
                bg.fillRoundedRect(-size / 2, -size / 2, size, size, 24);
                bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 24);

                btn.setScale(1);
                btn.isPressing = false;
            });
        };

        btn.on('pointerdown', () => {
            btn.press();
            if (type === 'turn') this.handleTurn();
            else this.handleClimb();
        });

        // Store reference for keyboard syncing
        if (type === 'turn') this.turnButton = btn;
        else this.climbButton = btn;

        return btn;
    }

    initStairs() {
        this.stairsData = [{ x: 0, y: 0 }];
        const startX = this.cameras.main.centerX;
        const startY = this.cameras.main.height * 0.3; // 사용자가 변경한 0.3 기준 동기화

        // 첫 계단
        const firstStair = this.stairPool.length > 0 ? this.stairPool.pop() : new Stair(this, 0, 0, this.STEP_WIDTH, this.STEP_HEIGHT);
        firstStair.reuse(startX, startY);

        // 중요: 첫 계단 좌표 정보 명시 (부서지는 연출 지원)
        firstStair.gridX = 0;
        firstStair.gridY = 0;

        this.stairGroup.add(firstStair);

        // 시작 시에는 무조건 플레이어의 초기 방향(오른쪽: 1)으로 몇 칸 생성
        // 절대로 첫 칸부터 꺾이지 않도록 강제 패턴 삽입
        this.currentPattern = [1, 1, 1];

        for (let i = 0; i < 20; i++) {
            if (this.mode === '100' && this.stairsData.length >= 100) break;
            this.addNextStair();
        }
    }

    addNextStair() {
        // 100계단 모드에서는 100개까지만 생성
        if (this.mode === '100' && this.stairsData.length >= 101) { // 0번 포함이므로 101개 데이터가 100계단
            return;
        }

        // 패턴이 비어있으면 새 패턴 생성
        if (this.currentPattern.length === 0) {
            this.generatePattern();
        }

        const last = this.stairsData[this.stairsData.length - 1];
        const nextXOffset = this.currentPattern.shift();

        const nextX = last.x + nextXOffset;
        const nextY = last.y + 1;

        this.stairsData.push({ x: nextX, y: nextY });

        const screenX = this.cameras.main.centerX + (nextX * this.STEP_WIDTH);
        const screenY = (this.cameras.main.height * 0.3) - (nextY * this.STEP_HEIGHT);

        let stairObj;
        if (this.stairPool.length > 0) {
            // 풀에 놀고 있는 계단이 있으면 재사용
            stairObj = this.stairPool.pop();
            stairObj.reuse(screenX, screenY);
        } else {
            // 없으면 새로 생성
            stairObj = new Stair(this, screenX, screenY, this.STEP_WIDTH, this.STEP_HEIGHT);
            this.stairGroup.add(stairObj);
        }

        // 씬 로직(파괴 연출 등)을 위해 좌표 데이터 저장
        stairObj.gridX = nextX;
        stairObj.gridY = nextY;

        // 순위 깃발 표시 (1~10위 기록 지점)
        const rankRecord = this.topRecords.find(r => r.score === nextY);
        if (rankRecord) {
            const rank = this.topRecords.indexOf(rankRecord) + 1;
            stairObj.showFlag(rank);
        }

        // 100번째 계단 표시
        if (this.mode === '100' && nextY === 100) {
            stairObj.showFlag('GOAL');
        }
    }

    /**
     * 화면 아래로 사라진 계단들을 제거하여 성능을 최적화합니다.
     */
    cleanupStairs() {
        const killY = this.cameras.main.scrollY + this.cameras.main.height + 300;

        this.stairGroup.getChildren().forEach(stair => {
            if (stair && stair.active && stair.y > killY) {
                // 파괴하지 않고 비활성화 후 풀에 반납
                stair.setActive(false);
                stair.setVisible(false);
                this.stairPool.push(stair);
            }
        });
    }

    generatePattern() {
        // 1. 방향 전환 (이전 세그먼트의 끝에서 방향이 바뀌어야 함)
        this.lastDirection *= -1;

        // 2. 가중치 기반 거리 선택
        const rhythms = [1, 2, 3, 4, 5];
        const weights = [30, 25, 25, 10, 10]; // 균형 잡힌 가중치 적용

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let selectedIndex = 0;

        // 동일 패턴 연속 반복 절대 금지 (무조건 다른 패턴 선택)
        do {
            let rand = Math.random() * totalWeight;
            selectedIndex = 0;
            for (let i = 0; i < weights.length; i++) {
                if (rand < weights[i]) {
                    selectedIndex = i;
                    break;
                }
                rand -= weights[i];
            }
        } while (selectedIndex === this.lastRhythmIndex);

        const distance = rhythms[selectedIndex];

        // 3. 순수 세그먼트 데이터 생성
        const steps = [];
        for (let i = 0; i < distance; i++) {
            steps.push(this.lastDirection);
        }

        // 4. 상태 업데이트 (항상 다른 패턴이므로 patternRepeatCount는 의미 없음)
        this.lastRhythmIndex = selectedIndex;
        this.patternRepeatCount = 0;

        this.currentPattern = steps;
    }

    bindInput() {
        // 키보드
        this.input.keyboard.on('keydown-LEFT', () => {
            if (this.turnButton) this.turnButton.press();
            this.handleTurn();
        });
        this.input.keyboard.on('keydown-Z', () => {
            if (this.turnButton) this.turnButton.press();
            this.handleTurn();
        });
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (this.climbButton) this.climbButton.press();
            this.handleClimb();
        });
        this.input.keyboard.on('keydown-X', () => {
            if (this.climbButton) this.climbButton.press();
            this.handleClimb();
        });

        // 모바일 터치 (화면 분할): 버튼 외 영역 터치 시에도 조작 가능하도록 지원
        this.input.on('pointerdown', (pointer, currentlyOver) => {
            // 버튼 자체를 누른 경우(currentlyOver에 객체가 있음)는 버튼 리스너가 처리하므로 무시
            if (currentlyOver.length > 0) return;

            // 화면 왼쪽 절반: 방향 전환
            if (pointer.x < this.cameras.main.width / 2) {
                if (this.turnButton) this.turnButton.press();
                this.handleTurn();
            }
            // 화면 오른쪽 절반: 오르기
            else {
                if (this.climbButton) this.climbButton.press();
                this.handleClimb();
            }
        });
    }

    handleTurn() {
        if (this.isGameOver || this.isCleared) return;

        // 1. 방향 전환
        this.player.turn();
        if (window.soundManager) window.soundManager.playTurn();

        // 2. 즉시 한 계단 이동 (무한 계단류 게임의 표준 로직: 방향 전환 버튼도 이동을 포함함)
        this.handleClimb();
    }

    handleClimb() {
        if (this.isGameOver || this.isCleared) return;

        const nextGridX = this.player.gridX + this.player.direction;
        const nextGridY = this.player.gridY + 1;
        const targetStair = this.stairsData[nextGridY];

        if (targetStair && targetStair.x === nextGridX) {
            const targetX = this.cameras.main.centerX + (nextGridX * this.STEP_WIDTH);
            const targetY = (this.cameras.main.height * 0.3) - (nextGridY * this.STEP_HEIGHT);

            this.player.climbTo(targetX, targetY);

            // 첫 이동 시 타이머 시작
            if (this.startTime === null) {
                this.startTime = Date.now();
            }

            this.handleSuccessStep();

            // 사운드: 콤보에 따라 피치 조절
            const pitch = Math.min(1.0 + (this.combo * 0.05), 2.0);
            if (window.soundManager) window.soundManager.playClimb(pitch);

            this.addNextStair();

            // 최적화 및 연출: 지나온 계단 파괴
            const prevGridY = nextGridY - 1;
            // score 0(시작 계단)인 경우도 명확히 파괴하기 위해 로직 강화
            this.stairGroup.getChildren().forEach(stair => {
                if (stair.active && stair.gridY === prevGridY) {
                    stair.shatter();
                }
            });

            this.cleanupStairs();

            // 100계단 모드 승리 조건
            if (this.mode === '100' && this.score >= 100) {
                this.gameClear();
                return;
            }

        } else {
            this.gameOver();
        }
    }

    gameClear() {
        this.isCleared = true;
        this.endTime = Date.now();
        const duration = this.startTime ? (this.endTime - this.startTime) / 1000 : 0;

        if (window.soundManager) window.soundManager.playClear();

        // 결과 저장
        this.gm.saveScore(this.mode, this.score, duration, this.maxCombo);

        const improvement = this.score - this.previousBest;

        this.time.delayedCall(1000, () => {
            this.scene.start('GameOverScene', {
                score: this.score,
                mode: this.mode,
                time: duration,
                cleared: true,
                maxCombo: this.maxCombo,
                previousBest: this.previousBest,
                improvement: improvement > 0 ? improvement : 0
            });
        });
    }

    gameOver() {
        this.isGameOver = true;
        const duration = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;

        // 결과 저장 (정상적으로 maxCombo 포함)
        this.gm.saveScore(this.mode, this.score, duration, this.maxCombo);

        this.cameras.main.shake(200, 0.01);
        this.player.fall();
        if (window.soundManager) {
            window.soundManager.stopBGM();
            window.soundManager.playFail();
        }

        const improvement = this.score - this.previousBest;

        this.time.delayedCall(1500, () => {
            this.scene.start('GameOverScene', {
                score: this.score,
                mode: this.mode,
                time: duration,
                cleared: false,
                maxCombo: this.maxCombo,
                previousBest: this.previousBest,
                improvement: improvement > 0 ? improvement : 0
            });
        });
    }

    handleSuccessStep() {
        this.score++;
        this.scoreText.setText(this.score);

        // 시각 효과: 점수 텍스트 팝
        this.tweens.add({
            targets: this.scoreText,
            scale: 1.2,
            duration: 50,
            yoyo: true
        });

        // 미세한 화면 흔들림 (타격감)
        this.cameras.main.shake(50, 0.002);

        // 콤보 증가 로직 (Full Gauge 조건)
        // 판정 기준: 에너지가 줄어들기 전(거의 100% 상태)에 입력했는지 체크
        // 설정된 에너지 임계값 이상일 때만 콤보 인정
        const energyRequired = this.maxEnergy * GameConfig.COMBO.ENERGY_THRESHOLD;

        if (this.energy >= energyRequired) {
            this.combo++;
            this.comboTimer = GameConfig.COMBO.TIMER;

            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            // UI 업데이트: 2콤보부터 표시
            if (this.combo >= 2) {
                this.comboCounterText.setText(`${this.combo} COMBO`);
                this.comboCounterText.setVisible(true);

                this.tweens.add({
                    targets: this.comboCounterText,
                    scale: 1.2,
                    duration: 50,
                    yoyo: true
                });
            }

            // 큰 팝업 효과 (설정된 단위마다) - 타임어택 모드에서는 표시 안함 (타이머가 그 자리에 있음)
            if (this.mode !== '100' && this.combo > 0 && this.combo % GameConfig.COMBO.POPUP_THRESHOLD === 0) {
                this.comboText.setVisible(true);
                this.comboText.setText(`${this.combo} COMBO!`);
                this.comboText.setScale(1.5);
                this.tweens.add({
                    targets: this.comboText,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            }
        } else {
            // "게이지가 가득 차 있지 않을 때" 이동하면 즉시 리셋
            this.combo = 0;
            this.comboTimer = 0;
            this.comboText.setVisible(false);
            this.comboCounterText.setVisible(false);
        }

        // 에너지 회복 (판정 후에 수행하여 엄격한 'Full' 상태 유지 유도)
        this.energy = Math.min(this.energy + GameConfig.ENERGY.RECOVERY_PER_STEP, this.maxEnergy);

        // 배경색 변경 체크 (10계단마다)
        if (this.score > 0 && this.score % 10 === 0) {
            this.changeBackgroundTheme();
        }

        // 폭죽 효과 (매 성공 시)
        this.confettiManager.emitParticleAt(this.player.x, this.player.y - 40, 5);
        // 무작위 색상 부여
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        this.confettiManager.setParticleTint(colors[Math.floor(Math.random() * colors.length)]);
    }

    changeBackgroundTheme() {
        // 순차적인 시간의 흐름 (낮 -> 노을 -> 밤 -> 새벽 -> 낮)
        const themes = [
            0x3498db, // Day (Light Blue)
            0xe67e22, // Sunset (Orange)
            0x2c3e50, // Night (Midnight Blue)
            0x1a1a2e  // Deep Night (Darker)
        ];

        if (this.currentThemeIndex === undefined) this.currentThemeIndex = 0;
        this.currentThemeIndex = (this.currentThemeIndex + 1) % themes.length;
        this.targetBgColor = themes[this.currentThemeIndex];
    }

    updateGradient() {
        this.gradient.clear();
        this.gradient.fillGradientStyle(0x000000, 0x000000, this.bgColor, this.bgColor, 0.4, 0.4, 0, 0);
        this.gradient.fillRect(0, 0, 720, 400);
    }

    update(time, delta) {
        if (this.isGameOver || this.isCleared) return;

        const dt = delta / 1000; // 초 단위

        // 타이머 업데이트
        if (this.mode === '100') {
            const t = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
            this.timerText.setText(t.toFixed(2) + 's');
        }

        // 콤보 타이머 체크 (게이지가 0이 되거나 타이머 종료 시 콤보 종료)
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0 || this.energy <= 0) {
                this.combo = 0;
                this.comboText.setVisible(false);
                this.comboCounterText.setVisible(false);
            }
        }

        // 에너지 감소 (난이도 커브)
        // 점수가 일정 단계 늘어날 때마다 감소 속도 증가
        const difficultyMultiplier = 1 + (this.score / GameConfig.ENERGY.DIFFICULTY_SCALE);
        this.energy -= this.energyDecay * difficultyMultiplier * dt;

        // 에너지 바 업데이트 (설정값 사용)
        this.energyBar.clear();

        const barWidth = this.cameras.main.width * GameConfig.UI.BAR_WIDTH_PERCENT;
        const barHeight = GameConfig.UI.BAR_HEIGHT;
        const barX = (this.cameras.main.width - barWidth) / 2;
        const barY = GameConfig.UI.BAR_Y;

        const fillPercent = Math.max(0, this.energy / this.maxEnergy);
        const fillWidth = barWidth * fillPercent;

        // Fill color based on energy level
        let fillColor = 0xe74c3c; // Redish default
        if (fillPercent > 0.5) fillColor = 0xff9f43; // Orange
        // if (fillPercent > 0.8) fillColor = 0x2ecc71; // Green

        this.energyBar.fillStyle(fillColor, 1);
        // Draw fill inside the rounded container border
        // Simple rect for fill, handled by mask or just drawing slightly smaller? 
        // We will just draw a rounded rect slightly smaller
        if (fillWidth > 0) {
            this.energyBar.fillRoundedRect(barX, barY, fillWidth, barHeight, 8);
        }

        if (this.energy <= 0) {
            this.gameOver();
        }

        // 배경색 부드러운 전환
        if (this.bgColor !== this.targetBgColor) {
            const current = Phaser.Display.Color.IntegerToColor(this.bgColor);
            const target = Phaser.Display.Color.IntegerToColor(this.targetBgColor);

            const nextColor = Phaser.Display.Color.Interpolate.ColorWithColor(current, target, 100, 1);
            this.bgColor = Phaser.Display.Color.GetColor(nextColor.r, nextColor.g, nextColor.b);

            this.backgroundRect.setFillStyle(this.bgColor);
            this.updateGradient();
        }
    }
}
