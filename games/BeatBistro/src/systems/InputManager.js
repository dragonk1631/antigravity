export default class InputManager {
    constructor(scene, onHit) {
        this.scene = scene;
        this.onHit = onHit; // callback(hand, timeMs)

        // Default Bindings
        this.bindings = JSON.parse(localStorage.getItem('beatbistro_settings'))?.keys || {
            left: Phaser.Input.Keyboard.KeyCodes.F,
            right: Phaser.Input.Keyboard.KeyCodes.J
        };

        this.keys = {};
    }

    setup() {
        this.updateKeyObjects();

        // Touch
        const width = this.scene.scale.width;

        // Ensure we support 2 pointers for multi-touch
        if (this.scene.input.addPointer) {
            this.scene.input.addPointer(1);
        }

        this.scene.input.on('pointerdown', (pointer) => {
            // Check if touch is in valid game area (simple left/right split)
            // Can be refined to ignore UI buttons if needed (use gameobject interactive instead)
            // For MVP global mapping:
            if (pointer.y < 100) return; // Ignore top area (UI/Pause)

            const hand = pointer.x < width / 2 ? 'left' : 'right';
            this.handleInput(hand);
        });
    }

    updateKeyObjects() {
        // Remove old listeners if any
        if (this.keys.left) this.keys.left.removeAllListeners();
        if (this.keys.right) this.keys.right.removeAllListeners();

        // Add new keys
        this.keys.left = this.scene.input.keyboard.addKey(this.bindings.left);
        this.keys.right = this.scene.input.keyboard.addKey(this.bindings.right);

        this.keys.left.on('down', () => this.handleInput('left'));
        this.keys.right.on('down', () => this.handleInput('right'));
    }

    handleInput(hand) {
        // Use AudioContext time if available for precision sync, 
        // fallback to performance.now() (converted to sec if needed, but request said Ms)
        // Actually for rhythm games, we usually want the exact time of the event.
        // Web Audio API provides `context.currentTime` (seconds).
        // Phaser provides `plugin.game.loop.now` (ms).
        // Let's stick to MS for this callback as requested.
        const timeMs = this.scene.game.loop.now;
        this.onHit(hand, timeMs);
    }

    rebind(hand, keyCode) {
        this.bindings[hand] = keyCode;
        this.saveSettings();
        this.updateKeyObjects();
    }

    saveSettings() {
        const settings = JSON.parse(localStorage.getItem('beatbistro_settings')) || {};
        settings.keys = this.bindings;
        localStorage.setItem('beatbistro_settings', JSON.stringify(settings));
    }
}
