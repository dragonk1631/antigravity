// Particle System for Visual Effects
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10, type = 'burst') {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 100 + Math.random() * 200;

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (type === 'burst' ? 100 : 0),
                life: 1.0,
                decay: 1.5 + Math.random(),
                size: 4 + Math.random() * 8,
                color,
                type
            });
        }
    }

    emitTrail(x, y, color) {
        this.particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + Math.random() * 10,
            vx: (Math.random() - 0.5) * 30,
            vy: Math.random() * 20,
            life: 1.0,
            decay: 3,
            size: 3 + Math.random() * 4,
            color,
            type: 'trail'
        });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt; // Gravity
            p.life -= p.decay * dt;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;

            // Glow effect
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.size * 2;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Procedural Background with Noise
class ProceduralBackground {
    constructor() {
        this.noiseCanvas = document.createElement('canvas');
        this.noiseCanvas.width = 128;
        this.noiseCanvas.height = 128;
        this.generateNoise();

        this.cloudOffset = 0;
    }

    generateNoise() {
        const ctx = this.noiseCanvas.getContext('2d');
        const imageData = ctx.createImageData(128, 128);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const value = Math.random() * 255;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
            data[i + 3] = 30; // Low alpha for subtle effect
        }

        ctx.putImageData(imageData, 0, 0);
    }

    draw(ctx, width, height, bgColor, cameraY, time) {
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, this.adjustBrightness(bgColor, -30));
        gradient.addColorStop(0.5, bgColor);
        gradient.addColorStop(1, this.adjustBrightness(bgColor, 30));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Animated noise overlay
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.globalCompositeOperation = 'overlay';
        const pattern = ctx.createPattern(this.noiseCanvas, 'repeat');
        ctx.fillStyle = pattern;
        ctx.translate(Math.sin(time) * 10, cameraY * 0.1);
        ctx.fillRect(-100, -100, width + 200, height + 200);
        ctx.restore();

        // Procedural clouds
        this.drawClouds(ctx, width, height, cameraY, time);

        // Stars
        this.drawStars(ctx, width, height, cameraY, time);
    }

    drawClouds(ctx, width, height, cameraY, time) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = 'white';

        for (let i = 0; i < 5; i++) {
            const x = ((i * 173 + time * 10) % (width + 200)) - 100;
            const y = ((i * 97 - cameraY * 0.1) % (height + 100)) - 50;

            // Cloud shape using multiple circles
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.arc(x + 50, y - 10, 50, 0, Math.PI * 2);
            ctx.arc(x + 100, y + 5, 35, 0, Math.PI * 2);
            ctx.arc(x + 30, y + 20, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawStars(ctx, width, height, cameraY, time) {
        ctx.save();

        for (let i = 0; i < 30; i++) {
            const x = (i * 137) % width;
            const y = ((i * 89 - cameraY * 0.05) % height + height) % height;
            const twinkle = Math.sin(time * 3 + i) * 0.5 + 0.5;

            ctx.globalAlpha = 0.3 + twinkle * 0.4;
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 5;

            ctx.beginPath();
            ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    adjustBrightness(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }
}

// Sound Manager using Web Audio API
// Sound Manager using Web Audio API
// Sound Manager using Web Audio API
class SoundManager {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.tempo = 140;
        this.timerID = null;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // sec

        // Music Data
        this.sequencer = {
            melody: [],
            chords: [],
            bass: []
        };

        // Scheduler State
        this.noteIndexMelody = 0;
        this.noteIndexBass = 0;
        this.noteIndexChord = 0;
        this.timeMelody = 0;
        this.timeBass = 0;
        this.timeChord = 0;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.composeMusic();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- Instruments ---

    playMelodyNote(note, time, duration) {
        if (!note) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.value = note;
        osc.type = 'square'; // Chiptuneish lead

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // ADSR Envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.02); // Attack
        gain.gain.exponentialRampToValueAtTime(0.08, time + 0.05); // Decay
        gain.gain.setValueAtTime(0.08, time + duration - 0.02); // Sustain
        gain.gain.linearRampToValueAtTime(0, time + duration); // Release

        // Vibrato
        const vib = this.ctx.createOscillator();
        const vibGain = this.ctx.createGain();
        vib.frequency.value = 5; // 5Hz vibrato
        vibGain.gain.value = 3; // depth
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);
        vib.start(time);
        vib.stop(time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }

    playChordNote(note, time, duration) {
        if (!note) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.value = note;
        osc.type = 'triangle'; // Softer backing

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.05, time + 0.1);
        gain.gain.setValueAtTime(0.05, time + duration - 0.1);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }

    playBassNote(note, time, duration) {
        if (!note) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.value = note;
        osc.type = 'sawtooth'; // Punchy bass

        // Lowpass filter for bass
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 800;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.1, time + 0.1);
        gain.gain.setValueAtTime(0.1, time + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.start(time);
        osc.stop(time + duration);
    }

    // --- Sequencer ---

    composeMusic() {
        const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
        const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77;
        const C6 = 1046.50;
        const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, B3 = 246.94;

        // 16 Bar Melody Loop (Simple layout)
        // Bars 1-4
        this.sequencer.melody = [
            // Bar 1
            { Note: E5, Len: 1 }, { Note: D5, Len: 0.5 }, { Note: C5, Len: 0.5 }, { Note: D5, Len: 1 }, { Note: E5, Len: 1 },
            // Bar 2
            { Note: G5, Len: 2 }, { Note: E5, Len: 1 }, { Note: C5, Len: 1 },
            // Bar 3
            { Note: A5, Len: 1 }, { Note: G5, Len: 0.5 }, { Note: F5, Len: 0.5 }, { Note: G5, Len: 1 }, { Note: E5, Len: 1 },
            // Bar 4
            { Note: D5, Len: 3 }, { Note: null, Len: 1 }, // Rest

            // Bar 5-8 (Variation)
            { Note: E5, Len: 1 }, { Note: D5, Len: 0.5 }, { Note: C5, Len: 0.5 }, { Note: D5, Len: 1 }, { Note: E5, Len: 1 },
            { Note: G5, Len: 1.5 }, { Note: A5, Len: 0.5 }, { Note: G5, Len: 2 },
            { Note: F5, Len: 1 }, { Note: E5, Len: 1 }, { Note: D5, Len: 1 }, { Note: C5, Len: 1 },
            { Note: C5, Len: 3 }, { Note: null, Len: 1 },

            // Bar 9-12 (Higher energy)
            { Note: G5, Len: 1 }, { Note: G5, Len: 1 }, { Note: A5, Len: 1 }, { Note: G5, Len: 1 },
            { Note: C6, Len: 2 }, { Note: G5, Len: 2 },
            { Note: F5, Len: 1 }, { Note: E5, Len: 1 }, { Note: F5, Len: 1 }, { Note: G5, Len: 1 },
            { Note: E5, Len: 3 }, { Note: null, Len: 1 },

            // Bar 13-16 (Resolution)
            { Note: C5, Len: 1 }, { Note: E5, Len: 1 }, { Note: G5, Len: 1 }, { Note: C6, Len: 1 },
            { Note: B5, Len: 1.5 }, { Note: A5, Len: 0.5 }, { Note: G5, Len: 2 },
            { Note: A5, Len: 1 }, { Note: G5, Len: 1 }, { Note: F5, Len: 1 }, { Note: D5, Len: 1 },
            { Note: C5, Len: 4 }
        ];

        // Simple Chord Progression: C - G - Am - F (Standard Pop)
        // 4 beats per bar
        const loops = 4; // Repeat progression 4 times for 16 bars total
        for (let i = 0; i < loops; i++) {
            // C Major
            this.sequencer.chords.push({ notes: [C4, E4, G4], len: 4 });
            this.sequencer.bass.push({ note: C3, len: 1 });
            this.sequencer.bass.push({ note: C3, len: 1 });
            this.sequencer.bass.push({ note: G3, len: 1 });
            this.sequencer.bass.push({ note: C3, len: 1 });

            // G Major
            this.sequencer.chords.push({ notes: [G3, B3, D4], len: 4 });
            this.sequencer.bass.push({ note: G3, len: 1 });
            this.sequencer.bass.push({ note: G3, len: 1 });
            this.sequencer.bass.push({ note: D3, len: 1 });
            this.sequencer.bass.push({ note: G3, len: 1 });

            // A Minor
            this.sequencer.chords.push({ notes: [A3, C4, E4], len: 4 });
            this.sequencer.bass.push({ note: A3, len: 1 });
            this.sequencer.bass.push({ note: A3, len: 1 });
            this.sequencer.bass.push({ note: E3, len: 1 });
            this.sequencer.bass.push({ note: A3, len: 1 });

            // F Major
            this.sequencer.chords.push({ notes: [F3, A3, C4], len: 4 });
            this.sequencer.bass.push({ note: F3, len: 1 });
            this.sequencer.bass.push({ note: F3, len: 1 });
            this.sequencer.bass.push({ note: C3, len: 1 });
            this.sequencer.bass.push({ note: F3, len: 1 });
        }
    }

    startBGM() {
        // Initialize audio context if not already done
        this.init();

        if (!this.ctx || this.isPlaying) return;
        this.isPlaying = true;

        // Ensure context is running (user interaction requirement)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Reset tracking variables
        this.noteIndexMelody = 0;
        this.noteIndexBass = 0;
        this.noteIndexChord = 0;

        const startTime = this.ctx.currentTime + 0.1;
        this.timeMelody = startTime;
        this.timeBass = startTime;
        this.timeChord = startTime;

        this.tick();
    }

    tick() {
        if (!this.isPlaying) return;

        const secondsPerBeat = 60.0 / this.tempo;

        const schedule = (indexKey, timeKey, track, type) => {
            // Schedule notes that need to play within the lookahead window
            while (this[timeKey] < this.ctx.currentTime + this.scheduleAheadTime) {
                if (track.length === 0) return;

                const event = track[this[indexKey] % track.length];

                let durationBeats = event.Len || event.len || 1;
                let note = event.Note || event.note;
                let notes = event.notes;

                const durationSeconds = durationBeats * secondsPerBeat;

                if (type === 'melody') {
                    this.playMelodyNote(note, this[timeKey], durationSeconds * 0.9);
                } else if (type === 'bass') {
                    this.playBassNote(note, this[timeKey], durationSeconds * 0.9);
                } else if (type === 'chord') {
                    if (notes) {
                        notes.forEach(n => this.playChordNote(n, this[timeKey], durationSeconds * 0.9));
                    }
                }

                this[timeKey] += durationSeconds;
                this[indexKey]++;
            }
        };

        schedule('noteIndexMelody', 'timeMelody', this.sequencer.melody, 'melody');
        schedule('noteIndexBass', 'timeBass', this.sequencer.bass, 'bass');
        schedule('noteIndexChord', 'timeChord', this.sequencer.chords, 'chord');

        if (this.isPlaying) {
            this.timerID = setTimeout(() => this.tick(), this.lookahead);
        }
    }

    stopBGM() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    // SFX
    playClimb() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.type = 'square';
        osc.start(t);
        osc.stop(t + 0.1);
    }

    playFail() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(40, t + 0.3);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);

        osc.type = 'sawtooth';
        osc.start(t);
        osc.stop(t + 0.3);
    }

    playClear() {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.05;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.frequency.value = freq;
            osc.type = 'triangle';

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

            osc.start(t);
            osc.stop(t + 1.5);
        });
    }
}

