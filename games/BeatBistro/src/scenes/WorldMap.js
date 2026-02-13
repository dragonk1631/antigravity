import { LEVELS } from '../data/levels.js';
import { COLORS } from '../consts.js';
import SaveManager from '../systems/SaveManager.js';

export default class WorldMap extends Phaser.Scene {
    constructor() {
        super('WorldMap');
    }

    create() {
        const { width, height } = this.scale;
        this.saveManager = new SaveManager();

        // Header
        this.add.text(width / 2, 40, 'STAGE SELECT', {
            fontSize: '32px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Rank Display
        const rank = this.saveManager.data.rank;
        const xp = this.saveManager.data.xp;
        this.add.text(width / 2, 70, `Rank: ${rank} (XP: ${xp})`, {
            fontSize: '16px', color: COLORS.ACCENT
        }).setOrigin(0.5);

        // Scrollable List Container
        const listContainer = this.add.container(0, 0);

        let y = 120;

        LEVELS.forEach((level) => {
            const isUnlocked = this.saveManager.isLevelUnlocked(level.id);
            const stars = this.saveManager.getStars(level.id);

            const btnGroup = this.add.container(width / 2, y);
            const bg = this.add.rectangle(0, 0, width * 0.85, 70, isUnlocked ? 0x2a2a2a : 0x111111).setInteractive();

            // Text color based on unlock
            const titleColor = isUnlocked ? '#ffffff' : '#666666';

            // Level Info
            const titleText = this.add.text(-width * 0.38, -15, `#${level.id} ${level.title}`, {
                fontSize: '18px', color: titleColor, fontStyle: 'bold'
            });

            const metaText = this.add.text(-width * 0.38, 10, `${level.pattern.left}:${level.pattern.right} Polyrhythm • ${level.bpm} BPM`, {
                fontSize: '14px', color: '#888888'
            });

            // Star Display
            let starString = '';
            for (let i = 0; i < 3; i++) {
                starString += (i < stars) ? '★' : '☆';
            }
            const starText = this.add.text(width * 0.35, 0, isUnlocked ? starString : '🔒', {
                fontSize: '24px', color: COLORS.ACCENT
            }).setOrigin(1, 0.5);

            btnGroup.add([bg, titleText, metaText, starText]);

            if (isUnlocked) {
                bg.on('pointerdown', () => {
                    this.scene.start('Game', { levelId: level.id });
                });
                // Hover
                bg.on('pointerover', () => bg.setFillStyle(0x444444));
                bg.on('pointerout', () => bg.setFillStyle(0x2a2a2a));
            }

            listContainer.add(btnGroup);
            y += 80;
        });

        // Back Button
        const backBtn = this.add.text(width / 2, height - 40, "BACK TO TITLE", { fontSize: '18px', backgroundColor: '#333', padding: 10 }).setOrigin(0.5).setInteractive().setScrollFactor(0);
        backBtn.on('pointerdown', () => this.scene.start('Menu'));

        // Mobile Scroll (Simple drag)
        let isDrag = false;
        let lastY = 0;

        this.input.on('pointerdown', (p) => {
            isDrag = true;
            lastY = p.y;
        });
        this.input.on('pointerup', () => isDrag = false);
        this.input.on('pointermove', (p) => {
            if (isDrag) {
                const dy = p.y - lastY;
                listContainer.y += dy;
                // Clamp scroll (approx)
                const minScroll = -((LEVELS.length * 80) + 100 - height);
                if (listContainer.y > 0) listContainer.y = 0;
                if (listContainer.y < minScroll) listContainer.y = minScroll;

                lastY = p.y;
            }
        });
    }
}
