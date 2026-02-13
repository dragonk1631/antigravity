/**
 * SettingsManager.js
 * Manages settings overlay and layout editor preview
 */

export class SettingsManager {
    constructor(gameEngine) {
        this.game = gameEngine;

        // Default layout configuration
        this.layout = this.loadLayout() || {
            hitLineY: 0.7,
            scoreY: 0.72,
            scoreFontSize: 28,
            scoreLabel: 16,
            comboY: 150,
            comboFontSize: 96,
            comboLabelSpacing: 55,
            touchZoneTop: 0.7,
            touchZoneHeight: 0.3,
            keyIconSize: 60,
            keyIconY: 0,
            keyIconShape: '50%',
            keyIconGlow: 15,
            keyIconHue: 0,

            // [New] Note Defaults
            noteHeightScale: 1.0,
            noteShape: 'RECT'
        };

        this.elements = {
            overlay: document.getElementById('settings-overlay'),
            closeBtn: document.getElementById('close-settings-btn'),
            settingsBtn: document.getElementById('settings-btn'),

            // Sliders
            hitlineSlider: document.getElementById('hitline-slider'),
            scorePosSlider: document.getElementById('score-pos-slider'),
            scoreSizeSlider: document.getElementById('score-size-slider'),
            comboPosSlider: document.getElementById('combo-pos-slider'),
            touchzoneSlider: document.getElementById('touchzone-slider'),

            // [New] Note Customization
            noteHeightSlider: document.getElementById('note-height-slider'),
            noteHeightValue: document.getElementById('note-height-value'),
            noteShapeBtns: document.querySelectorAll('.shape-btn'),
            previewCanvas: document.getElementById('preview-canvas'),

            // Value displays
            hitlineValue: document.getElementById('hitline-value'),
            scorePosValue: document.getElementById('score-pos-value'),
            scoreSizeValue: document.getElementById('score-size-value'),
            comboPosValue: document.getElementById('combo-pos-value'),
            touchzoneValue: document.getElementById('touchzone-value'),
            keyIconSizeSlider: document.getElementById('key-icon-size-slider'),
            keyIconPosSlider: document.getElementById('key-icon-pos-slider'),
            keyIconSizeValue: document.getElementById('key-icon-size-value'),
            keyIconPosValue: document.getElementById('key-icon-pos-value'),
            keyIconShapeSelect: document.getElementById('key-icon-shape-select'),
            keyIconGlowSlider: document.getElementById('key-icon-glow-slider'),
            keyIconGlowValue: document.getElementById('key-icon-glow-value'),
            keyIconHueSlider: document.getElementById('key-icon-hue-slider'),
            keyIconHueValue: document.getElementById('key-icon-hue-value'),

            // Buttons
            saveBtn: document.getElementById('save-settings-btn'),
            resetBtn: document.getElementById('reset-settings-btn'),
            presetBtns: document.querySelectorAll('.preset-btn')
        };

        this.bindEvents();
        this.initializeSliders();
    }

