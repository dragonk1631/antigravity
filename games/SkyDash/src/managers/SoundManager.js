/**
 * SoundManager
 * 16마디 이상의 멜로디 시퀀싱과 메뉴/게임 전용 곡을 지원하는 고급 절차적 오디오 엔진
 */
class SoundManager {
    constructor(soundSystem) {
        this.sound = soundSystem;
        this.bgmNode = null;
        this.isMuted = false;
        this.initialized = false;
        this.currentMode = null; // 'menu' or 'game'
    }

    init() {
        if (this.initialized) return;
        const ctx = this.sound.context;
        if (ctx.state === 'suspended') ctx.resume();
        this.initialized = true;
    }

    playTone(freq, type = 'sine', duration = 0.1, vol = 0.5, pitch = 1.0) {
        if (this.isMuted || !this.initialized) return;
        const ctx = this.sound.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq * pitch, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    // 드럼 컴포넌트
    playKick() { this.playTone(150, 'sine', 0.3, 0.4); }
    playSnare() {
        const ctx = this.sound.context;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        noise.connect(gain); gain.connect(ctx.destination);
        noise.start();
    }

    /**
     * BGM 시작 (모드별 멜로디 시퀀싱)
     */
    startBGM(mode = 'menu') {
        if (this.bgmNode && this.currentMode === mode) return;
        this.stopBGM();
        this.init();
        this.currentMode = mode;

        const tempo = mode === 'menu' ? 100 : 140;
        const beatTime = 60 / tempo;
        let step = 0;

        // 멜로디 정의 (16마디 이상)
        const menuMelody = [
            261, 293, 329, 349, 392, 0, 392, 349, 329, 0, 261, 0,
            261, 293, 329, 349, 392, 440, 493, 523, 0, 493, 440, 392,
            349, 329, 293, 261, 196, 220, 246, 261, 0, 0, 0, 0
        ];
        const gameMelody = [
            392, 392, 440, 392, 523, 493, 0, 392, 392, 440, 392, 587, 523, 0,
            392, 392, 659, 523, 493, 440, 0, 698, 698, 659, 523, 587, 523, 0,
            392, 440, 523, 587, 659, 0, 523, 0, 392, 0, 261, 0
        ];
        const gameOverMelody = [
            196, 0, 164, 0, 147, 0, 130, 0, 123, 0, 0, 0,
            196, 0, 164, 0, 147, 0, 110, 0, 98, 0, 0, 0
        ];

        const loop = () => {
            if (!this.bgmNode) return;

            let mel;
            if (mode === 'menu') mel = menuMelody;
            else if (mode === 'game') mel = gameMelody;
            else mel = gameOverMelody;

            // 드럼 패턴
            if (mode !== 'gameOver') {
                if (step % 4 === 0) this.playKick();
                if (step % 4 === 2) this.playSnare();
            } else {
                // Game Over 시에는 심장 박동 같은 느린 킥만
                if (step % 8 === 0) this.playKick();
            }

            // 베이스/멜로디
            if (step % 2 === 0) {
                const note = mel[(step / 2) % mel.length];
                if (note > 0) {
                    this.playTone(note, mode === 'menu' ? 'sine' : 'sawtooth', 0.6, 0.03);
                    this.playTone(note / 2, 'triangle', 0.4, 0.06); // Bass
                }
            }

            step++;
            this.bgmNode = setTimeout(loop, beatTime * 250);
        };

        this.bgmNode = true;
        loop();
    }

    stopBGM() {
        if (this.bgmNode) {
            clearTimeout(this.bgmNode);
            this.bgmNode = null;
        }
    }

    playClimb(pitch = 1.0) { this.playTone(600, 'triangle', 0.1, 0.2, pitch); }
    playTurn() { this.playTone(300, 'square', 0.05, 0.15); }
    playFail() { this.playTone(100, 'sawtooth', 0.5, 0.3); }
    playClear() {
        const ctx = this.sound.context;
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            this.playTone(freq, 'sine', 0.4, 0.1, 1.0);
        });
    }
}
