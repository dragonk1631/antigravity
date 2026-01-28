/**
 * SettingsScene
 * 게임의 설정을 변경하는 화면입니다.
 * 캐릭터, 계단, 배경 색상을 커스터마이징할 수 있습니다.
 */
class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    create() {
        this.gm = new GameManager(); // 싱글톤 인스턴스 가져오기
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 배경
        this.add.rectangle(0, 0, width, height, 0x1a1a1a).setOrigin(0);

        // 설정 음악 시작
        if (window.soundManager) {
            window.soundManager.startBGM('setting');
        }

        // 타이틀
        this.add.text(width / 2, 60, 'SETTINGS', {
            fontFamily: 'Arial',
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        // 뒤로가기 버튼
        const backBtn = this.createButton(width / 2, height - 80, 'Back to Menu', () => {
            this.scene.start('MainMenuScene');
        });

        // 색상 프리셋
        const colors = [
            '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#ecf0f1', '#34495e'
        ];

        // 1. 캐릭터 색상
        this.add.text(50, 130, 'Character Color', { fontSize: '22px', color: '#aaaaaa' });
        this.createColorGrid(50, 165, colors, 'characterColor');

        // 2. 계단 색상
        this.add.text(50, 310, 'Stair Color', { fontSize: '22px', color: '#aaaaaa' });
        this.createColorGrid(50, 345, colors, 'stairColor');

        // 3. 배경 색상
        this.add.text(50, 490, 'Background Color', { fontSize: '22px', color: '#aaaaaa' });
        this.createColorGrid(50, 525, colors, 'bgColor');

        // 미리보기 캐릭터 및 계단
        this.previewContainer = this.add.container(width / 2, 750);
        this.createPreview();
    }

    createButton(x, y, text, callback) {
        const btn = this.add.rectangle(x, y, 200, 60, 0x666666).setInteractive();
        const label = this.add.text(x, y, text, { fontSize: '24px', fontFamily: 'Arial' }).setOrigin(0.5);

        btn.on('pointerdown', callback);
        btn.on('pointerover', () => btn.setFillStyle(0x888888));
        btn.on('pointerout', () => btn.setFillStyle(0x666666));

        return btn;
    }

    createColorGrid(startX, startY, colors, targetKey) {
        const size = 60;
        const gap = 20;
        const cols = 4;

        colors.forEach((color, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = startX + col * (size + gap);
            const y = startY + row * (size + gap);

            // 색상 박스
            const rect = this.add.rectangle(x, y, size, size, parseInt(color.replace('#', '0x')))
                .setOrigin(0)
                .setInteractive();

            // 선택 표시 로직
            rect.on('pointerdown', () => {
                this.gm.updateSetting(targetKey, color);
                this.updatePreview();

                // 선택 효과(간단히 플래시)
                this.tweens.add({
                    targets: rect,
                    scaleX: 0.9,
                    scaleY: 0.9,
                    duration: 100,
                    yoyo: true
                });
            });
        });
    }

    createPreview() {
        // 배경 미리보기 (Container 뒷 배경)
        this.previewBg = this.add.rectangle(0, 0, 300, 300, parseInt(this.gm.settings.bgColor.replace('#', '0x')));
        this.previewContainer.add(this.previewBg);

        // 계단 미리보기
        this.previewStair = this.add.rectangle(0, 50, 100, 30, parseInt(this.gm.settings.stairColor.replace('#', '0x')));
        this.previewContainer.add(this.previewStair);

        // 캐릭터 미리보기
        this.previewChar = this.add.circle(0, 0, 20, parseInt(this.gm.settings.characterColor.replace('#', '0x')));
        this.previewContainer.add(this.previewChar);
    }

    updatePreview() {
        this.previewBg.setFillStyle(parseInt(this.gm.settings.bgColor.replace('#', '0x')));
        this.previewStair.setFillStyle(parseInt(this.gm.settings.stairColor.replace('#', '0x')));
        this.previewChar.setFillStyle(parseInt(this.gm.settings.characterColor.replace('#', '0x')));
    }
}
