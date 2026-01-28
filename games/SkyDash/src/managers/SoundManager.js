/**
 * SoundManager
 * 정밀 스케줄링 및 대기 환경 필터를 지원하는 고급 절차적 오디오 엔진
 * FM 합성 모드와 MIDI 파일 재생 모드를 지원합니다.
 */
class SoundManager extends Phaser.Events.EventEmitter {
    constructor(soundSystem) {
        super();
        this.sound = soundSystem;
        this.ctx = soundSystem.context;
        this.isMuted = false;
        this.initialized = false;
        this.currentMode = null; // 'menu', 'game', 'gameOver'

        // MIDI 재생 관련
        this.midiMode = 'fm'; // 'fm' or 'midi' (GameManager에서 로드)
        this.currentMidiAudio = null; // MIDI 재생용 Audio 엘리먼트
        this.midiPaths = {
            game: 'assets/audio/midi/stage01.mid',      // 무한 모드
            timeattack: 'assets/audio/midi/stage02.mid', // 타임어택 모드
            menu: 'assets/audio/midi/stage03.mid',       // 메인 메뉴
            gameOver: 'assets/audio/midi/stage03.mid'    // 게임오버 (메뉴와 동일)
        };

        // 시퀀싱 제어 변수 (FM 모드용)
        this.nextNoteTime = 0.0;
        this.step = 0;
        this.timerID = null;
        this.tempo = 120;
        this.lookahead = 25.0; // 스케줄링 간격 (ms)
        this.scheduleAheadTime = 0.1; // 스케줄 보낼 시간 (s)

        // --- 마스터 이펙트 체인 (고급 공간감) ---
        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.masterCompressor.connect(this.ctx.destination);

        // 스테레오 딜레이 (Pseudo-Reverb 용)
        this.delay = this.ctx.createDelay(0.5);
        this.delay.delayTime.setValueAtTime(0.15, this.ctx.currentTime);
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.setValueAtTime(0.05, this.ctx.currentTime); // 에코 피드백 최소화 (거의 무음)

        // 피드백 경로 필터 (웅웅거림 차단용 밴드패스)
        this.delayFilter = this.ctx.createBiquadFilter();
        this.delayFilter.type = 'bandpass';
        this.delayFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        this.delayFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

        this.delay.connect(this.delayFilter);
        this.delayFilter.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delay);
        this.delay.connect(this.masterCompressor);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        this.masterGain.connect(this.masterCompressor);

        // 딜레이로 보내는 양(Wet)을 극도로 낮게 설정 (드라이한 소리)
        const wetGain = this.ctx.createGain();
        wetGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        this.masterGain.connect(wetGain);
        wetGain.connect(this.delay);

        this.envFilter = this.ctx.createBiquadFilter();
        this.envFilter.type = 'lowpass';
        this.envFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
        this.envFilter.connect(this.masterGain);

