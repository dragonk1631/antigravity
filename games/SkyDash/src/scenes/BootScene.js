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

        this.load.spritesheet('player', 'assets/images/player.png', { frameWidth: 32, frameHeight: 48 });

        // 사운드 매니저 초기화 (오디오 컨텍스트 등)
    }

    create() {
        // 게임 데이터 매니저 초기화 (싱글톤)
        // window.gameManager = new GameManager(); 

        // SoundManager는 글로벌로 사용하거나 GameScene에서 관리
        window.soundManager = new SoundManager(this.sound);

        // 플레이어 애니메이션 생성
        this.anims.create({
            key: 'idle-front',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 24, // 10 -> 24: 120ms 점프 동안 약 3프레임 소비하여 역동성 증가
            repeat: -1
        });

        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
            frameRate: 24, // 10 -> 24
            repeat: -1
        });

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
