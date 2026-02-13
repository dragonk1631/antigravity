
import { COLORS } from '../consts.js';

export default class TouchPads {
    constructor(scene, inputManager) {
        this.scene = scene;
        this.inputManager = inputManager;
        this.padding = 10;

        this.createPads();
        this.registerInputEvents();
    }

    createPads() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        const padHeight = h * 0.4;
        const padY = h - padHeight;

        // Containers for animations
        this.leftPad = this.scene.add.rectangle(w * 0.25, padY + padHeight / 2, w / 2 - this.padding, padHeight - this.padding, 0x000000, 0)
            .setStrokeStyle(4, parseInt(COLORS.SECONDARY.replace('#', '0x')));

        this.rightPad = this.scene.add.rectangle(w * 0.75, padY + padHeight / 2, w / 2 - this.padding, padHeight - this.padding, 0x000000, 0)
            .setStrokeStyle(4, parseInt(COLORS.PRIMARY.replace('#', '0x')));

        // Visual Backgrounds (Initially hidden/low alpha)
        this.leftBg = this.scene.add.rectangle(w * 0.25, padY + padHeight / 2, w / 2 - this.padding, padHeight - this.padding, parseInt(COLORS.SECONDARY.replace('#', '0x')), 0.1);
        this.rightBg = this.scene.add.rectangle(w * 0.75, padY + padHeight / 2, w / 2 - this.padding, padHeight - this.padding, parseInt(COLORS.PRIMARY.replace('#', '0x')), 0.1);

        // Labels
        this.scene.add.text(w * 0.25, padY + padHeight / 2, 'LEFT (F)', { fontSize: '24px', color: COLORS.SECONDARY }).setOrigin(0.5).setAlpha(0.5);
        this.scene.add.text(w * 0.75, padY + padHeight / 2, 'RIGHT (J)', { fontSize: '24px', color: COLORS.PRIMARY }).setOrigin(0.5).setAlpha(0.5);

        // Interactive zones (Invisible, covering full bottom area)
        this.leftZone = this.scene.add.zone(0, padY, w / 2, padHeight).setOrigin(0).setInteractive();
        this.rightZone = this.scene.add.zone(w / 2, padY, w / 2, padHeight).setOrigin(0).setInteractive();
    }

    registerInputEvents() {
        // Touch
        this.leftZone.on('pointerdown', () => this.triggerPad('left'));
        this.rightZone.on('pointerdown', () => this.triggerPad('right'));

        // Keyboard handled by InputManager mostly, but we want visual feedback
        // So we listen to InputManager's events if we can, or we expose a method to trigger visual
    }

    // Called by Game scene when input is detected (either key or touch)
    flash(hand) {
        const bg = hand === 'left' ? this.leftBg : this.rightBg;
        const pad = hand === 'left' ? this.leftPad : this.rightPad;

        // Flash animation
        bg.setAlpha(0.6);
        this.scene.tweens.add({
            targets: bg,
            alpha: 0.1,
            duration: 150
        });

        // Scale anim
        pad.setScale(0.95);
        this.scene.tweens.add({
            targets: pad,
            scale: 1,
            duration: 100,
            ease: 'Back.out'
        });
    }

    triggerPad(hand) {
        // Forward to Input Manager
        this.inputManager.handleInput(hand);
        this.flash(hand);
    }
}
