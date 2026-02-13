/**
 * MidiPlayer - 고품질 MIDI 재생 (SpessaSynth 기반)
 * 
 * 기술 가이드 참조: documents/tech/web_midi_implementation_guide.md
 * - WASM/AudioWorklet 기반 SpessaSynth 사용
 * - SF2 SoundFont로 고품질 악기음 재생
 */

import { WorkletSynthesizer, Sequencer } from 'spessasynth_lib';
import { CONFIG } from '../config/GameConfig.js';

// AudioWorklet 프로세서 URL (CORS 호환성이 더 좋은 esm.sh 사용)
const PROCESSOR_URL = 'https://esm.sh/spessasynth_lib@4.0.20/dist/spessasynth_processor.min.js';

export class MidiPlayer {
    constructor(audioContext, debug = null) {
        this.audioContext = audioContext;
        this.debug = debug;

        // SpessaSynth 인스턴스
        this.synth = null;
        this.sequencer = null;

        // 상태
        this.isReady = false;
        this.isPlaying = false;
        this.soundFontLoaded = false;

        // 콜백
        this.onNoteOn = null;

        // SoundFont 경로 (static server 호환성을 위해 public/ 포함)
        this.soundFontUrl = 'public/assets/soundfonts/TimGM6mb.sf2';

        // 채널 상태 추적
        this.channelStates = Array.from({ length: 16 }, () => ({
            volume: 1.0,
            isMuted: false,
            isSolo: false
        }));
    }

