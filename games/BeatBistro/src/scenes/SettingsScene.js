export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, 50, 'SETTINGS', { fontSize: '32px' }).setOrigin(0.5);

        // Load bindings
        const settings = JSON.parse(localStorage.getItem('beatbistro_settings')) || {};
        this.bindings = settings.keys || { left: Phaser.Input.Keyboard.KeyCodes.F, right: Phaser.Input.Keyboard.KeyCodes.J };

        // Key Config UI
        this.createKeyBinder(width / 2, 150, 'Left Hand', 'left');
        this.createKeyBinder(width / 2, 250, 'Right Hand', 'right');

        // Back Button
        const backBtn = this.add.text(width / 2, height - 100, 'BACK', {
            fontSize: '24px', backgroundColor: '#444', padding: 10
        }).setOrigin(0.5).setInteractive();

        backBtn.on('pointerdown', () => this.scene.start('Menu'));
    }

    createKeyBinder(x, y, label, hand) {
        const container = this.add.container(x, y);

        const labelText = this.add.text(0, -20, label, { fontSize: '18px', color: '#888' }).setOrigin(0.5);

        const keyName = this.getKeyName(this.bindings[hand]);
        const btn = this.add.text(0, 10, keyName, {
            fontSize: '24px',
            backgroundColor: '#222',
            padding: { x: 20, y: 10 },
            fixedWidth: 150,
            align: 'center'
        }).setOrigin(0.5).setInteractive();

        btn.on('pointerdown', () => {
            btn.setText('PRESS KEY...');
            btn.setBackgroundColor('#660000');

            const handleKey = (event) => {
                this.input.keyboard.off('keydown', handleKey);

                // Save
                this.bindings[hand] = event.keyCode;
                this.saveSettings();

                // Update UI
                btn.setText(this.getKeyName(event.keyCode));
                btn.setBackgroundColor('#222');
            };

            this.input.keyboard.on('keydown', handleKey);
        });

        container.add([labelText, btn]);
    }

    getKeyName(keyCode) {
        // Simple mapper, Phaser has huge map but we only need basic chars usually
        for (let k in Phaser.Input.Keyboard.KeyCodes) {
            if (Phaser.Input.Keyboard.KeyCodes[k] === keyCode) {
                return k;
            }
        }
        return `KEY ${keyCode}`;
    }

    saveSettings() {
        const settings = JSON.parse(localStorage.getItem('beatbistro_settings')) || {};
        settings.keys = this.bindings;
        localStorage.setItem('beatbistro_settings', JSON.stringify(settings));
    }
}