class Game {
    constructor(main, mode = 'infinite') {
        this.main = main;
        this.mode = mode;
        this.goalStairs = mode === '100' ? 100 : Infinity;

        this.sound = new SoundManager();
        this.particles = new ParticleSystem();
        this.background = new ProceduralBackground();

        this.time = 0;

        this.STEP_HEIGHT = 80;
        this.STEP_WIDTH = 100;

        this.reset();
    }

    reset() {
        this.score = 0;
        this.isGameOver = false;
        this.isCleared = false;
        this.elapsedTime = 0;

        this.fallY = 0;
        this.fallVelocity = 0;
        this.isFalling = false;
        this.fallRotation = 0;

        this.flashIntensity = 0;
        this.selectedButton = 0; // 0=Restart, 1=Menu

        this.maxEnergy = 100;
        this.energy = this.maxEnergy;
        this.energyDecay = 8;

        this.player = {
            gridX: 0,
            gridY: 0,
            dir: 1,
            animTimer: 0,
            state: 'IDLE',
            bounceY: 0
        };

        this.stairs = [];
        this.stairs.push({ x: 0, y: 0 });
        for (let i = 1; i < 15; i++) {
            this.addStair();
        }

        this.cameraY = 0;
        this.updateScore();
    }

    addStair() {
        const last = this.stairs[this.stairs.length - 1];

        if (this.stairs.length < 3) {
            this.stairs.push({ x: last.x + 1, y: last.y + 1 });
        } else {
            const prev = this.stairs[this.stairs.length - 2];
            const prevDir = last.x - prev.x;

            let nextX;
            if (Math.random() < 0.35) {
                nextX = last.x - prevDir;
            } else {
                nextX = last.x + prevDir;
            }

            if (prevDir === 0) nextX = last.x + 1;

            this.stairs.push({ x: nextX, y: last.y + 1 });
        }
    }

