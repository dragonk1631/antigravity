import { COLORS } from '../consts.js';
import DailyManager from '../systems/DailyManager.js';

export default class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, height * 0.3, 'POLY RHYTHM', {
            fontSize: '64px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.4, 'Tap to Start', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Interaction to unlock AudioContext
        const startZone = this.add.zone(width / 2, height / 2, width, height).setInteractive();

        startZone.once('pointerdown', () => {
            // Unlock Audio is best done in a user gesture listener at the DOM level or here
            // Phaser handles AudioContext resume automatically on input usually, but explicit check is good.
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
            this.scene.start('WorldMap');
        });

        // Debug Button
        const debugBtn = this.add.text(width / 2, height * 0.8, '[ DEBUG: METRONOME ]', {
            fontSize: '18px',
            color: '#ffff00',
            backgroundColor: '#333',
            padding: 8
        }).setOrigin(0.5).setInteractive();

        debugBtn.on('pointerdown', () => {
            if (this.sound.context.state === 'suspended') this.sound.context.resume();
            this.scene.start('MetronomeTestScene');
        });

        // Settings Button
        const settingsBtn = this.add.text(width / 2, height * 0.9, '[ SETTINGS ]', {
            fontSize: '18px',
            color: '#aaaaaa',
            padding: 8
        }).setOrigin(0.5).setInteractive();

        settingsBtn.on('pointerdown', () => this.scene.start('SettingsScene'));

        // Daily Run Button

        const dailyBtn = this.add.text(width / 2, height * 0.6, '★ DAILY SPECIAL ★', {
            fontSize: '28px',
            color: '#ffd700',
            backgroundColor: '#444',
            padding: 15,
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive();

        this.tweens.add({ targets: dailyBtn, scale: 1.05, duration: 500, yoyo: true, repeat: -1 });

        dailyBtn.on('pointerdown', () => {
            // Start Daily
            const dailyManager = new DailyManager();
            const stages = dailyManager.getDailyStages();
            console.log('Daily Stages:', stages);

            if (this.sound.context.state === 'suspended') this.sound.context.resume();

            this.scene.start('Game', {
                mode: 'daily',
                playlist: stages,
                score: 0
            });
        });
    }
}