    /**
     * 초기화
     */
    async init() {
        try {
            this.log('SpessaSynth 초기화 중...');

            // AudioWorklet 프로세서 모듈 등록 (CDN 사용)
            await this.audioContext.audioWorklet.addModule(PROCESSOR_URL);
            this.log('AudioWorklet 프로세서 등록 완료');

            // WorkletSynthesizer 생성
            this.synth = new WorkletSynthesizer(this.audioContext);

            // destination에 연결
            this.synth.connect(this.audioContext.destination);

            // 워커 준비 대기
            await this.synth.isReady;

            this.log('Synthesizer 준비 완료');
            this.isReady = true;

            return true;

        } catch (error) {
            this.log(`초기화 실패: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * SoundFont 로드
     */
    async loadSoundFont(url = null) {
        if (!this.isReady) {
            throw new Error('Synthesizer가 초기화되지 않았습니다');
        }

        const sfUrl = url || this.soundFontUrl;
        this.log(`SoundFont 로드 중: ${sfUrl}`);

        try {
            const response = await fetch(sfUrl);
            if (!response.ok) {
                this.log(`SoundFont 없음 (${response.status}). 기본 사운드 사용`, 'info');
                return false;
            }

            // Content-Type 확인 (HTML 등이 반환되었는지 체크)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                this.log('SoundFont 파일이 유효하지 않습니다 (HTML 반환됨). 기본 사운드 사용', 'info');
                return false;
            }

            const sfData = await response.arrayBuffer();
            this.log(`SoundFont 데이터 획득: ${(sfData.byteLength / 1024 / 1024).toFixed(2)}MB`);

            await this.synth.soundBankManager.addSoundBank(sfData, 'main');

            this.soundFontLoaded = true;
            this.log('SoundFont 적용 완료 (SpessaSynth SoundBank 등록됨)', 'success');

            return true;

        } catch (error) {
            this.log(`SoundFont 로드 실패: ${error.message}`, 'error');
            this.log('기본 사운드 사용', 'info');
            return false;
        }
    }

    /**
     * MIDI 파일 로드 및 재생 준비
     */
    async loadMidi(midiData) {
        if (!this.isReady) {
            throw new Error('Synthesizer가 초기화되지 않았습니다');
        }

        try {
            // ArrayBuffer 또는 URL
            let midiBuffer = midiData;

            if (typeof midiData === 'string') {
                const response = await fetch(midiData);
                midiBuffer = await response.arrayBuffer();
            }

            // Sequencer가 없으면 생성
            if (!this.sequencer) {
                this.sequencer = new Sequencer(this.synth);
            }

            // 곡 목록 로드
            this.sequencer.loadNewSongList([{ binary: midiBuffer }]);

            this.log('MIDI 로드 완료');
            return true;

        } catch (error) {
            this.log(`MIDI 로드 실패: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 재생 시작
     */
    play() {
        if (!this.sequencer) {
            this.log('MIDI가 로드되지 않았습니다', 'error');
            return;
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.sequencer.play();
        this.isPlaying = true;
        this.log('재생 시작');
    }

    /**
     * 일시정지
     */
    pause() {
        if (this.sequencer) {
            this.sequencer.pause();
            this.isPlaying = false;
            this.log('일시정지');
        }
    }

    /**
     * 정지
     */
    stop() {
        if (this.sequencer) {
            this.sequencer.pause();
            this.sequencer.currentTime = 0;
            this.isPlaying = false;
            this.log('정지');
        }
    }

    /**
     * 현재 재생 시간 (초)
     */
    getCurrentTime() {
        if (!this.sequencer) return 0;
        return this.sequencer.currentTime;
    }

    /**
     * 곡 길이 (초)
     */
    getDuration() {
        if (!this.sequencer) return 0;
        return this.sequencer.duration;
    }

    /**
     * 볼륨 설정 (0~1)
     */
    setVolume(volume) {
        if (this.synth) {
            this.synth.setMasterParameter('mainVolume', Math.max(0, Math.min(1, volume)));
        }
    }

    /**
     * 특정 채널의 볼륨 설정 (0~1)
     */
    setChannelVolume(channel, volume) {
        if (this.synth && channel >= 0 && channel < 16) {
            const v = Math.max(0, Math.min(1, volume));
            this.channelStates[channel].volume = v;
            // CC 7 (Main Volume) 사용
            this.synth.controllerChange(channel, 7, Math.floor(v * 127));
            this.log(`Channel ${channel} volume set to ${v}`);
        }
    }

    /**
     * 특정 채널 뮤트 설정
     */
    setChannelMute(channel, isMuted) {
        if (this.synth && channel >= 0 && channel < 16) {
            this.channelStates[channel].isMuted = isMuted;
            this.synth.muteChannel(channel, isMuted);
            this.log(`Channel ${channel} ${isMuted ? 'muted' : 'unmuted'}`);
        }
    }

    /**
     * 특정 채널 솔로 설정
     */
    setChannelSolo(channel, isSolo) {
        if (!this.synth || channel < 0 || channel >= 16) return;

        this.channelStates[channel].isSolo = isSolo;

        // 솔로 모드 활성화인 경우: 해당 채널만 켜고 나머지는 뮤트 (이미 솔로인 채널 제외)
        // 솔로 모드 비활성화인 경우: 모든 채널 뮤트 해제 (원래 뮤트 상태였던 것 제외하는 로직은 단순화를 위해 생략하거나 확장 가능)
        const anySolo = this.channelStates.some(s => s.isSolo);

        if (anySolo) {
            this.channelStates.forEach((state, i) => {
                const shouldMute = !state.isSolo;
                this.synth.muteChannel(i, shouldMute);
            });
        } else {
            // 솔로가 하나도 없으면 모든 채널의 원래 뮤트 상태 적용
            this.channelStates.forEach((state, i) => {
                this.synth.muteChannel(i, state.isMuted);
            });
        }

        this.log(`Channel ${channel} solo ${isSolo ? 'on' : 'off'}. Total solo active: ${anySolo}`);
    }

    /**
     * 현재 모든 채널 정보 반환
     */
    getChannelsInfo() {
        if (!this.sequencer || !this.sequencer.song) return [];

        const channels = [];
        // SpessaSynth의 sequencer.song.tracks 또는 MIDI 데이터를 통해 활성 채널 파악
        // 여기서는 간단히 0-15 채널 중 노트가 있는 채널만 필터링하거나 전체 반환
        return this.channelStates.map((state, i) => ({
            channel: i,
            ...state
        }));
    }

    /**
     * 현재 재생 시간 (초)
     */
    getTime() {
        if (!this.sequencer) return 0;
        return this.sequencer.currentTime;
    }

    /**
     * 재생 시간 설정 (초)
     */
    setTime(time) {
        if (this.sequencer) {
            this.sequencer.currentTime = time;
            this.log(`시간 설정: ${time.toFixed(2)}s`);
        }
    }

    /**
     * 재생 여부 확인
     */
    getIsPlaying() {
        return this.isPlaying;
    }

    /**
     * 리소스 해제
     */
    dispose() {
        if (this.sequencer) {
            this.sequencer.pause();
            this.sequencer = null;
        }
        if (this.synth) {
            this.synth.destroy();
            this.synth = null;
        }
        this.isReady = false;
        this.isPlaying = false;
    }

    /**
     * 로그
     */
    log(message, type = 'info') {
        if (type === 'error' || type === 'warn' || CONFIG.GAME.VERBOSE_LOGGING) {
            if (this.debug) {
                this.debug.log(`[MidiPlayer] ${message}`, type);
            }
            console.log(`[MidiPlayer] ${message}`);
        }
    }
}
