
import { LEVELS } from '../data/levels.js';
import { COLORS, GAME_CONFIG } from '../consts.js';
import AudioScheduler from '../systems/AudioScheduler.js';
import InputManager from '../systems/InputManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import AdService from '../systems/AdService.js';

// UI Components
import HUD from '../ui/HUD.js';
import GeometricTrack from '../ui/GeometricTrack.js';
import TouchPads from '../ui/TouchPads.js';
import FeedbackOverlay from '../ui/FeedbackOverlay.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create(data) {
        // Init Data
        this.mode = data.mode || 'normal';
        this.playlist = data.playlist || [];
        this.cumulativeScore = data.score || 0;
        let levelId = data.levelId;
        if (this.mode === 'daily' && this.playlist.length > 0) {
            levelId = this.playlist[0];
        }
        this.levelData = LEVELS.find(l => l.id === levelId) || LEVELS[0];

        // Systems
        this.scoreManager = new ScoreManager();
        this.inputManager = new InputManager(this, (hand, timeMs) => this.handleInput(hand, timeMs));
        this.adService = new AdService(this);
        this.audioCtx = this.sound.context;

        // Health
        this.health = GAME_CONFIG.MAX_HEALTH;
        this.maxHealth = GAME_CONFIG.MAX_HEALTH;
        this.isRevived = false;

        this.startTime = 0;
        this.isPlaying = false;

        // Setup Components
        this.createLayout();

        // Audio Notes (Still needed for audio playback, but visual is procedural)
        this.notes = this.generateNotes(this.levelData);

        // Start Sequence
        this.startCountdown();
    }

    createLayout() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Background: Neon Grid & Stars
        this.add.rectangle(0, 0, w, h, 0x050510).setOrigin(0); // Deep dark blue/black

        // Simple Grid Effect using Graphics
        const grid = this.add.grid(w / 2, h / 2, w * 2, h * 2, 50, 50, 0x000000, 0, 0x222244, 0.2);
        grid.setRotation(Math.PI / 4); // Diamond grid? or just perspective? 
        // Let's do a simple perspective grid simulation or just moving grid
        this.tweens.add({
            targets: grid,
            y: h / 2 + 50,
            duration: 1000,
            repeat: -1
        });

        // Starfield
        const particles = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: w },
            y: { min: 0, max: h },
            quantity: 1,
            frequency: 100,
            lifespan: 2000,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.2, end: 0 },
            tint: 0xffffff,
            speedY: { min: 20, max: 50 } // Falling stars
        });

        // UI Components
        this.hud = new HUD(this, this.levelData);
        this.feedback = new FeedbackOverlay(this);

        // Input - TouchPads need InputManager reference
        this.touchPads = new TouchPads(this, this.inputManager);
        this.inputManager.setup();

        // Unlock Audio Context on first interaction
        const resumeAudio = () => {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        };
        this.input.on('pointerdown', resumeAudio);
        this.input.keyboard.on('keydown', resumeAudio);

        // Polyrhythm Setup
        // Link speed to BPM
        // Standard Bar = 4 beats
        const bpm = this.levelData.bpm || 100;
        const secondsPerBeat = 60 / bpm;
        const barDuration = secondsPerBeat * 4;

        // Visual Layout Adjustment
        const trackY = h * 0.35;
        const trackSize = w * 0.12;

        // Left Track (Triangle - 3 sides) - CYAN
        this.leftTrack = new GeometricTrack(
            this, w * 0.25, trackY, trackSize,
            3, // Triangle
            '#00FFFF', // Cyan
            barDuration
        );

        // Right Track (Square - 4 sides) - MAGENTA
        this.rightTrack = new GeometricTrack(
            this, w * 0.75, trackY, trackSize,
            4, // Square
            '#FF00FF', // Magenta
            barDuration
        );

        // Central Metronome
        this.metronomeVisual = this.add.circle(w / 2, trackY, 15, 0xffffff);
        this.metronomeVisual.setStrokeStyle(3, 0xffaa00);
        if (this.metronomeVisual.postFX) {
            this.metronomeVisual.postFX.addGlow(0xffaa00, 4, 1);
        }

        // Metronome State
        this.beatInterval = secondsPerBeat;
        this.lastBeatTime = 0;
        this.barDuration = barDuration; // Store for update logic

        // Debug
        this.isDebug = false;
        this.debugText = this.add.text(10, h - 100, '', { fontSize: '12px', color: '#0f0' }).setDepth(500).setVisible(false);
        this.input.keyboard.on('keydown-D', () => {
            this.isDebug = !this.isDebug;
            this.debugText.setVisible(this.isDebug);
        });
    }

    startCountdown() {
        let count = 3;
        const countText = this.add.text(this.scale.width / 2, this.scale.height * 0.2, '3', {
            fontSize: '96px',
            fontStyle: 'bold',
            color: '#fff'
        }).setOrigin(0.5).setDepth(200);

        this.time.addEvent({
            delay: 1000,
            repeat: 3,
            callback: () => {
                if (count > 0) {
                    countText.setText(String(count));
                    count--;
                    this.tweens.add({ targets: countText, scale: { from: 1.5, to: 1 }, alpha: { from: 1, to: 0.5 }, duration: 500 });
                } else {
                    countText.destroy();
                    this.startGame();
                }
            }
        });
    }

    startGame() {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        this.startTime = this.audioCtx.currentTime + 1.0;
        this.isPlaying = true;

        this.audioScheduler = new AudioScheduler(this.audioCtx, (lookAheadLimit) => {
            this.scheduleAudio(lookAheadLimit);
        });
        this.audioScheduler.start();
    }

    generateNotes(level) {
        const notes = [];
        const beatsPerBar = 4;
        const secondsPerBeat = 60 / level.bpm;
        const secondsPerBar = secondsPerBeat * beatsPerBar;
        const totalBars = Math.ceil(level.duration / secondsPerBar);

        for (let bar = 0; bar < totalBars; bar++) {
            const barStartTime = bar * secondsPerBar;
            // Left hand notes
            const leftCount = level.pattern.left;
            for (let i = 0; i < leftCount; i++) {
                // Determine normalized time in bar (0, 0.5 for 2) matches track logic
                notes.push({ time: barStartTime + (i * (secondsPerBar / leftCount)), hand: 'left' });
            }
            // Right hand notes
            const rightCount = level.pattern.right;
            for (let i = 0; i < rightCount; i++) {
                notes.push({ time: barStartTime + (i * (secondsPerBar / rightCount)), hand: 'right' });
            }
        }
        return notes.sort((a, b) => a.time - b.time);
    }

    scheduleAudio(limitTime) {
        if (!this.notes) return;

        // We use a separate index for audio scheduling to not mess with visuals
        if (typeof this.nextAudioIndex === 'undefined') this.nextAudioIndex = 0;

        while (this.nextAudioIndex < this.notes.length) {
            const note = this.notes[this.nextAudioIndex];
            const noteAbsTime = this.startTime + note.time;
            if (noteAbsTime < limitTime) {
                this.playTick(noteAbsTime, note.hand);
                this.nextAudioIndex++;
            } else {
                break;
            }
        }
    }

    playTick(time, hand) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.type = hand === 'left' ? 'square' : 'triangle';
        osc.frequency.value = hand === 'left' ? 300 : 600;
        osc.start(time);
        osc.stop(time + 0.05); // Short click
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    }

    playPolyrhythmTone(type) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        if (type === 'triangle') {
            // High Sine (880Hz)
            osc.type = 'sine';
            osc.frequency.value = 880;
        } else {
            // Low Square (440Hz)
            osc.type = 'square';
            osc.frequency.value = 440;
        }

        osc.start(now);
        osc.stop(now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    }

    playMetronomeTick() {
        // Debounce to prevent multiple triggers per frame/beat
        const now = this.audioCtx.currentTime;
        if (this.lastTickTime && now - this.lastTickTime < 0.1) return;
        this.lastTickTime = now;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'triangle'; // Woodblock-ish? Or simple beep
        osc.frequency.value = 1000;
        osc.start(now);
        osc.stop(now + 0.05);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    }

    update(time, delta) {
        if (!this.isPlaying) return;

        const currentGameTime = this.audioCtx.currentTime - this.startTime;
        if (currentGameTime > this.levelData.duration + 2) {
            // this.finishGame(true); 
        }

        if (this.health <= 0) {
            this.handleGameOver();
        }

        const leftHits = this.leftTrack.update(currentGameTime);
        if (leftHits && leftHits.length > 0) {
            this.playPolyrhythmTone('triangle');
            leftHits.forEach(idx => this.leftTrack.pulseVertex(idx));
            this.lastHitTime = currentGameTime;
        }

        const rightHits = this.rightTrack.update(currentGameTime);
        if (rightHits && rightHits.length > 0) {
            this.playPolyrhythmTone('square');
            rightHits.forEach(idx => this.rightTrack.pulseVertex(idx));
            this.lastHitTime = currentGameTime;
        }

        // Central Metronome Update
        const beatProgress = (currentGameTime % this.beatInterval) / this.beatInterval;
        // Pulse visual on beat start
        if (beatProgress < 0.1 && this.metronomeVisual.scale < 1.1) {
            this.metronomeVisual.setScale(1.5);
            this.playMetronomeTick(); // Audio
        } else {
            // Decay
            this.metronomeVisual.setScale(1.0 + (1.5 - 1.0) * (1 - beatProgress));
        }
        // Force clamp to avoid accumulation errors or stickiness
        if (beatProgress > 0.5) this.metronomeVisual.setScale(1.0);

        if (this.isDebug) {
            this.debugText.setText(
                `Time: ${currentGameTime.toFixed(2)}\n` +
                `FPS: ${(1000 / delta).toFixed(0)}\n` +
                `Audio: ${this.audioCtx.state}\n` +
                `Last Hit: ${this.lastHitTime ? this.lastHitTime.toFixed(2) : 'None'}`
            );
        }
    }

    handleInput(hand, timeMs) {
        if (!this.isPlaying) return;
        const currentGameTime = this.audioCtx.currentTime - this.startTime;
        this.touchPads.flash(hand);

        // Check Hit against Track
        const track = hand === 'left' ? this.leftTrack : this.rightTrack;
        const hitData = track.checkHit(currentGameTime);

        if (hitData) {
            const errorMs = hitData.diff * 1000;
            const result = this.scoreManager.judge(errorMs);

            if (result !== 'MISS') {
                // SUCCESS Feedback
                const type = hand === 'left' ? 'triangle' : 'square';
                this.playPolyrhythmTone(type); // Play Tone

                track.pulseVertex(hitData.vertexIndex); // Visual Burst

                this.feedback.showJudgement(result, errorMs);
                this.hud.updateScore(this.scoreManager.score);
                this.hud.updateCombo(this.scoreManager.combo);
                this.feedback.showComboBadge(this.scoreManager.combo);

                // Extra sparkles for Perfect
                if (result === 'PERFECT') {
                    // Handled by pulseVertex particles mostly, maybe add screen tint?
                }

                this.health += (result === 'PERFECT' ? 5 : 2);
            } else {
                // FAIL Feedback (Judgment said MISS/BAD)
                this.handleMiss();
            }
        } else {
            // Explicit Miss (Tapped empty space/time)
            this.handleMiss();
        }

        if (this.health > this.maxHealth) this.health = this.maxHealth;
        const healthPct = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        if (this.hud.healthBar) this.hud.healthBar.width = 300 * healthPct;
    }

    handleMiss() {
        this.scoreManager.resetCombo();
        this.hud.updateCombo(0);
        this.feedback.showJudgement('MISS', 0);
        this.health -= 10;

        this.playMissSound();
        this.cameras.main.shake(100, 0.01); // Screen Shake
        this.cameras.main.flash(50, 255, 0, 0); // Red Flash
    }

    playMissSound() {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.value = 150; // Low buzz
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.1);
    }

    handleGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.isPlaying = false;
        this.audioCtx.suspend();

        // Revive Check
        if (!this.isRevived) {
            // For MVP, simple confirm or Ad call
            const r = confirm("Game Over! Watch Ad to Revive?");
            if (r) {
                this.adService.showRewarded('Revive').then(() => {
                    this.revive();
                }).catch(() => {
                    this.finishGame(false);
                });
            } else {
                this.finishGame(false);
            }
        } else {
            this.finishGame(false);
        }
    }

    revive() {
        this.isRevived = true;
        this.isGameOver = false;
        this.health = this.maxHealth;

        // Skip 50% remaining
        const current = this.audioCtx.currentTime - this.startTime;
        const total = this.levelData.duration;
        const remaining = total - current;
        const skipAmount = remaining * 0.5;
        const newTime = current + skipAmount;

        // Reset Audio
        this.audioScheduler.stop();
        this.startTime = this.audioCtx.currentTime - newTime + 1.0;

        // Reset Visuals?
        // Geometric tracks are stateless except for currentTime passed in update.
        // So no need to reset "timeline".

        // Reset Indices
        this.nextAudioIndex = this.notes.findIndex(n => n.time >= newTime);
        if (this.nextAudioIndex === -1) this.nextAudioIndex = this.notes.length;

        setTimeout(() => {
            this.audioCtx.resume();
            this.audioScheduler.start();
            this.isPlaying = true;
        }, 1000);
    }

    togglePause() {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.audioCtx.suspend();
        } else {
            this.isPlaying = true;
            this.audioCtx.resume();
        }
    }

    finishGame(cleared) {
        this.isPlaying = false;
        if (this.audioScheduler) this.audioScheduler.stop();

        this.scene.start('Result', {
            levelId: this.levelData.id,
            score: this.scoreManager.score,
            maxCombo: this.scoreManager.maxCombo,
            stats: this.scoreManager.stats,
            accuracy: this.scoreManager.getAccuracy(),
            history: this.scoreManager.history,
            cleared: cleared && this.scoreManager.score > 0,
            mode: this.mode,
            playlist: (this.mode === 'daily' && this.playlist.length > 0) ? this.playlist.slice(1) : [],
            cumulativeScore: this.cumulativeScore + this.scoreManager.score
        });
    }
}
