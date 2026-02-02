/**
 * LayoutEditor.js
 * Interactive GUI editor for adjusting game layout in real-time
 */

export class LayoutEditor {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.isActive = false;
        this.selectedElement = null;

        // Default layout configuration
        this.layout = this.loadLayout() || {
            hitLineY: 0.7,           // percentage
            scoreY: 0.72,            // percentage
            scoreFontSize: 28,       // px
            scoreLabel: 16,          // px
            comboY: 150,             // px
            comboFontSize: 96,       // px
            comboLabelSpacing: 55,   // px
            touchZoneTop: 0.7,       // percentage
            touchZoneHeight: 0.3,    // percentage
            touchIconMargin: 30,     // px
            progressBarBottom: 8     // px
        };

        this.elements = {
            'hitLine': { name: 'Hit Line', prop: 'hitLineY', type: 'percentage', min: 0.5, max: 0.9, step: 0.01 },
            'score': { name: 'Score Position', prop: 'scoreY', type: 'percentage', min: 0.6, max: 0.95, step: 0.01 },
            'scoreFontSize': { name: 'Score Font Size', prop: 'scoreFontSize', type: 'pixels', min: 20, max: 48, step: 2 },
            'combo': { name: 'Combo Position', prop: 'comboY', type: 'pixels', min: 100, max: 300, step: 5 },
            'comboFontSize': { name: 'Combo Font Size', prop: 'comboFontSize', type: 'pixels', min: 60, max: 120, step: 4 },
            'touchZone': { name: 'Touch Zone Top', prop: 'touchZoneTop', type: 'percentage', min: 0.5, max: 0.8, step: 0.01 }
        };

        this.selectedKey = 'hitLine';
        this.isDragging = false;
        this.dragStartY = 0;
        this.dragStartValue = 0;