        // 정적 노이즈 버퍼 생성 (GC 부하 및 틱 노이즈 방지)
        this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const noiseData = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
    }

    // --- [Phase 11-13] 차세대 4-오퍼레이터 FM 합성 엔진 (TinySynth 스타일) ---
    /**
     * @param {number} freq 기본 주파수
     * @param {Object} algo 오퍼레이터 설정 {op1..op4, vibrato, pan, type}
     * Type: 'series', 'parallel', '2+2', '3+1' 등 입향지정 가능
     */
    play4OpFM(freq, algo, vol = 0.2, time = null) {
        if (this.isMuted || !this.initialized) return;
        const startTime = time || this.ctx.currentTime;

        // [Phase 10] 키 스케일링: 고음일수록 소리가 빨리 감쇄됨
        const keyScale = Math.max(0.2, 1.0 - (freq / 5000));

        const ops = [1, 2, 3, 4].map(() => ({
            osc: this.ctx.createOscillator(),
            gain: this.ctx.createGain()
        }));

        const mainGain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(algo.pan || 0, startTime);

        // 비브라토 LFO
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        if (algo.vibrato) {
            lfo.frequency.setValueAtTime(algo.vibrato.freq || 5, startTime);
            lfoGain.gain.setValueAtTime(algo.vibrato.depth || 5, startTime);
            lfo.connect(lfoGain);
            lfo.start(startTime);
        }

        const opRouting = algo.routing || [0, 1, 2, 3]; // g: dest (0=main)

        ops.forEach((op, i) => {
            const cfg = algo[`op${i + 1}`];
            if (!cfg) {
                // 오퍼레이터 설정이 없으면 아예 시작하지 않음 (TypeError 방지)
                op.active = false;
                return;
            }
            op.active = true;
            op.osc.type = cfg.type || 'sine';
            op.osc.frequency.setValueAtTime(freq * cfg.ratio, startTime);
            if (algo.vibrato) lfoGain.connect(op.osc.frequency);

            const env = cfg.adsr;
            const a = env.a || 0.01;
            const h = env.h || 0;
            const d = (env.d || 0.1) * keyScale;
            const s = env.s || 0.5;
            const r = (env.r || 0.1) * keyScale;

            op.gain.gain.setValueAtTime(0, startTime);
            op.gain.gain.linearRampToValueAtTime(cfg.lvl, startTime + a);
            op.gain.gain.setValueAtTime(cfg.lvl, startTime + a + h);
            op.gain.gain.exponentialRampToValueAtTime(Math.max(0.001, cfg.lvl * s), startTime + a + h + d);
            op.gain.gain.exponentialRampToValueAtTime(0.001, startTime + a + h + d + r);

            op.osc.connect(op.gain);
            op.osc.start(startTime);
            op.osc.stop(startTime + a + h + d + r + 0.1);
        });

        // 알고리즘 연결 (TinySynth 스타일의 유연한 라우팅)
        // algo.connections: [[mod, destIdx], ...] destIdx 0=mainGain, 1=op1.osc.freq, etc.
        const connections = algo.connections || [[3, 2], [2, 1], [1, 0], [0, 0]];

        connections.forEach(([modIdx, destIdx]) => {
            // 해당 오퍼레이터가 활성화된 경우에만 연결
            if (ops[modIdx] && ops[modIdx].active) {
                if (destIdx === 0) {
                    ops[modIdx].gain.connect(mainGain);
                } else if (ops[destIdx - 1] && ops[destIdx - 1].active) {
                    // 진동수 변조 (FM)
                    ops[modIdx].gain.connect(ops[destIdx - 1].osc.frequency);
                }
            }
        });

        mainGain.gain.setValueAtTime(vol, startTime);
        mainGain.connect(panner);
        panner.connect(this.envFilter);
    }

    // --- 공명 필터(VCF) 스위핑 합성 ---
    playVCFSynth(freq, type = 'sawtooth', filterFreq = 2000, Q = 10, adsr = { a: 0.05, d: 0.2, s: 0.5, r: 0.5 }, vol = 0.3, time = null) {
        if (this.isMuted || !this.initialized) return;
        const startTime = time || this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const vcf = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        vcf.type = 'lowpass';
        vcf.Q.setValueAtTime(Q, startTime);
        vcf.frequency.setValueAtTime(filterFreq, startTime);
        vcf.frequency.exponentialRampToValueAtTime(100, startTime + adsr.a + adsr.d); // 필터 스윕 효과

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + adsr.a);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * adsr.s), startTime + adsr.a + adsr.d);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + adsr.a + adsr.d + adsr.r);

        osc.connect(vcf);
        vcf.connect(gain);
        gain.connect(this.envFilter);

        osc.start(startTime);
        osc.stop(startTime + adsr.a + adsr.d + adsr.r);
    }

    // --- 프로급 기술: ADSR 엔벨로프 합성 ---
    playProTone(freq, type = 'sine', adsr = { a: 0.05, d: 0.1, s: 0.5, r: 0.2 }, vol = 0.5, time = null) {
        if (this.isMuted || !this.initialized) return;
        const startTime = time || this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        // ADSR 로직
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + adsr.a); // Attack
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * adsr.s), startTime + adsr.a + adsr.d); // Decay to Sustain
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + adsr.a + adsr.d + adsr.r); // Release

        osc.connect(gain);
        gain.connect(this.envFilter);
        osc.start(startTime);
        osc.stop(startTime + adsr.a + adsr.d + adsr.r);
    }

    playSnare(time = null) {
        // 하이브리드 노이즈 드럼: 화이트 노이즈(Air) + 금속성 노이즈(Body)
        if (this.isMuted || !this.initialized) return;
        const startTime = time || this.ctx.currentTime;

        // 1. Snare Body (Triangle)
        const osc = this.ctx.createOscillator();
        const mainGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.1);

        mainGain.gain.setValueAtTime(0.3, startTime);
        mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        // 2. Snare Snap (Hybrid Noise)
        const noise = this.ctx.createBufferSource();
        const noiseGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        noise.buffer = this.noiseBuffer;
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, startTime);

        noiseGain.gain.setValueAtTime(0.4, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.envFilter);

        osc.connect(mainGain);
        mainGain.connect(this.envFilter);

        osc.start(startTime);
        noise.start(startTime);
        osc.stop(startTime + 0.2);
        noise.stop(startTime + 0.2);
    }

    midiToFreq(midi) {
        if (!midi || midi === 0) return 0;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    init() {
        if (this.initialized) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.initialized = true;
    }

    /**
     * 환경 필터 강도 조절 (고도가 높아질수록 frequency 감소)
     * @param {number} intensity 0.0 ~ 1.0 (1.0일 때 가장 먹먹한 소리)
     */
    setEnvIntensity(intensity) {
        if (!this.initialized) return;
        const freq = 20000 - (intensity * 18000); // 20kHz ~ 2kHz
        this.envFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }

    playTone(freq, type = 'sine', duration = 0.1, vol = 0.5, pitch = 1.0, time = null) {
        if (this.isMuted || !this.initialized) return;
        const startTime = time || this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq * pitch, startTime);
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(this.envFilter);
        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // --- 궁극의 8트랙 악기 편성 (Extreme 8-Track Orchestration) ---

    // --- [Phase 10] 가상 악기급 프리셋 정의 ---

    playElectricPiano(freq, vol = 0.2, time = null) {
        // Rhodes 스타일: 2+2 알고리즘 (Bell + Body)
        const algo = {
            op1: { ratio: 1.0, lvl: 0.5, adsr: { a: 0.005, h: 0.01, d: 2.0, s: 0.1, r: 0.5 } }, // Body Base
            op2: { ratio: 1.0, lvl: 0.3, adsr: { a: 0.005, h: 0.02, d: 1.5, s: 0.0, r: 0.2 } }, // Body Modulation
            op3: { ratio: 14.1, lvl: 0.4, adsr: { a: 0.001, h: 0, d: 0.1, s: 0.0, r: 0.1 } },   // Tine Bell
            op4: { ratio: 1.0, lvl: 0.2, adsr: { a: 0.01, h: 0.05, d: 2.0, s: 0.4, r: 0.8 } }, // Resonance
            connections: [[1, 0], [3, 2], [0, 0], [2, 0]], // 2+2 구조 (0=main)
            pan: -0.2, // 좌측 약간 치우침
            vibrato: { freq: 4.5, depth: 2 }
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playStringPad(freq, vol = 0.1, time = null) {
        // 무성한 오케스트라 현악기: 병렬 알고리즘 + 넓은 스테레오
        const algo = {
            op1: { ratio: 1.0, lvl: 0.4, adsr: { a: 0.4, h: 0.1, d: 0.5, s: 0.8, r: 1.0 } },
            op2: { ratio: 1.003, lvl: 0.3, adsr: { a: 0.5, h: 0.15, d: 0.5, s: 0.7, r: 1.0 } },
            op3: { ratio: 0.5, lvl: 0.4, adsr: { a: 0.6, h: 0.2, d: 0.5, s: 0.6, r: 1.0 } },
            op4: { ratio: 2.0, lvl: 0.2, adsr: { a: 0.3, h: 0.05, d: 0.5, s: 0.5, r: 0.8 } },
            connections: [[0, 0], [1, 0], [2, 0], [3, 0]], // 4개 병렬 (풍부한 합창 느낌)
            pan: 0.5, // 우측 배치
            vibrato: { freq: 5.2, depth: 10 }
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playBrightBrass(freq, vol = 0.2, time = null) {
        // 강력한 FM 브라스: 직렬 4-OP (Brilliant Metal Bark)
        const algo = {
            op1: { ratio: 1.0, lvl: 0.6, adsr: { a: 0.005, h: 0.01, d: 0.3, s: 0.4, r: 0.2 } },
            op2: { ratio: 1.0, lvl: 0.5, adsr: { a: 0.01, h: 0.02, d: 0.2, s: 0.2, r: 0.1 } },
            op3: { ratio: 2.0, lvl: 0.8, adsr: { a: 0.005, h: 0, d: 0.1, s: 0.1, r: 0.1 } },
            op4: { ratio: 4.0, lvl: 0.4, adsr: { a: 0.002, h: 0, d: 0.05, s: 0.0, r: 0.05 } },
            connections: [[3, 2], [2, 1], [1, 0], [0, 0]], // 직렬 연결
            pan: 0, // 중앙 집중
            vibrato: { freq: 4.0, depth: 2 }
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playFMLead(freq, vol = 0.15, time = null) {
        // 강력한 신스 리드: 병렬+직렬 혼합 (Brilliant Hybrid)
        const algo = {
            op1: { ratio: 1.0, lvl: 0.6, adsr: { a: 0.01, h: 0.02, d: 0.3, s: 0.4, r: 0.3 } },
            op2: { ratio: 2.01, lvl: 0.4, adsr: { a: 0.02, h: 0.01, d: 0.2, s: 0.2, r: 0.2 } },
            op3: { ratio: 3.5, lvl: 0.5, adsr: { a: 0.01, h: 0, d: 0.1, s: 0.1, r: 0.1 } },
            op4: { ratio: 0.5, lvl: 0.3, adsr: { a: 0.01, d: 0.5, s: 0.3, r: 0.3 } },
            connections: [[3, 0], [2, 1], [1, 0], [0, 0]],
            pan: 0,
            vibrato: { freq: 6.0, depth: 4 }
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playFMHarp(freq, vol = 0.1, time = null) {
        // 영롱한 벨/하프: 병렬 + 직렬 혼합
        const algo = {
            op1: { ratio: 1.0, lvl: 0.5, adsr: { a: 0.005, h: 0, d: 0.8, s: 0.0, r: 0.5 } },
            op2: { ratio: 14.0, lvl: 0.7, adsr: { a: 0.002, h: 0, d: 0.2, s: 0.0, r: 0.1 } },
            op3: { ratio: 1.0, lvl: 0.4, adsr: { a: 0.01, h: 0, d: 0.5, s: 0.0, r: 0.3 } },
            op4: { ratio: 8.0, lvl: 0.6, adsr: { a: 0.005, h: 0, d: 0.1, s: 0.0, r: 0.1 } },
            connections: [[1, 0], [3, 2], [0, 0], [2, 0]], // 2+2 구조
            pan: 0.3 // 약간 우측
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playCinematicBass(freq, vol = 0.2, time = null) {
        // 묵직하고 깊은 4-OP 베이스: 직렬 알고리즘
        const algo = {
            op1: { ratio: 1.0, lvl: 0.7, adsr: { a: 0.02, h: 0.05, d: 0.3, s: 0.6, r: 0.2 } },
            op2: { ratio: 0.5, lvl: 0.5, adsr: { a: 0.05, h: 0, d: 0.4, s: 0.5, r: 0.3 } },
            op3: { ratio: 1.01, lvl: 0.2, adsr: { a: 0.01, h: 0, d: 0.1, s: 0.1, r: 0.1 } },
            op4: { ratio: 2.0, lvl: 0.1, adsr: { a: 0.01, h: 0, d: 0.1, s: 0.1, r: 0.1 } },
            connections: [[3, 2], [2, 1], [1, 0], [0, 0]],
            pan: -0.1
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playSquareLead(freq, vol = 0.15, time = null) {
        // 두터운 스퀘어파 리드: 2+2 (Detuned Squares)
        const algo = {
            op1: { type: 'square', ratio: 1.0, lvl: 0.5, adsr: { a: 0.01, h: 0.02, d: 0.2, s: 0.4, r: 0.2 } },
            op2: { type: 'square', ratio: 1.001, lvl: 0.4, adsr: { a: 0.01, h: 0.02, d: 0.25, s: 0.3, r: 0.2 } },
            op3: { type: 'sine', ratio: 2.0, lvl: 0.3, adsr: { a: 0.005, d: 0.1, s: 0.1, r: 0.1 } }, // High overtone
            op4: { type: 'sine', ratio: 0.5, lvl: 0.2, adsr: { a: 0.02, d: 0.3, s: 0.2, r: 0.2 } },  // Sub-depth
            connections: [[0, 0], [1, 0], [2, 1], [3, 0]],
            pan: 0,
            vibrato: { freq: 5.5, depth: 3 }
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playSynthBass(freq, vol = 0.2, time = null) {
        // 타격감 강한 펀치 베이스: 직렬 4-OP
        const algo = {
            op1: { ratio: 1.0, lvl: 0.8, adsr: { a: 0.005, h: 0.03, d: 0.2, s: 0.5, r: 0.1 } },
            op2: { ratio: 1.0, lvl: 0.6, adsr: { a: 0.005, d: 0.1, s: 0.2, r: 0.1 } },
            op3: { ratio: 0.5, lvl: 0.4, adsr: { a: 0.01, d: 0.15, s: 0.1, r: 0.1 } },
            op4: { ratio: 2.0, lvl: 0.2, adsr: { a: 0.002, d: 0.05, s: 0.0, r: 0.05 } },
            connections: [[3, 2], [2, 1], [1, 0], [0, 0]]
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playWarmPad(freq, vol = 0.1, time = null) {
        // 따뜻하고 몽환적인 패드: 병렬 합성
        const algo = {
            op1: { ratio: 1.0, lvl: 0.4, adsr: { a: 0.5, d: 1.0, s: 0.8, r: 1.0 } },
            op2: { ratio: 1.002, lvl: 0.3, adsr: { a: 0.6, d: 1.0, s: 0.7, r: 1.2 } },
            op3: { ratio: 1.5, lvl: 0.2, adsr: { a: 0.7, d: 0.8, s: 0.6, r: 1.5 } },
            op4: { ratio: 0.5, lvl: 0.2, adsr: { a: 0.8, d: 1.2, s: 0.5, r: 1.5 } },
            connections: [[0, 0], [1, 0], [2, 0], [3, 0]],
            pan: 0.6,
            vibrato: { freq: 4.0, depth: 5 }
        };
        this.play4OpFM(freq, algo, vol, time);
    }

    playSoftKick(time) {
        if (!this.initialized) return;
        const startTime = time || this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // 킥의 퍽퍽한 소리 방지: 60Hz에서 시작하여 부드럽게 하강
        osc.frequency.setValueAtTime(60, startTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
    }

    playSnare(time) {
        if (!this.initialized) return;
        const startTime = time || this.ctx.currentTime;

        // 정적 버퍼 사용 (가비지 컬렉션 방지)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, startTime);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.1, startTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);

        noise.connect(noiseGain);
        osc.connect(oscGain);
        noiseGain.connect(this.masterCompressor);
        oscGain.connect(this.masterCompressor);

        noise.start(startTime);
        osc.start(startTime);

        // 오실레이터 정지 (중요: 노이즈 누수 방지)
        osc.stop(startTime + 0.1);
        noise.stop(startTime + 0.2);
    }

    /**
     * 음악 모드 설정 (GameManager에서 호출)
     * @param {string} mode 'fm' or 'midi'
     */
    setMusicMode(mode) {
        this.midiMode = mode;
    }

    /**
     * BGM 시작 (FM 합성 또는 MIDI 파일)
     */
    startBGM(mode = 'menu') {
        if (this.currentMode === mode && (this.timerID || this.currentMidiAudio)) return;
        this.stopBGM();
        this.init();
        this.currentMode = mode;

        // GameManager에서 설정 로드
        const gm = new GameManager();
        this.midiMode = gm.settings.musicMode || 'fm';

        if (this.midiMode === 'midi') {
            // MIDI 모드: MIDIjs 사용
            this.startMidiBGM(mode);
        } else {
            // FM 합성 모드: 기존 로직
            this.startFMBGM(mode);
        }
    }

    /**
     * MIDI 파일 BGM 재생 (MIDIjs 사용)
     */
    startMidiBGM(mode) {
        const midiPath = this.midiPaths[mode] || this.midiPaths.menu;

        // MIDIjs 라이브러리가 로드되어 있는지 확인
        if (typeof MIDIjs !== 'undefined') {
            MIDIjs.play(midiPath);
        } else {
            console.warn('MIDIjs 라이브러리가 로드되지 않았습니다. FM 모드로 폴백합니다.');
            this.startFMBGM(mode);
        }
    }

    /**
     * FM 합성 BGM 시작 (기존 로직)
     */
    startFMBGM(mode) {
        // 템포 설정: 타임어택 140, 게임 130, 메뉴 110
        if (mode === 'timeattack') {
            this.tempo = 140;
        } else if (mode === 'game') {
            this.tempo = 130;
        } else {
            this.tempo = 110;
        }

        this.step = 0;
        this.nextNoteTime = this.ctx.currentTime;

        this.scheduler();
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.step, this.nextNoteTime);
            this.nextStep();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextStep() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16비트 기준
        this.step++;
    }

    scheduleNote(step, time) {
        if (this.currentMode === 'game') {
            this.scheduleGameBGM(step, time);
        } else if (this.currentMode === 'timeattack') {
            this.scheduleTimeAttackBGM(step, time);
        } else {
            this.scheduleSimpleBGM(step, time);
        }
    }

    /**
     * 장기 체류형 멀티 섹션 구성 (Intro -> Verse -> Chorus -> Bridge)
     */
    scheduleGameBGM(step, time) {
        const totalSteps = 128; // 약 2분 분량의 루프 (100BPM 기준)
        const bar = Math.floor((step % totalSteps) / 16);
        const section = Math.floor((step % totalSteps) / 32);

        // --- 1. Upbeat Drums (Four-on-the-floor) ---
        if (step % 4 === 0) this.playSoftKick(time); // 심장 박동처럼 뛰는 4비트 킥
        if (step % 8 === 4) this.playSnare(time);    // 명확한 백비트 스네어

        // 밝고 가벼운 하이햇
        if (step % 2 === 1) {
            const vel = 0.015 + Math.random() * 0.005;
            this.playProTone(12000, 'sine', { a: 0.001, d: 0.01, s: 0.02, r: 0.01 }, vel, time);
        }
        if (step % 4 === 0) this.emit('beat', time);

        // --- 2. Galloping Bass (Am - G - F - E) ---
        const bassProg = [45, 43, 41, 40];
        const currentRoot = bassProg[section % 4];
        // 갤로핑 리듬 (1, 3, 4번째 16분음표 박자)
        if (step % 4 !== 1) {
            this.playCinematicBass(this.midiToFreq(currentRoot), 0.12, time);
        }

        // --- 3. Wide Additive Pads (Organ/Pad Hybrid) ---
        if (step % 32 === 0) {
            // 주음 (Pan Right)
            this.playStringPad(this.midiToFreq(currentRoot + 12), 0.04, time);
            // 5도음 (Pan Left - Additive effect)
            this.playStringPad(this.midiToFreq(currentRoot + 19), 0.03, time);
        }

        // --- 4. Energetic Arp (Bright Harp - Cross Panning) ---
        const arpPattern = [0, 4, 7, 12, 7, 4, 7, 0];
        if (step % 2 === 0) {
            const arpNote = currentRoot + 24 + arpPattern[(step / 2) % 8];
            // 짝수/홀수 박자에 따라 팬을 교차하여 입체감 극대화
            const pan = (step % 4 === 0) ? -0.6 : 0.6;
            const algo = {
                op1: { ratio: 1.0, lvl: 0.5, adsr: { a: 0.005, h: 0, d: 0.8, s: 0.0, r: 0.5 } },
                op2: { ratio: 14.0, lvl: 0.7, adsr: { a: 0.002, h: 0, d: 0.2, s: 0.0, r: 0.1 } },
                connections: [[1, 0], [0, 0]],
                pan: pan
            };
            this.play4OpFM(this.midiToFreq(arpNote), algo, 0.04, time);
        }

        // --- 5. Main Lead (Staccato Melody Layer) ---
        let melody;
        if (section === 0 || section === 1) { // 기분 좋은 전개
            melody = [69, 71, 72, 74, 76, 0, 74, 72, 71, 72, 69, 0, 67, 69, 71, 0];
        } else if (section === 2) { // 시원한 절정 (Chorus)
            melody = [81, 79, 81, 83, 84, 0, 83, 81, 79, 77, 79, 81, 76, 74, 76, 0];
        } else { // 마무리 섹션
            melody = [76, 74, 72, 71, 69, 67, 65, 64, 62, 0, 64, 65, 67, 69, 71, 72];
        }

        const note = melody[step % 16];
        if (note > 0) {
            // 주 멜로디: 날카로운 브라스 (송곳처럼 꽂히는 음색)
            this.playBrightBrass(this.midiToFreq(note), 0.15, time);

            // 코러스 섹션에서 에너지를 더해주는 FM 리드 레이어
            if (section === 2) {
                this.playFMLead(this.midiToFreq(note + 12), 0.08, time);
            }
        }
    }

    /**
     * 100계단 타임어택 전용 BGM (Cm, 140BPM)
     */
    scheduleTimeAttackBGM(step, time) {
        const bar = Math.floor((step % 64) / 16); // 16마디 (256스텝) 루프면 좋겠지만 16박자(4마디) 단위를 bar로
        const totalBars = 16;
        const currentBar = Math.floor((step % (totalBars * 16)) / 16);

        // --- 1. Drums (Time Attack Pattern) ---
        if (step % 4 === 0) this.playSoftKick(time);
        if (step % 8 === 4) this.playSnare(time);
        if (step % 2 === 1) {
            this.playProTone(10000, 'sine', { a: 0.001, d: 0.01, s: 0.01, r: 0.01 }, 0.02, time);
        }

        // --- 2. Synth Bass (Cm Tension) ---
        const bassProg = [48, 48, 48, 48, 44, 44, 46, 46, 48, 48, 48, 48, 51, 51, 53, 53];
        const bassNote = bassProg[currentBar % 16];
        if (step % 4 === 0 || step % 4 === 3) { // Syncopated bass
            this.playSynthBass(this.midiToFreq(bassNote), 0.12, time);
        }

        // --- 3. Warm Pad (Atmospheric) ---
        if (step % 32 === 0) {
            this.playWarmPad(this.midiToFreq(bassNote + 12), 0.05, time);
        }

        // --- 4. Square Lead (Melody Planning) ---
        let melody = [];
        // 1-4마디: Cm 상승 (C-Eb-G)
        if (currentBar < 4) {
            melody = [60, 0, 63, 0, 67, 0, 63, 0, 60, 63, 67, 72, 60, 0, 0, 0];
        }
        // 5-8마디: Ab-Bb 긴장감
        else if (currentBar < 8) {
            melody = [68, 0, 68, 0, 70, 0, 70, 0, 68, 70, 72, 70, 68, 0, 0, 0];
        }
        // 9-12마디: 변주 (리듬 변경)
        else if (currentBar < 12) {
            melody = [60, 63, 60, 67, 60, 63, 60, 72, 60, 63, 60, 67, 72, 70, 67, 63];
        }
        // 13-16마디: 클라이맥스 (옥타브 업)
        else {
            melody = [72, 0, 75, 0, 79, 0, 75, 0, 72, 75, 79, 84, 84, 82, 79, 75];
        }

        const note = melody[step % 16];
        if (note > 0) {
            this.playSquareLead(this.midiToFreq(note), 0.15, time);
        }
    }

    scheduleSimpleBGM(step, time) {
        const menuMelody = [60, 62, 64, 65, 67, 0, 67, 65, 64, 0, 60, 0];
        const gameOverMelody = [48, 0, 45, 0, 43, 0, 41, 0, 40, 0, 0, 0];
        const mel = this.currentMode === 'menu' ? menuMelody : gameOverMelody;

        if (step % 8 === 0) {
            this.playSoftKick(time);
            this.emit('beat', time);
        }
        if (step % 16 === 8) this.playSnare(time);

        // 메뉴에서는 선명한 브라스 사용
        if (step % 2 === 0) {
            const note = mel[(step / 2) % mel.length];
            if (note > 0) {
                this.playBrightBrass(this.midiToFreq(note), 0.15, time);
            }
        }
    }

    stopBGM() {
        // FM 모드 정지
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        // MIDI 모드 정지
        if (typeof MIDIjs !== 'undefined') {
            MIDIjs.stop();
        }
        this.currentMode = null;
    }

    playClimb(pitch = 1.0) {
        this.playProTone(600 * pitch, 'triangle', { a: 0.01, d: 0.05, s: 0.2, r: 0.1 }, 0.3);
    }
    playTurn() {
        this.playProTone(300, 'sine', { a: 0.01, d: 0.05, s: 0.1, r: 0.05 }, 0.2);
    }
    playFail() {
        this.playProTone(100, 'triangle', { a: 0.05, d: 0.2, s: 0.5, r: 0.5 }, 0.4);
    }
    playClear() {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            this.playProTone(freq, 'sine', { a: 0.05, d: 0.1, s: 0.5, r: 0.2 }, 0.3, this.ctx.currentTime + (i * 0.1));
        });
    }
}
