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
            touchZoneHeight: 0.3
        };

        this.elements = {
            overlay: document.getElementById('settings-overlay'),
            closeBtn: document.getElementById('close-settings-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            previewCanvas: document.getElementById('layout-preview-canvas'),

            // Sliders
            hitlineSlider: document.getElementById('hitline-slider'),
            scorePosSlider: document.getElementById('score-pos-slider'),
            scoreSizeSlider: document.getElementById('score-size-slider'),
            comboPosSlider: document.getElementById('combo-pos-slider'),
            touchzoneSlider: document.getElementById('touchzone-slider'),

            // Value displays
            hitlineValue: document.getElementById('hitline-value'),
            scorePosValue: document.getElementById('score-pos-value'),
            scoreSizeValue: document.getElementById('score-size-value'),
            comboPosValue: document.getElementById('combo-pos-value'),
            touchzoneValue: document.getElementById('touchzone-value'),

            // Buttons
            saveBtn: document.getElementById('save-settings-btn'),
            resetBtn: document.getElementById('reset-settings-btn'),
            presetBtns: document.querySelectorAll('.preset-btn')
        };

        this.previewCtx = this.elements.previewCanvas?.getContext('2d');

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

        // Update displays
        this.updateDisplays();
    }

    updateDisplays() {
        if (this.elements.hitlineValue) this.elements.hitlineValue.textContent = Math.round(this.layout.hitLineY * 100) + '%';
        if (this.elements.scorePosValue) this.elements.scorePosValue.textContent = Math.round(this.layout.scoreY * 100) + '%';
        if (this.elements.scoreSizeValue) this.elements.scoreSizeValue.textContent = this.layout.scoreFontSize + 'px';
        if (this.elements.comboPosValue) this.elements.comboPosValue.textContent = this.layout.comboY + 'px';
        if (this.elements.touchzoneValue) this.elements.touchzoneValue.textContent = Math.round(this.layout.touchZoneTop * 100) + '%';
    }

    updateValue(key, value, displayText) {
        this.layout[key] = value;
        // Preview is continuously rendered by renderPreviewLoop()

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
        // Hide main menu overlay to show game canvas
        const mainOverlay = document.getElementById('overlay');
        if (mainOverlay) {
            this.wasOverlayVisible = mainOverlay.style.display !== 'none';
            mainOverlay.style.display = 'none';
        }

        this.elements.overlay.style.display = 'flex';

        // Initialize preview canvas size
        this.initPreviewCanvas();

        // Start continuous preview rendering
        this.isPreviewActive = true;
        this.renderPreviewLoop();
    }

    initPreviewCanvas() {
        const canvas = this.elements.previewCanvas;
        if (!canvas) return;

        // Set canvas size to match its CSS display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        this.previewCtx = canvas.getContext('2d');
    }

    close() {
        this.elements.overlay.style.display = 'none';

        // Stop preview rendering
        this.isPreviewActive = false;
        if (this.previewAnimationFrame) {
            cancelAnimationFrame(this.previewAnimationFrame);
            this.previewAnimationFrame = null;
        }

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
            touchZoneHeight: 0.3
        };

        this.initializeSliders();
        this.renderPreview();
        this.showNotification('Layout reset to default!');
    }

    loadPreset(num) {
        const presets = {
            1: { hitLineY: 0.7, scoreY: 0.72, comboY: 150, touchZoneTop: 0.7 }, // Default
            2: { hitLineY: 0.75, scoreY: 0.77, comboY: 120, touchZoneTop: 0.75 }, // Compact
            3: { hitLineY: 0.65, scoreY: 0.68, comboY: 180, touchZoneTop: 0.65 }  // Spacious
        };

        if (presets[num]) {
            Object.assign(this.layout, presets[num]);
            this.initializeSliders();
            this.renderPreview();
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
