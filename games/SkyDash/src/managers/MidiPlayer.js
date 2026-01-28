/**
 * MidiPlayer v5.4 "Hardcore Diagnosis & Volume Recovery"
 * - SpessaSynth (WASM/JS) v4 합성 엔진
 * - 물리적 연결 강제 활성화 (connect)
 * - 초기화 후 진단 벨소리(Test Note) 추가
 */
class MidiPlayer {
    constructor() {
        this.isPlaying = false;
        this.isStarting = false;
        this.synth = null;
        this.sequencer = null;
        this.audioContext = null;
        this.sf2Url = './assets/audio/soundfont/TimGM6mb.sf2';
        this.isReady = false;
        this.isLoading = false;
        this.currentUrl = null;
    }

    async init() {
        if (this.isReady) return;
        if (this.isLoading) {
            while (this.isLoading) await new Promise(r => setTimeout(r, 100));
            return;
        }

        this.isLoading = true;
        console.log('[MIDI v5.4] 엔진 초기화 시작...');

        try {
            // 1. SpessaSynth 로드 대기
            let retry = 0;
            while (!window.SpessaSynth && retry < 100) {
                await new Promise(r => setTimeout(r, 100));
                retry++;
            }
            if (!window.SpessaSynth) throw new Error('SpessaSynth 라이브러리를 찾을 수 없습니다.');

            // 2. AudioContext 확보
            this.audioContext = (window.soundManager && window.soundManager.ctx) || new (window.AudioContext || window.webkitAudioContext)();
            console.log('[MIDI v5.4] AudioContext 상태:', this.audioContext.state);

            if (this.audioContext.state === 'suspended') {
                try { await this.audioContext.resume(); } catch (e) {
                    console.log('[MIDI v5.4] Context 활성화 대기 중...');
                }
            }

            // 3. AudioWorklet 모듈 등록
            const processorUrl = './src/libs/spessasynth_processor.min.js';
            await this.audioContext.audioWorklet.addModule(processorUrl);
            console.log('[MIDI v5.4] 워크렛 프로세서 로드 성공');

            // 4. 합성기(Synthesizer) 생성 및 연결
            this.synth = new window.SpessaSynth.Synthesizer(this.audioContext);

            // 물리적 연결 (매우 중요)
            this.synth.connect(this.audioContext.destination);

            // 볼륨 설정
            this.synth.setMasterParameter('masterGain', 1.0);

            // 엔진 응답 대기
            await this.synth.isReady;
            console.log('[MIDI v5.4] 합성기 워커 준비 완료');

            // 5. 시퀀서 생성
            this.sequencer = new window.SpessaSynth.Sequencer(this.synth);

            // 6. SF2 사운드폰트 로드
            const sf2Resp = await fetch(this.sf2Url);
            if (!sf2Resp.ok) throw new Error(`SF2 파일 로드 실패 (${this.sf2Url})`);
            const sf2Data = await sf2Resp.arrayBuffer();

            // 사운드폰트 주입 및 비동기 대기
            await this.synth.soundBankManager.addSoundBank(sf2Data, 'default_bank');
            console.log('[MIDI v5.4] 사운드폰트 주입 성공');

            this.isReady = true;
            this.isLoading = false;

            // 🚩 진단용 테스트 노트 (성공 시 '띵' 소리가 나야 함)
            this.testSound();

        } catch (e) {
            this.isLoading = false;
            console.error('[MIDI v5.4] Fatal Error:', e);
        }
    }

    testSound() {
        if (!this.synth) return;
        console.log('[MIDI v5.4] 진단 벨소리 출력 시도 (CH 0, Note 72)');
        this.synth.noteOn(0, 72, 80);
        setTimeout(() => this.synth.noteOff(0, 72), 500);
    }

    async play(url, loop = true) {
        if (this.currentUrl === url && this.isPlaying) return true;

        this.stop();
        this.isStarting = true;
        this.currentUrl = url;

        try {
            await this.init();
            if (!this.isReady) return false;

            // 재생 직전 컨텍스트 다시 확인
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const response = await fetch(url);
            const midiData = await response.arrayBuffer();

            if (this.currentUrl !== url) return false;

            // 시퀀서 데이터 주입
            this.sequencer.loadNewSongList([{
                name: url,
                binary: midiData
            }]);

            // 로딩 대기 (시퀀서가 곡을 파싱할 시간을 줌)
            let loadRetry = 0;
            while (this.sequencer.isLoading && loadRetry < 20) {
                await new Promise(r => setTimeout(r, 50));
                loadRetry++;
            }

            this.sequencer.loopCount = loop ? -1 : 0;
            this.sequencer.play();

            this.isPlaying = true;
            this.isStarting = false;
            console.log(`[MIDI v5.4] 재생 정상 시작: ${url}`);
            return true;
        } catch (e) {
            this.isPlaying = false;
            this.isStarting = false;
            console.error('[MIDI v5.4] 재생 중 실패:', e);
            return false;
        }
    }

    stop() {
        this.isPlaying = false;
        this.isStarting = false;
        if (this.sequencer) {
            this.sequencer.pause();
            this.sequencer.currentTime = 0;
        }
        if (this.synth) {
            this.synth.stopAll(true);
        }
    }
}

window.midiPlayer = new MidiPlayer();
