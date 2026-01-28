/**
 * GameOverScene
 * 키보드 조작 및 버튼 포커스 기능을 추가한 결과 화면
 */
class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
        this.selectedIndex = 0; // 0: Restart, 1: Menu
    }

    init(data) {
        this.score = data.score || 0;
        this.mode = data.mode || 'infinite';
        this.time = data.time || 0;
        this.maxCombo = data.maxCombo || 0;
        this.previousBest = data.previousBest || 0;
        this.improvement = data.improvement || 0;
        this.cleared = data.cleared || false;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);

        // 결과에 따른 음악 시작 (승리 vs 패배)
        if (window.soundManager) {
            const bgmKey = this.cleared ? 'victory' : 'gameOver';
            window.soundManager.startBGM(bgmKey);
        }

        // 결과 배너
        const titleText = this.cleared ? I18nManager.get('gameover.success') : I18nManager.get('gameover.failed');
        const titleColor = this.cleared ? '#2ecc71' : '#ff4757';
        this.add.text(width / 2, height / 4, titleText, {
            fontFamily: 'Arial Black', fontSize: '80px', color: titleColor,
            stroke: '#ffffff', strokeThickness: 6
        }).setOrigin(0.5);

        // 신기록 및 경신 정보 표시
        if (this.mode === 'infinite') {
            if (this.improvement > 0) {
                this.add.text(width / 2, height / 2 - 140, I18nManager.get('gameover.new_record', { val: this.improvement }), {
                    fontFamily: 'Arial', fontSize: '32px', color: '#2ecc71', fontWeight: 'bold'
                }).setOrigin(0.5);
            }
        } else { // 100계단 모드
            if (this.cleared) {
                // 성공 시 기록 단축/오버 표시
                let diffText = '';
                let diffColor = '#ffffff';
                if (this.previousBest === 0) {
                    diffText = I18nManager.get('gameover.first_record');
                } else {
                    const diff = this.time - this.previousBest;
                    if (diff < 0) {
                        diffText = I18nManager.get('gameover.shorter', { val: Math.abs(diff).toFixed(2) });
                        diffColor = '#2ecc71';
                    } else {
                        diffText = I18nManager.get('gameover.over', { val: diff.toFixed(2) });
                        diffColor = '#e67e22';
                    }
                }
                this.add.text(width / 2, height / 2 - 140, diffText, {
                    fontFamily: 'Arial', fontSize: '32px', color: diffColor, fontWeight: 'bold'
                }).setOrigin(0.5);
            } else {
                // 실패 시 진행도 표시 (신기록 경신 표시 안함)
                this.add.text(width / 2, height / 2 - 140, `${this.score}${I18nManager.get('gameover.steps')}`, {
                    fontFamily: 'Arial', fontSize: '32px', color: '#aaaaaa', fontWeight: 'bold'
                }).setOrigin(0.5);
            }
        }

        const resultText = this.mode === '100' ? `${this.time.toFixed(2)}s` : this.score;
        this.add.text(width / 2, height / 2 - 50, resultText, {
            fontFamily: 'Arial', fontSize: '100px', fontStyle: 'bold', color: '#f1c40f'
        }).setOrigin(0.5);

        // Max Combo 표시
        this.add.text(width / 2, height / 2 + 25, `Max Combo: ${this.maxCombo}`, {
            fontFamily: 'Arial', fontSize: '28px', color: '#3498db', fontWeight: 'bold'
        }).setOrigin(0.5);

        // 이전 기록 표시 (무한모드 혹은 타임어택 성공시에만)
        if (this.mode === 'infinite' && this.improvement > 0) {
            this.add.text(width / 2, height / 2 + 75, I18nManager.get('gameover.prev_best', { val: this.previousBest }), {
                fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa'
            }).setOrigin(0.5);
        } else if (this.mode === '100' && this.cleared && this.previousBest > 0) {
            this.add.text(width / 2, height / 2 + 75, I18nManager.get('gameover.prev_highest', { val: this.previousBest.toFixed(2) }), {
                fontFamily: 'Arial', fontSize: '24px', color: '#aaaaaa'
            }).setOrigin(0.5);
        }

        // 버튼 컨테이너
        this.btnGroup = this.add.container(width / 2, height / 2 + 150);

        this.restartBtn = this.createButton(0, 0, I18nManager.get('gameover.restart'), 0x2ecc71);
        this.menuBtn = this.createButton(0, 110, I18nManager.get('gameover.menu'), 0x34495e);

        this.btnGroup.add([this.restartBtn, this.menuBtn]);

        // 키보드 입력 설정
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-UP', () => this.changeSelection(-1));
        this.input.keyboard.on('keydown-DOWN', () => this.changeSelection(1));
        this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection());
        this.input.keyboard.on('keydown-SPACE', () => this.confirmSelection());

        // 초기 포커스 업데이트
        this.updateFocus();

        // 마우스 클릭 지원 유지
        this.restartBtn.getAt(0).on('pointerdown', () => this.confirmSelection(0));
        this.menuBtn.getAt(0).on('pointerdown', () => this.confirmSelection(1));

        // 씬이 꺼질 때 키보드 리스너 정리 (GameScene에서 이미 초기화하므로 중복 제거)
        this.events.on('shutdown', () => {
            // 개별 리스너 해제가 필요하면 여기서 수행하지만, 
            // GameScene.create()에서전역 리스너를 한 번 밀어내므로 여기서는 비워둡니다.
        });
    }

    createButton(x, y, text, color) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 380, 90, color, 1).setInteractive();
        bg.setStrokeStyle(4, 0xffffff, 0); // 포커스용 스트로크

        const label = this.add.text(0, 0, text, {
            fontFace: 'Arial', fontSize: '36px', weight: 'bold', color: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, label]);

        // Hover 효과
        bg.on('pointerover', () => {
            if (bg.parentContainer === this.restartBtn) this.selectedIndex = 0;
            else this.selectedIndex = 1;
            this.updateFocus();
        });

        return container;
    }

    changeSelection(dir) {
        this.selectedIndex = (this.selectedIndex + dir + 2) % 2;
        if (window.soundManager) window.soundManager.playTurn();
        this.updateFocus();
    }

    updateFocus() {
        const btns = [this.restartBtn, this.menuBtn];
        btns.forEach((btn, i) => {
            const bg = btn.getAt(0);
            const label = btn.getAt(1);
            if (i === this.selectedIndex) {
                bg.setStrokeStyle(6, 0xffffff, 1);
                btn.setScale(1.1);
                label.setStyle({ color: '#ffffff' });
            } else {
                bg.setStrokeStyle(4, 0xffffff, 0);
                btn.setScale(1.0);
                label.setStyle({ color: '#cccccc' });
            }
        });
    }

    confirmSelection(index) {
        const finalIndex = index !== undefined ? index : this.selectedIndex;
        if (window.soundManager) window.soundManager.playClimb();

        if (finalIndex === 0) {
            this.scene.start('GameScene', { mode: this.mode });
        } else {
            this.scene.start('MainMenuScene');
        }
    }
}
