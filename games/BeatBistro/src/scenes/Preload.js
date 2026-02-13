import { COLORS } from '../consts.js';

export default class Preload extends Phaser.Scene {
    constructor() {
        super('Preload');
    }

    preload() {
        // Create textures programmatically to avoid external assets for MVP

        // 1. Tile Background Pattern
        const tileG = this.make.graphics({ x: 0, y: 0, add: false });
        tileG.fillStyle(0xFFF8E7); // Base Cream
        tileG.fillRect(0, 0, 64, 64);
        tileG.lineStyle(2, 0xEFE5D1); // Light darker cream for grout
        tileG.strokeRect(0, 0, 64, 64);
        tileG.generateTexture('bg_tile', 64, 64);

        // 2. Rounded Panel (White with Stroke)
        const panelG = this.make.graphics({ x: 0, y: 0, add: false });
        panelG.fillStyle(0xFFFFFF);
        panelG.lineStyle(4, 0x2C2C2C);
        panelG.fillRoundedRect(0, 0, 200, 100, 16);
        panelG.strokeRoundedRect(0, 0, 200, 100, 16);
        panelG.generateTexture('panel_rounded', 200, 100);

        // 3. Input Button Backgrounds (Left/Blue, Right/Orange)
        // Left Button
        panelG.clear();
        panelG.fillStyle(0xF0F8FF); // Very light blue
        panelG.lineStyle(4, 0x2C2C2C);
        panelG.fillRoundedRect(0, 0, 140, 140, 20);
        panelG.strokeRoundedRect(0, 0, 140, 140, 20);
        panelG.lineStyle(4, 0x87CEEB); // Bottom accent
        panelG.beginPath();
        panelG.moveTo(20, 140);
        panelG.lineTo(120, 140);
        panelG.strokePath();
        panelG.generateTexture('btn_left', 140, 140);

        // Right Button
        panelG.clear();
        panelG.fillStyle(0xFFF5E6); // Very light orange
        panelG.lineStyle(4, 0x2C2C2C);
        panelG.fillRoundedRect(0, 0, 140, 140, 20);
        panelG.strokeRoundedRect(0, 0, 140, 140, 20);
        panelG.lineStyle(4, 0xFFB347); // Bottom accent
        panelG.beginPath();
        panelG.moveTo(20, 140);
        panelG.lineTo(120, 140);
        panelG.strokePath();
        panelG.generateTexture('btn_right', 140, 140);

        // 4. Icons (Refined)
        const iconG = this.make.graphics({ x: 0, y: 0, add: false });

        // Knife Icon
        iconG.lineStyle(3, 0x2C2C2C);
        iconG.fillStyle(0xFFFFFF);
        iconG.beginPath();
        iconG.moveTo(10, 40);
        iconG.lineTo(40, 10);
        iconG.lineTo(50, 20); // Blade tip
        iconG.lineTo(20, 50);
        iconG.closePath();
        iconG.fillPath();
        iconG.strokePath();
        iconG.fillStyle(0x8B4513); // Handle
        iconG.fillRect(10, 40, 15, 15); // Simple handle representation
        iconG.generateTexture('icon_knife', 64, 64);

        // Pan Icon
        iconG.clear();
        iconG.lineStyle(3, 0x2C2C2C);
        iconG.fillStyle(0xFFFFFF);
        iconG.strokeCircle(32, 32, 20); // Pan body
        iconG.beginPath();
        iconG.moveTo(52, 32);
        iconG.lineTo(80, 32); // Handle
        iconG.strokePath();
        iconG.generateTexture('icon_pan', 96, 64);

        // 5. Note Ingredient (Tomato?)
        iconG.clear();
        iconG.fillStyle(0xFF6347); // Tomato Red
        iconG.lineStyle(2, 0x8B0000);
        iconG.fillCircle(32, 32, 24);
        iconG.strokeCircle(32, 32, 24);
        // Leaf
        iconG.fillStyle(0x228B22);
        iconG.fillCircle(32, 10, 8);
        iconG.generateTexture('note', 64, 64);

        // 6. Central Gauge
        iconG.clear();
        iconG.lineStyle(4, 0x2C2C2C);
        iconG.fillStyle(0xFFF8E7); // Cream fill
        iconG.fillCircle(100, 100, 90);
        iconG.strokeCircle(100, 100, 90);
        // Divisions
        iconG.beginPath();
        iconG.moveTo(100, 10);
        iconG.lineTo(100, 190);
        iconG.moveTo(10, 100);
        iconG.lineTo(190, 100);
        iconG.strokePath();
        iconG.generateTexture('gauge_bg', 200, 200);

        // 7. Particle
        iconG.clear();
        iconG.fillStyle(0xFFB347);
        iconG.fillCircle(4, 4, 4);
        iconG.generateTexture('particle', 8, 8);

        // 8. Smoke
        iconG.clear();
        iconG.fillStyle(0x555555, 0.5);
        iconG.fillCircle(16, 16, 16);
        iconG.generateTexture('smoke', 32, 32);
    }

    create() {
        this.scene.start('Menu');
    }
}
