import SaveManager from '../systems/SaveManager.js';
import { LEVELS } from '../data/levels.js';
import { COLORS } from '../consts.js';

export default class Result extends Phaser.Scene {
    constructor() {
        super('Result');
    }

    create(data) {
        const { width, height } = this.scale;

        // Find level thresholds
        const levelConfig = LEVELS.find(l => l.id === data.levelId) || LEVELS[0];
        const thresholds = levelConfig.thresholds || { star1: 1000, star2: 3000, star3: 5000 };

        // Calculate Stars
        let stars = 0;
        if (data.cleared) {
            if (data.score >= thresholds.star3) stars = 3;
            else if (data.score >= thresholds.star2) stars = 2;
            else if (data.score >= thresholds.star1) stars = 1;
            else stars = 0; // Cleared but low score? (Design choice: Cleared usually means 1 star minimum if we want progression)
            // Let's enforce min 1 star if cleared for MVP progression simplicity
            if (stars === 0) stars = 1;
        }

        const title = data.cleared ? "DISH COMPLETED!" : "FAILED";
        const color = data.cleared ? '#00ff00' : '#ff0000';

        this.add.text(width / 2, height * 0.15, title, { fontSize: '48px', color: color, fontStyle: 'bold' }).setOrigin(0.5);

        // Star Display
        let starStr = "";
        for (let i = 0; i < 3; i++) starStr += i < stars ? "★" : "☆";
        this.add.text(width / 2, height * 0.25, starStr, { fontSize: '60px', color: '#ffd700' }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.35, `Score: ${data.score}`, { fontSize: '32px' }).setOrigin(0.5);
        this.add.text(width / 2, height * 0.42, `Max Combo: ${data.maxCombo}`, { fontSize: '24px' }).setOrigin(0.5);

        // Save progress if cleared
        if (data.cleared) {
            const saveManager = new SaveManager();
            const result = saveManager.submitLevelResult(data.levelId, data.score, stars);

            if (result.isNewRecord) {
                this.add.text(width / 2, height * 0.38, "NEW RECORD!", { fontSize: '16px', color: '#00ffff' }).setOrigin(0.5);
            }
            if (result.earnedXP > 0) {
                this.add.text(width / 2, height * 0.53, `+${result.earnedXP} XP (Rank ${result.rank})`, { fontSize: '16px', color: '#ffff00' }).setOrigin(0.5);
            }
        }

        this.add.text(width / 2, height * 0.58, `Perfect: ${data.stats.perfect} | Good: ${data.stats.good} | Miss: ${data.stats.miss}`, { fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);

        // Accuracy
        const acc = data.accuracy || 0;
        this.add.text(width / 2, height * 0.63, `Accuracy: ${acc}%`, { fontSize: '24px', color: '#ffff00' }).setOrigin(0.5);

        // Error Bar Visualization
        const recent = data.history ? data.history.filter(h => h.result !== 'MISS').slice(-20) : [];
        if (recent.length > 0) {
            const barY = height * 0.72;
            const barWidth = 400;
            const barHeight = 60;

            // Axis
            this.add.rectangle(width / 2, barY, barWidth, 2, 0x888888); // Center (0ms)
            this.add.text(width / 2 - barWidth / 2, barY + 10, '-100ms', { fontSize: '10px' });
            this.add.text(width / 2 + barWidth / 2, barY + 10, '+100ms', { fontSize: '10px' }).setOrigin(1, 0);

            recent.forEach((hit, i) => {
                // Normalize -100ms to 100ms to X position
                const ms = Phaser.Math.Clamp(hit.delta, -100, 100);
                const x = width / 2 + (ms / 100) * (barWidth / 2);
                const color = hit.result === 'PERFECT' ? 0x00ff00 : 0xffff00;

                // Draw dot
                this.add.circle(x, barY - 10 - (i * 2), 4, color);
            });

            this.add.text(width / 2, barY + 30, 'Error Spread (Recent 20 Hits)', { fontSize: '12px', color: '#666' }).setOrigin(0.5);
        }

        // --- BUTTONS ---
        let buttonsY = height * 0.85;

        // Next Stage / Finish (for Daily)
        if (data.mode === 'daily') {
            if (data.cleared) {
                const nextBtn = this.add.text(width / 2, buttonsY, "NEXT COURSE >>", { fontSize: '24px', backgroundColor: '#e94560', padding: 12 }).setOrigin(0.5).setInteractive();
                nextBtn.on('pointerdown', () => {
                    // Notify Game or restart with next
                    // Easier: Call a global manager or re-start Game with updated playlist
                    this.scene.start('Game', {
                        mode: 'daily',
                        playlist: data.playlist,
                        score: data.cumulativeScore
                    });
                });
            } else {
                // Daily Failed
                this.add.text(width / 2, buttonsY, "DAILY RUN ENDED", { fontSize: '24px', color: '#ff0000' }).setOrigin(0.5);
                this.add.text(width / 2, buttonsY + 40, "TAP TO EXIT", { fontSize: '18px' }).setOrigin(0.5).setInteractive().on('pointerdown', () => this.scene.start('Menu'));
            }
        } else {
            // Normal Mode
            const retryBtn = this.add.text(width / 2, buttonsY, "RETRY", { fontSize: '24px', backgroundColor: '#444', padding: 10 }).setOrigin(0.5).setInteractive();
            retryBtn.on('pointerdown', () => this.scene.start('Game', { levelId: data.levelId }));

            const mapBtn = this.add.text(width / 2, buttonsY + 60, "MENU", { fontSize: '24px', backgroundColor: '#444', padding: 10 }).setOrigin(0.5).setInteractive();
            mapBtn.on('pointerdown', () => this.scene.start('WorldMap'));
        }
    }
}
