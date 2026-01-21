/**
 * Pink Tetris VS AI - Arcade Edition
 * - Arcade Progression
 * - Tuned AI (Safety First)
 * - Enemy Conversations
 */

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = [
    null,
    '#FFAFCC', // I
    '#FFAB91', // J
    '#FFD54F', // L
    '#FFF59D', // O
    '#A5D6A7', // S
    '#CE93D8', // T
    '#81D4FA', // Z
    '#B0BEC5'  // Garbage
];

const BORDER_COLORS = [
    null,
    '#F06292', '#FF8A65', '#FFC107', '#FFF176', '#81C784', '#BA68C8', '#4FC3F7', '#78909C'
];

const PIECES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

const ENEMY_QUOTES = {
    start: [
        "I am the Level 1 Boss!",
        "Level 2? Still too easy.",
        "Getting serious now.",
        "I will crush you!",
        "I am a Tetris GOD.",
        "You cannot defeat me."
    ],
    attack: [ // AI sends garbage
        "Take this!", "Eat garbage!", "Too sloooow!", "Weakness!", "Mwahaha!"
    ],
    damage: [ // Player sends garbage to AI
        "Ouch!", "Hey!", "Not fair!", "I'll remember that!", "Grrr..."
    ]
};

class Shard {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = 0.4;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.size = Math.random() * 6 + 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

class SoundManager {
    constructor() {
        this.ctx = null;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.25;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn("Audio error", e);
        }
        this.isPlayingBGM = false;
        this.beat = 0;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(e => { });
    }

    playTone(freq, type, duration, vol = 1.0, time = 0) {
        if (!this.ctx) return;
        const t = time || this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + duration);
    }

    playMove() { this.playTone(300, 'sine', 0.1, 0.2); }
    playRotate() { this.playTone(500, 'triangle', 0.1, 0.2); }
    playDrop() { this.playTone(150, 'square', 0.15, 0.4); }
    playHold() { this.playTone(400, 'sine', 0.1, 0.3); }

    playClear(lines) {
        const base = 400 + (lines * 100);
        this.playTone(base, 'sawtooth', 0.2, 0.4);
        setTimeout(() => this.playTone(base * 1.5, 'sine', 0.3, 0.4), 100);
    }

    startBGM() {
        if (!this.ctx || this.isPlayingBGM) return;
        this.isPlayingBGM = true;
        this.beat = 0;
        this.scheduleNextBeat();
    }

    scheduleNextBeat() {
        if (!this.isPlayingBGM || !this.ctx) return;
        const bpm = 145;
        const beatDur = 60 / bpm;
        const t = this.ctx.currentTime;

        // Kick
        this.playTone(60, 'square', 0.1, 0.6, t);

        // Hat
        if (this.beat % 2 === 1) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 1000;
            gain.gain.value = 0.1;
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.05);
        }

        // Bass
        const bassNotes = [110, 110, 130, 146];
        this.playTone(bassNotes[this.beat % 4], 'sine', 0.15, 0.3, t + beatDur / 2);

        this.beat++;
        this.sequencerTimer = setTimeout(() => this.scheduleNextBeat(), beatDur * 1000);
    }

    stopBGM() {
        this.isPlayingBGM = false;
        if (this.sequencerTimer) clearTimeout(this.sequencerTimer);
    }
}

class TetrisInstance {
    constructor(canvasId, holdId, nextId, isAI = false, onGarbageSent = null) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isAI = isAI;
        this.onGarbageSent = onGarbageSent;

        this.holdCanvas = holdId ? document.getElementById(holdId) : null;
        this.holdCtx = this.holdCanvas ? this.holdCanvas.getContext('2d') : null;
        this.nextCanvas = nextId ? document.getElementById(nextId) : null;
        this.nextCtx = this.nextCanvas ? this.nextCanvas.getContext('2d') : null;

