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

        // 2. 타이틀 (상단 - 조금 더 아래로 배치하여 여유 공간 확보)
        const title = this.add.text(width / 2, 200, 'SkyDash', {
            fontFamily: 'Arial Black',
            fontSize: '100px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 12,
            shadow: { offsetX: 0, offsetY: 10, color: '#000000', blur: 20, fill: true }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            y: 190,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            loop: -1
        });

        // 3. 모든 메뉴 버튼 그룹 (중앙 상단)
        const btnYStart = 400;
        const spacing = 100; // 간격을 넓혀 시각적 균형 확보

        this.createMenuButton(width / 2, btnYStart, I18nManager.get('menu.infinite'), 0x3498db, () => this.startGame('infinite'));
        this.createMenuButton(width / 2, btnYStart + spacing, I18nManager.get('menu.timeattack'), 0xe67e22, () => this.startGame('100'));
        this.createMenuButton(width / 2, btnYStart + spacing * 2, I18nManager.get('menu.leaderboard'), 0x27ae60, () => this.scene.start('LeaderboardScene'));
        this.createMenuButton(width / 2, btnYStart + spacing * 3, I18nManager.get('menu.settings'), 0x7f8c8d, () => this.scene.start('SettingsScene'));

        // 4. 캐릭터 선택 시스템 (중앙 하단)
        const selectorY = btnYStart + spacing * 3 + 220;
        this.createCharacterSelector(width, height, selectorY);


        // 5. 크레딧 및 언어 선택기 (하단 고정)
        this.add.text(width / 2, height - 35, I18nManager.get('menu.credit'), {
            fontSize: '18px', color: '#ffffff', alpha: 0.6
        }).setOrigin(0.5);

        this.createLanguageSelector(width / 2, height - 100);

        // 메뉴 음악 시작
        if (window.soundManager) {
            window.soundManager.startBGM('menu');
        }
    }

    /**
     * 캐릭터 선택기 생성 (좌우 실루엣 프리뷰 포함)
     */
    createCharacterSelector(width, height, centerY = 600) {
        const centerX = width / 2;
        const offset = 180;
        const previewScale = 4.0;

        // 현재 인덱스 및 순환 함수 (24종 기준)
        const currentIndex = this.gm.settings.playerIndex || 1;
        const getIndex = (idx) => ((idx - 1 + 24) % 24) + 1;

        const prevIndex = getIndex(currentIndex - 1);
        const nextIndex = getIndex(currentIndex + 1);

        // 1. 좌측 실루엣 (이전 캐릭터)
        this.createSilhouette(centerX - offset, centerY, prevIndex, previewScale * 0.7, -1);

        // 2. 우측 실루엣 (다음 캐릭터)
        this.createSilhouette(centerX + offset, centerY, nextIndex, previewScale * 0.7, 1);

        // 3. 중앙 캐릭터 (현재 선택 - 동적 시트 사용)
        const currentKey = `player${currentIndex.toString().padStart(2, '0')}_sheet`;
        const mainPlayer = this.add.sprite(centerX, centerY, currentKey);
        mainPlayer.setScale(previewScale);
        // 애니메이션 키는 그대로 유지 (BootScene에서 생성할 때 playerXX_idle-front 형식 사용)
        const animPrefix = `player${currentIndex.toString().padStart(2, '0')}`;
        mainPlayer.play(`${animPrefix}_idle-front`);

        this.tweens.add({
            targets: mainPlayer,
            y: centerY - 15,
            duration: 1500,
            yoyo: true,
            loop: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createSilhouette(x, y, index, scale, side) {
        const animPrefix = `player${index.toString().padStart(2, '0')}`;
        const key = `${animPrefix}_sheet`;
        const silhouette = this.add.sprite(x, y, key).setInteractive();
        silhouette.setScale(scale);
        silhouette.setTint(0x000000);
        silhouette.setAlpha(0.4);
        silhouette.play(`${animPrefix}_idle-front`);

        // 등장 애니메이션
        silhouette.x += side * 50;
        silhouette.alpha = 0;
        this.tweens.add({
            targets: silhouette,
            x: x,
            alpha: 0.4,
            duration: 500,
            ease: 'Back.easeOut'
        });

        // 클릭 시 캐릭터 변경
        silhouette.on('pointerdown', () => {
            if (window.soundManager) window.soundManager.playClimb();

            this.tweens.add({
                targets: silhouette,
                x: this.cameras.main.width / 2,
                y: y,
                scale: scale / 0.7,
                alpha: 1,
                duration: 400,
                ease: 'Cubic.easeInOut',
                onStart: () => {
                    silhouette.clearTint();
                    silhouette.setDepth(10);
                },
                onComplete: () => {
                    this.gm.updateSetting('playerIndex', index);
                    this.scene.restart();
                }
            });
        });

        // 호버 효과
        silhouette.on('pointerover', () => {
            silhouette.setAlpha(0.8);
            silhouette.setScale(scale * 1.1);
        });
        silhouette.on('pointerout', () => {
            silhouette.setAlpha(0.4);
            silhouette.setScale(scale);
        });
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
