/**
 * BeatMaster - Refactored Main Entry (Canvas-Only Sprite-Based)
 * 타이틀 화면 + 메뉴 + 노트 스프라이트 시트 슬라이싱 적용
 */

import { CONFIG } from './src/config/GameConfig.js';
import { SPRITE_CONFIG } from './src/config/SpriteConfig.js';
import { MidiParser } from './src/audio/MidiParser.js';
import { MidiPlayer } from './src/audio/MidiPlayer.js';
import { SpriteManager } from './src/rendering/SpriteManager.js';
import { BitmapFont } from './src/rendering/BitmapFont.js';
import { UIRenderer } from './src/rendering/UIRenderer.js';

class GameEngine {
    constructor() {
        // Core Systems
        this.parser = new MidiParser();
        this.player = null;
        this.audioCtx = null;
        this.sprites = new SpriteManager();
        this.bitmapFont = null;
        this.uiRenderer = null;

        // Canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game State
        this.state = {
            scene: 'TITLE', // 'TITLE', 'MENU', 'PLAYING', 'PAUSED', 'RESULT', 'GAMEOVER'
            notes: [],
            isPlaying: false,
            startTime: 0,
            currentTime: 0,
            score: 0,
            combo: 0,
            hp: 100,
            canvasWidth: 0,
            canvasHeight: 0,
            currentMidiSource: null,
            keyPressed: {},
            activeLongNotes: [null, null, null, null],
            laneHitFlash: [0, 0, 0, 0],
            nextCheckIndex: 0,
            nextLaneNoteIndices: [0, 0, 0, 0],
            difficulty: 1, // 0=EASY, 1=NORMAL, 2=HARD
            particles: [],
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            songDuration: 0,
            stats: { perfect: 0, good: 0, miss: 0, maxCombo: 0 },
            lanePointerMap: {},
            comboAnimProgress: 0,
            comboAnimScale: 1.0,
            judgmentText: '',
            judgmentAlpha: 0,
            songList: [],
            selectedSongIndex: 0,
            menuScrollY: 0,
            titlePulse: 0, // 타이틀 애니메이션
            menuFocus: 'song', // 'song', 'difficulty', 'play'
            scrollSpeed: 2.0 // Default Speed
        };

        // Rendering Cache
        this.cache = {
            laneWidth: 0,
            hitLineY: 0,
            horizonY: 0,
            trackHeight: 0,
            lookaheadMs: 2000,
            laneColors: SPRITE_CONFIG.COLORS.LANE,
            particlePool: [],
            activeParticles: [],
            noteSheet: null,
            noteSpriteSize: { w: 0, h: 0 }
        };

        // Initialize particle pool
        for (let i = 0; i < 200; i++) {
            this.cache.particlePool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, color: '' });
        }

        this._lastTimestamp = 0;
        this.init();
    }

    async init() {
        console.log('[GameEngine] Initializing Canvas-Only Sprite-Based System...');

        // Load all sprite assets
        await this.sprites.loadAll();

        // Calculate note sprite size from loaded image
        const noteImg = this.sprites.get('NOTE');
        if (noteImg) {
            const sheet = SPRITE_CONFIG.NOTE_SHEET;
            this.cache.noteSpriteSize = {
                w: noteImg.width / sheet.COLS,
                h: noteImg.height / sheet.ROWS
            };
            console.log(`[GameEngine] Note sprite size: ${this.cache.noteSpriteSize.w}x${this.cache.noteSpriteSize.h}`);
        }

        // Initialize font and UI renderer
        this.bitmapFont = new BitmapFont(this.sprites);
        this.uiRenderer = new UIRenderer(this.ctx, this.sprites, this.bitmapFont);

        // Setup canvas
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 300));

        // Load song list
        await this.loadSongList();

        // Bind input events
        this.bindEvents();

        // Start render loop
        requestAnimationFrame((t) => this.loop(t));

        console.log('[GameEngine] Initialization complete.');
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        this.state.canvasWidth = this.canvas.clientWidth;
        this.state.canvasHeight = this.canvas.clientHeight;

        this.canvas.width = this.state.canvasWidth * dpr;
        this.canvas.height = this.state.canvasHeight * dpr;
        this.ctx.scale(dpr, dpr);

        // Update cache
        this.cache.laneWidth = this.state.canvasWidth / CONFIG.NOTES.LANES;
        this.cache.horizonY = this.state.canvasHeight * SPRITE_CONFIG.GAME.HORIZON_Y;
        this.cache.hitLineY = this.state.canvasHeight * SPRITE_CONFIG.GAME.HIT_LINE_Y;
        this.cache.trackHeight = this.cache.hitLineY - this.cache.horizonY;

        // Update UI renderer
        if (this.uiRenderer) {
            this.uiRenderer.setSize(this.state.canvasWidth, this.state.canvasHeight);
        }
    }

    async loadSongList() {
        try {
            const res = await fetch('songs.json');
            if (!res.ok) throw new Error('Failed to fetch songs.json');
            this.state.songList = await res.json();
            console.log(`[GameEngine] Loaded ${this.state.songList.length} songs`);
        } catch (e) {
            console.warn('[GameEngine] Failed to load songs.json:', e);
            this.state.songList = [];
        }
    }

    bindEvents() {
        // Keyboard
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Pointer (touch + mouse)
        this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();

        if (this.state.scene === 'TITLE') {
            this.state.scene = 'MENU';
            return;
        }

        if (this.state.scene === 'MENU') {
            if (key === 'arrowup') {
                if (this.state.menuFocus === 'song') {
                    this.state.selectedSongIndex = Math.max(0, this.state.selectedSongIndex - 1);
                } else if (this.state.menuFocus === 'difficulty') {
                    this.state.menuFocus = 'song';
                } else if (this.state.menuFocus === 'play') {
                    this.state.menuFocus = 'difficulty';
                }
            } else if (key === 'arrowdown') {
                if (this.state.menuFocus === 'song') {
                    if (this.state.selectedSongIndex < this.state.songList.length - 1) {
                        this.state.selectedSongIndex++;
                    } else {
                        this.state.menuFocus = 'difficulty';
                    }
                } else if (this.state.menuFocus === 'difficulty') {
                    this.state.menuFocus = 'play';
                }
            } else if (key === 'arrowleft') {
                if (this.state.menuFocus === 'difficulty') {
                    this.state.difficulty = Math.max(0, this.state.difficulty - 1);
                }
            } else if (key === 'arrowright') {
                if (this.state.menuFocus === 'difficulty') {
                    this.state.difficulty = Math.min(2, this.state.difficulty + 1);
                }
            } else if (key === 'enter' || key === ' ') {
                if (this.state.menuFocus === 'play' || this.state.menuFocus === 'song') {
                    this.startGame();
                } else if (this.state.menuFocus === 'difficulty') {
                    this.state.menuFocus = 'play';
                }
            }
        } else if (this.state.scene === 'PLAYING') {
            // Speed Control
            if (e.code === 'F3') {
                e.preventDefault();
                this.state.scrollSpeed = Math.max(0.5, parseFloat((this.state.scrollSpeed - 0.1).toFixed(1)));
                return;
            }
            if (e.code === 'F4') {
                e.preventDefault();
                this.state.scrollSpeed = Math.min(10.0, parseFloat((this.state.scrollSpeed + 0.1).toFixed(1)));
                return;
            }

            if (key === 'escape') {
                this.togglePause();
                return;
            }

            const lane = CONFIG.NOTES.LANE_KEYS.indexOf(key);
            if (lane !== -1) {
                this.triggerLaneDown(lane);
            }
        } else if (this.state.scene === 'PAUSED') {
            if (key === 'escape') {
                this.togglePause();
            }
        } else if (this.state.scene === 'RESULT' || this.state.scene === 'GAMEOVER') {
            this.returnToMenu();
        }
    }

    handleKeyUp(e) {
        if (this.state.scene !== 'PLAYING') return;
        const key = e.key.toLowerCase();
        const lane = CONFIG.NOTES.LANE_KEYS.indexOf(key);
        if (lane !== -1) {
            this.triggerLaneUp(lane);
        }
    }

    handlePointerDown(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.state.scene === 'TITLE') {
            this.state.scene = 'MENU';
            return;
        }

        if (this.state.scene === 'MENU') {
            this.handleMenuClick(x, y);
        } else if (this.state.scene === 'PLAYING') {
            const laneWidth = this.state.canvasWidth / CONFIG.NOTES.LANES;
            const lane = Math.floor(x / laneWidth);
            if (lane >= 0 && lane < CONFIG.NOTES.LANES) {
                this.state.lanePointerMap[e.pointerId] = lane;
                this.triggerLaneDown(lane);
                this.canvas.setPointerCapture(e.pointerId);
            }
        } else if (this.state.scene === 'PAUSED') {
            this.togglePause();
        } else if (this.state.scene === 'RESULT' || this.state.scene === 'GAMEOVER') {
            this.returnToMenu();
        }
    }

    handleMenuClick(x, y) {
        const { canvasWidth, canvasHeight } = this.state;
        const menuCfg = SPRITE_CONFIG.MENU;
        const sidePad = canvasWidth * menuCfg.SIDE_PADDING;

        // Song list area
        const songListY = canvasHeight * menuCfg.SONG_LIST_Y;
        const songListH = canvasHeight * menuCfg.SONG_LIST_HEIGHT;
        const itemH = menuCfg.SONG_ITEM_HEIGHT;

        if (y >= songListY && y < songListY + songListH) {
            const idx = Math.floor((y - songListY) / itemH);
            if (idx >= 0 && idx < this.state.songList.length) {
                this.state.selectedSongIndex = idx;
                this.state.menuFocus = 'song';
                return;
            }
        }

        // Difficulty area
        const diffY = canvasHeight * menuCfg.DIFFICULTY_Y;
        if (y >= diffY - 30 && y <= diffY + 30) {
            const diffW = 100;
            const totalW = 3 * diffW + 20;
            const startX = (canvasWidth - totalW) / 2;
            for (let i = 0; i < 3; i++) {
                const bx = startX + i * (diffW + 10);
                if (x >= bx && x <= bx + diffW) {
                    this.state.difficulty = i;
                    this.state.menuFocus = 'difficulty';
                    return;
                }
            }
        }

        // Play button
        const playY = canvasHeight * menuCfg.PLAY_BUTTON_Y;
        const playW = 200;
        const playH = 50;
        const playX = (canvasWidth - playW) / 2;
        if (x >= playX && x <= playX + playW && y >= playY - playH / 2 && y <= playY + playH / 2) {
            this.startGame();
        }
    }

    handlePointerUp(e) {
        const lane = this.state.lanePointerMap[e.pointerId];
        if (lane !== undefined) {
            this.triggerLaneUp(lane);
            delete this.state.lanePointerMap[e.pointerId];
        }
    }

    async startGame() {
        if (this.state.songList.length === 0) return;
        const song = this.state.songList[this.state.selectedSongIndex];
        this.state.currentMidiSource = song.url;

        // Setup audio FIRST, then load MIDI
        await this.setupAudio();
        await this.loadMidiData(song.url);
        await this.loadMidiIntoPlayer();
        this.beginGameplay();
    }

    async setupAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.player = new MidiPlayer(this.audioCtx);
            const soundfont = CONFIG.AUDIO.SOUNDFONTS[CONFIG.AUDIO.DEFAULT_SOUNDFONT];
            console.log(`[GameEngine] Loading soundfont: ${soundfont.name}`);
            await this.player.init(soundfont.url);
        }
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }
    }

    async loadMidiData(src) {
        console.log('[GameEngine] Loading MIDI...');
        try {
            const difficultyMap = ['EASY', 'NORMAL', 'HARD'];
            const gameData = await this.parser.parse(src, difficultyMap[this.state.difficulty], this.state.isMobile);
            this.state.notes = gameData.allNotes.map(n => ({
                ...n,
                hit: false,
                completed: false,
                missed: false
            }));
            this.state.backgroundMidi = gameData.backgroundMidi;
            this.state.nextCheckIndex = 0;
            this.state.nextLaneNoteIndices = [0, 0, 0, 0];

            if (this.state.notes.length > 0) {
                this.state.lastNoteEndTime = this.state.notes.reduce((max, n) =>
                    Math.max(max, n.time + (n.duration || 0)), 0);
            }

            console.log(`[GameEngine] MIDI loaded: ${this.state.notes.length} notes`);
        } catch (e) {
            console.error('[GameEngine] MIDI load failed:', e);
        }
    }

    async loadMidiIntoPlayer() {
        if (!this.player) return;
        if (this.state.backgroundMidi) {
            await this.player.loadMidi(this.state.backgroundMidi);
        }
    }


    beginGameplay() {
        // Reset state
        this.state.score = 0;
        this.state.combo = 0;
        this.state.hp = 100;
        this.state.stats = { perfect: 0, good: 0, miss: 0, maxCombo: 0 };
        this.state.nextCheckIndex = 0;
        this.state.nextLaneNoteIndices = [0, 0, 0, 0];
        this.state.notes.forEach(n => {
            n.hit = false;
            n.completed = false;
            n.missed = false;
        });

        if (this.state.notes.length > 0) {
            const lastNote = this.state.notes[this.state.notes.length - 1];
            this.state.songDuration = lastNote.time + (lastNote.duration || 0) + 2000;
        }

        if (this.player) this.player.stop();

        this.state.scene = 'PLAYING';
        this.state.isPlaying = true;
        this.state.gameStartTime = performance.now();
        this.state.audioStarted = false;

        console.log('[GameEngine] Game started!');
    }

    togglePause() {
        if (this.state.scene === 'PLAYING') {
            this.state.scene = 'PAUSED';
            this.state.isPlaying = false;
            if (this.player) this.player.pause();
        } else if (this.state.scene === 'PAUSED') {
            this.state.scene = 'PLAYING';
            this.state.isPlaying = true;
            if (this.player) this.player.resume();
        }
    }

    returnToMenu() {
        this.state.scene = 'MENU';
        this.state.isPlaying = false;
        if (this.player) this.player.stop();
    }

    triggerLaneDown(lane) {
        if (!this.state.isPlaying) return;
        this.state.keyPressed[lane] = true;
        this.checkHit(lane);
    }

    triggerLaneUp(lane) {
        if (!this.state.isPlaying) return;
        this.state.keyPressed[lane] = false;

        const activeLN = this.state.activeLongNotes[lane];
        if (activeLN && !activeLN.completed) {
            const now = this.state.currentTime;
            const endTime = activeLN.time + activeLN.duration;
            const diff = Math.abs(now - endTime);
            const releaseWindow = CONFIG.NOTES.JUDGMENT.RELEASE_WINDOW * 1000;

            if (diff <= releaseWindow) {
                const judgment = this.getJudgment(diff / 1000 / 1.5);
                this.applyJudgment(judgment);
            } else {
                this.applyJudgment('MISS');
            }
            activeLN.completed = true;
            this.syncCheckIndex();
            this.state.activeLongNotes[lane] = null;
        }
    }

    syncCheckIndex() {
        const notes = this.state.notes;
        while (this.state.nextCheckIndex < notes.length &&
            (notes[this.state.nextCheckIndex].completed || notes[this.state.nextCheckIndex].missed)) {
            this.state.nextCheckIndex++;
        }
    }

    checkHit(lane) {
        const now = this.state.currentTime;
        const windowSize = CONFIG.NOTES.JUDGMENT.GOOD * 1000;
        const notes = this.state.notes;
        let idx = this.state.nextLaneNoteIndices[lane];

        while (idx < notes.length) {
            const note = notes[idx];
            if (note.time > now + windowSize) break;

            if (note.lane === lane && !note.hit) {
                const diff = Math.abs(note.time - now);
                if (diff <= windowSize) {
                    note.hit = true;
                    this.createParticles(lane);
                    this.state.laneHitFlash[lane] = 150;

                    const judgment = this.getJudgment(diff / 1000);
                    this.applyJudgment(judgment);

                    if (note.isLongNote) {
                        this.state.activeLongNotes[lane] = note;
                    } else {
                        note.completed = true;
                    }

                    this.syncCheckIndex();
                    this.state.nextLaneNoteIndices[lane] = idx + 1;
                    return;
                }
            }
            idx++;
        }
    }

    getJudgment(diff) {
        if (diff <= CONFIG.NOTES.JUDGMENT.PERFECT) return 'PERFECT';
        if (diff <= CONFIG.NOTES.JUDGMENT.GOOD) return 'GOOD';
        return 'MISS';
    }

    applyJudgment(type) {
        this.state.judgmentText = type;
        this.state.judgmentAlpha = 1.0;

        if (type === 'MISS') {
            this.state.combo = 0;
            this.state.hp = Math.max(0, this.state.hp - CONFIG.HP.MISS_PENALTY);
            this.state.stats.miss++;
        } else {
            this.state.combo++;
            this.state.stats.maxCombo = Math.max(this.state.stats.maxCombo, this.state.combo);
            this.state.comboAnimProgress = 1.0;

            if (type === 'PERFECT') {
                this.state.hp = Math.min(100, this.state.hp + CONFIG.HP.PERFECT_HEAL);
                this.state.stats.perfect++;
                this.state.score += 100 * (this.state.combo >= 50 ? 1.5 : this.state.combo >= 20 ? 1.2 : 1);
            } else {
                this.state.hp = Math.min(100, this.state.hp + CONFIG.HP.GOOD_HEAL);
                this.state.stats.good++;
                this.state.score += 50 * (this.state.combo >= 50 ? 1.5 : this.state.combo >= 20 ? 1.2 : 1);
            }
        }

        if (this.state.hp <= 0 && this.state.isPlaying) {
            this.failGame();
        }
    }

    failGame() {
        this.state.scene = 'GAMEOVER';
        this.state.isPlaying = false;
        if (this.player) this.player.stop();
    }

    showResults() {
        this.state.scene = 'RESULT';
        this.state.isPlaying = false;
    }

    createParticles(lane) {
        const x = lane * this.cache.laneWidth + this.cache.laneWidth / 2;
        const y = this.cache.hitLineY;
        const color = this.cache.laneColors[lane];
        const count = this.state.isMobile ? 6 : 12;

        for (let i = 0; i < count; i++) {
            const p = this.cache.particlePool.find(obj => obj.life <= 0);
            if (p) {
                p.x = x;
                p.y = y;
                p.vx = (Math.random() - 0.5) * 15;
                p.vy = (Math.random() - 0.5) * 15 - 8;
                p.life = 1.0;
                p.decay = 0.02 + Math.random() * 0.03;
                p.color = color;
                if (!this.cache.activeParticles.includes(p)) {
                    this.cache.activeParticles.push(p);
                }
            }
        }
    }

    updateParticles(delta) {
        const active = this.cache.activeParticles;
        for (let i = active.length - 1; i >= 0; i--) {
            const p = active[i];
            p.x += p.vx * (delta / 16);
            p.y += p.vy * (delta / 16);
            p.life -= p.decay * (delta / 16);
            if (p.life <= 0) {
                active.splice(i, 1);
            }
        }
    }

    // ==================== MAIN LOOP ====================

    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));

        const delta = timestamp - this._lastTimestamp;
        this._lastTimestamp = timestamp;

        // Update title animation
        this.state.titlePulse = (this.state.titlePulse + delta * 0.003) % (Math.PI * 2);

        if (this.state.scene === 'PLAYING') {
            this.updateGameplay(timestamp, delta);
        }

        this.render();
    }

    updateGameplay(timestamp, delta) {
        // Calculate current time
        const rawTime = timestamp - this.state.gameStartTime;
        this.state.currentTime = rawTime - (CONFIG.NOTES.JUDGMENT.AUDIO_OFFSET * 1000);

        // Start audio at 0
        if (!this.state.audioStarted && this.state.currentTime >= 0) {
            if (this.player) this.player.play();
            this.state.audioStarted = true;
        }

        // Check for missed notes
        const missThreshold = this.state.currentTime - (CONFIG.NOTES.JUDGMENT.GOOD * 1000) - (CONFIG.NOTES.JUDGMENT.MISS_GRACE * 1000);
        while (this.state.nextCheckIndex < this.state.notes.length) {
            const note = this.state.notes[this.state.nextCheckIndex];
            if (note.time < missThreshold) {
                if (!note.hit && !note.completed) {
                    note.completed = true;
                    this.applyJudgment('MISS');
                }
                this.state.nextCheckIndex++;
            } else {
                break;
            }
        }

        // Update animations
        this.state.laneHitFlash = this.state.laneHitFlash.map(v => Math.max(0, v - delta));
        if (this.state.comboAnimProgress > 0) {
            this.state.comboAnimProgress = Math.max(0, this.state.comboAnimProgress - delta / 350);
            this.state.comboAnimScale = 1 + 0.25 * (1 - this.state.comboAnimProgress);
        } else {
            this.state.comboAnimScale = 1.0;
        }
        if (this.state.judgmentAlpha > 0) {
            this.state.judgmentAlpha = Math.max(0, this.state.judgmentAlpha - delta / 500);
        }
        this.updateParticles(delta);

        // Check for game end
        const gameEndTime = this.state.lastNoteEndTime + 2000;
        if (this.state.currentTime >= gameEndTime) {
            this.state.isPlaying = false;
            if (this.player) this.player.stop();
            this.showResults();
        }
    }

    // ==================== RENDERING ====================

    render() {
        this.ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        switch (this.state.scene) {
            case 'TITLE':
                this.renderTitle();
                break;
            case 'MENU':
                this.renderMenu();
                break;
            case 'PLAYING':
                this.renderGame();
                this.renderHUD();
                break;
            case 'PAUSED':
                this.renderGame();
                this.renderHUD();
                this.uiRenderer.drawPauseOverlay();
                break;
            case 'RESULT':
                this.renderGame();
                const rank = this.calculateRank();
                this.uiRenderer.drawResultScreen(this.state.stats, rank);
                break;
            case 'GAMEOVER':
                this.renderGame();
                this.uiRenderer.drawGameOverScreen();
                break;
        }
    }

    calculateRank() {
        const total = this.state.stats.perfect + this.state.stats.good + this.state.stats.miss;
        const accuracy = total > 0 ? (this.state.stats.perfect / total) : 0;
        if (accuracy > 0.95) return 'S';
        if (accuracy > 0.85) return 'A';
        if (accuracy > 0.70) return 'B';
        if (accuracy > 0.50) return 'C';
        return 'F';
    }

    // ==================== TITLE SCREEN ====================

    renderTitle() {
        const { canvasWidth, canvasHeight } = this.state;

        // Background
        const bgImg = this.sprites.get('BACKGROUND');
        if (bgImg) {
            this.ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        }
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Title Image with pulse effect
        const titleImg = this.sprites.get('TITLE');
        const scale = 1 + Math.sin(this.state.titlePulse) * 0.05;

        if (titleImg) {
            const titleW = Math.min(500, canvasWidth * 0.8) * scale;
            const titleH = titleW * (titleImg.height / titleImg.width);
            const titleX = (canvasWidth - titleW) / 2;
            const titleY = canvasHeight * 0.25 - titleH / 2;
            this.ctx.drawImage(titleImg, titleX, titleY, titleW, titleH);
        } else {
            // Fallback text
            this.ctx.save();
            this.ctx.font = `bold ${80 * scale}px "Outfit", sans-serif`;
            this.ctx.fillStyle = '#FF007A';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.shadowColor = '#FF007A';
            this.ctx.shadowBlur = 30;
            this.ctx.fillText('BEATMASTER', canvasWidth / 2, canvasHeight * 0.3);
            this.ctx.restore();
        }

        // Sample note sprites display
        const noteImg = this.sprites.get('NOTE');
        if (noteImg) {
            const spriteSize = this.cache.noteSpriteSize;
            const displaySize = 60;
            const spacing = 80;
            const startX = canvasWidth / 2 - (1.5 * spacing);
            const noteY = canvasHeight * 0.55;

            for (let i = 0; i < 4; i++) {
                const sprite = SPRITE_CONFIG.NOTE_SHEET.LANE_SPRITES[i];
                const sx = sprite.col * spriteSize.w;
                const sy = sprite.row * spriteSize.h;
                this.ctx.drawImage(noteImg, sx, sy, spriteSize.w, spriteSize.h,
                    startX + i * spacing - displaySize / 2, noteY - displaySize / 2, displaySize, displaySize);
            }
        }

        // Press Start prompt
        const alpha = 0.5 + Math.sin(this.state.titlePulse * 2) * 0.5;
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.font = 'bold 28px "Outfit", sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PRESS ANY KEY OR TAP TO START', canvasWidth / 2, canvasHeight * 0.75);
        this.ctx.restore();

        // Footer
        this.ctx.save();
        this.ctx.font = '14px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('© 2026 BeatMaster', canvasWidth / 2, canvasHeight - 30);
        this.ctx.restore();
    }

    // ==================== MENU SCREEN ====================

    renderMenu() {
        const { canvasWidth, canvasHeight, songList, selectedSongIndex, difficulty, menuFocus } = this.state;
        const menuCfg = SPRITE_CONFIG.MENU;
        const colors = SPRITE_CONFIG.COLORS;
        const difficulties = SPRITE_CONFIG.DIFFICULTIES;

        // Background
        const bgImg = this.sprites.get('BACKGROUND');
        if (bgImg) {
            this.ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
        }
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const sidePad = canvasWidth * menuCfg.SIDE_PADDING;

        // ===== HEADER =====
        this.ctx.save();
        this.ctx.font = 'bold 36px "Outfit", sans-serif';
        this.ctx.fillStyle = colors.PRIMARY;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SELECT SONG', canvasWidth / 2, canvasHeight * menuCfg.TITLE_Y);
        this.ctx.restore();

        // ===== SONG LIST =====
        const songListY = canvasHeight * menuCfg.SONG_LIST_Y;
        const songListH = canvasHeight * menuCfg.SONG_LIST_HEIGHT;
        const itemH = menuCfg.SONG_ITEM_HEIGHT;

        // Song list container
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(sidePad, songListY, canvasWidth - sidePad * 2, songListH);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(sidePad, songListY, canvasWidth - sidePad * 2, songListH);

        // Clip for scrolling
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(sidePad, songListY, canvasWidth - sidePad * 2, songListH);
        this.ctx.clip();

        songList.forEach((song, i) => {
            const itemY = songListY + i * itemH;
            const isSelected = i === selectedSongIndex;
            const isFocused = menuFocus === 'song' && isSelected;

            // Item background
            if (isSelected) {
                this.ctx.fillStyle = isFocused ? 'rgba(255, 0, 122, 0.4)' : 'rgba(255, 0, 122, 0.2)';
                this.ctx.fillRect(sidePad + 2, itemY + 2, canvasWidth - sidePad * 2 - 4, itemH - 4);
            }

            // Song name
            this.ctx.font = isSelected ? 'bold 20px "Outfit", sans-serif' : '18px "Outfit", sans-serif';
            this.ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
            this.ctx.textBaseline = 'middle';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(song.name, sidePad + 20, itemY + itemH / 2);

            // Indicator for selected
            if (isSelected) {
                this.ctx.fillStyle = colors.PRIMARY;
                this.ctx.beginPath();
                this.ctx.moveTo(sidePad + 8, itemY + itemH / 2 - 6);
                this.ctx.lineTo(sidePad + 16, itemY + itemH / 2);
                this.ctx.lineTo(sidePad + 8, itemY + itemH / 2 + 6);
                this.ctx.fill();
            }
        });
        this.ctx.restore();

        // ===== DIFFICULTY SELECTION =====
        const diffY = canvasHeight * menuCfg.DIFFICULTY_Y;
        const diffW = 100;
        const diffH = 40;
        const totalDiffW = 3 * diffW + 20;
        const diffStartX = (canvasWidth - totalDiffW) / 2;
        const isFocusDiff = menuFocus === 'difficulty';

        this.ctx.save();
        this.ctx.font = 'bold 16px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DIFFICULTY', canvasWidth / 2, diffY - 30);
        this.ctx.restore();

        difficulties.forEach((diff, i) => {
            const bx = diffStartX + i * (diffW + 10);
            const selected = i === difficulty;
            const focused = selected && isFocusDiff;

            // Button background
            this.ctx.fillStyle = selected ? colors.PRIMARY : 'rgba(255, 255, 255, 0.1)';
            if (focused) {
                this.ctx.shadowColor = colors.PRIMARY;
                this.ctx.shadowBlur = 15;
            }
            this.ctx.fillRect(bx, diffY - diffH / 2, diffW, diffH);
            this.ctx.shadowBlur = 0;

            // Border
            this.ctx.strokeStyle = selected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = selected ? 2 : 1;
            this.ctx.strokeRect(bx, diffY - diffH / 2, diffW, diffH);

            // Text
            this.ctx.font = selected ? 'bold 16px "Outfit", sans-serif' : '14px "Outfit", sans-serif';
            this.ctx.fillStyle = selected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(diff, bx + diffW / 2, diffY);
        });

        // ===== PLAY BUTTON =====
        const playY = canvasHeight * menuCfg.PLAY_BUTTON_Y;
        const playW = 200;
        const playH = 50;
        const playX = (canvasWidth - playW) / 2;
        const isFocusPlay = menuFocus === 'play';

        // Button
        this.ctx.save();
        const playGrad = this.ctx.createLinearGradient(playX, playY - playH / 2, playX, playY + playH / 2);
        playGrad.addColorStop(0, isFocusPlay ? '#FF3399' : colors.PRIMARY);
        playGrad.addColorStop(1, isFocusPlay ? '#CC0066' : '#CC0066');
        this.ctx.fillStyle = playGrad;

        if (isFocusPlay) {
            this.ctx.shadowColor = colors.PRIMARY;
            this.ctx.shadowBlur = 25;
        }

        this.ctx.beginPath();
        this.ctx.roundRect(playX, playY - playH / 2, playW, playH, 10);
        this.ctx.fill();

        this.ctx.font = 'bold 22px "Outfit", sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('▶ PLAY', canvasWidth / 2, playY);
        this.ctx.restore();

        // Instructions
        this.ctx.save();
        this.ctx.font = '14px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('↑↓ Select Song | ←→ Difficulty | ENTER Start', canvasWidth / 2, canvasHeight - 25);
        this.ctx.restore();
    }

    // ==================== GAME RENDERING ====================

    renderGame() {
        let { laneWidth, hitLineY, horizonY, trackHeight, laneColors } = this.cache;
        const lookaheadMs = 2000 / this.state.scrollSpeed; // Dynamic Speed
        const canvasCenterX = this.state.canvasWidth / 2;

        // 1. Background
        const bgImg = this.sprites.get('BACKGROUND');
        if (bgImg) {
            this.ctx.drawImage(bgImg, 0, 0, this.state.canvasWidth, this.state.canvasHeight);
        }
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        // 2. 3D Procedural Track (Replaces Image)
        this.drawProceduralTrack();

        // 3. Lane Dividers (Included in drawProceduralTrack, logical placeholders here removed)

        // 5. Notes (using sprite sheet slicing)
        const timeLimit = this.state.currentTime + lookaheadMs;
        const noteImg = this.sprites.get('NOTE');
        const spriteSize = this.cache.noteSpriteSize;

        for (let i = this.state.nextCheckIndex; i < this.state.notes.length; i++) {
            const note = this.state.notes[i];
            if (note.time > timeLimit) break;
            if (note.time < this.state.currentTime - 100 && !note.isLongNote) continue;

            const timeOffset = note.time - this.state.currentTime;
            const normY = 1 - Math.max(0, Math.min(1, timeOffset / lookaheadMs));
            const projectedY = horizonY + trackHeight * Math.pow(normY, 2.5);
            const scale = 0.2 + 0.8 * Math.pow(normY, 3);

            const laneWidthBase = this.state.canvasWidth / CONFIG.NOTES.LANES;
            const laneOffset = note.lane - CONFIG.NOTES.LANES / 2 + 0.5;
            const x = canvasCenterX + (laneOffset * (this.state.canvasWidth * scale / CONFIG.NOTES.LANES));

            // Note Size Scaling (Fill the lane)
            const noteSize = laneWidthBase * scale * 0.85; // Fill 85% of lane width

            if (note.isLongNote) {
                // Long note body
                const endTimeOffset = (note.time + note.duration) - this.state.currentTime;
                const endNormY = 1 - Math.max(0, Math.min(1, endTimeOffset / lookaheadMs));
                const endProjectedY = horizonY + trackHeight * Math.pow(endNormY, 2.5);
                const endScale = 0.2 + 0.8 * Math.pow(endNormY, 3);
                const endX = canvasCenterX + (laneOffset * (this.state.canvasWidth * endScale / CONFIG.NOTES.LANES));
                const endSize = laneWidthBase * endScale * 0.85;

                // Gradient Body
                const style = SPRITE_CONFIG.NOTE_STYLES[note.lane];
                const bodyGrad = this.ctx.createLinearGradient(0, projectedY, 0, endProjectedY);
                bodyGrad.addColorStop(0, style.gradient[0]); // Match note head color
                bodyGrad.addColorStop(1, style.gradient[1]); // Match tail color

                this.ctx.fillStyle = bodyGrad;
                this.ctx.globalAlpha = 0.8; // Semi-transparent body

                // Draw Trapezoid Body
                this.ctx.beginPath();
                this.ctx.moveTo(x - noteSize / 2, projectedY);
                this.ctx.lineTo(x + noteSize / 2, projectedY);
                this.ctx.lineTo(endX + endSize / 2, endProjectedY);
                this.ctx.lineTo(endX - endSize / 2, endProjectedY);
                this.ctx.closePath();
                this.ctx.fill();

                // Borders
                this.ctx.strokeStyle = style.border;
                this.ctx.lineWidth = 2 * scale;
                this.ctx.stroke(); // Stroke the body

                this.ctx.globalAlpha = 1.0;
            }

            // Note head - Hybrid Rendering (Sprite Preferred)
            if (noteImg) {
                const sheet = SPRITE_CONFIG.NOTE_SHEET;
                const spriteInfo = sheet.LANE_SPRITES[note.lane];
                const sw = sheet.SPRITE_WIDTH;
                const sh = sheet.SPRITE_HEIGHT;
                const sx = spriteInfo.col * sw;
                const sy = spriteInfo.row * sh;

                // Maintain aspect ratio
                const aspectRatio = sh / sw;
                const drawW = noteSize * 1.3; // Make sprite slightly larger to pop
                const drawH = drawW * aspectRatio;

                this.ctx.drawImage(noteImg, sx, sy, sw, sh, x - drawW / 2, projectedY - drawH / 2, drawW, drawH);
            } else {
                const style = SPRITE_CONFIG.NOTE_STYLES[note.lane];
                this.drawProceduralNote(this.ctx, x, projectedY, noteSize, style);
            }
        }

        // Judgment Line and Particles are handled in drawProceduralTrack to ensure correct layering
    }

    renderHUD() {
        // HP Bar
        this.uiRenderer.drawHPBar(this.state.hp);

        // Score
        this.uiRenderer.drawScore(Math.floor(this.state.score));

        // Combo
        this.uiRenderer.drawCombo(this.state.combo, this.state.comboAnimScale);

        // Progress
        if (this.player) {
            const progress = this.player.currentTime / this.player.duration;
            this.uiRenderer.drawProgressBar(progress);
            this.uiRenderer.drawTimeDisplay(this.player.currentTime, this.player.duration);
        }

        // Judgment
        this.uiRenderer.drawJudgment(this.state.judgmentText, this.state.judgmentAlpha);

        // Speed Display
        this.ctx.save();
        this.ctx.font = 'bold 20px "Outfit", sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'right';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(`SPEED: ${this.state.scrollSpeed.toFixed(1)} (F3/F4)`, this.state.canvasWidth - 20, this.state.canvasHeight - 30);
        this.ctx.restore();
    }

    // ==================== PROCEDURAL DRAWING ====================

    drawProceduralNote(ctx, x, y, size, style) {
        ctx.save();
        ctx.translate(x, y);

        // Gradient Fill
        const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
        grad.addColorStop(0, style.gradient[0]);
        grad.addColorStop(1, style.gradient[1]);
        ctx.fillStyle = grad;

        // Shadow/Glow
        ctx.shadowColor = style.border;
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;

        // Draw Shape
        ctx.beginPath();
        if (style.shape === 'HEART') {
            this.drawHeartPath(ctx, size);
        } else {
            this.drawStarPath(ctx, size);
        }
        ctx.fill();

        // Border
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = style.border;
        ctx.lineWidth = size * 0.08;
        ctx.stroke();

        // Inner Highlight (Gel Effect)
        ctx.save();
        ctx.clip(); // Clip to the shape

        ctx.beginPath();
        if (style.shape === 'HEART') {
            // Heart highlight curve
            ctx.ellipse(0, -size * 0.25, size * 0.3, size * 0.15, 0, 0, Math.PI * 2);
        } else {
            // Star highlight
            ctx.ellipse(0, -size * 0.2, size * 0.2, size * 0.2, 0, 0, Math.PI * 2);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    // Improved Plump Heart Shape
    drawHeartPath(ctx, size) {
        const w = size;
        const h = size;
        ctx.beginPath();
        // Plumper, rounder heart
        ctx.moveTo(0, h * 0.3);
        ctx.bezierCurveTo(w / 2, -h * 0.3, w, h * 0.45, 0, h);
        ctx.bezierCurveTo(-w, h * 0.45, -w / 2, -h * 0.3, 0, h * 0.3);
        ctx.closePath();
    }

    drawStarPath(ctx, size) {
        const R = size * 0.5; // Outer radius
        const r = size * 0.25; // Inner radius
        const spikes = 5;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = (i % 2 === 0) ? R : r;
            const angle = (Math.PI / spikes) * i - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.lineJoin = 'round'; // Soften spikes
    }

    // ==================== PROCEDURAL TRACK RENDERING (Rainbow Style) ====================

    drawProceduralTrack() {
        const { canvasWidth, canvasHeight } = this.state;
        const { horizonY, hitLineY } = this.cache;
        const canvasCenterX = canvasWidth / 2;
        const styles = SPRITE_CONFIG.LANE_STYLES;
        const noteStyles = SPRITE_CONFIG.NOTE_STYLES;

        // Perspective Setup
        const laneCount = CONFIG.NOTES.LANES;
        const bottomWidth = canvasWidth * 0.9;
        const topWidth = canvasWidth * 0.15;
        const totalHeight = canvasHeight;

        const getX = (laneIndex, yRatio) => {
            const w = topWidth + (bottomWidth - topWidth) * yRatio;
            const xOffset = (laneIndex - laneCount / 2) * (w / laneCount);
            return canvasCenterX + xOffset;
        };

        const yTop = horizonY;
        const yBottom = totalHeight;

        // 1. Dark Space Background (Global)
        const bgGrad = this.ctx.createLinearGradient(0, yTop, 0, yBottom);
        bgGrad.addColorStop(0, styles.BACKGROUND_GRADIENT[0]);
        bgGrad.addColorStop(1, styles.BACKGROUND_GRADIENT[1]);
        this.ctx.fillStyle = bgGrad;

        // Full Track Trapezoid
        this.ctx.beginPath();
        this.ctx.moveTo(getX(0, 0), yTop);
        this.ctx.lineTo(getX(laneCount, 0), yTop);
        this.ctx.lineTo(getX(laneCount, 1), yBottom);
        this.ctx.lineTo(getX(0, 1), yBottom);
        this.ctx.fill();

        // 2. Individual Lane Beams (Rainbow Road)
        this.ctx.globalCompositeOperation = 'screen'; // Make it glowy

        for (let i = 0; i < laneCount; i++) {
            // Beam Gradient (Top Color -> Lane Color)
            // Use NOTE_STYLES gradient for beams
            const laneColor = noteStyles[i].gradient;

            // Interaction State
            const isPressed = this.state.keyPressed[i];
            const flash = this.state.laneHitFlash[i];

            // Base Opacity (Always visible slightly) + Active Opacity
            let opacity = 0.15;
            if (isPressed) opacity = 0.8;
            else if (flash > 0) opacity = 0.15 + (flash / 150) * 0.6;

            if (opacity > 0.01) {
                const beamGrad = this.ctx.createLinearGradient(0, yTop, 0, yBottom);
                beamGrad.addColorStop(0, laneColor[0]);   // Beam Top Color
                beamGrad.addColorStop(0.5, laneColor[1]); // Mid
                beamGrad.addColorStop(1, 'rgba(0,0,0,0)'); // Fade at bottom (or near bar)

                this.ctx.globalAlpha = opacity;
                this.ctx.fillStyle = beamGrad;

                this.ctx.beginPath();
                this.ctx.moveTo(getX(i, 0), yTop);
                this.ctx.lineTo(getX(i + 1, 0), yTop);
                this.ctx.lineTo(getX(i + 1, 1), yBottom);
                this.ctx.lineTo(getX(i, 1), yBottom);
                this.ctx.fill();

                // Sparkles (Active only)
                if ((isPressed || flash > 0) && Math.random() < 0.3) {
                    this.createSparkle(i, getX(i + 0.5, 1), yBottom);
                }
            }
        }
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;

        // 3. Lane Dividers
        this.ctx.strokeStyle = styles.DIVIDER_COLOR;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 1; i < laneCount; i++) {
            this.ctx.moveTo(getX(i, 0), yTop);
            this.ctx.lineTo(getX(i, 1), yBottom);
        }
        this.ctx.stroke();

        // 4. Side Borders (Neon)
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = styles.BORDER_GLOW;
        this.ctx.strokeStyle = styles.BORDER_COLOR;
        this.ctx.lineWidth = styles.BORDER_WIDTH;
        this.ctx.beginPath();
        // Left
        this.ctx.moveTo(getX(0, 0), yTop);
        this.ctx.lineTo(getX(0, 1), yBottom);
        // Right
        this.ctx.moveTo(getX(laneCount, 0), yTop);
        this.ctx.lineTo(getX(laneCount, 1), yBottom);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // 5. Judgment Bar (Glossy Glass)
        const jY = hitLineY;
        const jLeft = getX(0, (jY - horizonY) / (yBottom - horizonY));
        const jRight = getX(laneCount, (jY - horizonY) / (yBottom - horizonY));
        const barHeight = styles.JUDGMENT_LINE_HEIGHT;

        // Glowy Background for Bar
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';

        // Gradient Bar
        const barGrad = this.ctx.createLinearGradient(jLeft, 0, jRight, 0);
        // Match lane colors across the bar
        barGrad.addColorStop(0.12, noteStyles[0].glow);
        barGrad.addColorStop(0.37, noteStyles[1].glow);
        barGrad.addColorStop(0.62, noteStyles[2].glow);
        barGrad.addColorStop(0.87, noteStyles[3].glow);

        this.ctx.fillStyle = barGrad;
        this.ctx.globalAlpha = 0.3; // Semi-transparent
        this.ctx.beginPath();
        this.ctx.roundRect(jLeft - 10, jY - barHeight / 2, (jRight - jLeft) + 20, barHeight, 10);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;

        // White Border for Bar
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 6. Judgment Icons (Jelly Hearts)
        const laneWidthAtHit = (jRight - jLeft) / laneCount;
        for (let i = 0; i < laneCount; i++) {
            const laneInfo = styles.JUDGMENT_ICONS[i];
            const px = jLeft + laneWidthAtHit * i + laneWidthAtHit / 2;
            const py = jY;
            const iconSize = laneWidthAtHit * 0.9 * (styles.ICON_SCALE || 1.2);
            const laneStyle = noteStyles[i];

            this.ctx.save();
            this.ctx.translate(px, py);

            // Press Animation
            if (this.state.keyPressed[i]) {
                this.ctx.scale(0.9, 0.9);
                this.ctx.shadowColor = laneInfo.color;
                this.ctx.shadowBlur = 25;
            } else {
                this.ctx.shadowColor = laneInfo.color;
                this.ctx.shadowBlur = 10;
            }

            // Body Gradient (Vertical)
            const iconGrad = this.ctx.createLinearGradient(0, -iconSize / 2, 0, iconSize / 2);
            iconGrad.addColorStop(0, laneStyle.gradient[0]);
            iconGrad.addColorStop(1, laneStyle.gradient[1]);
            this.ctx.fillStyle = iconGrad;

            if (laneInfo.shape === 'HEART') {
                this.drawHeartPath(this.ctx, iconSize);
            }
            this.ctx.fill();

            // Jelly Highlight (Top Left Ellipse)
            this.ctx.globalCompositeOperation = 'source-atop';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.ellipse(-iconSize * 0.2, -iconSize * 0.2, iconSize * 0.25, iconSize * 0.15, -0.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Rim Light (Bottom Right)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(iconSize * 0.2, iconSize * 0.2, iconSize * 0.2, iconSize * 0.1, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Stroke
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            if (laneInfo.shape === 'HEART') {
                this.drawHeartPath(this.ctx, iconSize);
            }
            this.ctx.stroke();

            this.ctx.restore();
        }

        // 7. Update Particles
        this.updateAndDrawParticles();
    }

    createSparkle(lane, startX, startY) {
        if (this.cache.activeParticles.length > 300) return; // Limit count

        const pool = this.cache.particlePool;
        let p = pool.length > 0 ? pool.pop() : { x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '' };

        p.x = startX + (Math.random() - 0.5) * 40; // Random spread
        p.y = startY;
        p.vx = (Math.random() - 0.5) * 2;
        p.vy = -(Math.random() * 5 + 5); // Rise up fast
        p.life = 1.0;
        p.color = SPRITE_CONFIG.LANE_STYLES.SPARKLE_COLOR;

        this.cache.activeParticles.push(p);
    }

    updateAndDrawParticles() {
        // Use additive blending for sparkles
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.fillStyle = '#FFFFFF';

        for (let i = this.cache.activeParticles.length - 1; i >= 0; i--) {
            const p = this.cache.activeParticles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;

            if (p.life <= 0) {
                this.cache.activeParticles.splice(i, 1);
                this.cache.particlePool.push(p); // Return to pool
                continue;
            }

            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, Math.random() * 3 + 1, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
    }
}

// Start Engine
new GameEngine();
