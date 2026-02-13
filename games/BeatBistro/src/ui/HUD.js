
import { COLORS } from '../consts.js';

export default class HUD {
    constructor(scene, levelData) {
        this.scene = scene;
        this.levelData = levelData;

        this.container = scene.add.container(0, 0).setDepth(100);
        this.createLayout();
    }

    createLayout() {
        const w = this.scene.scale.width;

        // 1. Top Left: Level Info
        this.levelText = this.scene.add.text(20, 20, `${this.levelData.id}`, {
            fontSize: '24px',
            fontStyle: 'bold',
            color: COLORS.TEXT_DARK
        });

        this.bpmText = this.scene.add.text(20, 50, `${this.levelData.bpm} BPM`, {
            fontSize: '16px',
            color: COLORS.TEXT_LIGHT
        });

        // 2. Top Center: Combo (Big)
        this.comboLabel = this.scene.add.text(w / 2, 30, 'COMBO', {
            fontSize: '14px',
            color: COLORS.TEXT_LIGHT
        }).setOrigin(0.5);

        this.comboText = this.scene.add.text(w / 2, 60, '0', {
            fontSize: '48px',
            fontStyle: 'bold',
            color: COLORS.TEXT_DARK
        }).setOrigin(0.5);

        // 3. Top Right: Score & Pause
        this.scoreLabel = this.scene.add.text(w - 20, 30, 'SCORE', {
            fontSize: '14px',
            color: COLORS.TEXT_LIGHT
        }).setOrigin(1, 0.5);

        this.scoreText = this.scene.add.text(w - 20, 55, '0', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: COLORS.TEXT_DARK
        }).setOrigin(1, 0.5);

        this.pauseBtn = this.scene.add.text(w - 20, 15, 'II', {
            fontSize: '20px',
            fontStyle: 'bold',
            color: COLORS.TEXT_DARK
        }).setOrigin(1, 0).setInteractive();

        this.container.add([
            this.levelText, this.bpmText,
            this.comboLabel, this.comboText,
            this.scoreLabel, this.scoreText,
            this.pauseBtn
        ]);
    }

    updateScore(score) {
        this.scoreText.setText(Math.floor(score).toLocaleString());
    }

    updateCombo(combo) {
        this.comboText.setText(combo);
        // Little bounce effect
        this.scene.tweens.add({
            targets: this.comboText,
            scale: { from: 1.5, to: 1 },
            duration: 150,
            ease: 'Back.out'
        });
    }
}
