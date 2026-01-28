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

        // 4. 음악 모드 토글 (FM / MIDI)
        this.add.text(50, 680, 'Music Mode', { fontSize: '22px', color: '#aaaaaa' });
        this.createMusicModeToggle(50, 720);

        // 미리보기 캐릭터 및 계단
        this.previewContainer = this.add.container(width / 2, 950);
        this.createPreview();
    }

    /**
     * 음악 모드 토글 버튼 생성 (FM 합성 / MIDI 파일)
     */
    createMusicModeToggle(x, y) {
        const currentMode = this.gm.settings.musicMode || 'fm';

        // FM 버튼
        const fmBtn = this.add.rectangle(x, y, 140, 50, currentMode === 'fm' ? 0x3498db : 0x444444)
            .setOrigin(0)
            .setInteractive();
        const fmLabel = this.add.text(x + 70, y + 25, '🎹 FM 합성', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        // MIDI 버튼
        const midiBtn = this.add.rectangle(x + 160, y, 140, 50, currentMode === 'midi' ? 0x3498db : 0x444444)
            .setOrigin(0)
            .setInteractive();
        const midiLabel = this.add.text(x + 230, y + 25, '🎵 MIDI', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        // 상태 텍스트
        const statusText = this.add.text(x + 320, y + 25,
            currentMode === 'fm' ? '(절차적 합성)' : '(파일 재생)', {
            fontSize: '14px',
            color: '#888888'
        }).setOrigin(0, 0.5);

        // FM 버튼 클릭
        fmBtn.on('pointerdown', () => {
            this.gm.updateSetting('musicMode', 'fm');
            fmBtn.setFillStyle(0x3498db);
            midiBtn.setFillStyle(0x444444);
            statusText.setText('(절차적 합성)');

            // 음악 재시작 (새 모드로)
            if (window.soundManager) {
                window.soundManager.stopBGM();
                window.soundManager.startBGM('menu');
            }
        });

        // MIDI 버튼 클릭
        midiBtn.on('pointerdown', () => {
            this.gm.updateSetting('musicMode', 'midi');
            fmBtn.setFillStyle(0x444444);
            midiBtn.setFillStyle(0x3498db);
            statusText.setText('(파일 재생)');

            // 음악 재시작 (새 모드로)
            if (window.soundManager) {
                window.soundManager.stopBGM();
                window.soundManager.startBGM('menu');
            }
        });

        // 호버 효과
        [fmBtn, midiBtn].forEach(btn => {
            btn.on('pointerover', () => {
                if (btn.fillColor !== 0x3498db) btn.setFillStyle(0x555555);
            });
            btn.on('pointerout', () => {
                const mode = this.gm.settings.musicMode || 'fm';
                if (btn === fmBtn && mode !== 'fm') btn.setFillStyle(0x444444);
                if (btn === midiBtn && mode !== 'midi') btn.setFillStyle(0x444444);
            });
        });
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