    bindEvents() {
        // Open settings
        this.elements.settingsBtn?.addEventListener('click', () => this.open());

        // Close settings
        this.elements.closeBtn?.addEventListener('click', () => this.close());

        // Close on overlay click
        this.elements.overlay?.addEventListener('click', (e) => {
            if (e.target === this.elements.overlay) this.close();
        });

        // Slider events
        this.elements.hitlineSlider?.addEventListener('input', (e) => this.updateValue('hitLineY', e.target.value / 100, e.target.value + '%'));
        this.elements.scorePosSlider?.addEventListener('input', (e) => this.updateValue('scoreY', e.target.value / 100, e.target.value + '%'));
        this.elements.scoreSizeSlider?.addEventListener('input', (e) => this.updateValue('scoreFontSize', parseInt(e.target.value), e.target.value + 'px'));
        this.elements.comboPosSlider?.addEventListener('input', (e) => this.updateValue('comboY', parseInt(e.target.value), e.target.value + 'px'));
        this.elements.touchzoneSlider?.addEventListener('input', (e) => this.updateValue('touchZoneTop', e.target.value / 100, e.target.value + '%'));
        this.elements.keyIconSizeSlider?.addEventListener('input', (e) => this.updateValue('keyIconSize', parseInt(e.target.value), e.target.value + 'px'));
        this.elements.keyIconPosSlider?.addEventListener('input', (e) => this.updateValue('keyIconY', parseInt(e.target.value), e.target.value + 'px'));

        // [New] Note Customization Events
        this.elements.noteHeightSlider?.addEventListener('input', (e) => this.updateValue('noteHeightScale', e.target.value / 100, e.target.value + '%'));

        this.elements.noteShapeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Visual update
                this.elements.noteShapeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Logic update
                this.updateValue('noteShape', btn.dataset.value);
            });
        });

        this.elements.keyIconShapeSelect?.addEventListener('change', (e) => this.updateValue('keyIconShape', e.target.value));
        this.elements.keyIconGlowSlider?.addEventListener('input', (e) => this.updateValue('keyIconGlow', parseInt(e.target.value), e.target.value + 'px'));
        this.elements.keyIconHueSlider?.addEventListener('input', (e) => this.updateValue('keyIconHue', parseInt(e.target.value), e.target.value + '°'));

        // Button events
        this.elements.saveBtn?.addEventListener('click', () => this.saveLayout());
        this.elements.resetBtn?.addEventListener('click', () => this.resetLayout());

        // Preset buttons
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.loadPreset(parseInt(btn.dataset.preset)));
        });
    }

    initializeSliders() {
        // Set slider values from loaded layout
        if (this.elements.hitlineSlider) this.elements.hitlineSlider.value = this.layout.hitLineY * 100;
        if (this.elements.scorePosSlider) this.elements.scorePosSlider.value = this.layout.scoreY * 100;
        if (this.elements.scoreSizeSlider) this.elements.scoreSizeSlider.value = this.layout.scoreFontSize;
        if (this.elements.comboPosSlider) this.elements.comboPosSlider.value = this.layout.comboY;
        if (this.elements.touchzoneSlider) this.elements.touchzoneSlider.value = this.layout.touchZoneTop * 100;
        if (this.elements.keyIconSizeSlider) this.elements.keyIconSizeSlider.value = this.layout.keyIconSize;
        if (this.elements.keyIconPosSlider) this.elements.keyIconPosSlider.value = this.layout.keyIconY;
        if (this.elements.keyIconShapeSelect) this.elements.keyIconShapeSelect.value = this.layout.keyIconShape;
        if (this.elements.keyIconGlowSlider) this.elements.keyIconGlowSlider.value = this.layout.keyIconGlow;
        if (this.elements.keyIconHueSlider) this.elements.keyIconHueSlider.value = this.layout.keyIconHue;

        // [New] Init Note Controls
        if (this.elements.noteHeightSlider) this.elements.noteHeightSlider.value = this.layout.noteHeightScale * 100;
        if (this.elements.noteShapeBtns) {
            this.elements.noteShapeBtns.forEach(btn => {
                if (btn.dataset.value === (this.layout.noteShape || 'RECT')) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Apply to CSS variables immediately
        this.applyCustomStyles();

        // Update displays
        this.updateDisplays();
    }

    updateDisplays() {
        if (this.elements.hitlineValue) this.elements.hitlineValue.textContent = Math.round(this.layout.hitLineY * 100) + '%';
        if (this.elements.scorePosValue) this.elements.scorePosValue.textContent = Math.round(this.layout.scoreY * 100) + '%';
        if (this.elements.scoreSizeValue) this.elements.scoreSizeValue.textContent = this.layout.scoreFontSize + 'px';
        if (this.elements.comboPosValue) this.elements.comboPosValue.textContent = this.layout.comboY + 'px';
        if (this.elements.touchzoneValue) this.elements.touchzoneValue.textContent = Math.round(this.layout.touchZoneTop * 100) + '%';
        if (this.elements.keyIconSizeValue) this.elements.keyIconSizeValue.textContent = this.layout.keyIconSize + 'px';
        if (this.elements.keyIconPosValue) this.elements.keyIconPosValue.textContent = this.layout.keyIconY + 'px';
        if (this.elements.keyIconGlowValue) this.elements.keyIconGlowValue.textContent = this.layout.keyIconGlow + 'px';
        if (this.elements.keyIconHueValue) this.elements.keyIconHueValue.textContent = this.layout.keyIconHue + '°';

        // [New] Note Display
        if (this.elements.noteHeightValue) this.elements.noteHeightValue.textContent = Math.round(this.layout.noteHeightScale * 100) + '%';
    }

    applyCustomStyles() {
        document.documentElement.style.setProperty('--key-icon-size', `${this.layout.keyIconSize}px`);
        document.documentElement.style.setProperty('--key-icon-y', `${this.layout.keyIconY}px`);
        document.documentElement.style.setProperty('--touch-zone-top', `${this.layout.touchZoneTop * 100}%`);
        document.documentElement.style.setProperty('--key-icon-radius', this.layout.keyIconShape);
        document.documentElement.style.setProperty('--key-icon-glow', `${this.layout.keyIconGlow}px`);
        document.documentElement.style.setProperty('--key-icon-hue', `${this.layout.keyIconHue}deg`);
    }

    updateValue(key, value, displayText) {
        this.layout[key] = value;

        // Sync logic: hitLineY and touchZoneTop must always be identical
        if (key === 'hitLineY') {
            this.layout.touchZoneTop = value;
        } else if (key === 'touchZoneTop') {
            this.layout.hitLineY = value;
        }

        // Apply specifically if it's a CSS variable update
        if (key === 'keyIconSize' || key === 'keyIconY' || key === 'touchZoneTop' || key === 'hitLineY' || key === 'keyIconShape' || key === 'keyIconGlow' || key === 'keyIconHue') {
            this.applyCustomStyles();
        }

        // [LIVE PREVIEW] Apply changes to actual game engine immediately
        if (this.game) {
            if (this.game.resize) this.game.resize();
            if (this.game.renderPreview) {
                // [Fix] Pass the specific preview canvas element
                this.game.renderPreview(this.elements.previewCanvas);
            }
        }

        // Update corresponding display
        const displays = {
            'hitLineY': this.elements.hitlineValue,
            'scoreY': this.elements.scorePosValue,
            'scoreFontSize': this.elements.scoreSizeValue,
            'comboY': this.elements.comboPosValue,
            'touchZoneTop': this.elements.touchzoneValue
        };

        if (displays[key]) displays[key].textContent = displayText;
    }

    open() {
        // Show game container to display actual game as preview
        const gameContainer = this.game?.elements?.gameContainer;
        if (gameContainer) {
            gameContainer.style.visibility = 'visible';
        }

        // Hide main menu overlay
        const mainOverlay = document.getElementById('overlay');
        if (mainOverlay) {
            this.wasOverlayVisible = mainOverlay.style.display !== 'none';
            mainOverlay.style.display = 'none';
        }

        this.elements.overlay.style.display = 'flex';

        // [PREVIEW] Render preview immediately
        if (this.game && this.game.renderPreview) {
            // [Fix] Pass the specific preview canvas element
            this.game.renderPreview(this.elements.previewCanvas);
        }
    }

    initPreviewCanvas() {
        // [New] Ensure preview canvas resolution matches display size
        const canvas = this.elements.previewCanvas;
        if (!canvas) return;

        // Force resize to match container if needed, or set fixed internal size
        // Since we are using object-fit: contain, we can set a high fixed resolution
        canvas.width = 1280;
        canvas.height = 720;
    }

    close() {
        this.elements.overlay.style.display = 'none';

        // Restore main menu overlay if it was visible before
        const mainOverlay = document.getElementById('overlay');
        if (mainOverlay && this.wasOverlayVisible) {
            mainOverlay.style.display = 'flex';
        }
    }

    renderPreviewLoop() {
        if (!this.isPreviewActive) return;

        this.renderPreview();
        this.previewAnimationFrame = requestAnimationFrame(() => this.renderPreviewLoop());
    }

    renderPreview() {
        // Live preview on dedicated preview canvas
        if (!this.previewCtx || !this.elements.previewCanvas) return;

        const ctx = this.previewCtx;
        const canvas = this.elements.previewCanvas;
        const width = canvas.width;
        const height = canvas.height;

        if (width === 0 || height === 0) return;

        // Clear canvas with game background
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, width, height);

        // Draw game background elements (lanes, dividers)
        const laneWidth = width / 4;

        // Draw lane backgrounds with gradient
        const laneColors = ['#FF66B2', '#ffcc00', '#00f2ff', '#00ff66'];
        for (let i = 0; i < 4; i++) {
            const x = i * laneWidth;
            const gradient = ctx.createLinearGradient(x, 0, x, height);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, laneColors[i] + '20');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, 0, laneWidth, height);
        }

        // Draw lane dividers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const x = i * laneWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Draw side rails
        ctx.strokeStyle = 'rgba(255, 180, 0, 0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(2, height);
        ctx.moveTo(width - 2, 0);
        ctx.lineTo(width - 2, height);
        ctx.stroke();

        // === Draw actual UI elements with current layout settings ===

        // Draw hit line (actual game element)
        const hitLineY = height * this.layout.hitLineY;
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f2ff';
        ctx.beginPath();
        ctx.moveTo(0, hitLineY);
        ctx.lineTo(width, hitLineY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw combo (actual game rendering)
        const comboY = this.layout.comboY;
        const comboLabelSpacing = this.layout.comboLabelSpacing;
        const comboFontSize = this.layout.comboFontSize;

        ctx.font = '700 18px "Outfit"';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('COMBO', width / 2, comboY - comboLabelSpacing);

        ctx.font = `900 ${comboFontSize}px "Outfit"`;
        ctx.fillStyle = '#00f2ff';
        ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#00f2ff';
        ctx.fillText('123', width / 2, comboY);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        // Draw score (actual game rendering)
        const scoreY = height * this.layout.scoreY;
        const scoreLabelSize = this.layout.scoreLabel || 16;
        const scoreFontSize = this.layout.scoreFontSize;

        ctx.font = `600 ${scoreLabelSize}px "Outfit"`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('SCORE', width / 2, scoreY - 15);

        ctx.font = `900 ${scoreFontSize}px "Outfit"`;
        ctx.fillStyle = '#fff';
        ctx.fillText('000000', width / 2, scoreY + 15);

        // Draw HP bar
        const hpBarWidth = 200;
        const hpBarHeight = 8;
        const hpBarX = (width - hpBarWidth) / 2;
        const hpBarY = 20;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        ctx.fillStyle = '#00ff66';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * 0.8, hpBarHeight);

        ctx.font = '12px "Outfit"';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('HP', width / 2, hpBarY - 5);

        // === Draw layout adjustment guides (overlays) ===

        // Hit line guide
        ctx.strokeStyle = 'rgba(255, 0, 122, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, hitLineY);
        ctx.lineTo(width, hitLineY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 0, 122, 0.9)';
        ctx.font = 'bold 12px "Outfit"';
        ctx.textAlign = 'left';
        ctx.fillText('← Hit Line', 10, hitLineY - 10);

        // Combo guide
        ctx.fillStyle = 'rgba(0, 242, 255, 0.7)';
        ctx.font = '11px "Outfit"';
        ctx.textAlign = 'left';
        ctx.fillText('← Combo', width / 2 + 100, comboY);

        // Score guide
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('← Score', width / 2 + 80, scoreY);

        // Touch zone guide
        const touchZoneTop = height * this.layout.touchZoneTop;
        ctx.fillStyle = 'rgba(0, 242, 255, 0.08)';
        ctx.fillRect(0, touchZoneTop, width, height - touchZoneTop);

        ctx.strokeStyle = 'rgba(0, 242, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, touchZoneTop);
        ctx.lineTo(width, touchZoneTop);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(0, 242, 255, 0.9)';
        ctx.font = 'bold 12px "Outfit"';
        ctx.textAlign = 'left';
        ctx.fillText('← Touch Zone', 10, touchZoneTop + 20);
    }

    saveLayout() {
        localStorage.setItem('beatmaster_layout', JSON.stringify(this.layout));
        this.showNotification('Layout saved! ✓');
    }

    loadLayout() {
        const saved = localStorage.getItem('beatmaster_layout');
        return saved ? JSON.parse(saved) : null;
    }

    resetLayout() {
        this.layout = {
            hitLineY: 0.7,
            scoreY: 0.72,
            scoreFontSize: 28,
            scoreLabel: 16,
            comboY: 150,
            comboFontSize: 96,
            comboLabelSpacing: 55,
            touchZoneTop: 0.7,
            touchZoneHeight: 0.3,
            keyIconSize: 60,
            keyIconY: 0,
            keyIconShape: '50%',
            keyIconGlow: 15
        };

        this.initializeSliders();

        // [LIVE PREVIEW] Apply reset to game immediately
        if (this.game && this.game.resize) {
            this.game.resize();
        }

        this.showNotification('Layout reset to default!');
    }

    loadPreset(num) {
        const presets = {
            1: { hitLineY: 0.7, touchZoneTop: 0.7, scoreY: 0.72, comboY: 150, keyIconSize: 60, keyIconY: 0, keyIconShape: '50%', keyIconGlow: 15 }, // Default
            2: { hitLineY: 0.75, touchZoneTop: 0.75, scoreY: 0.77, comboY: 120, keyIconSize: 44, keyIconY: 5, keyIconShape: '15%', keyIconGlow: 10 }, // Compact
            3: { hitLineY: 0.65, touchZoneTop: 0.65, scoreY: 0.68, comboY: 180, keyIconSize: 70, keyIconY: -5, keyIconShape: '0%', keyIconGlow: 20 }  // Spacious
        };

        if (presets[num]) {
            Object.assign(this.layout, presets[num]);
            this.initializeSliders();

            // [LIVE PREVIEW] Apply preset to game immediately
            if (this.game && this.game.resize) {
                this.game.resize();
            }

            this.showNotification(`Preset ${num} loaded!`);
        }
    }

    showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'settings-notification';
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }

    getLayout() {
        return this.layout;
    }
}