        this.particles = [];
        this.reset();
    }

    reset() {
        this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.pieceBag = [];
        this.nextPieces = [];
        this.holdPiece = null;
        this.canHold = true;
        this.garbageQueue = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.softDropping = false; // Soft drop state
        this.particles = [];

        this.fillBag();
        // tetr.io shows 5-6 next pieces
        for (let i = 0; i < 5; i++) {
            this.nextPieces.push(this.getPieceFromBag());
        }
        this.spawnPiece();
    }

    fillBag() {
        const pieces = [1, 2, 3, 4, 5, 6, 7];
        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }
        this.pieceBag = pieces;
    }

    getPieceFromBag() {
        if (this.pieceBag.length === 0) this.fillBag();
        const type = this.pieceBag.pop();
        return { type: type, shape: PIECES[type], x: 0, y: 0, rotation: 0 };
    }

    spawnPiece() {
        this.currentPiece = this.nextPieces.shift();
        this.nextPieces.push(this.getPieceFromBag());
        if (this.currentPiece) {
            this.currentPiece.x = Math.floor(COLS / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
            this.currentPiece.y = 0;
        }
        this.canHold = true;
        if (this.collide(this.grid, this.currentPiece)) {
            this.gameOver = true;
        }
    }

    collide(grid, piece) {
        if (!piece) return false;
        const m = piece.shape;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 && (grid[y + piece.y] && grid[y + piece.y][x + piece.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    merge() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.grid[y + this.currentPiece.y][x + this.currentPiece.x] = value;
                }
            });
        });
    }

    rotateMatrix(matrix) {
        const N = matrix.length;
        return matrix.map((row, i) => row.map((val, j) => matrix[N - 1 - j][i]));
    }

    // SRS Wall Kick Data (tetr.io standard)
    getSRSKickTable(pieceType, rotation, direction) {
        // I-piece has special wall kicks
        if (pieceType === 1) {
            const iKicks = {
                '0>>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
                '1>>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
                '1>>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
                '2>>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
                '2>>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
                '3>>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
                '3>>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
                '0>>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
            };
            const key = `${rotation}>>${(rotation + direction + 4) % 4}`;
            return iKicks[key] || [[0, 0]];
        } else {
            // JLSTZ pieces
            const normalKicks = {
                '0>>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
                '1>>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
                '1>>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
                '2>>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
                '2>>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
                '3>>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
                '3>>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
                '0>>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
            };
            const key = `${rotation}>>${(rotation + direction + 4) % 4}`;
            return normalKicks[key] || [[0, 0]];
        }
    }

    actionRotate(direction = 1) {
        if (!this.currentPiece) return false;

        const piece = this.currentPiece;
        const rotated = this.rotateMatrix(piece.shape);
        const originalShape = piece.shape;
        const originalRotation = piece.rotation || 0;
        const newRotation = (originalRotation + direction + 4) % 4;

        // Try wall kicks using SRS
        const kicks = this.getSRSKickTable(piece.type, originalRotation, direction);

        piece.shape = rotated;
        piece.rotation = newRotation;

        for (let kick of kicks) {
            piece.x += kick[0];
            piece.y -= kick[1]; // Y is inverted

            if (!this.collide(this.grid, piece)) {
                return true; // Success!
            }

            // Undo kick attempt
            piece.x -= kick[0];
            piece.y += kick[1];
        }

        // All kicks failed, restore original
        piece.shape = originalShape;
        piece.rotation = originalRotation;
        return false;
    }

    actionMove(dir) {
        this.currentPiece.x += dir;
        if (this.collide(this.grid, this.currentPiece)) {
            this.currentPiece.x -= dir;
            return false;
        }
        return true;
    }

    actionDrop() {
        this.currentPiece.y++;
        if (this.collide(this.grid, this.currentPiece)) {
            this.currentPiece.y--;
            this.merge();
            this.processClears();
            return true;
        }
        this.dropCounter = 0;
        return false;
    }

    actionHardDrop() {
        while (!this.actionDrop()) { }
        return true;
    }

    actionHold() {
        if (!this.canHold) return false;
        if (this.holdPiece === null) {
            this.holdPiece = this.currentPiece.type;
            this.spawnPiece();
        } else {
            const temp = this.currentPiece.type;
            this.currentPiece = { type: this.holdPiece, shape: PIECES[this.holdPiece], x: 0, y: 0, rotation: 0 };
            this.holdPiece = temp;
            this.currentPiece.x = Math.floor(COLS / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
            this.currentPiece.y = 0;
        }
        this.canHold = false;
        return true;
    }

    processClears() {
        let linesCleared = 0;
        let y = ROWS - 1;
        while (y >= 0) {
            let rowFull = true;
            for (let x = 0; x < COLS; ++x) {
                if (this.grid[y][x] === 0) {
                    rowFull = false;
                    break;
                }
            }
            if (rowFull) {
                for (let x = 0; x < COLS; x++) {
                    const c = this.grid[y][x];
                    for (let k = 0; k < 8; k++) {
                        this.particles.push(new Shard(x * BLOCK_SIZE + 15, y * BLOCK_SIZE + 15, COLORS[c]));
                    }
                }
                const row = this.grid.splice(y, 1)[0].fill(0);
                this.grid.unshift(row);
                linesCleared++;
            } else {
                y--;
            }
        }

        if (linesCleared > 0) {
            this.score += linesCleared * 100 * linesCleared;
            // Send garbage logic
            // 2->1, 3->2, 4->4
            let garbageToSend = 0;
            if (linesCleared === 2) garbageToSend = 1;
            else if (linesCleared === 3) garbageToSend = 2;
            else if (linesCleared === 4) garbageToSend = 4;

            if (garbageToSend > 0 && this.onGarbageSent) {
                this.onGarbageSent(garbageToSend);
            }
        }

        this.addGarbage();
        this.spawnPiece();
    }

    addGarbage() {
        if (this.garbageQueue > 0) {
            const hole = Math.floor(Math.random() * COLS);
            for (let i = 0; i < this.garbageQueue; i++) {
                if (this.grid[0].some(c => c !== 0)) {
                    this.gameOver = true;
                    return;
                }
                this.grid.shift();
                const trashRow = Array(COLS).fill(8);
                trashRow[hole] = 0;
                this.grid.push(trashRow);
            }
            this.garbageQueue = 0;
        }
    }

    receiveGarbage(amount) {
        this.garbageQueue += amount;
    }

    update(dt) {
        if (this.gameOver) return;
        this.dropCounter += dt;

        // tetr.io: Soft drop is 20x faster
        const effectiveInterval = this.softDropping ? this.dropInterval / 20 : this.dropInterval;

        if (this.dropCounter > effectiveInterval) {
            this.actionDrop();
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }
    }

    drawBlock(ctx, x, y, typeId, ghost = false) {
        const size = BLOCK_SIZE;
        const color = COLORS[typeId];
        const border = BORDER_COLORS[typeId];

        if (ghost) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);
            ctx.restore();
            return;
        }

        const grad = ctx.createLinearGradient(x * size, y * size, x * size + size, y * size + size);
        grad.addColorStop(0, color);
        grad.addColorStop(1, border);

        ctx.fillStyle = grad;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(x * size + 2, y * size + 2, size - 4, size / 2);
    }

    // UI drawing helper for fitting pieces in box
    drawUIBlock(ctx, x, y, typeId, scale = 1) {
        const size = BLOCK_SIZE * scale;
        const color = COLORS[typeId];

        ctx.fillStyle = color;
        ctx.fillRect(x, y, size - 1, size - 1);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(x + 1, y + 1, size - 2, size / 2);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        this.grid.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) this.drawBlock(this.ctx, x, y, val);
            });
        });

        // Current & Ghost
        if (this.currentPiece) {
            let ghostY = this.currentPiece.y;
            try {
                while (!this.collide(this.grid, { ...this.currentPiece, y: ghostY + 1 })) {
                    ghostY++;
                }
                this.currentPiece.shape.forEach((r, y) => r.forEach((v, x) => {
                    if (v !== 0) this.drawBlock(this.ctx, this.currentPiece.x + x, ghostY + y, v, true);
                }));

                this.currentPiece.shape.forEach((r, y) => r.forEach((v, x) => {
                    if (v !== 0) this.drawBlock(this.ctx, this.currentPiece.x + x, this.currentPiece.y + y, v);
                }));
            } catch (e) { }
        }

        this.particles.forEach(p => p.draw(this.ctx));

        // Draw Hold (Centered)
        const scale = 0.8;
        const boxSize = 90;
        if (this.holdCtx) {
            this.holdCtx.clearRect(0, 0, boxSize, boxSize);
            if (this.holdPiece) {
                const shape = PIECES[this.holdPiece];
                const w = shape[0].length * BLOCK_SIZE * scale;
                const h = shape.length * BLOCK_SIZE * scale;
                const offX = (boxSize - w) / 2;
                const offY = (boxSize - h) / 2;

                shape.forEach((r, y) => r.forEach((v, x) => {
                    if (v !== 0) this.drawUIBlock(this.holdCtx, offX + x * BLOCK_SIZE * scale, offY + y * BLOCK_SIZE * scale, v, scale);
                }));
            }
        }

        // Draw Next (Centered) - Show first 5 pieces
        if (this.nextCtx) {
            const nextHeight = 300;
            this.nextCtx.clearRect(0, 0, boxSize, nextHeight);

            // Show first 5 pieces (tetr.io style)
            const piecesToShow = Math.min(5, this.nextPieces.length);
            for (let i = 0; i < piecesToShow; i++) {
                const piece = this.nextPieces[i];
                const shape = piece.shape;
                const w = shape[0].length * BLOCK_SIZE * scale;
                const h = shape.length * BLOCK_SIZE * scale;
                const offX = (boxSize - w) / 2;
                const offY = 5 + i * 55; // Tighter spacing for 5 pieces

                shape.forEach((r, y) => r.forEach((v, x) => {
                    if (v !== 0) this.drawUIBlock(this.nextCtx, offX + x * BLOCK_SIZE * scale, offY + y * BLOCK_SIZE * scale, v, scale);
                }));
            }
        }
    }
}

