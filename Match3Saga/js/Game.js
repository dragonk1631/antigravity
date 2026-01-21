class Game {
    constructor(main) {
        this.main = main;
        this.grid = new Grid(8, 8);
        // Logical resolution is 720x1280. Grid is 8*75 = 600px wide.
        this.offsetX = (main.width - 8 * 75) / 2; // (720 - 600) / 2 = 60
        this.offsetY = (main.height - 8 * 75) / 2; // Centered vertically


        this.bgImage = new Image();
        this.bgImage.src = 'assets/bg_game.png';

        this.selectedCandy = null;
        this.score = 0;

        this.soundManager = new SoundManager();
        this.particleSystem = new ParticleSystem();
    }

    startLevel(level) {
        this.grid.fullFill();
        this.score = 0;
        this.grid.score = 0;
        this.soundManager.resume();
        this.soundManager.playBGM();
    }

    handleInput(type, x, y) {
        // Back Button Logic (Improved Hitbox)
        // Draw area: 20, height - 70. size 100x50
        if (x < 130 && x > 10 && y > this.main.height - 80 && y < this.main.height - 10) {
            if (type === 'START') {
                this.soundManager.playPop(); // UI Click sound
                this.soundManager.stopBGM();
                this.main.switchToLobby();
            }
            return;
        }

        // Blocks input if grid is animating
        if (this.grid.isProcessing) return;

        // Convert screen coords to grid coords
        const col = Math.floor((x - this.offsetX) / 75);
        const row = Math.floor((y - this.offsetY) / 75);

        if (type === 'START') {
            if (col >= 0 && col < 8 && row >= 0 && row < 8) {
                this.selectedCandy = { col, row };
                this.soundManager.playPop(); // Select sound
            }
        } else if (type === 'END' || type === 'MOVE') {
            // Support Swipe
            if (this.selectedCandy) {
                const dCol = col - this.selectedCandy.col;
                const dRow = row - this.selectedCandy.row;

                // Only process if moved to adjacent cell
                if (Math.abs(dCol) + Math.abs(dRow) === 1) {
                    this.soundManager.playSwap();
                    this.grid.swap(this.selectedCandy.col, this.selectedCandy.row, col, row, (event, data) => {
                        this.onGameEvent(event, data);
                    });
                    this.selectedCandy = null;
                }
            }
            if (type === 'END') this.selectedCandy = null;
        }
    }

    onGameEvent(event, data) {
        if (event === 'MATCH') {
            const matchCount = data.count;
            const matches = data.matches;

            this.score += matchCount * 100;
            this.soundManager.playMatch();

            matches.forEach(candy => {
                const color = this.getCandyColor(candy.type);
                this.particleSystem.spawn(
                    this.offsetX + candy.col * 75 + 37,
                    this.offsetY + candy.row * 75 + 37,
                    color
                );
            });
        }
    }

    getCandyColor(type) {
        const colors = ['#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ffa500', '#800080'];
        return colors[type] || '#ffffff';
    }

    update(dt) {
        this.grid.update(dt);
        this.particleSystem.update(dt);
    }

    draw(ctx) {
        // Draw BG
        if (this.bgImage.complete) {
            ctx.drawImage(this.bgImage, 0, 0, this.main.width, this.main.height);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, this.main.width, this.main.height);
        }

        // Dark Overlay for visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // 40% Darken
        ctx.fillRect(0, 0, this.main.width, this.main.height);

        // Calculate responsive UI positions
        // Board Background with Glow
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;

        // Rounded Rect Helper
        const roundRect = (x, y, w, h, r) => {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        };

        const boardPadding = 10;
        const boardX = this.offsetX - boardPadding;
        const boardY = this.offsetY - boardPadding;
        const boardW = 8 * 75 + boardPadding * 2;
        const boardH = 8 * 75 + boardPadding * 2;

        roundRect(boardX, boardY, boardW, boardH, 15);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for stroke
        ctx.stroke();

        this.grid.draw(ctx, this.offsetX, this.offsetY);
        this.particleSystem.draw(ctx);

        // Score Panel (Top)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        roundRect(20, 20, 200, 50, 10);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${this.score}`, 40, 55);

        // Back Button (Bottom Left)
        ctx.fillStyle = '#ff4444';
        roundRect(20, this.main.height - 70, 100, 50, 10);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Back", 70, this.main.height - 38);

        // Selection highlight
        if (this.selectedCandy) {
            ctx.shadowColor = 'yellow';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            const x = this.offsetX + this.selectedCandy.col * 75;
            const y = this.offsetY + this.selectedCandy.row * 75;

            roundRect(x, y, 75, 75, 10);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
}
