class Main {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Handle Retinal Displays / Resolution
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.lobby = new Lobby(this);
        this.game = new Game(this);

        this.currentState = 'LOBBY'; // LOBBY, GAME

        this.lastTime = 0;
        requestAnimationFrame((ts) => this.loop(ts));

        this.initInput();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = 720; // Logical Width
        this.height = 1280; // Logical Height

        // Calculate scale factor
        this.scaleX = this.canvas.width / this.width;
        this.scaleY = this.canvas.height / this.height;

        // Reset transform to identity then apply scale
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.scaleX, this.scaleY);
    }

    initInput() {
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleInputMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleInputEnd(e));

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleInputMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleInputEnd(e));
    }

    getEventPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        // Convert to logical coordinates
        return {
            x: (clientX - rect.left) * (this.width / rect.width),
            y: (clientY - rect.top) * (this.height / rect.height)
        };
    }

    handleInputStart(e) {
        const pos = this.getEventPos(e);
        if (this.currentState === 'LOBBY') {
            this.lobby.handleInput(pos.x, pos.y);
        } else if (this.currentState === 'GAME') {
            this.game.handleInput('START', pos.x, pos.y);
        }
    }

    handleInputMove(e) {
        const pos = this.getEventPos(e);
        if (this.currentState === 'GAME') {
            this.game.handleInput('MOVE', pos.x, pos.y);
        }
    }

    handleInputEnd(e) {
        const pos = this.getEventPos(e);
        if (this.currentState === 'GAME') {
            this.game.handleInput('END', pos.x, pos.y);
        }
    }

    switchToGame(level) {
        this.currentState = 'GAME';
        this.game.startLevel(level);
    }

    switchToLobby() {
        this.currentState = 'LOBBY';
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(deltaTime) {
        if (this.currentState === 'LOBBY') {
            this.lobby.update(deltaTime);
        } else {
            this.game.update(deltaTime);
        }
    }

    draw() {
        // Clear logic depends on the transform, but usually clearRect(0,0,width,height) clears logical area
        this.ctx.clearRect(0, 0, this.width, this.height);
        if (this.currentState === 'LOBBY') {
            this.lobby.draw(this.ctx);
        } else {
            this.game.draw(this.ctx);
        }
    }
}

window.onload = () => {
    new Main();
};