class AIController {
    constructor(tetrisInstance, level) {
        this.tetris = tetrisInstance;
        this.level = level;
        this.moveQueue = [];
        this.thinkTimer = 0;
        // Level 1: 500ms, Level 10: 50ms
        this.moveDelay = Math.max(50, 500 - (level * 45));
        this.planTimer = 0;
        this.panicMode = false;
    }

    update(dt) {
        if (this.tetris.gameOver) return;
        this.thinkTimer += dt;
        this.planTimer += dt;

        if (this.moveQueue.length > 0) {
            if (this.thinkTimer > this.moveDelay) {
                const move = this.moveQueue.shift();
                if (move === 'L') this.tetris.actionMove(-1);
                if (move === 'R') this.tetris.actionMove(1);
                if (move === 'U') this.tetris.actionRotate();
                if (move === 'D') this.tetris.actionDrop();
                if (move === 'SPACE') this.tetris.actionHardDrop();
                this.thinkTimer = 0;
            }
        } else {
            if (this.planTimer > this.moveDelay) {
                this.plan();
                this.planTimer = 0;
            }
        }
        this.tetris.update(dt);
    }

    plan() {
        let bestScore = -Infinity;
        let bestMove = null;

        const piece = this.tetris.currentPiece;
        const grid = this.tetris.grid;
        if (!piece) return;

        // Check height for panic mode
        // Find highest block
        let maxY = ROWS;
        for (let r = 0; r < ROWS; r++) {
            if (grid[r].some(c => c !== 0)) {
                maxY = r;
                break;
            }
        }
        this.panicMode = (maxY < 6); // If stack is very high (indices 0-5), PANIC!

        for (let r = 0; r < 4; r++) {
            let shape = piece.shape;
            for (let i = 0; i < r; i++) shape = this.tetris.rotateMatrix(shape);

            for (let x = -2; x < COLS; x++) {
                let y = -99;
                let validX = true;
                for (let py = 0; py < shape.length; ++py) {
                    for (let px = 0; px < shape[py].length; ++px) {
                        if (shape[py][px] !== 0) {
                            if (x + px < 0 || x + px >= COLS) validX = false;
                        }
                    }
                }
                if (!validX) continue;

                let tempY = -2;
                while (true) {
                    let collision = false;
                    for (let py = 0; py < shape.length; ++py) {
                        for (let px = 0; px < shape[py].length; ++px) {
                            if (shape[py][px] !== 0) {
                                if (tempY + py >= ROWS || (tempY + py >= 0 && grid[tempY + py] && grid[tempY + py][x + px] !== 0)) {
                                    collision = true;
                                }
                            }
                        }
                    }
                    if (collision) {
                        y = tempY - 1;
                        break;
                    }
                    tempY++;
                }

                if (y < 0) continue;

                const score = this.evaluate(grid, shape, x, y);
                // Level-based noise (Error)
                // Level 10 has almost 0 randomness
                const noise = (10 - this.level) * (Math.random() * 5 - 2.5);

                if (score + noise > bestScore) {
                    bestScore = score + noise;
                    bestMove = { r: r, x: x };
                }
            }
        }

        if (bestMove) {
            for (let i = 0; i < bestMove.r; i++) this.moveQueue.push('U');
            const dx = bestMove.x - piece.x;
            for (let i = 0; i < Math.abs(dx); i++) this.moveQueue.push(dx > 0 ? 'R' : 'L');

            // Panic mode = Drop fast
            if (this.panicMode || this.level > 5) {
                this.moveQueue.push('SPACE');
            } else {
                this.moveQueue.push('D');
            }
        }
    }

