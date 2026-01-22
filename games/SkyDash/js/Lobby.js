class Lobby {
    constructor(main) {
        this.main = main;
        this.buttons = [
            { id: 'infinite', label: '∞ Infinite Mode', desc: 'Climb forever!', y: 500 },
            { id: '100', label: '⏱️ 100 Stairs', desc: 'Time Attack', y: 650 },
            { id: 'leaderboard', label: '🏆 Leaderboard', desc: 'High Scores', y: 800 },
            { id: 'settings', label: '⚙️ Settings', desc: 'Customize', y: 950 }
        ];
        this.hoverIndex = -1;
        this.showLeaderboard = false;
    }

    handleInput(x, y) {
        if (this.showLeaderboard) {
            // Back button
            if (y > 1050 && y < 1130 && x > 210 && x < 510) {
                this.showLeaderboard = false;
            }
            return;
        }

        for (let i = 0; i < this.buttons.length; i++) {
            const btn = this.buttons[i];
            if (y > btn.y - 50 && y < btn.y + 50 && x > 110 && x < 610) {
                if (btn.id === 'settings') {
                    this.main.switchToSettings();
                } else if (btn.id === 'leaderboard') {
                    this.showLeaderboard = true;
                } else {
                    this.main.startGame(btn.id);
                }
                return;
            }
        }
    }

    update(dt) { }

    draw(ctx) {
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, 1280);
        gradient.addColorStop(0, '#0f0c29');
        gradient.addColorStop(0.5, '#302b63');
        gradient.addColorStop(1, '#24243e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 720, 1280);

        // Stars
        ctx.fillStyle = 'white';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137) % 720;
            const y = (i * 89) % 600;
            const size = (i % 3) + 1;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        if (this.showLeaderboard) {
            this.drawLeaderboard(ctx);
            return;
        }

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SKY DASH', 360, 200);

        ctx.font = '28px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Infinite Stairs Challenge', 360, 260);

        // Character Preview
        this.drawCharacter(ctx, 360, 380);

        // Buttons
        this.buttons.forEach((btn, index) => {
            this.drawButton(ctx, btn, index === this.hoverIndex);
        });

        // Instructions
        ctx.font = '20px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('← Turn + Climb | → Climb', 360, 1100);
    }

    drawLeaderboard(ctx) {
        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 Leaderboard', 360, 120);

        // Get scores
        const scores = this.main.getLeaderboard();

        // Draw table
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(60, 180, 600, 800);

        // Headers
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Rank', 100, 230);
        ctx.fillText('Mode', 250, 230);
        ctx.textAlign = 'right';
        ctx.fillText('Score/Time', 620, 230);

        // Divider
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(80, 250);
        ctx.lineTo(640, 250);
        ctx.stroke();

        // Scores
        ctx.font = '22px Arial';
        scores.slice(0, 15).forEach((entry, i) => {
            const y = 290 + i * 50;
            const isGold = i === 0;
            const isSilver = i === 1;
            const isBronze = i === 2;

            ctx.fillStyle = isGold ? '#ffd700' : isSilver ? '#c0c0c0' : isBronze ? '#cd7f32' : '#fff';
            ctx.textAlign = 'left';
            ctx.fillText(`#${i + 1}`, 100, y);

            const modeLabel = entry.mode === 'infinite' ? '∞ Infinite' : `⏱️ ${entry.mode} Stairs`;
            ctx.fillText(modeLabel, 180, y);

            ctx.textAlign = 'right';
            if (entry.mode === 'infinite') {
                ctx.fillText(`${entry.score} steps`, 620, y);
            } else {
                ctx.fillText(`${entry.time.toFixed(2)}s`, 620, y);
            }
        });

        if (scores.length === 0) {
            ctx.fillStyle = '#888';
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No records yet!', 360, 500);
            ctx.font = '20px Arial';
            ctx.fillText('Play a game to set a high score', 360, 550);
        }

        // Back Button
        ctx.fillStyle = '#555';
        ctx.fillRect(210, 1050, 300, 60);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.strokeRect(210, 1050, 300, 60);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('← Back', 360, 1088);
    }

    drawButton(ctx, btn, isHover) {
        const width = 500;
        const height = 80;
        const x = 360 - width / 2;
        const y = btn.y - height / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + 5, y + 5, width, height);

        const btnGrad = ctx.createLinearGradient(x, y, x, y + height);
        if (btn.id === 'settings') {
            btnGrad.addColorStop(0, '#555');
            btnGrad.addColorStop(1, '#333');
        } else if (btn.id === 'leaderboard') {
            btnGrad.addColorStop(0, '#daa520');
            btnGrad.addColorStop(1, '#b8860b');
        } else {
            btnGrad.addColorStop(0, isHover ? '#4a69bd' : '#3867d6');
            btnGrad.addColorStop(1, isHover ? '#3867d6' : '#2d4a8c');
        }
        ctx.fillStyle = btnGrad;
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(btn.label, 360, btn.y + 5);

        ctx.font = '18px Arial';
        ctx.fillStyle = '#ccc';
        ctx.fillText(btn.desc, 360, btn.y + 30);
    }

    drawCharacter(ctx, x, y) {
        const settings = this.main.settings || {};
        const bodyColor = settings.characterColor || '#f39c12';

        ctx.save();
        ctx.translate(x, y);

        const bounce = Math.sin(Date.now() / 200) * 5;

        ctx.fillStyle = '#ffe0bd';
        ctx.beginPath();
        ctx.arc(0, -35 + bounce, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, -42 + bounce, 22, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = bodyColor;
        ctx.fillRect(-15, -10 + bounce, 30, 45);

        ctx.fillStyle = '#e67e22';
        ctx.fillRect(-12, 35 + bounce, 10, 30);
        ctx.fillRect(2, 35 + bounce, 10, 30);

        ctx.restore();
    }
}
