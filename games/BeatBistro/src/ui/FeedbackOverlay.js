
import { COLORS } from '../consts.js';

export default class FeedbackOverlay {
    constructor(scene) {
        this.scene = scene;
        this.createLayout();
    }

    createLayout() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        // Judgement Text Container (Center)
        this.judgeText = this.scene.add.text(w / 2, h * 0.35, '', {
            fontSize: '48px',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4,
            fontFamily: 'Arial'
        }).setOrigin(0.5).setAlpha(0).setDepth(200);

        // Error Delta Panel (Small pill below judgment)
        this.deltaPanel = this.scene.add.container(w / 2, h * 0.42).setAlpha(0).setDepth(200);
        const bg = this.scene.add.rectangle(0, 0, 140, 30, 0x000000, 0.7).setOrigin(0.5);
        this.deltaText = this.scene.add.text(0, 0, '', {
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.deltaPanel.add([bg, this.deltaText]);

        // Combo Badge Container
        this.badgeContainer = this.scene.add.container(w / 2, h * 0.5).setAlpha(0).setDepth(201);
    }

    showJudgement(result, deltaMs) {
        // 1. Text
        this.judgeText.setText(result);

        let color = '#ffffff';
        if (result === 'PERFECT') color = COLORS.SUCCESS;
        else if (result === 'GOOD') color = COLORS.PRIMARY;
        else if (result === 'MISS') color = COLORS.ACCENT;

        this.judgeText.setColor(color);
        this.judgeText.setAlpha(1).setScale(0.8);
        this.judgeText.y = this.scene.scale.height * 0.35;

        // Pop animation
        this.scene.tweens.add({
            targets: this.judgeText,
            scale: 1.2,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this.judgeText,
                    alpha: 0,
                    y: this.judgeText.y - 20,
                    duration: 300,
                    delay: 200
                });
            }
        });

        // 2. Delta Panel (Only for hits, not misses if delta is huge)
        if (result !== 'MISS') {
            const earlyLate = deltaMs > 0 ? 'Late' : 'Early';
            const absDelta = Math.abs(deltaMs).toFixed(0);
            this.deltaText.setText(`${earlyLate} ${absDelta}ms`);

            this.deltaPanel.setAlpha(1).y = this.scene.scale.height * 0.42;
            this.scene.tweens.add({
                targets: this.deltaPanel,
                alpha: 0,
                duration: 500,
                delay: 500
            });
        }
    }

    showComboBadge(combo) {
        if (combo > 0 && combo % 10 === 0) {
            // Simple shape stamp
            const badge = this.scene.add.text(0, 0, `${combo} COMBO!`, {
                fontSize: '32px',
                color: '#FFD700',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
            }).setOrigin(0.5);

            this.badgeContainer.add(badge);
            this.badgeContainer.setAlpha(1).setScale(0);

            this.scene.tweens.add({
                targets: this.badgeContainer,
                scale: 1.5,
                angle: 360,
                duration: 400,
                ease: 'Back.out',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: this.badgeContainer,
                        alpha: 0,
                        scale: 2,
                        duration: 300,
                        onComplete: () => {
                            badge.destroy();
                        }
                    });
                }
            });
        }
    }
}