    evaluate(originalGrid, shape, x, y) {
        const grid = originalGrid.map(row => [...row]);
        shape.forEach((r, py) => {
            r.forEach((v, px) => {
                if (v !== 0 && y + py < ROWS && y + py >= 0) grid[y + py][x + px] = v;
            });
        });

        let height = 0;
        let holes = 0;
        let lines = 0;

        for (let r = 0; r < ROWS; r++) {
            if (grid[r].some(c => c !== 0)) {
                height = Math.max(height, ROWS - r);
            }
            if (grid[r].every(c => c !== 0)) {
                lines++;
            }
        }

        for (let c = 0; c < COLS; c++) {
            let blockFound = false;
            for (let r = 0; r < ROWS; r++) {
                if (grid[r][c] !== 0) {
                    blockFound = true;
                } else if (blockFound && grid[r][c] === 0) {
                    holes++;
                }
            }
        }

        // TUNE: Heavy punishment for holes, reward lines but also keep height low
        let score = (-10 * height) + (20 * lines) + (-50 * holes);

        // If panic mode, JUST CLEAR LINES
        if (this.panicMode) {
            score = lines * 1000 - height * 10;
        }

        return score;
    }
}

class GameController {
    constructor() {
        this.audio = new SoundManager();
        this.menu = document.getElementById('difficulty-overlay');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.mascot = document.getElementById('mascot-img');
        this.bubble = document.getElementById('mascot-speech');

        this.player = null;
        this.ai = null;
        this.aiController = null;
        this.lastTime = 0;
        this.isActive = false;

        this.currentLevel = 1;

        // Start Button in Menu
        const startBtn = document.createElement('button');
        startBtn.innerText = "START ARCADE (Level 1)";
        startBtn.className = 'diff-btn';
        startBtn.style.width = '300px';
        startBtn.style.background = '#ff4081';
        startBtn.style.color = 'white';
        startBtn.onclick = () => this.startLevel(1);

        const container = document.querySelector('.difficulty-buttons');
        container.innerHTML = '';
        container.appendChild(startBtn);

        document.getElementById('restart-btn').innerText = "Try Again";
        document.getElementById('restart-btn').addEventListener('click', () => location.reload()); // Full reset

        this.boundLoop = this.loop.bind(this);
    }

