class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Lower volume safety
        this.masterGain.connect(this.ctx.destination);
        this.bgmOscs = [];
        this.isPlayingBGM = false;

        // Unlock audio context on first interaction
        window.addEventListener('mousedown', () => this.resume(), { once: true });
        window.addEventListener('touchstart', () => this.resume(), { once: true });
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.isPlayingBGM) {
            // this.playBGM(); // Auto-start BGM? Maybe let user trigger or start on Game
        }
    }

    playTone(freq, type, duration, startTime = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playSwap() {
        this.playTone(400, 'sine', 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.1), 50);
    }

    playMatch() {
        // Happy chord
        this.playTone(523.25, 'triangle', 0.3, 0); // C5
        this.playTone(659.25, 'triangle', 0.3, 0.05); // E5
        this.playTone(783.99, 'triangle', 0.3, 0.1); // G5
    }

    playPop() {
        this.playTone(800 + Math.random() * 200, 'square', 0.1);
    }

    playInvalid() {
        this.playTone(150, 'sawtooth', 0.2);
    }

    playBGM() {
        if (this.isPlayingBGM) return;
        this.isPlayingBGM = true;

        // Simple loop
        const noteLength = 0.25;
        const sequence = [
            523.25, 659.25, 783.99, 1046.50, // C E G C
            783.99, 659.25, 523.25, 392.00,  // G E C G
            440.00, 523.25, 659.25, 880.00,  // A C E A
            783.99, 659.25, 587.33, 523.25   // G E D C
        ];

        let noteIndex = 0;

        const playNextNote = () => {
            if (!this.isPlayingBGM) return;
            const freq = sequence[noteIndex];

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + noteLength);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + noteLength);

            noteIndex = (noteIndex + 1) % sequence.length;

            setTimeout(playNextNote, noteLength * 1000);
        };

        playNextNote();
    }

    stopBGM() {
        this.isPlayingBGM = false;
    }
}
