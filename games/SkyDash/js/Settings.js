class Settings {
    constructor(main) {
        this.main = main;

        // Color options
        this.characterColors = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#1abc9c'];
        this.stairColors = ['#2ed573', '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#00d2d3'];
        this.bgColors = ['#1e3c72', '#4a69bd', '#8e44ad', '#c0392b', '#16a085', '#2c3e50'];

        this.sections = [
            { id: 'character', label: '👤 Character', colors: this.characterColors, y: 350 },
            { id: 'stair', label: '🟩 Stairs', colors: this.stairColors, y: 550 },
            { id: 'bg', label: '🌌 Background', colors: this.bgColors, y: 750 }
        ];
    }

    handleInput(x, y) {
        // Back button
        if (y > 1050 && y < 1130 && x > 210 && x < 510) {
            this.main.switchToLobby();
            return;
        }

        // Color selection
        this.sections.forEach(section => {
            if (y > section.y && y < section.y + 80) {
                const startX = 360 - (section.colors.length * 45) / 2;
                section.colors.forEach((color, i) => {
                    const cx = startX + i * 55 + 25;
                    if (Math.abs(x - cx) < 25) {
                        this.selectColor(section.id, color);
                    }
                });
            }
        });
    }

    selectColor(sectionId, color) {
        if (sectionId === 'character') {
            this.main.settings.characterColor = color;
        } else if (sectionId === 'stair') {
            this.main.settings.stairColor = color;
        } else if (sectionId === 'bg') {
            this.main.settings.bgColor = color;
        }

        // Save to localStorage
        localStorage.setItem('skydash_settings', JSON.stringify(this.main.settings));
    }

    update(dt) { }

    draw(ctx) {
        const settings = this.main.settings;

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, 1280);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 720, 1280);

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚙️ Settings', 360, 120);

        // Preview
        ctx.fillStyle = '#333';
        ctx.fillRect(160, 170, 400, 120);
        this.drawPreview(ctx, settings);

        // Sections
        this.sections.forEach(section => {
            this.drawSection(ctx, section, settings);
        });

        // Back Button
        this.drawBackButton(ctx);
    }

    drawPreview(ctx, settings) {
        const x = 360;
        const y = 230;

        // Mini background
        ctx.fillStyle = settings.bgColor || '#1e3c72';
        ctx.fillRect(170, 180, 380, 100);

        // Mini stair
        ctx.fillStyle = settings.stairColor || '#2ed573';
        ctx.fillRect(280, 250, 80, 20);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(280, 260, 80, 10);

        // Mini character
        ctx.fillStyle = '#ffe0bd';
        ctx.beginPath();
        ctx.arc(320, 220, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = settings.characterColor || '#f39c12';
        ctx.fillRect(308, 235, 24, 30);
    }

    drawSection(ctx, section, settings) {
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(section.label, 360, section.y - 20);

        // Color swatches
        const startX = 360 - (section.colors.length * 55) / 2;
        section.colors.forEach((color, i) => {
            const cx = startX + i * 55 + 25;
            const cy = section.y + 40;

            // Selected indicator
            let isSelected = false;
            if (section.id === 'character' && settings.characterColor === color) isSelected = true;
            if (section.id === 'stair' && settings.stairColor === color) isSelected = true;
            if (section.id === 'bg' && settings.bgColor === color) isSelected = true;

            if (isSelected) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(cx, cy, 28, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Swatch
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx, cy, 22, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawBackButton(ctx) {
        const x = 210;
        const y = 1050;
        const width = 300;
        const height = 60;

        ctx.fillStyle = '#555';
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('← Back to Menu', 360, y + 38);
    }
}
