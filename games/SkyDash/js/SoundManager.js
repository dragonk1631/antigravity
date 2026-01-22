// Sound Manager for SkyDash
// Handles all audio: background music, sound effects, and game jingles

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
            bass: [],
            drums: []
        };

        // Scheduler State
        this.noteIndexMelody = 0;
        this.noteIndexBass = 0;
        this.noteIndexChord = 0;
        this.noteIndexDrum = 0;
        this.timeMelody = 0;
        this.timeBass = 0;
        this.timeChord = 0;
        this.timeDrum = 0;

        this.currentMusicType = 'game';
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.composeGameMusic(); // 기본 게임 음악
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
        osc.type = 'square';

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // ADSR Envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.08, time + 0.05);
        gain.gain.setValueAtTime(0.08, time + duration - 0.02);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        // Vibrato
        const vib = this.ctx.createOscillator();
        const vibGain = this.ctx.createGain();
        vib.frequency.value = 5;
        vibGain.gain.value = 3;
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
        osc.type = 'triangle';

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
        osc.type = 'sawtooth';

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

    // --- Drum Synthesizers ---

    playKick(time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.05);
        osc.type = 'sine';

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playSnare(time) {
        if (!this.ctx) return;

        // Noise part
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;

        const noiseGain = this.ctx.createGain();
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noiseGain.gain.setValueAtTime(0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.start(time);
        noise.stop(time + 0.1);

        // Tone part
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.frequency.value = 200;
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        oscGain.gain.setValueAtTime(0.2, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        osc.start(time);
        osc.stop(time + 0.08);
    }

    playHihat(time) {
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.ctx.createGain();
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        noise.start(time);
        noise.stop(time + 0.05);
    }

    // --- Music Composition ---

    composeGameMusic() {
        const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
        const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77;
        const C6 = 1046.50;
        const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, B3 = 246.94;

        this.tempo = 140;

        // 16 Bar Melody
        this.sequencer.melody = [
            { Note: E5, Len: 1 }, { Note: D5, Len: 0.5 }, { Note: C5, Len: 0.5 }, { Note: D5, Len: 1 }, { Note: E5, Len: 1 },
            { Note: G5, Len: 2 }, { Note: E5, Len: 1 }, { Note: C5, Len: 1 },
            { Note: A5, Len: 1 }, { Note: G5, Len: 0.5 }, { Note: F5, Len: 0.5 }, { Note: G5, Len: 1 }, { Note: E5, Len: 1 },
            { Note: D5, Len: 3 }, { Note: null, Len: 1 },

            { Note: E5, Len: 1 }, { Note: D5, Len: 0.5 }, { Note: C5, Len: 0.5 }, { Note: D5, Len: 1 }, { Note: E5, Len: 1 },
            { Note: G5, Len: 1.5 }, { Note: A5, Len: 0.5 }, { Note: G5, Len: 2 },
            { Note: F5, Len: 1 }, { Note: E5, Len: 1 }, { Note: D5, Len: 1 }, { Note: C5, Len: 1 },
            { Note: C5, Len: 3 }, { Note: null, Len: 1 },

            { Note: G5, Len: 1 }, { Note: G5, Len: 1 }, { Note: A5, Len: 1 }, { Note: G5, Len: 1 },
            { Note: C6, Len: 2 }, { Note: G5, Len: 2 },
            { Note: F5, Len: 1 }, { Note: E5, Len: 1 }, { Note: F5, Len: 1 }, { Note: G5, Len: 1 },
            { Note: E5, Len: 3 }, { Note: null, Len: 1 },

            { Note: C5, Len: 1 }, { Note: E5, Len: 1 }, { Note: G5, Len: 1 }, { Note: C6, Len: 1 },
            { Note: B5, Len: 1.5 }, { Note: A5, Len: 0.5 }, { Note: G5, Len: 2 },
            { Note: A5, Len: 1 }, { Note: G5, Len: 1 }, { Note: F5, Len: 1 }, { Note: D5, Len: 1 },
            { Note: C5, Len: 4 }
        ];

        // Chords & Bass
        const loops = 4;
        for (let i = 0; i < loops; i++) {
            this.sequencer.chords.push({ notes: [C4, E4, G4], len: 4 });
            this.sequencer.bass.push({ note: C3, len: 1 });
            this.sequencer.bass.push({ note: C3, len: 1 });
            this.sequencer.bass.push({ note: G3, len: 1 });
            this.sequencer.bass.push({ note: C3, len: 1 });

            this.sequencer.chords.push({ notes: [G3, B3, D4], len: 4 });
            this.sequencer.bass.push({ note: G3, len: 1 });
            this.sequencer.bass.push({ note: G3, len: 1 });
            this.sequencer.bass.push({ note: D3, len: 1 });
            this.sequencer.bass.push({ note: G3, len: 1 });

            this.sequencer.chords.push({ notes: [A3, C4, E4], len: 4 });
            this.sequencer.bass.push({ note: A3, len: 1 });
            this.sequencer.bass.push({ note: A3, len: 1 });
            this.sequencer.bass.push({ note: E3, len: 1 });
            this.sequencer.bass.push({ note: A3, len: 1 });

            this.sequencer.chords.push({ notes: [F3, A3, C4], len: 4 });
            this.sequencer.bass.push({ note: F3, len: 1 });
            this.sequencer.bass.push({ note: F3, len: 1 });
            this.sequencer.bass.push({ note: C3, len: 1 });
            this.sequencer.bass.push({ note: F3, len: 1 });
        }

        // EDM 드럼 패턴 (4-on-the-floor)
        for (let bar = 0; bar < 16; bar++) {
            // 비트 1
            this.sequencer.drums.push({ type: 'kick', len: 0.5 });
            this.sequencer.drums.push({ type: 'hihat', len: 0.5 });
            // 비트 2 (스네어)
            this.sequencer.drums.push({ type: 'kick', len: 0.25 });
            this.sequencer.drums.push({ type: 'snare', len: 0.25 });
            this.sequencer.drums.push({ type: 'hihat', len: 0.5 });
            // 비트 3
            this.sequencer.drums.push({ type: 'kick', len: 0.5 });
            this.sequencer.drums.push({ type: 'hihat', len: 0.5 });
            // 비트 4 (스네어)
            this.sequencer.drums.push({ type: 'kick', len: 0.25 });
            this.sequencer.drums.push({ type: 'snare', len: 0.25 });
            this.sequencer.drums.push({ type: 'hihat', len: 0.5 });
        }
    }

    composeLobbyMusic() {
        const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00;
        const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99;
        const C3 = 130.81, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00;

        this.tempo = 120;

        // 8마디 로비 음악
        this.sequencer.melody = [
            { Note: C5, Len: 2 }, { Note: E5, Len: 1 }, { Note: G5, Len: 1 },
            { Note: F5, Len: 2 }, { Note: E5, Len: 1 }, { Note: D5, Len: 1 },
            { Note: E5, Len: 2 }, { Note: C5, Len: 2 },
            { Note: D5, Len: 3 }, { Note: null, Len: 1 },

            { Note: C5, Len: 2 }, { Note: E5, Len: 1 }, { Note: G5, Len: 1 },
            { Note: A4, Len: 2 }, { Note: G4, Len: 1 }, { Note: F4, Len: 1 },
            { Note: G4, Len: 2 }, { Note: E5, Len: 1.5 }, { Note: D5, Len: 0.5 },
            { Note: C5, Len: 4 }
        ];

        for (let i = 0; i < 2; i++) {
            this.sequencer.chords.push({ notes: [C4, E4, G4], len: 4 });
            this.sequencer.chords.push({ notes: [G3, D4, G4], len: 4 });
            this.sequencer.chords.push({ notes: [A3, C4, E4], len: 4 });
            this.sequencer.chords.push({ notes: [F3, A3, C4], len: 4 });
        }

        for (let i = 0; i < 2; i++) {
            this.sequencer.bass.push({ note: C3, len: 4 });
            this.sequencer.bass.push({ note: G3, len: 4 });
            this.sequencer.bass.push({ note: A3, len: 4 });
            this.sequencer.bass.push({ note: F3, len: 4 });
        }

        // 로비 드럼 (차분)
        for (let bar = 0; bar < 8; bar++) {
            this.sequencer.drums.push({ type: 'kick', len: 1 });
            this.sequencer.drums.push({ type: 'snare', len: 1 });
            this.sequencer.drums.push({ type: 'kick', len: 1 });
            this.sequencer.drums.push({ type: 'snare', len: 1 });
        }
    }

    startBGM(type = 'game') {
        this.init();

        // 음악 타입이 바뀌거나 비어있으면 재작곡
        if (type !== this.currentMusicType || this.sequencer.melody.length === 0) {
            this.stopBGM();
            this.currentMusicType = type;
            this.sequencer = { melody: [], chords: [], bass: [], drums: [] };

            if (type === 'lobby') {
                this.composeLobbyMusic();
            } else {
                this.composeGameMusic();
            }
        }

        if (!this.ctx || this.isPlaying) return;
        this.isPlaying = true;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.noteIndexMelody = 0;
        this.noteIndexBass = 0;
        this.noteIndexChord = 0;
        this.noteIndexDrum = 0;

        const startTime = this.ctx.currentTime + 0.1;
        this.timeMelody = startTime;
        this.timeBass = startTime;
        this.timeChord = startTime;
        this.timeDrum = startTime;

        this.tick();
    }

    tick() {
        if (!this.isPlaying) return;

        const secondsPerBeat = 60.0 / this.tempo;

        const schedule = (indexKey, timeKey, track, type) => {
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
                } else if (type === 'drum') {
                    const drumType = event.type;
                    if (drumType === 'kick') {
                        this.playKick(this[timeKey]);
                    } else if (drumType === 'snare') {
                        this.playSnare(this[timeKey]);
                    } else if (drumType === 'hihat') {
                        this.playHihat(this[timeKey]);
                    }
                }

                this[timeKey] += durationSeconds;
                this[indexKey]++;
            }
        };

        schedule('noteIndexMelody', 'timeMelody', this.sequencer.melody, 'melody');
        schedule('noteIndexBass', 'timeBass', this.sequencer.bass, 'bass');
        schedule('noteIndexChord', 'timeChord', this.sequencer.chords, 'chord');
        schedule('noteIndexDrum', 'timeDrum', this.sequencer.drums, 'drum');

        if (this.isPlaying) {
            this.timerID = setTimeout(() => this.tick(), this.lookahead);
        }
    }

    stopBGM() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    // 게임 오버 징글
    playGameOverJingle() {
        if (!this.ctx) return;

        const notes = [523.25, 440, 349.23, 261.63]; // C5 -> A4 -> F4 -> C4
        notes.forEach((freq, i) => {
            const time = this.ctx.currentTime + i * 0.15;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.value = freq;
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

            osc.start(time);
            osc.stop(time + 0.4);
        });
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