    handleInput(action, x, y) {
        this.sound.init();
        this.sound.resume();

        if (!this.sound.isPlaying && !this.isGameOver && !this.isFalling) {
            this.sound.startBGM();
        }

        // Block all input while falling
        if (this.isFalling) {
            return;
        }

        if (this.isGameOver) {
            // Keyboard navigation for game over screen
            if (action === 'TURN') { // Left arrow
                this.selectedButton = 0; // Restart
                return;
            }
            if (action === 'CLIMB') { // Right arrow
                this.selectedButton = 1; // Menu
                return;
            }
            if (action === 'SELECT') { // Enter key
                if (this.selectedButton === 0) {
                    this.reset();
                } else {
                    this.main.switchToLobby();
                }
                return;
            }

            // Mouse/touch click
            if (x !== undefined && y !== undefined) {
                if (x > 110 && x < 340 && y > 650 && y < 720) {
                    this.reset();
                    return;
                }
                if (x > 380 && x < 610 && y > 650 && y < 720) {
                    this.main.switchToLobby();
                    return;
                }
            }
            return;
        }

        if (this.isCleared) {
            this.main.switchToLobby();
            return;
        }

        if (action === 'TURN') {
            this.player.dir *= -1;
        }

        const nextGridX = this.player.gridX + this.player.dir;
        const nextGridY = this.player.gridY + 1;
        const targetStair = this.stairs[nextGridY];

        if (targetStair && targetStair.x === nextGridX) {
            this.player.gridX = nextGridX;
            this.player.gridY = nextGridY;
            this.score++;
            this.energy = Math.min(this.energy + 15, this.maxEnergy);
            this.generateNewStairs();

            this.player.state = 'MOVE';
            this.player.animTimer = 0.15;
            this.player.bounceY = -20;

            // Effects
            this.flashIntensity = 0.2;
            const settings = this.main.settings;
            this.particles.emit(360, 400, settings.stairColor || '#2ed573', 8);

            this.sound.playClimb();
            this.updateScore();

            if (this.score >= this.goalStairs) {
                this.isCleared = true;
                this.sound.stopBGM();
                this.sound.playClear();
                this.particles.emit(360, 400, '#ffd700', 30, 'burst');
            }
        } else {
            this.sound.playFail();
            this.triggerFall();
        }
    }

