/**
 * MidiPlayer - SpessaSynth 기반 고품질 재생기
 */

// SpessaSynth 라이브러리는 CDN을 통해 import (main.js에서 처리하거나 여기서 직접)
const SPESSA_LIB_URL = 'https://esm.sh/spessasynth_lib@4.0.20';
const PROCESSOR_URL = 'https://esm.sh/spessasynth_lib@4.0.20/dist/spessasynth_processor.min.js';

export class MidiPlayer {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.synth = null;
        this.sequencer = null;
        this.isReady = false;
    }

    async init(soundFontUrl) {
        try {
            const { WorkletSynthesizer, Sequencer } = await import(SPESSA_LIB_URL);

            await this.ctx.audioWorklet.addModule(PROCESSOR_URL);

            // Enable high-quality audio settings
            this.synth = new WorkletSynthesizer(this.ctx, {
                // Enable reverb for spatial depth
                reverbEnabled: true,
                // Enable chorus for richer sound
                chorusEnabled: true,
                // Use high-quality interpolation
                interpolationType: 'linear', // or 'cubic' for even higher quality
                // Set high sample rate if supported
                sampleRate: this.ctx.sampleRate
            });

            this.synth.connect(this.ctx.destination);

            await this.synth.isReady;

            // SoundFont 로드
            console.log(`[MidiPlayer] Loading SoundFont from: ${soundFontUrl}`);
            const sfRes = await fetch(soundFontUrl);
            if (!sfRes.ok) throw new Error(`HTTP ${sfRes.status} while loading SoundFont`);

            const sfData = await sfRes.arrayBuffer();
            console.log(`[MidiPlayer] SoundFont Data Size: ${sfData.byteLength} bytes`);

            // SF2 헤더 검증 (RIFF)
            const header = new TextDecoder().decode(new Uint8Array(sfData.slice(0, 4)));
            if (header !== 'RIFF') {
                throw new Error(`Invalid SoundFont header: Expected 'RIFF', got '${header}'. The file might be corrupted or an HTML error page.`);
            }

            await this.synth.soundBankManager.addSoundBank(sfData);

            this.sequencer = new Sequencer(this.synth);
            this.isReady = true;
            console.log("[MidiPlayer] SpessaSynth & SoundFont Ready (High Quality Mode)");
        } catch (e) {
            console.error("[MidiPlayer] Initialization failed:", e);
        }
    }

    /**
     * loadMidi - MIDI 데이터를 시퀀서에 비동기로 로드하고 완료를 기다립니다.
     */
    async loadMidi(buffer) {
        if (!this.sequencer) return;

        // 데이터 검증
        if (!(buffer instanceof Uint8Array) && !(buffer instanceof ArrayBuffer)) {
            console.error("[MidiPlayer] Invalid MIDI buffer type:", typeof buffer);
            return;
        }

        const view = new Uint8Array(buffer);
        const header = String.fromCharCode(...view.slice(0, 4));
        console.log(`[MidiPlayer] Loading MIDI binary, size: ${buffer.byteLength}, header: ${header}`);

        if (header !== 'MThd') {
            console.warn("[MidiPlayer] MIDI header mismatch! Expected MThd, got:", header);
        }

        // SpessaSynth의 loadNewSongList는 비동기적으로 동작할 수 있으므로 
        // 로딩 처리가 완료될 수 있도록 리턴합니다.
        await this.sequencer.loadNewSongList([{ binary: buffer }]);
        console.log("[MidiPlayer] MIDI data successfully loaded into sequencer.");
    }

    play() {
        if (this.sequencer) {
            console.log("[MidiPlayer] Attempting to play sequencer. Current duration:", this.sequencer.duration);
            this.sequencer.play();
        } else {
            console.error("[MidiPlayer] Cannot play: Sequencer not initialized.");
        }
    }

    pause() {
        if (this.sequencer) this.sequencer.pause();
    }

    /**
     * 특정 채널의 자동 재생을 묵음 처리함
     */
    setChannelMute(channel, isMuted) {
        if (!this.synth) return;
        // 이제 미표 제거 방식을 사용하므로 볼륨을 0으로 만들 필요가 없습니다.
        // 오히려 키음 출력을 위해 볼륨이 100이어야 합니다.
        this.synth.controllerChange(channel, 7, 100);
    }

    /**
     * 사용자가 노트를 눌렀을 때 실시간으로 음을 출력 (키음)
     */
    triggerNoteOn(channel, pitch, velocity = 100) {
        if (!this.synth || !this.isReady) return;
        // 벨로시티가 너무 낮으면 소리가 안 들릴 수 있으므로 최소값 보정 (30)
        const finalVelocity = Math.max(30, velocity);
        this.synth.noteOn(channel, pitch, finalVelocity);
    }

    triggerNoteOff(channel, pitch) {
        if (!this.synth || !this.isReady) return;
        this.synth.noteOff(channel, pitch);
    }

    playNote(lane) {
        // 기존 드럼 효과음 유지 (Lane Mapping)
        const midiNotes = [36, 38, 39, 42];
        const note = midiNotes[lane] || 36;
        this.triggerNoteOn(9, note, 100);
        setTimeout(() => this.triggerNoteOff(9, note), 100);
    }

    async resumeContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
            console.log("[MidiPlayer] AudioContext Resumed");
        }
    }

    stop() {
        if (this.sequencer) {
            this.sequencer.pause();
            this.sequencer.currentTime = 0;

            // stopAllNotes()가 존재하지 않을 경우를 대비하여 직접 모든 채널에 All Notes Off 송신
            if (this.synth) {
                if (typeof this.synth.stopAllNotes === 'function') {
                    this.synth.stopAllNotes();
                } else {
                    // MIDI 표준: 16개 모든 채널에 All Notes Off (123) 및 All Sound Off (120) 송신
                    for (let i = 0; i < 16; i++) {
                        this.synth.controllerChange(i, 123, 0); // All Notes Off
                        this.synth.controllerChange(i, 120, 0); // All Sound Off
                    }
                }
            }
        }
    }

    get currentTime() {
        return this.sequencer ? this.sequencer.currentTime : 0;
    }

    get duration() {
        return this.sequencer ? this.sequencer.duration : 0;
    }
}
