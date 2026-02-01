/**
 * AudioManager - 오디오 시스템 관리
 * Web Audio API 기반 신디사이저
 * 
 * 실제 MIDI 노트를 재생하는 기능 추가
 */

import { CONFIG } from '../config/GameConfig.js';

export class AudioManager {
    constructor(debug = null) {
        this.debug = debug;
        this.context = null;
        this.isReady = false;
        this.masterGain = null;

        // 신스 설정
        this.synthGain = null;  // 멜로디용
        this.drumGain = null;   // 드럼용

        // 활성 오실레이터 (노트 오프용)
        this.activeNotes = new Map();

        // 레이턴시 보정값 (밀리초)
        this.latencyOffset = 0;
    }

    /**
     * 오디오 시스템 초기화
     */
    async init() {
        // 실제 컨텍스트 생성은 getContext()나 start() 시점으로 연기하여 경고 최소화
        this.isReady = true;
        this.log('AudioManager 준비 완료 (상호작용 대기)');
        return true;
    }

    /**
     * 오디오 컨텍스트 생성 및 시작 (사용자 클릭 후 호출되어야 함)
     */
    async start() {
        try {
            // 1. AudioContext 보장
            if (!this.context) {
                this.log('AudioContext 생성...');
                this.context = new (window.AudioContext || window.webkitAudioContext)();
            }

            // 2. 오디오 노드(Gain) 보장
            // context가 이전에 생성되었더라도 노드들은 여기서 생성될 수 있어야 함
            if (!this.masterGain) {
                this.log('오디오 노드(Gain) 구성 중...');

                // 마스터 게인
                this.masterGain = this.context.createGain();
                this.masterGain.connect(this.context.destination);
                this.masterGain.gain.value = CONFIG.AUDIO.MASTER_VOLUME || 0.8;

                // 신스 게인 (멜로디)
                this.synthGain = this.context.createGain();
                this.synthGain.connect(this.masterGain);
                this.synthGain.gain.value = 0.3;

                // 드럼 게인
                this.drumGain = this.context.createGain();
                this.drumGain.connect(this.masterGain);
                this.drumGain.gain.value = CONFIG.AUDIO.SFX_VOLUME || 0.6;

                this.log(`오디오 시스템 설정 완료 (${this.context.sampleRate}Hz)`);
            }

            // 3. 상태 확인 및 resume
            if (this.context.state === 'suspended') {
                await this.context.resume();
                this.log('AudioContext 활성화됨');
            }

            return this.context.state === 'running';
        } catch (error) {
            this.log(`AudioContext 시작 실패: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 컨텍스트 반환 (필요 시 자동 생성)
     */
    getContext() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.context;
    }

    /**
     * 현재 오디오 시간
     */
    getCurrentTime() {
        if (!this.context) return 0;
        return this.context.currentTime + (this.latencyOffset / 1000);
    }

    /**
     * 마스터 볼륨
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * MIDI 노트 재생 (멜로디)
     */
    playMidiNote(midiNote, velocity = 0.7, duration = 0.3) {
        if (!this.context || this.context.state !== 'running' || !this.synthGain) return;

        const now = this.context.currentTime;
        const freq = this.midiToFrequency(midiNote);

        // 오실레이터 생성 (신스 사운드)
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        // 웨이브 타입 (따뜻한 사운드)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // 로우패스 필터
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000 + velocity * 3000, now);
        filter.Q.value = 1;

        // 엔벨로프 (ADSR)
        const attackTime = 0.01;
        const decayTime = 0.1;
        const sustainLevel = velocity * 0.5;
        const releaseTime = 0.2;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocity * 0.4, now + attackTime);
        gain.gain.linearRampToValueAtTime(sustainLevel * 0.4, now + attackTime + decayTime);
        gain.gain.setValueAtTime(sustainLevel * 0.4, now + duration - releaseTime);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        // 연결
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.synthGain);

        osc.start(now);
        osc.stop(now + duration + 0.1);

        // 활성 노트 추적
        const noteKey = midiNote;
        this.activeNotes.set(noteKey, { osc, gain });
    }

    /**
     * MIDI 노트 번호 → 주파수
     */
    midiToFrequency(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /**
     * 드럼 사운드 재생
     */
    playDrum(type = 'kick', velocity = 0.8) {
        if (!this.context || this.context.state !== 'running' || !this.drumGain) return;

        const now = this.context.currentTime;

        switch (type) {
            case 'kick':
                this.playKick(now, velocity);
                break;
            case 'snare':
                this.playSnare(now, velocity);
                break;
            case 'hihat':
                this.playHiHat(now, velocity);
                break;
        }
    }

    /**
     * 킥 드럼
     */
    playKick(time, velocity = 0.9) {
        if (!this.drumGain) return;

        // 톤 오실레이터
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);

        gain.gain.setValueAtTime(velocity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

        osc.connect(gain);
        gain.connect(this.drumGain);

        osc.start(time);
        osc.stop(time + 0.35);

        // 클릭 사운드 (어택)
        const click = this.context.createOscillator();
        const clickGain = this.context.createGain();

        click.frequency.setValueAtTime(1000, time);
        clickGain.gain.setValueAtTime(velocity * 0.3, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

        click.connect(clickGain);
        clickGain.connect(this.drumGain);

        click.start(time);
        click.stop(time + 0.02);
    }

    /**
     * 스네어 드럼
     */
    playSnare(time, velocity = 0.8) {
        if (!this.drumGain) return;

        // 노이즈
        const bufferSize = this.context.sampleRate * 0.15;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(velocity * 0.4, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1500;

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.drumGain);

        noise.start(time);
        noise.stop(time + 0.15);

        // 톤 (바디)
        const osc = this.context.createOscillator();
        const oscGain = this.context.createGain();

        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);

        oscGain.gain.setValueAtTime(velocity * 0.3, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        osc.connect(oscGain);
        oscGain.connect(this.drumGain);

        osc.start(time);
        osc.stop(time + 0.08);
    }

    /**
     * 하이햇
     */
    playHiHat(time, velocity = 0.5) {
        if (!this.drumGain) return;

        const bufferSize = this.context.sampleRate * 0.06;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(velocity * 0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.drumGain);

        noise.start(time);
        noise.stop(time + 0.06);
    }

    /**
     * 효과음 재생 (피드백용)
     */
    playTone(frequency = 440, duration = 0.1, type = 'sine') {
        if (!this.context || this.context.state !== 'running' || !this.masterGain) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + duration);
    }

    /**
     * 마리오 스타일의 튀는 점프 소리
     */
    playJumpSFX(velocity = 1.0) {
        if (!this.context || this.context.state !== 'running' || !this.masterGain) return;

        const now = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // 쀼잉~ 하는 상승 주파수 (마리오 스타일)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

        gain.gain.setValueAtTime(0.3 * velocity, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * 슬라이딩 발동 소리
     */
    playSlideSFX(velocity = 1.0) {
        if (!this.context || this.context.state !== 'running' || !this.masterGain) return;

        const now = this.context.currentTime;
        const osc = this.context.createOscillator();
        const noise = this.context.createBufferSource();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        // 징~ 하는 단시간 톱니파 + 약간의 노이즈
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.15);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);

        gain.gain.setValueAtTime(0.2 * velocity, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    /**
     * 근접 공격 효과음
     */
    playAttackSFX(velocity = 1.0) {
        if (!this.context || this.context.state !== 'running' || !this.masterGain) return;

        const now = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        // 슉! (피치 급강하)
        osc.type = 'square';
        osc.frequency.setValueAtTime(800 * velocity, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * 레이턴시 오프셋 설정
     */
    setLatencyOffset(ms) {
        this.latencyOffset = ms;
        this.log(`레이턴시 오프셋: ${ms}ms`);
    }

    /**
     * 로그
     */
    log(message, type = 'info') {
        if (type === 'error' || type === 'warn' || CONFIG.GAME.VERBOSE_LOGGING) {
            if (this.debug) {
                this.debug.log(`[Audio] ${message}`, type);
            }
            console.log(`[AudioManager] ${message}`);
        }
    }
}