    startLevel(level) {
        this.currentLevel = level;
        this.menu.style.display = 'none';
        this.gameOverModal.classList.add('hidden');

        console.log(`Starting Level ${level}`);

        // Setup Enemy Visuals
        // Hue rotate based on level
        this.mascot.style.filter = `hue-rotate(${(level - 1) * 30}deg) brightness(${1.0 - (level - 1) * 0.03})`;

        this.speak(ENEMY_QUOTES.start[Math.min(level - 1, ENEMY_QUOTES.start.length - 1)] || "Prepared to die?");

        this.player = new TetrisInstance('p1-canvas', 'p1-hold', 'p1-next', false, (lines) => {
            this.audio.playClear(lines);
            if (this.ai) this.ai.receiveGarbage(lines);
            this.speak(ENEMY_QUOTES.damage[Math.floor(Math.random() * ENEMY_QUOTES.damage.length)]);
        });

        this.ai = new TetrisInstance('ai-canvas', null, null, true, (lines) => {
            if (this.player) this.player.receiveGarbage(lines);
            this.speak(ENEMY_QUOTES.attack[Math.floor(Math.random() * ENEMY_QUOTES.attack.length)]);
            // Trigger mascot animation (Angry)
            this.mascot.classList.add('mascot-bounce');
            setTimeout(() => this.mascot.classList.remove('mascot-bounce'), 500);
        });

        this.aiController = new AIController(this.ai, level);

        document.getElementById('difficulty-display').innerText = level;

        this.isActive = true;
        this.audio.resume();
        this.audio.startBGM();

        this.lastTime = 0;
        requestAnimationFrame(this.boundLoop);
    }

    speak(text) {
        if (!this.bubble) return;
        this.bubble.innerText = text;
        this.bubble.classList.remove('hidden');
        setTimeout(() => this.bubble.classList.add('hidden'), 2000);
    }

