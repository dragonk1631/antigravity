/**
 * IntroScene
 * 게임 시작 전 사용자 상호작용을 유도하는 인트로 화면
 */
class IntroScene extends Phaser.Scene {
    constructor() {
        super('IntroScene');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.add.rectangle(0, 0, width, height, 0x1e3c72).setOrigin(0);

        // 로고 느낌의 텍스트
        const logo = this.add.text(width / 2, height / 2 - 50, 'SKY DASH', {
            fontFamily: 'Arial Black', fontSize: '120px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 15,
            shadow: { color: '#0000fb', blur: 30, fill: true, offsetX: 0, offsetY: 10 }
        }).setOrigin(0.5);

        const prompt = this.add.text(width / 2, height / 2 + 200, 'TOUCH TO START', {
            fontFamily: 'Arial', fontSize: '40px', color: '#ffffff'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: prompt,
            alpha: 0,
            duration: 800,
            yoyo: true,
            loop: -1
        });

        // 배경 파티클 효과
        const particles = this.add.graphics();
        particles.fillStyle(0xffffff, 0.2);
        for (let i = 0; i < 50; i++) {
            particles.fillCircle(Math.random() * width, Math.random() * height, Math.random() * 3);
        }

        // 입력 리스너 (안전한 폴백 포함)
        const setupInput = () => {
            if (this.input) {
                this.input.once('pointerdown', () => {
                    if (window.soundManager) {
                        window.soundManager.init();
                        window.soundManager.startBGM('menu');
                    }
                    this.cameras.main.fade(500, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.start('MainMenuScene');
                    });
                });
            } else {
                // 입력 시스템 부재 시 강제 전환 폴백
                this.time.delayedCall(2000, () => this.scene.start('MainMenuScene'));
            }
        };

        setupInput();
    }
}