        this.createUI();
        this.bindEvents();
    }

    createUI() {
        // Editor panel
        const panel = document.createElement('div');
        panel.id = 'layout-editor-panel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="editor-header">
                <h3>LAYOUT EDITOR</h3>
                <span class="editor-hint">Press E to toggle</span>
            </div>
            <div class="editor-content">
                <div class="selected-info">
                    <div class="info-label">Selected:</div>
                    <div id="selected-element-name">Hit Line</div>
                    <div class="info-value" id="selected-element-value">70%</div>
                </div>
                
                <div class="editor-controls">
                    <div class="control-hint">↑↓ Adjust | Shift+↑↓ Fast</div>
                    <div class="element-list" id="element-list"></div>
                </div>
                
                <div class="editor-actions">
                    <button id="save-layout-btn" class="editor-btn">💾 Save</button>
                    <button id="load-layout-btn" class="editor-btn">📂 Load</button>
                    <button id="reset-layout-btn" class="editor-btn">🔄 Reset</button>
                </div>
                
                <div class="editor-presets">
                    <div class="preset-label">Presets (1-5):</div>
                    <div class="preset-buttons">
                        <button class="preset-btn" data-preset="1">1</button>
                        <button class="preset-btn" data-preset="2">2</button>
                        <button class="preset-btn" data-preset="3">3</button>
                        <button class="preset-btn" data-preset="4">4</button>
                        <button class="preset-btn" data-preset="5">5</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Visual guides overlay
        const guides = document.createElement('canvas');
        guides.id = 'layout-guides';
        guides.style.display = 'none';
        document.getElementById('game-container').appendChild(guides);

        this.panel = panel;
        this.guidesCanvas = guides;
        this.updateElementList();
    }

    updateElementList() {
        const list = document.getElementById('element-list');
        if (!list) return;

        list.innerHTML = '';
        Object.entries(this.elements).forEach(([key, elem]) => {
            const item = document.createElement('div');
            item.className = 'element-item' + (key === this.selectedKey ? ' selected' : '');
            item.dataset.key = key;
            item.innerHTML = `
                <span class="elem-name">${elem.name}</span>
                <span class="elem-value">${this.formatValue(key)}</span>
            `;
            item.addEventListener('click', () => this.selectElement(key));
            list.appendChild(item);
        });
    }

    formatValue(key) {
        const elem = this.elements[key];
        const value = this.layout[elem.prop];
        return elem.type === 'percentage' ? `${(value * 100).toFixed(0)}%` : `${value}px`;
    }

    selectElement(key) {
        this.selectedKey = key;
        const elem = this.elements[key];
        document.getElementById('selected-element-name').textContent = elem.name;
        document.getElementById('selected-element-value').textContent = this.formatValue(key);
        this.updateElementList();
    }

    bindEvents() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (!this.game.state.isPlaying) return;

            // Toggle editor with E key
            if (e.key === 'e' || e.key === 'E') {
                if (!e.repeat) this.toggle();
                return;
            }

            if (!this.isActive) return;

            // Arrow keys for adjustment
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const direction = e.key === 'ArrowUp' ? 1 : -1;
                const multiplier = e.shiftKey ? 10 : 1;
                this.adjustValue(direction * multiplier);
            }

            // Number keys for presets
            if (e.key >= '1' && e.key <= '5') {
                this.loadPreset(parseInt(e.key));
            }

            // S for save
            if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this.saveLayout();
            }

            // R for reset
            if (e.key === 'r' || e.key === 'R') {
                this.resetLayout();
            }
        });

        // Button events
        document.getElementById('save-layout-btn')?.addEventListener('click', () => this.saveLayout());
        document.getElementById('load-layout-btn')?.addEventListener('click', () => this.loadLayoutFromStorage());
        document.getElementById('reset-layout-btn')?.addEventListener('click', () => this.resetLayout());

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.loadPreset(parseInt(btn.dataset.preset));
            });
        });
    }

    toggle() {
        this.isActive = !this.isActive;
        this.panel.style.display = this.isActive ? 'block' : 'none';
        this.guidesCanvas.style.display = this.isActive ? 'block' : 'none';

        if (this.isActive) {
            this.updateElementList();
            this.selectElement(this.selectedKey);
        }
    }

    adjustValue(delta) {
        const elem = this.elements[this.selectedKey];
        const step = elem.step * delta;
        let newValue = this.layout[elem.prop] + step;

        // Clamp to min/max
        newValue = Math.max(elem.min, Math.min(elem.max, newValue));

        this.layout[elem.prop] = newValue;
        this.applyLayout();
        this.updateElementList();
        this.selectElement(this.selectedKey);
    }

    applyLayout() {
        // Apply layout values to game
        if (this.game.cache) {
            this.game.cache.hitLineY = this.game.state.canvasHeight * this.layout.hitLineY;
        }

        // Update touch zone CSS
        const touchZones = document.querySelectorAll('.touch-zone');
        touchZones.forEach(zone => {
            zone.style.top = `${this.layout.touchZoneTop * 100}%`;
            zone.style.height = `${this.layout.touchZoneHeight * 100}%`;
        });

        // Force re-render
        if (this.game.render) {
            this.game.render();
        }
    }

    saveLayout() {
        localStorage.setItem('beatmaster_layout', JSON.stringify(this.layout));
        this.showNotification('Layout saved!');
    }

    loadLayout() {
        const saved = localStorage.getItem('beatmaster_layout');
        return saved ? JSON.parse(saved) : null;
    }

    loadLayoutFromStorage() {
        const loaded = this.loadLayout();
        if (loaded) {
            this.layout = loaded;
            this.applyLayout();
            this.updateElementList();
            this.showNotification('Layout loaded!');
        }
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
            touchIconMargin: 30,
            progressBarBottom: 8
        };
        this.applyLayout();
        this.updateElementList();
        this.showNotification('Layout reset to default!');
    }

    loadPreset(num) {
        const presets = {
            1: { hitLineY: 0.7, scoreY: 0.72, comboY: 150, touchZoneTop: 0.7, touchZoneHeight: 0.3 }, // Default
            2: { hitLineY: 0.75, scoreY: 0.77, comboY: 120, touchZoneTop: 0.75, touchZoneHeight: 0.25 }, // Compact
            3: { hitLineY: 0.65, scoreY: 0.68, comboY: 180, touchZoneTop: 0.65, touchZoneHeight: 0.35 }, // Spacious
            4: { hitLineY: 0.8, scoreY: 0.82, comboY: 100, touchZoneTop: 0.8, touchZoneHeight: 0.2 }, // Minimal UI
            5: { hitLineY: 0.6, scoreY: 0.63, comboY: 200, touchZoneTop: 0.6, touchZoneHeight: 0.4 }  // Max UI
        };

        if (presets[num]) {
            Object.assign(this.layout, presets[num]);
            this.applyLayout();
            this.updateElementList();
            this.showNotification(`Preset ${num} loaded!`);
        }
    }

    showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'editor-notification';
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }

    renderGuides(ctx, width, height) {
        if (!this.isActive) return;

        ctx.clearRect(0, 0, width, height);

        // Grid lines (10% intervals)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        for (let i = 1; i < 10; i++) {
            const y = height * (i / 10);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px monospace';
            ctx.fillText(`${i * 10}%`, 5, y - 2);
        }

        // Highlight selected element
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.8)';
        ctx.lineWidth = 2;

        if (this.selectedKey === 'hitLine') {
            const y = height * this.layout.hitLineY;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(0, 242, 255, 1)';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`Hit Line (${(this.layout.hitLineY * 100).toFixed(0)}%)`, width - 150, y - 5);
        }
    }

    getLayout() {
        return this.layout;
    }
}
