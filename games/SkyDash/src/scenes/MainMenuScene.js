/**
 * MainMenuScene
 * 로비 화면입니다. 게임 모드 선택, 설정, 리더보드 진입이 가능합니다.
 */
class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
        this.gm = new GameManager(); // 싱글톤
    }

    preload() {
        // 국기 아이콘 로드
        this.load.image('flag_en', 'assets/images/ui/flag_usa.png');
        this.load.image('flag_ko', 'assets/images/ui/flag_kor.png');
        this.load.image('flag_ja', 'assets/images/ui/flag_jpn.png');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. 배경 설정 (설정된 색상 + 그라데이션)
        const bgColor = parseInt(this.gm.settings.bgColor.replace('#', '0x'));
        this.add.rectangle(0, 0, width, height, bgColor).setOrigin(0);

        // 하늘 느낌의 그라데이션
        const overlay = this.add.graphics();
        overlay.fillGradientStyle(0x000000, 0x000000, bgColor, bgColor, 0.3, 0.3, 0, 0);
        overlay.fillRect(0, 0, width, 500);



        // 2. 타이틀 (애니메이션 추가)
        const title = this.add.text(width / 2, 250, 'SkyDash', {
            fontFamily: 'Arial Black',
            fontSize: '100px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 12,
            shadow: { offsetX: 0, offsetY: 10, color: '#000000', blur: 20, fill: true }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            y: 230,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            loop: -1
        });

        // 3. 플로팅 캐릭터 (브랜드 느낌)
        const playerPreview = new Player(this, width / 2, height - 200);
        // GameConfig에 설정된 프리뷰 전용 배율 적용
        const previewScale = GameConfig.PLAYER.PREVIEW_SCALE || 4.0;
        playerPreview.setScale(previewScale);

        // 정면 애니메이션 재생
        if (playerPreview.sprite) {
            playerPreview.sprite.play('idle-front');
        }
        this.tweens.add({
            targets: playerPreview,
            y: height - 250,
            duration: 1500,
            ease: 'Cubic.easeInOut',
            yoyo: true,
            loop: -1
        });

        // 4. 메뉴 버튼 생성
        const btnYStart = 450;
        this.createMenuButton(width / 2, btnYStart, I18nManager.get('menu.infinite'), 0x2ecc71, () => this.startGame('infinite'));
        this.createMenuButton(width / 2, btnYStart + 100, I18nManager.get('menu.timeattack'), 0xe67e22, () => this.startGame('100'));
        this.createMenuButton(width / 2, btnYStart + 200, I18nManager.get('menu.leaderboard'), 0x9b59b6, () => this.scene.start('LeaderboardScene'));
        this.createMenuButton(width / 2, btnYStart + 300, I18nManager.get('menu.settings'), 0x34495e, () => this.scene.start('SettingsScene'));

        // 사운드 초기화 유도 가이드 (UI 하단)
        this.add.text(width / 2, height - 120, I18nManager.get('menu.credit'), {
            fontFamily: 'Arial', fontSize: '20px', color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0.6);

        // 5. 언어 선택 버튼 (화면 하단 국기)
        this.createLanguageSelector(width / 2, height - 60);

        // 메뉴 음악 시작
        if (window.soundManager) {
            window.soundManager.startBGM('menu');
        }
    }

    /**
     * 언어 선택기 생성 (USA / KOREA / JAPAN 국기)
     */
    createLanguageSelector(x, y) {
        const spacing = 110;

        // USA Flag
        this.createFlagIcon(x - spacing, y, 'en');

        // Korea Flag
        this.createFlagIcon(x, y, 'ko');

        // Japan Flag
        this.createFlagIcon(x + spacing, y, 'ja');
    }

    createFlagIcon(x, y, lang) {
        const size = 64;
        const container = this.add.container(x, y);
        const currentLang = this.gm.settings.language || 'en';

        // Background Glow for Active Language
        if (currentLang === lang) {
            const glow = this.add.circle(0, 0, size / 2 + 8, 0xffffff, 0.3);
            container.add(glow);
            this.tweens.add({
                targets: glow,
                alpha: 0.1,
                duration: 1000,
                yoyo: true,
                loop: -1
            });
        }

        // Flag Image (Circular assets generated)
        const flag = this.add.image(0, 0, `flag_${lang}`).setInteractive();
        flag.setDisplaySize(size, size);

        container.add(flag);

        flag.on('pointerdown', () => {
            if (currentLang !== lang) {
                if (window.soundManager) window.soundManager.playClimb();
                this.gm.updateSetting('language', lang);
                this.scene.restart();
            }
        });

        // Hover effects
        flag.on('pointerover', () => {
            container.setScale(1.15);
            flag.setTint(0xeeeeee);
        });
        flag.on('pointerout', () => {
            container.setScale(1);
            flag.clearTint();
        });

        return container;
    }

    createMenuButton(x, y, text, color, callback) {
        const container = this.add.container(x, y);

        const btn = this.add.rectangle(0, 0, 420, 85, color, 1).setInteractive();
        btn.setStrokeStyle(4, 0xffffff, 0.6);

        const label = this.add.text(0, 0, text, {
            fontFamily: 'Arial',
            fontSize: '34px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        container.add([btn, label]);

        btn.on('pointerover', () => {
            btn.setFillStyle(0xf1c40f); // Gold highlight
            label.setStyle({ color: '#000000' }); // Black text for maximum contrast on gold
            container.setScale(1.08);
        });
        btn.on('pointerout', () => {
            btn.setFillStyle(color);
            label.setStyle({ color: '#ffffff' }); // Restore white text
            container.setScale(1);
        });
        btn.on('pointerdown', () => {
            if (window.soundManager) window.soundManager.playClimb();
            callback();
        });
    }

    startGame(mode) {
        this.gm.currentMode = mode;
        this.scene.start('GameScene', { mode: mode });
    }
}
