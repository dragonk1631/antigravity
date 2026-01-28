/**
 * MidiPlayer
 * Tone.js와 Soundfont-player를 사용한 MIDI 파일 재생 클래스
 * 브라우저에서 .mid 파일을 로드하고 피아노 음색으로 재생합니다.
 */
class MidiPlayer {
    constructor() {
        this.isPlaying = false;
        this.isLoaded = false;
        this.currentMidi = null;
        this.instruments = {};
        this.scheduledEvents = [];
        this.audioContext = null;
        this.masterGain = null;
        this.loadingPromise = null;

        // 악기 매핑 (GM 프로그램 번호 -> 악기명)
        this.instrumentMap = {
            0: 'acoustic_grand_piano',
            4: 'electric_piano_1',
            25: 'acoustic_guitar_nylon',
            33: 'electric_bass_finger',
            40: 'violin',
            56: 'trumpet',
            73: 'flute',
            80: 'synth_lead_1_square'
        };
    }

    /**
     * MIDI 플레이어 초기화
     */
    async init() {
        if (this.audioContext) return;

        try {
            // Web Audio API 컨텍스트 생성
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 마스터 게인 노드
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.7;
            this.masterGain.connect(this.audioContext.destination);

            console.log('[MidiPlayer] 초기화 완료');
        } catch (e) {
            console.error('[MidiPlayer] 초기화 실패:', e);
        }
    }

    /**
     * SoundFont 악기 로드 (CDN에서)
     */
    async loadInstrument(name = 'acoustic_grand_piano') {
        if (this.instruments[name]) return this.instruments[name];

        await this.init();

        const url = `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/${name}-mp3.js`;

        try {
            // JSONP 형식의 SoundFont 로드
            const response = await fetch(url);
            const text = await response.text();

            // MIDI.Soundfont.acoustic_grand_piano = {...} 형식 파싱
            const jsonMatch = text.match(/MIDI\.Soundfont\.\w+\s*=\s*(\{[\s\S]*\})/);
            if (!jsonMatch) throw new Error('SoundFont 파싱 실패');

            const soundfontData = eval('(' + jsonMatch[1] + ')');

            // Base64 오디오 데이터를 AudioBuffer로 변환
            const buffers = {};
            for (const note in soundfontData) {
                const base64 = soundfontData[note].split(',')[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                buffers[note] = await this.audioContext.decodeAudioData(bytes.buffer.slice(0));
            }

            this.instruments[name] = buffers;
            console.log(`[MidiPlayer] 악기 로드 완료: ${name}`);
            return buffers;
        } catch (e) {
            console.error(`[MidiPlayer] 악기 로드 실패 (${name}):`, e);
            return null;
        }
    }

    /**
     * MIDI 파일 로드 및 파싱
     */
    async loadMidi(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const midi = this.parseMidi(new Uint8Array(arrayBuffer));

            this.currentMidi = midi;
            console.log(`[MidiPlayer] MIDI 로드 완료: ${url}`, midi);
            return midi;
        } catch (e) {
            console.error(`[MidiPlayer] MIDI 로드 실패 (${url}):`, e);
            return null;
        }
    }

    /**
     * 간단한 MIDI 파서 (Format 0, 1 지원)
     */
    parseMidi(data) {
        let pos = 0;

        const readString = (len) => {
            let str = '';
            for (let i = 0; i < len; i++) str += String.fromCharCode(data[pos++]);
            return str;
        };

        const readInt = (len) => {
            let val = 0;
            for (let i = 0; i < len; i++) val = (val << 8) | data[pos++];
            return val;
        };

        const readVarInt = () => {
            let val = 0;
            let byte;
            do {
                byte = data[pos++];
                val = (val << 7) | (byte & 0x7f);
            } while (byte & 0x80);
            return val;
        };

        // 헤더 파싱
        if (readString(4) !== 'MThd') throw new Error('Invalid MIDI');
        readInt(4); // 헤더 길이
        const format = readInt(2);
        const numTracks = readInt(2);
        const ticksPerBeat = readInt(2);

        const tracks = [];
        let tempo = 500000; // 기본 템포 (120 BPM)

        // 트랙 파싱
        for (let t = 0; t < numTracks; t++) {
            if (readString(4) !== 'MTrk') continue;
            const trackLength = readInt(4);
            const trackEnd = pos + trackLength;

            const notes = [];
            let time = 0;
            let runningStatus = 0;

            while (pos < trackEnd) {
                const deltaTime = readVarInt();
                time += deltaTime;

                let status = data[pos];
                if (status < 0x80) {
                    status = runningStatus;
                } else {
                    pos++;
                    if (status < 0xf0) runningStatus = status;
                }

                const type = status & 0xf0;
                const channel = status & 0x0f;

                if (type === 0x90) { // Note On
                    const note = data[pos++];
                    const velocity = data[pos++];
                    if (velocity > 0) {
                        notes.push({ time, note, velocity, channel });
                    }
                } else if (type === 0x80) { // Note Off
                    pos += 2;
                } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
                    pos += 2;
                } else if (type === 0xc0 || type === 0xd0) {
                    pos++;
                } else if (status === 0xff) { // Meta Event
                    const metaType = data[pos++];
                    const metaLength = readVarInt();
                    if (metaType === 0x51) { // Tempo
                        tempo = (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2];
                    }
                    pos += metaLength;
                } else if (status === 0xf0 || status === 0xf7) { // SysEx
                    const sysexLength = readVarInt();
                    pos += sysexLength;
                }
            }

            if (notes.length > 0) tracks.push(notes);
        }

