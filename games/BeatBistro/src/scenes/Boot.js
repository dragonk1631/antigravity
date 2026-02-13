export default class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        // Handle window resize or other global setups
        this.scene.start('Preload');
    }
}
