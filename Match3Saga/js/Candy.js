class Candy {
    constructor(type, col, row) {
        this.type = type; // 0-5 for different colors
        this.col = col;
        this.row = row;
        this.size = 75; // Tile size

        // Target (Logical) position 
        this.x = col * this.size;
        this.y = row * this.size;

        // Visual position for animation
        this.visualX = this.x;
        this.visualY = -this.size * 2; // Start above screen for spawn animation

        this.velocity = 0;
        this.gravity = 1.5;
        this.bounce = 0.4;

        this.state = 'SPAWN'; // SPAWN, IDLE, MOVING, FALLING, MATCHED
        this.scale = 1;
        this.alpha = 1;

        this.image = new Image();
        this.loadImage();
    }

    loadImage() {
        const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];
        // Ensure type is within bounds
        if (this.type < 0) this.type = 0;
        if (this.type >= colors.length) this.type = colors.length - 1;

        this.image.src = `assets/candy_${colors[this.type]}.png`;
    }

    // Set logical position
    setPos(c, r) {
        this.col = c;
        this.row = r;
        this.x = c * this.size;
        this.y = r * this.size;
    }

    update(dt) {
        const targetX = this.col * this.size;
        const targetY = this.row * this.size;

        // X Interpolation (Swapping)
        if (Math.abs(this.visualX - targetX) > 2) {
            this.visualX += (targetX - this.visualX) * 0.15;
            this.state = 'MOVING';
        } else {
            this.visualX = targetX;
        }

        // Y Interpolation (Falling)
        if (this.visualY < targetY - 2) {
            this.velocity += this.gravity;
            this.visualY += this.velocity;
            this.state = 'FALLING';

            if (this.visualY > targetY) {
                this.visualY = targetY;
                this.velocity = -this.velocity * this.bounce; // Bounce
                if (Math.abs(this.velocity) < 1) this.velocity = 0;
            }
        } else if (Math.abs(this.visualY - targetY) > 2) {
            // Swapping up/down
            this.velocity = 0;
            this.visualY += (targetY - this.visualY) * 0.15;
            this.state = 'MOVING';
        } else {
            this.visualY = targetY;
            if (this.state === 'FALLING' || this.state === 'MOVING') {
                // Check if actually stationary
                if (Math.abs(this.visualY - targetY) < 1 && Math.abs(this.visualX - targetX) < 1) {
                    this.state = 'IDLE';
                }
            }
        }

        if (this.state === 'MATCHED') {
            this.scale -= 0.1;
            this.alpha -= 0.1;
            if (this.scale < 0) this.scale = 0;
            if (this.alpha < 0) this.alpha = 0;
        }
    }

    draw(ctx, offsetX, offsetY) {
        if (this.scale <= 0) return;

        ctx.globalAlpha = this.alpha;
        const drawX = offsetX + this.visualX + (this.size - this.size * this.scale) / 2;
        const drawY = offsetY + this.visualY + (this.size - this.size * this.scale) / 2;
        const size = this.size * this.scale;

        if (this.image.complete && this.image.naturalWidth !== 0) {
            ctx.drawImage(this.image, drawX, drawY, size, size);
        } else {
            // Fallback
            const colors = ['#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ffa500', '#800080'];
            ctx.fillStyle = colors[this.type];
            ctx.beginPath();
            ctx.arc(drawX + size / 2, drawY + size / 2, size / 2 - 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
