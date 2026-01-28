/**
 * BootScene
 * 게임에 필요한 에셋을 로드하고 초기 설정을 수행하는 씬입니다.
 */
class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // 로딩 바 시각화
        this.createLoadingBar();

        // ------------------------------------
        // 에셋 로드 (플레이스홀더 및 리소스)
        // ------------------------------------

        // 24종 플레이어 에셋 일괄 로드
        for (let i = 1; i <= 24; i++) {
            const num = i.toString().padStart(2, '0');
            this.load.image(`player${num}`, `assets/images/player/player${num}.png`);
        }

        // 타일셋 로드 (32x32 타일 규격으로 가정)
        this.load.spritesheet('tileset', 'assets/images/tileset/legacy_atlas.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // 사운드 매니저 초기화 (오디오 컨텍스트 등)
    }

    create() {
        // SoundManager 및 MidiPlayer 초기화
        window.soundManager = new SoundManager(this.sound);

        // 핵심 악기 사전 로딩 (MIDI 엔진 초기화)
        if (window.midiPlayer) {
            window.midiPlayer.init();
        }

        // 24종 플레이어별 동적 Spritesheet 생성 및 애니메이션 생성
        for (let i = 1; i <= 24; i++) {
            const num = i.toString().padStart(2, '0');
            const key = `player${num}`;

            // 1. 로드된 이미지의 소스 객체를 직접 가져와 4x4 격자 크기 계산
            const texture = this.textures.get(key);
            if (!texture || texture.key === '__MISSING') {
                console.warn(`[Boot] Texture ${key} not found.`);
                continue;
            }

            const sourceImage = texture.getSourceImage();
            if (!sourceImage) {
                console.warn(`[Boot] Source image for ${key} is null.`);
                continue;
            }

            const frameWidth = Math.max(1, Math.floor(sourceImage.width / 4));
            const frameHeight = Math.max(1, Math.floor(sourceImage.height / 4));

            // 2. 기존 이미지를 spritesheet로 재구성 (이미지 객체 직접 사용)
            if (this.textures.exists(`${key}_sheet`)) {
                this.textures.remove(`${key}_sheet`);
            }

            this.textures.addSpriteSheet(`${key}_sheet`, sourceImage, {
                frameWidth: frameWidth,
                frameHeight: frameHeight
            });

            // 3. 애니메이션 생성 (시트 키 사용)
            const sheetKey = `${key}_sheet`;

            // 기존 애니메이션 삭제 (중복 생성 방지)
            const animKeys = [`${key}_idle-front`, `${key}_walk-left`, `${key}_walk-right`];
            animKeys.forEach(k => {
                if (this.anims.exists(k)) this.anims.remove(k);
            });

            this.anims.create({
                key: `${key}_idle-front`,
                frames: this.anims.generateFrameNumbers(sheetKey, { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: `${key}_walk-left`,
                frames: this.anims.generateFrameNumbers(sheetKey, { start: 4, end: 7 }),
                frameRate: 24,
                repeat: -1
            });

            this.anims.create({
                key: `${key}_walk-right`,
                frames: this.anims.generateFrameNumbers(sheetKey, { start: 8, end: 11 }),
                frameRate: 24,
                repeat: -1
            });
        }

        // 다음 씬으로 전환
        this.scene.start('IntroScene');
    }

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', function (value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
    }
}
