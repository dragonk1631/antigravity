class Main {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = 720;
        this.height = 1280;

        // Load settings
        this.settings = JSON.parse(localStorage.getItem('skydash_settings')) || {
            characterColor: '#f39c12',
            stairColor: '#2ed573',
            bgColor: '#1e3c72'
        };

        this.lobby = new Lobby(this);
        this.settingsScreen = new Settings(this);
        this.game = null;
        this.sound = new SoundManager();

        this.currentState = 'LOBBY';

        this.lastTime = 0;

        // Music state
        this.musicStarted = false;

        window.addEventListener('resize', () => this.resize());
        this.resize();

        this.bindControls();
        requestAnimationFrame((ts) => this.loop(ts));
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        this.scaleX = this.canvas.width / this.width;
        this.scaleY = this.canvas.height / this.height;

        this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    }

    bindControls() {
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');

        const handleEvent = (action, e) => {
            e.preventDefault();
            if (this.currentState === 'GAME' && this.game) {
                this.game.handleInput(action);
            }
        };

        ['mousedown', 'touchstart'].forEach(evt => {
            btnLeft.addEventListener(evt, (e) => handleEvent('TURN', e), { passive: false });
            btnRight.addEventListener(evt, (e) => handleEvent('CLIMB', e), { passive: false });
        });

        // Canvas click for menus AND game over buttons
        ['mousedown', 'touchstart'].forEach(evt => {
            this.canvas.addEventListener(evt, (e) => {
                // Start lobby music on first interaction
                if (!this.musicStarted) {
                    this.sound.init();
                    this.sound.resume();
                    if (this.currentState === 'LOBBY') {
                        this.sound.startBGM('lobby');
                    }
                    this.musicStarted = true;
                }

                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                let clientX = e.clientX || (e.touches && e.touches[0].clientX);
                let clientY = e.clientY || (e.touches && e.touches[0].clientY);

                const x = (clientX - rect.left) * (this.width / rect.width);
                const y = (clientY - rect.top) * (this.height / rect.height);

                if (this.currentState === 'LOBBY') {
                    this.lobby.handleInput(x, y);
                } else if (this.currentState === 'SETTINGS') {
                    this.settingsScreen.handleInput(x, y);
                } else if (this.currentState === 'GAME' && this.game) {
                    // Pass coordinates for game over button detection
                    this.game.handleInput('CLICK', x, y);
                }
            }, { passive: false });
        });

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;

            if (this.currentState === 'GAME' && this.game) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyZ') this.game.handleInput('TURN');
                if (e.code === 'ArrowRight' || e.code === 'KeyX') this.game.handleInput('CLIMB');
                if (e.code === 'Enter') this.game.handleInput('SELECT');
                if (e.code === 'Escape') this.switchToLobby();
            } else if (this.currentState === 'SETTINGS') {
                if (e.code === 'Escape') this.switchToLobby();
            }
        });
    }

    startGame(mode) {
        this.game = new Game(this, mode, this.sound);
        this.currentState = 'GAME';

        // Switch to game music
        this.sound.stopBGM();
        this.sound.startBGM('game');

        document.getElementById('controls').style.display = 'flex';
        document.getElementById('score').style.display = 'block';
    }

    switchToLobby() {
        // Save score before leaving game
        if (this.game && (this.game.isGameOver || this.game.isCleared)) {
            this.saveScore(this.game.mode, this.game.score, this.game.elapsedTime);
        }

        this.currentState = 'LOBBY';

        // Switch to lobby music
        this.sound.stopBGM();
        if (this.musicStarted) {
            this.sound.startBGM('lobby');
        }

        document.getElementById('controls').style.display = 'none';
        document.getElementById('score').style.display = 'none';
    }

    switchToSettings() {
        this.currentState = 'SETTINGS';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('score').style.display = 'none';
    }

    // Leaderboard Functions
    saveScore(mode, score, time) {
        const leaderboard = JSON.parse(localStorage.getItem('skydash_leaderboard')) || [];

        const entry = {
            mode: mode,
            score: score,
            time: time,
            date: Date.now()
        };

        leaderboard.push(entry);

        // Sort: Infinite by score (desc), Time attack by time (asc)
        leaderboard.sort((a, b) => {
            if (a.mode === 'infinite' && b.mode === 'infinite') {
                return b.score - a.score;
            } else if (a.mode !== 'infinite' && b.mode !== 'infinite') {
                // Only count completed time attacks
                if (a.score >= parseInt(a.mode) && b.score >= parseInt(b.mode)) {
                    return a.time - b.time;
                }
                return b.score - a.score;
            }
            return 0;
        });

        // Keep only top 20
        localStorage.setItem('skydash_leaderboard', JSON.stringify(leaderboard.slice(0, 20)));
    }

    getLeaderboard() {
        return JSON.parse(localStorage.getItem('skydash_leaderboard')) || [];
    }

    loop(timestamp) {
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(deltaTime);

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    update(dt) {
        if (this.currentState === 'LOBBY') {
            this.lobby.update(dt);
        } else if (this.currentState === 'GAME' && this.game) {
            this.game.update(dt);
        } else if (this.currentState === 'SETTINGS') {
            this.settingsScreen.update(dt);
        }
    }

    draw() {
        // Ensure transform is applied (some operations might reset it)
        this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);

        if (this.currentState === 'LOBBY') {
            this.lobby.draw(this.ctx);
        } else if (this.currentState === 'GAME' && this.game) {
            this.game.draw(this.ctx);
        } else if (this.currentState === 'SETTINGS') {
            this.settingsScreen.draw(this.ctx);
        }
    }
}

window.onload = () => {
    new Main();
};