    triggerFall() {
        this.isFalling = true;
        this.fallY = 0;
        this.fallVelocity = 0;
        this.sound.stopBGM();
        this.particles.emit(360, 400, '#ff6b6b', 20, 'burst');
    }

    generateNewStairs() {
        while (this.stairs.length < this.player.gridY + 20) {
            this.addStair();
        }
    }

    update(dt) {
        this.time += dt;
        this.particles.update(dt);

        // Flash decay
        if (this.flashIntensity > 0) {
            this.flashIntensity -= dt * 3;
            if (this.flashIntensity < 0) this.flashIntensity = 0;
        }

        if (this.isCleared) return;

        if (this.isFalling) {
            this.fallVelocity += 2000 * dt;
            this.fallY += this.fallVelocity * dt;
            this.fallRotation += dt * 8;

            if (this.fallY > 500) {
                this.isGameOver = true;
                this.isFalling = false;
            }
            return;
        }

        if (this.isGameOver) return;

        this.elapsedTime += dt;

        this.energy -= this.energyDecay * dt;
        if (this.energy <= 0) {
            this.sound.playFail();
            this.triggerFall();
            return;
        }

        const targetCamY = this.player.gridY * this.STEP_HEIGHT;
        this.cameraY += (targetCamY - this.cameraY) * 8 * dt;

        if (this.player.animTimer > 0) {
            this.player.animTimer -= dt;
            if (this.player.animTimer <= 0) {
                this.player.state = 'IDLE';
            }
        }

        if (this.player.bounceY < 0) {
            this.player.bounceY += 150 * dt;
            if (this.player.bounceY > 0) this.player.bounceY = 0;
        }

        // Emit trail particles when moving
        if (this.player.state === 'MOVE') {
            this.particles.emitTrail(360, 450, 'rgba(255,255,255,0.5)');
        }
    }