    loop(time) {
        if (!this.isActive) return;
        if (this.lastTime === 0) this.lastTime = time;
        const dt = time - this.lastTime;
        this.lastTime = time;
        if (dt > 1000) { requestAnimationFrame(this.boundLoop); return; }

        this.player.update(dt);
        this.aiController.update(dt);

        this.player.draw();
        this.ai.draw();

        document.getElementById('p1-score').innerText = this.player.score;

        if (this.player.gameOver) {
            this.endGame('LOSE');
        } else if (this.ai.gameOver) {
            this.endGame('WIN');
        } else {
            requestAnimationFrame(this.boundLoop);
        }
    }

    endGame(result) {
        this.isActive = false;
        this.audio.stopBGM();

        if (result === 'WIN') {
            if (this.currentLevel < 10) {
                // Next level
                setTimeout(() => {
                    alert(`LEVEL ${this.currentLevel} CLEARED! Moving to Level ${this.currentLevel + 1}`);
                    this.startLevel(this.currentLevel + 1);
                }, 500);
            } else {
                // ALL CLEAR
                this.gameOverModal.classList.remove('hidden');
                document.getElementById('result-title').innerText = "ALL LEVELS CLEARED!";
                document.getElementById('final-score').innerText = this.player.score + 1000000;
            }
        } else {
            this.gameOverModal.classList.remove('hidden');
            document.getElementById('result-title').innerText = "GAME OVER";
            document.getElementById('final-score').innerText = this.player.score;
        }
    }
}

// ⚡ DAS/ARR Input Handler (tetr.io style)
class InputHandler {
    constructor(player, audio) {
        this.player = player;
        this.audio = audio;

        // DAS/ARR settings (in ms) - Comfortable for general players
        this.DAS = 133; // Delayed Auto Shift (standard)
        this.ARR = 33;  // Auto Repeat Rate (smooth but controllable)

        this.keys = {};
        this.dasTimers = {};
        this.arrTimers = {};

        this.setupListeners();
    }

    setupListeners() {
        window.addEventListener('keydown', (e) => {
            if (!window.gameController || !window.gameController.isActive) return;

            const key = e.code;
            if (this.keys[key]) return; // Already pressed

            this.keys[key] = true;
            this.handleKeyPress(key, true);

            // Start DAS timer for movement keys
            if (key === 'ArrowLeft' || key === 'ArrowRight') {
                this.dasTimers[key] = setTimeout(() => {
                    this.startARR(key);
                }, this.DAS);
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.code;
            this.keys[key] = false;

            // Clear timers
            if (this.dasTimers[key]) {
                clearTimeout(this.dasTimers[key]);
                delete this.dasTimers[key];
            }
            if (this.arrTimers[key]) {
                clearInterval(this.arrTimers[key]);
                delete this.arrTimers[key];
            }

            // Stop soft drop
            if (key === 'ArrowDown') {
                this.player.softDropping = false;
            }
        });
    }

    startARR(key) {
        // Repeat at ARR interval
        this.arrTimers[key] = setInterval(() => {
            if (!this.keys[key]) {
                clearInterval(this.arrTimers[key]);
                return;
            }
            this.handleKeyPress(key, false);
        }, this.ARR);
    }

    handleKeyPress(key, isInitial) {
        const p = this.player;
        const a = this.audio;

        switch (key) {
            case 'ArrowLeft':
                if (p.actionMove(-1) && isInitial) a.playMove();
                break;
            case 'ArrowRight':
                if (p.actionMove(1) && isInitial) a.playMove();
                break;
            case 'ArrowUp':
            case 'KeyX':
                if (isInitial && p.actionRotate()) a.playRotate();
                break;
            case 'KeyZ':
            case 'ControlLeft':
                if (isInitial && p.actionRotate(-1)) a.playRotate(); // Counter-clockwise
                break;
            case 'ArrowDown':
                p.softDropping = true; // Enable soft drop
                break;
            case 'Space':
                if (isInitial && p.actionHardDrop()) a.playDrop();
                break;
            case 'KeyC':
            case 'ShiftLeft':
                if (isInitial && p.actionHold()) a.playHold();
                break;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    try {
        window.gameController = new GameController();

        // Initialize input handler when game starts
        const originalStartLevel = window.gameController.startLevel.bind(window.gameController);
        window.gameController.startLevel = function (level) {
            originalStartLevel(level);
            if (!window.inputHandler) {
                window.inputHandler = new InputHandler(this.player, this.audio);
            } else {
                window.inputHandler.player = this.player;
            }
        };
    } catch (e) {
        console.error(e);
    }
});