        return { format, numTracks, ticksPerBeat, tempo, tracks };
    }

    /**
     * MIDI 노트 번호를 노트명으로 변환 (예: 60 -> 'C4')
     */
    midiNoteToName(noteNumber) {
        const notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        const octave = Math.floor(noteNumber / 12) - 1;
        const note = notes[noteNumber % 12];
        return note + octave;
    }

    /**
     * MIDI 재생
     */
    async play(midiUrl, loop = true) {
        if (this.isPlaying) this.stop();

        await this.init();

        // 오디오 컨텍스트 재개 (iOS 대응)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // MIDI 로드
        const midi = await this.loadMidi(midiUrl);
        if (!midi || midi.tracks.length === 0) {
            console.warn('[MidiPlayer] MIDI 데이터가 없습니다. FM 모드로 폴백합니다.');
            return false;
        }

        // 악기 로드
        const instrument = await this.loadInstrument('acoustic_grand_piano');
        if (!instrument) {
            console.warn('[MidiPlayer] 악기 로드 실패. FM 모드로 폴백합니다.');
            return false;
        }

        this.isPlaying = true;

        // 노트 스케줄링
        const scheduleNotes = () => {
            const bpm = 60000000 / midi.tempo;
            const secondsPerTick = 60 / (bpm * midi.ticksPerBeat);
            const startTime = this.audioContext.currentTime + 0.1;

            let maxTime = 0;

            for (const track of midi.tracks) {
                for (const note of track) {
                    const noteTime = note.time * secondsPerTick;
                    const noteName = this.midiNoteToName(note.note);

                    maxTime = Math.max(maxTime, noteTime);

                    if (instrument[noteName]) {
                        const source = this.audioContext.createBufferSource();
                        source.buffer = instrument[noteName];

                        const gainNode = this.audioContext.createGain();
                        gainNode.gain.value = (note.velocity / 127) * 0.5;

                        source.connect(gainNode);
                        gainNode.connect(this.masterGain);

                        const playTime = startTime + noteTime;
                        source.start(playTime);
                        source.stop(playTime + 2); // 최대 2초 재생

                        this.scheduledEvents.push({ source, gainNode });
                    }
                }
            }

            // 루프 설정
            if (loop && maxTime > 0) {
                this.loopTimeout = setTimeout(() => {
                    if (this.isPlaying) {
                        this.clearScheduledEvents();
                        scheduleNotes();
                    }
                }, (maxTime + 1) * 1000);
            }
        };

        scheduleNotes();
        console.log('[MidiPlayer] 재생 시작:', midiUrl);
        return true;
    }

    /**
     * 재생 중지
     */
    stop() {
        this.isPlaying = false;

        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
            this.loopTimeout = null;
        }

        this.clearScheduledEvents();
        console.log('[MidiPlayer] 재생 중지');
    }

    /**
     * 스케줄된 이벤트 정리
     */
    clearScheduledEvents() {
        for (const event of this.scheduledEvents) {
            try {
                event.source.stop();
                event.source.disconnect();
                event.gainNode.disconnect();
            } catch (e) { }
        }
        this.scheduledEvents = [];
    }

    /**
     * 볼륨 설정 (0.0 ~ 1.0)
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }
}

// 전역 인스턴스
window.midiPlayer = new MidiPlayer();
