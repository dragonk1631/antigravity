class Lobby {
    constructor(main) {
        this.main = main;
        this.levels = [
            { x: 360, y: 1100, id: 1 },
            { x: 160, y: 950, id: 2 },
            { x: 560, y: 800, id: 3 },
            { x: 200, y: 600, id: 4 },
            { x: 500, y: 400, id: 5 }
        ];
        this.bgImage = new Image();
        this.bgImage.src = 'assets/bg_lobby.png';
    }

    handleInput(x, y) {
        for (let level of this.levels) {
            const dx = x - level.x;
            const dy = y - level.y;
            if (dx * dx + dy * dy < 40 * 40) { // 40px radius click area
                console.log(`Starting Level ${level.id}`);
                this.main.switchToGame(level.id);
                return;
            }
        }
    }

    update(dt) {
        // Animation logic for lobby (e.g. bouncing nodes)
    }

    draw(ctx) {
        // Draw BG
        if (this.bgImage.complete) {
            ctx.drawImage(this.bgImage, 0, 0, this.main.width, this.main.height);
        } else {
            ctx.fillStyle = '#55d';
            ctx.fillRect(0, 0, this.main.width, this.main.height);
        }

        // Draw Path
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.levels[0].x, this.levels[0].y);
        for (let i = 1; i < this.levels.length; i++) {
            ctx.lineTo(this.levels[i].x, this.levels[i].y);
        }
        ctx.stroke();

        // Draw Nodes
        for (let level of this.levels) {
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(level.x, level.y, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(level.id, level.x, level.y);
        }
    }
}
