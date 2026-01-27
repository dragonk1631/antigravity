/**
 * SkyDash Phaser 3 Game Configuration
 * Reverting to the most stable "bulletproof" parent/scaling setup.
 */
const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    parent: 'game-container', // Attach to the dedicated div
    backgroundColor: '#000000',
    pixelArt: true, // 픽셀 아트 렌더링 최적화 (Nearest neighbor)
    roundPixels: true, // 서브 픽셀 렌더링 방지 (가독성 향상)
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH // Native centering within the parent
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        IntroScene,
        MainMenuScene,
        GameScene,
        GameOverScene,
        SettingsScene,
        LeaderboardScene
    ]
};

window.onload = () => {
    window.game = new Phaser.Game(config);
};