    updateScore() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
            if (this.mode === 'infinite') {
                scoreEl.innerText = this.score;
            } else {
                scoreEl.innerText = `${this.score}/${this.goalStairs}`;
            }
        }
    }

    draw(ctx) {
        const settings = this.main.settings;
        const bgColor = settings.bgColor || '#1e3c72';

        // Procedural background
        this.background.draw(ctx, 720, 1280, bgColor, this.cameraY, this.time);

        const baseScreenY = 900;
        const centerX = 360;

        // Stairs
        this.stairs.forEach((s, index) => {
            const worldY = s.y * this.STEP_HEIGHT;
            const screenY = baseScreenY - (worldY - this.cameraY);

            if (screenY > -100 && screenY < 1400) {
                const camX = this.player.gridX * this.STEP_WIDTH;
                const finalX = centerX + (s.x * this.STEP_WIDTH) - camX;
                this.drawStair(ctx, finalX, screenY, index === this.player.gridY, settings);
            }
        });

        // Player
        const fallOffset = this.isFalling ? this.fallY : 0;
        const pScreenY = baseScreenY - (this.player.gridY * this.STEP_HEIGHT - this.cameraY) + this.player.bounceY + fallOffset;
        const isLeft = this.player.dir === -1;
        this.drawPlayer(ctx, centerX, pScreenY, isLeft, this.player.state, settings);

        // Particles
        this.particles.draw(ctx);

        // Energy Bar
        this.drawEnergyBar(ctx);

        // Timer
        if (this.mode !== 'infinite') {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'right';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 5;
            ctx.fillText(`⏱️ ${this.elapsedTime.toFixed(2)}s`, 700, 130);
            ctx.shadowBlur = 0;
        }

        // Flash effect
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, 720, 1280);
        }

        // Game Over
        if (this.isGameOver) {
            this.drawGameOver(ctx);
        }

        // Cleared
        if (this.isCleared) {
            this.drawCleared(ctx);
        }
    }

    drawStair(ctx, x, y, isCurrent, settings) {
        const width = 90;
        const height = 25;
        const stairColor = settings.stairColor || '#2ed573';

        ctx.save();

        // Glow for current stair
        if (isCurrent) {
            ctx.shadowColor = stairColor;
            ctx.shadowBlur = 20;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x - width / 2 + 5, y + 8, width, height);

        // Grass top with gradient
        const grassGrad = ctx.createLinearGradient(x - width / 2, y, x - width / 2, y + height / 2);
        grassGrad.addColorStop(0, isCurrent ? this.lightenColor(stairColor, 40) : stairColor);
        grassGrad.addColorStop(1, isCurrent ? stairColor : this.darkenColor(stairColor, 20));
        ctx.fillStyle = grassGrad;
        ctx.fillRect(x - width / 2, y, width, height / 2);

        // Dirt with gradient
        const dirtGrad = ctx.createLinearGradient(x - width / 2, y + height / 2, x - width / 2, y + height);
        dirtGrad.addColorStop(0, '#8B4513');
        dirtGrad.addColorStop(1, '#5D3A1A');
        ctx.fillStyle = dirtGrad;
        ctx.fillRect(x - width / 2, y + height / 2, width, height / 2);

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x - width / 2, y, width, 3);

        ctx.restore();
    }

    drawPlayer(ctx, x, y, isLeft, state, settings) {
        ctx.save();
        ctx.translate(x, y - 60);

        if (isLeft) ctx.scale(-1, 1);

        if (this.isFalling) {
            ctx.rotate(this.fallRotation);
        }

        const bounce = state === 'MOVE' ? Math.sin(this.time * 15) * 3 : Math.sin(this.time * 2) * 2;
        const bodyColor = settings.characterColor || '#f39c12';

        // Shadow under character
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 50, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = 12;

        // Head (larger, more proportional)
        ctx.fillStyle = '#ffe0bd';
        ctx.beginPath();
        ctx.arc(0, -35 + bounce, 22, 0, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f5d5a8';
        ctx.fillRect(-5, -15 + bounce, 10, 8);

        // Hair - bangs
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(-8, -45 + bounce, 12, 0.3, Math.PI);
        ctx.arc(0, -48 + bounce, 14, 0.2, Math.PI - 0.2);
        ctx.arc(8, -45 + bounce, 12, 0, Math.PI - 0.3);
        ctx.fill();

        // Hair - back/ponytail
        ctx.beginPath();
        ctx.moveTo(-5, -48 + bounce);
        ctx.quadraticCurveTo(-28, -35 + bounce, -26, -12 + bounce);
        ctx.quadraticCurveTo(-30, -5 + bounce, -28, 2 + bounce);
        ctx.quadraticCurveTo(-24, -8 + bounce, -20, -15 + bounce);
        ctx.quadraticCurveTo(-22, -30 + bounce, -5, -43 + bounce);
        ctx.fill();

        // Hair shine
        ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(-10, -42 + bounce, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = this.isFalling ? '#fff' : '#2c2c2c';
        ctx.beginPath();
        ctx.arc(-6, -37 + bounce, 3.5, 0, Math.PI * 2);
        ctx.arc(6, -37 + bounce, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupils
        if (!this.isFalling) {
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-6, -36 + bounce, 2, 0, Math.PI * 2);
            ctx.arc(6, -36 + bounce, 2, 0, Math.PI * 2);
            ctx.fill();

            // Eye highlights
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(-7, -38 + bounce, 1.5, 1.5);
            ctx.fillRect(5, -38 + bounce, 1.5, 1.5);
        } else {
            // Panic eyes
            ctx.fillStyle = '#333';
            ctx.fillRect(-8, -39 + bounce, 5, 5);
            ctx.fillRect(3, -39 + bounce, 5, 5);
        }

        // Mouth - smile or worried
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (this.isFalling) {
            ctx.arc(0, -28 + bounce, 6, 0.2, Math.PI - 0.2);
        } else {
            ctx.arc(0, -30 + bounce, 6, 0.2, Math.PI - 0.2, true);
        }
        ctx.stroke();

        // Body with gradient and details
        const bodyGrad = ctx.createLinearGradient(-14, -8 + bounce, -14, 25 + bounce);
        bodyGrad.addColorStop(0, this.lightenColor(bodyColor, 25));
        bodyGrad.addColorStop(0.5, bodyColor);
        bodyGrad.addColorStop(1, this.darkenColor(bodyColor, 10));
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-14, -8 + bounce, 28, 38);

        // Clothing detail - collar
        ctx.fillStyle = this.lightenColor(bodyColor, 35);
        ctx.beginPath();
        ctx.moveTo(-14, -8 + bounce);
        ctx.lineTo(-10, -2 + bounce);
        ctx.lineTo(0, -5 + bounce);
        ctx.lineTo(10, -2 + bounce);
        ctx.lineTo(14, -8 + bounce);
        ctx.closePath();
        ctx.fill();

        // Arms
        ctx.fillStyle = '#ffe0bd';
        const armSwing = state === 'MOVE' ? Math.sin(this.time * 15) * 5 : 0;

        // Left arm
        ctx.beginPath();
        ctx.arc(-14, 0 + bounce + armSwing, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-17, 0 + bounce + armSwing, 6, 20);

        // Left hand
        ctx.beginPath();
        ctx.arc(-14, 20 + bounce + armSwing, 5, 0, Math.PI * 2);
        ctx.fill();

        // Right arm
        ctx.beginPath();
        ctx.arc(14, 0 + bounce - armSwing, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(11, 0 + bounce - armSwing, 6, 20);

        // Right hand
        ctx.beginPath();
        ctx.arc(14, 20 + bounce - armSwing, 5, 0, Math.PI * 2);
        ctx.fill();

        // Legs with pants gradient
        const legGrad = ctx.createLinearGradient(0, 30, 0, 55);
        legGrad.addColorStop(0, '#3498db');
        legGrad.addColorStop(1, '#2980b9');
        ctx.fillStyle = legGrad;

        if (this.isFalling) {
            ctx.fillRect(-13, 30 + bounce, 9, 28);
            ctx.fillRect(4, 25 + bounce, 9, 33);
        } else if (state === 'MOVE') {
            ctx.fillRect(-11, 30 + bounce, 9, 27);
            ctx.fillRect(2, 27 + bounce, 9, 30);
        } else {
            ctx.fillRect(-11, 30 + bounce, 9, 27);
            ctx.fillRect(2, 30 + bounce, 9, 27);
        }

        // Shoes
        ctx.fillStyle = '#c0392b';
        if (this.isFalling) {
            ctx.fillRect(-15, 56 + bounce, 11, 6);
            ctx.fillRect(2, 56 + bounce, 11, 6);
        } else if (state === 'MOVE') {
            ctx.fillRect(-13, 55 + bounce, 11, 6);
            ctx.fillRect(0, 55 + bounce, 11, 6);
        } else {
            ctx.fillRect(-13, 55 + bounce, 11, 6);
            ctx.fillRect(0, 55 + bounce, 11, 6);
        }

        ctx.restore();

        // Direction Arrow with enhanced glow
        if (!this.isFalling && !this.isGameOver) {
            ctx.save();
            ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
            ctx.shadowBlur = 15;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            const arrowX = x + (isLeft ? -55 : 55);
            ctx.moveTo(arrowX, y - 15);
            ctx.lineTo(arrowX + (isLeft ? -22 : 22), y - 5);
            ctx.lineTo(arrowX, y + 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    drawEnergyBar(ctx) {
        const barWidth = 300;
        const barHeight = 20;
        const x = 360 - barWidth / 2;
        const y = 150;

        ctx.save();

        // Glow when low
        if (this.energy < 30) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20 * (1 - this.energy / 30);
        }

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 3, y - 3, barWidth + 6, barHeight + 6);

        // Energy gradient
        const energyPercent = this.energy / this.maxEnergy;
        const energyGrad = ctx.createLinearGradient(x, y, x + barWidth, y);
        if (energyPercent > 0.3) {
            energyGrad.addColorStop(0, '#2ecc71');
            energyGrad.addColorStop(1, '#27ae60');
        } else {
            energyGrad.addColorStop(0, '#e74c3c');
            energyGrad.addColorStop(1, '#c0392b');
        }
        ctx.fillStyle = energyGrad;
        ctx.fillRect(x, y, barWidth * energyPercent, barHeight);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        ctx.restore();
    }

    drawGameOver(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 720, 1280);

        ctx.save();
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 360, 450);
        ctx.restore();

        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.fillText(`Score: ${this.score}`, 360, 550);

        // Restart Button
        const restartSelected = this.selectedButton === 0;
        ctx.save();
        if (restartSelected) {
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 25;
        }
        ctx.fillStyle = restartSelected ? '#27ae60' : '#2ecc71';
        ctx.fillRect(110, 650, 230, 70);
        ctx.restore();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px Arial';
        ctx.fillText('🔄 Restart', 225, 695);

        // Menu Button
        const menuSelected = this.selectedButton === 1;
        ctx.save();
        if (menuSelected) {
            ctx.shadowColor = '#3498db';
            ctx.shadowBlur = 25;
        }
        ctx.fillStyle = menuSelected ? '#2980b9' : '#3498db';
        ctx.fillRect(380, 650, 230, 70);
        ctx.restore();

        ctx.fillStyle = 'white';
        ctx.fillText('🏠 Menu', 495, 695);

        // Keyboard hint
        ctx.fillStyle = '#aaa';
        ctx.font = '20px Arial';
        ctx.fillText('← → to select  |  Enter to confirm', 360, 770);
    }

    drawCleared(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 720, 1280);

        ctx.save();
        ctx.shadowColor = '#2ecc71';
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 CLEAR!', 360, 450);
        ctx.restore();

        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.fillText(`Time: ${this.elapsedTime.toFixed(2)}s`, 360, 550);

        ctx.fillStyle = '#ffd700';
        ctx.font = '36px Arial';
        ctx.fillText(`${this.goalStairs} Stairs Climbed!`, 360, 620);

        ctx.fillStyle = '#aaa';
        ctx.font = '28px Arial';
        ctx.fillText('Tap to return to Menu', 360, 720);
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    darkenColor(hex, percent) {
        return this.lightenColor(hex, -percent);
    }
}
