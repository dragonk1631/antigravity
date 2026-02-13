import AudioScheduler from '../systems/AudioScheduler.js';

export default class MetronomeTestScene extends Phaser.Scene {
    constructor() {
        super('MetronomeTestScene');
    }

    create() {
        this.add.text(this.scale.width / 2, 50, 'METRONOME TEST (2:3)', { fontSize: '32px' }).setOrigin(0.5);
        this.statusText = this.add.text(this.scale.width / 2, 100, 'Press SPACE or TOUCH to Start', { fontSize: '20px', color: '#aaaaaa' }).setOrigin(0.5);

        this.debugText = this.add.text(50, 200, '', { fontSize: '16px', fontFamily: 'monospace' });

        this.backBtn = this.add.text(50, 50, '< BACK', { fontSize: '24px', backgroundColor: '#333', padding: 10 }).setInteractive().on('pointerdown', () => {
            this.stopMetronome();
            this.scene.start('Menu');
        });

        this.ctx = this.sound.context;
        this.scheduler = null;
        this.isPlaying = false;

        // Polyrhythm Params (120 BPM)
        this.bpm = 120;
        this.barDuration = (60 / this.bpm) * 4; // 2 seconds

        this.intervalLeft = this.barDuration / 2; // 1.0s
        this.intervalRight = this.barDuration / 3; // 0.666s

        this.nextLeftTime = 0;
        this.nextRightTime = 0;

        this.leftCount = 0;
        this.rightCount = 0;

        // Visual Feedback
        this.leftBox = this.add.rectangle(this.scale.width * 0.3, this.scale.height / 2, 100, 100, 0xff0000);
        this.rightBox = this.add.rectangle(this.scale.width * 0.7, this.scale.height / 2, 100, 100, 0x0000ff);

        // Inputs
        this.input.on('pointerdown', () => this.toggle());
        this.input.keyboard.on('keydown-SPACE', () => this.toggle());
    }

    toggle() {
        if (this.isPlaying) {
            this.stopMetronome();
        } else {
            this.startMetronome();
        }
    }

    startMetronome() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.isPlaying = true;
        this.statusText.setText('RUNNING...');

        // Reset timings
        const startTime = this.ctx.currentTime + 0.1;
        this.nextLeftTime = startTime;
        this.nextRightTime = startTime;
        this.leftCount = 0;
        this.rightCount = 0;

        this.scheduler = new AudioScheduler(this.ctx, (limit) => this.schedule(limit));
        this.scheduler.start();
    }

    stopMetronome() {
        this.isPlaying = false;
        this.statusText.setText('Stopped');
        if (this.scheduler) this.scheduler.stop();
    }

    schedule(limitTime) {
        // Schedule Left (2 beats)
        while (this.nextLeftTime < limitTime) {
            this.playTick(this.nextLeftTime, 'left');
            this.nextLeftTime += this.intervalLeft;
        }

        // Schedule Right (3 beats)
        while (this.nextRightTime < limitTime) {
            this.playTick(this.nextRightTime, 'right');
            this.nextRightTime += this.intervalRight;
        }
    }

    playTick(time, hand) {
        // Audio
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (hand === 'left') {
            osc.frequency.value = 440; // A4
            osc.type = 'square';
        } else {
            osc.frequency.value = 880; // A5
            osc.type = 'triangle';
        }

        osc.start(time);
        osc.stop(time + 0.05);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.05);

        // Schedule Visual Feedback (using setTimeout for approximation since we don't have a precise visual scheduler loop yet)
        // Ideally we check in update(), but for this test, let's just queue a visual update in the main loop to match
        this.time.addEvent({
            delay: (time - this.ctx.currentTime) * 1000,
            callback: () => {
                const target = hand === 'left' ? this.leftBox : this.rightBox;
                target.alpha = 1;
                this.tweens.add({ targets: target, alpha: 0.3, duration: 100 });

                if (hand === 'left') this.leftCount++;
                else this.rightCount++;
            }
        });
    }

    update() {
        if (this.isPlaying) {
            this.debugText.setText([
                `Audio Time: ${this.ctx.currentTime.toFixed(3)}`,
                `Next Left: ${this.nextLeftTime.toFixed(3)}`,
                `Next Right: ${this.nextRightTime.toFixed(3)}`,
                `Left Count: ${this.leftCount}`,
                `Right Count: ${this.rightCount}`
            ]);
        }
    }
}
