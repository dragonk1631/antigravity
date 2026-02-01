/**
 * BeatMaster - Refactored Main Entry (Module)
 */

import { CONFIG } from './src/config/GameConfig.js';
import { MidiParser } from './src/audio/MidiParser.js';
import { MidiPlayer } from './src/audio/MidiPlayer.js';
import { DebugConsole } from './src/utils/DebugConsole.js';

class GameEngine {
    constructor() {
        this.parser = new MidiParser();
        this.player = null;
        this.audioCtx = null;
        this.debug = new DebugConsole('debug-console');

        this.state = {
            notes: [],
            isPlaying: false,
            startTime: 0,
            currentTime: 0,
            score: 0,
            combo: 0,
            canvasWidth: 0,
            canvasHeight: 0,
            currentMidiSource: null,
            keyPressed: {},
            activeLongNotes: {},
            laneActive: [0, 0, 0, 0],
            nextCheckIndex: 0,
            nextLaneNoteIndices: [0, 0, 0, 0],
            difficulty: CONFIG.NOTES.DIFFICULTY.DEFAULT,
            particles: [],
            gameplayChannels: [],
            laneHitFlash: [0, 0, 0, 0],
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            lastUIUpdate: { score: -1, combo: -1, time: "", hp: -1 },
            hp: 100,
            stats: { perfect: 0, good: 0, miss: 0, maxCombo: 0 },
            lanePointerMap: {}
        };

        this.cache = {
            laneWidth: 0,
            hitLineY: 0,
            pixelsPerMs: 0,
            laneGradients: [],
            beamGradients: [],
            particlePool: [],
            activeParticles: []
        };

        // Initialize particle pool (reuse objects to reduce GC)
        for (let i = 0; i < 200; i++) {
            this.cache.particlePool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, color: "" });
        }

        this.elements = {
            overlay: document.getElementById('overlay'),
            startBtn: document.getElementById('start-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            songSelect: document.getElementById('song-select'),
            midiUpload: document.getElementById('midi-upload'),
            scrollSpeedInput: document.getElementById('scroll-speed'),
            speedValue: document.getElementById('speed-value'),
            scoreEl: document.getElementById('score'),
            comboEl: document.getElementById('combo'),
            judgmentEl: document.getElementById('judgment-display'),
            canvas: document.getElementById('game-canvas'),
            progressBar: document.getElementById('progress-bar-fill'),
            timeDisplay: document.getElementById('time-display'),
            diffBtns: document.querySelectorAll('.difficulty-btn'),
            debugConsole: document.getElementById('debug-console'),
            touchZones: document.querySelectorAll('.touch-zone'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            hpBar: document.getElementById('hp-bar-fill'),
            resultOverlay: document.getElementById('result-overlay'),
            failOverlay: document.getElementById('game-over-overlay'),
            scanBtn: document.getElementById('scan-btn'),
            gameContainer: document.getElementById('game-container')
        };

        if (this.elements.debugConsole) this.elements.debugConsole.style.display = 'none';
        this.ctx = this.elements.canvas.getContext('2d');
        this.init();
    }

    async init() {
        this.resize();
        this.loadSongList();
        this.hideOverlays();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resize(), 300); // Give it time to settle
        });
        this.bindEvents();

        console.log("[GameEngine] Initialized with modules");
    }

    hideOverlays() {
        this.elements.resultOverlay.classList.remove('visible');
        this.elements.failOverlay.classList.remove('visible');
        this.elements.overlay.classList.remove('hidden'); // Ensure main overlay is visible
    }

    async loadSongList() {
        // 내장 곡 로드
        // 로컬 Songs.json 로드 (동적 리스트)
        try {
            const res = await fetch('songs.json');
            if (!res.ok) throw new Error("JSON fetch failed");
            const internalSongs = await res.json();

            internalSongs.forEach(song => {
                const opt = document.createElement('option');
                opt.value = song.url;
                opt.innerText = song.name;
                this.elements.songSelect.appendChild(opt);
            });
            console.log(`[GameEngine] Loaded ${internalSongs.length} songs from external config.`);
        } catch (e) {
            console.warn("[GameEngine] Failed to load songs.json, falling back to static list or empty.", e);
            // Fallback (Optional: Just leave empty or add a critical error msg)
            const opt = document.createElement('option');
            opt.innerText = "❌ No songs found (Run update_songs.bat)";
            this.elements.songSelect.appendChild(opt);
        }
    }

    async setupAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.player = new MidiPlayer(this.audioCtx);
            await this.player.init(CONFIG.AUDIO.SOUNDFONT_URL);
        }
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }
    }

    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startSession());
        this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
        this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        this.elements.scrollSpeedInput.addEventListener('input', (e) => {
            CONFIG.NOTES.SCROLL_SPEED = parseFloat(e.target.value);
            this.elements.speedValue.innerText = CONFIG.NOTES.SCROLL_SPEED.toFixed(1);
            // 실시간 렌더링 캐시 갱신
            this.cache.pixelsPerMs = (CONFIG.NOTES.SCROLL_SPEED / 10) * 2;
        });

        this.elements.midiUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const buffer = await file.arrayBuffer();
                await this.loadMidiData(buffer);
            }
        });

        if (this.elements.scanBtn) {
            this.elements.scanBtn.addEventListener('click', () => {
                const msg = "브라우저 보안상 직접 파일을 스캔할 수 없습니다. 터미널(VSCode 등)에서 'node scansongs.js' 명령어를 실행한 후 새로고침해 주세요.";
                this.debug.log(msg, "warn");
                alert(msg);
            });
        }

        this.elements.songSelect.addEventListener('change', async (e) => {
            if (e.target.value) {
                await this.loadMidiData(e.target.value);
            }
        });

        // 난이도 버튼 이벤트 바인딩
        this.elements.diffBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const diff = btn.getAttribute('data-value');
                this.state.difficulty = diff;

                // UI 업데이트
                this.elements.diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 데이터 재처리 (이미 로드된 소스가 있다면)
                if (this.state.currentMidiSource) {
                    await this.loadMidiData(this.state.currentMidiSource);
                }
                console.log(`[GameEngine] Difficulty changed to: ${diff}`);
            });
        });

        // Overlay buttons
        document.querySelectorAll('.restart-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                this.hideOverlays();
                await this.start();
            });
        });
        document.querySelectorAll('.home-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideOverlays();
                this.returnToMenu();
            });
        });

        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            this.handleKeyDown(e);
        });
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Universal Pointer Events on Canvas (Full-Lane Touch)
        this.elements.canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.handlePointerDown(e);
        });

        window.addEventListener('pointerup', (e) => {
            this.handlePointerUp(e);
        });

        window.addEventListener('pointercancel', (e) => {
            this.handlePointerUp(e);
        });
    }

    handlePointerDown(e) {
        if (!this.state.isPlaying) return;

        const rect = this.elements.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const laneWidth = rect.width / CONFIG.NOTES.LANES;
        const lane = Math.floor(x / laneWidth);

        if (lane >= 0 && lane < CONFIG.NOTES.LANES) {
            this.state.lanePointerMap[e.pointerId] = lane;
            this.triggerLaneDown(lane);
            this.elements.touchZones[lane]?.classList.add('active');

            // Pointer Capture to track movements outside canvas
            this.elements.canvas.setPointerCapture(e.pointerId);
        }
    }

    handlePointerUp(e) {
        if (this.state.lanePointerMap[e.pointerId] !== undefined) {
            const lane = this.state.lanePointerMap[e.pointerId];
            this.triggerLaneUp(lane);
            this.elements.touchZones[lane]?.classList.remove('active');
            delete this.state.lanePointerMap[e.pointerId];
        }
    }

    triggerLaneDown(lane) {
        if (!this.state.isPlaying) return;
        this.state.keyPressed[lane] = true;
        // Don't set laneActive here, let checkHit handle it for "successful" hits
        // this.state.laneActive[lane] = 200; 
        this.checkHit(lane);
    }

    triggerLaneUp(lane) {
        if (!this.state.isPlaying) return;
        this.state.keyPressed[lane] = false;

        const activeLN = this.state.activeLongNotes[lane];
        if (activeLN) {
            const now = this.state.currentTime;
            const endTime = activeLN.time + activeLN.duration;
            const diff = Math.abs(now - endTime);
            const releaseWindow = (CONFIG.NOTES.JUDGMENT.RELEASE_WINDOW || 0.250) * 1000;

            if (activeLN.completed) return;

            if (diff <= releaseWindow) {
                const judgment = this.getJudgment(diff / 1000 / 1.5);
                this.applyJudgment(`Release ${judgment}`);
            } else {
                this.applyJudgment("MISS");
            }

            if (this.player && activeLN.originalPitch !== undefined) {
                this.player.triggerNoteOff(activeLN.originalChannel, activeLN.originalPitch);
            }
            activeLN.completed = true; // Mark as completed
            this.syncCheckIndex();
            delete this.state.activeLongNotes[lane]; // Use delete for clarity
        }
    }

    handleKeyDown(e) {
        if (!this.state.isPlaying) return;
        const key = e.key.toLowerCase();
        const lane = CONFIG.NOTES.LANE_KEYS.indexOf(key);
        if (lane !== -1) {
            this.triggerLaneDown(lane);
            this.elements.touchZones[lane]?.classList.add('active');
        }
    }

    handleKeyUp(e) {
        if (!this.state.isPlaying) return;
        const key = e.key.toLowerCase();
        const lane = CONFIG.NOTES.LANE_KEYS.indexOf(key);
        if (lane !== -1) {
            this.triggerLaneUp(lane);
            this.elements.touchZones[lane]?.classList.remove('active');
        }
    }

    // [신규] 완료된 노트를 건너뛰도록 공통 인덱스 동기화
    syncCheckIndex() {
        const notes = this.state.notes;
        while (this.state.nextCheckIndex < notes.length && (notes[this.state.nextCheckIndex].completed || notes[this.state.nextCheckIndex].missed)) {
            this.state.nextCheckIndex++;
        }
    }

    async loadMidiData(src) {
        this.elements.startBtn.disabled = true;
        this.elements.startBtn.innerText = "PARSING...";

        try {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log(`[GameEngine] Loading MIDI (isMobile: ${isMobile})`);
            const gameData = await this.parser.parse(src, this.state.difficulty, isMobile);
            this.state.notes = gameData.allNotes.map(n => ({
                ...n,
                hit: false,
                completed: false,
                missed: false
            }));

            // [핵심] 멜로디가 제거된 배경음 데이터를 상태에 보관
            this.state.backgroundMidi = gameData.backgroundMidi;

            // [중요] 배경음 미디 로드 대기 - 비동기 완료를 보장함
            if (this.player && this.state.backgroundMidi) {
                await this.player.loadMidi(this.state.backgroundMidi);
                console.log("[GameEngine] Background MIDI binary finalized and loaded into sequencer.");
            }

            this.debug.log(`[GameEngine] 멜로디 분석 및 배경음 준비 완료!`, "success");

            // 인텍스 초기화
            this.state.nextCheckIndex = 0;
            this.state.nextLaneNoteIndices = [0, 0, 0, 0];
            this._lastTimestamp = 0;

            this.state.currentMidiSource = src;

            this.elements.startBtn.disabled = false;
            this.elements.startBtn.innerText = "START SESSION";

            const totalCount = gameData.allNotes.length;
            this.debug.log(`곡 로드: ${totalCount}개 노트 [${this.state.difficulty}]`, 'success');
            this.debug.log(`필터링 임계값: ${CONFIG.NOTES.DIFFICULTY.THRESHOLD[this.state.difficulty]}`, 'info');
            console.log("[GameEngine] MIDI Loaded:", gameData);
        } catch (e) {
            alert("MIDI 로드 실패");
            this.elements.startBtn.innerText = "START SESSION";
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    async startSession() {
        if (!this.state.currentMidiSource) {
            alert("곡을 먼저 선택해주세요.");
            return;
        }

        await this.setupAudio();

        // [수정] 배경음 미디가 확실히 로드되도록 await 처리 (메모리 내 바이너리 우선 사용)
        await this.loadMidiIntoPlayer();

        await this.beginGameplay();
    }

    /** [핵심] 곡을 실제로 시작하는 공통 로직 (최초 시작 & 재시작 공유) */
    async beginGameplay() {
        // UI 초기화
        this.elements.overlay.classList.remove('visible');
        this.elements.overlay.classList.add('hidden');
        this.elements.gameContainer.style.visibility = 'visible'; // 게임 컨테이너 표시

        // [Fix] 모바일 브라우저 주소창 변화 대응을 위해 약간의 지연 후 리사이즈
        setTimeout(() => this.resize(), 100);

        // 상태 초기화
        this.state.score = 0;
        this.state.combo = 0;
        this.state.hp = 100;
        this.state.stats = { perfect: 0, good: 0, miss: 0, maxCombo: 0 };
        this.state.nextCheckIndex = 0;
        this.state.nextLaneNoteIndices = [0, 0, 0, 0];
        this.state.lastUIUpdate = { score: -1, combo: -1, time: "", hp: -1 };

        // 모든 노트 상태 초기화 (재시작 필수)
        this.state.notes.forEach(n => {
            n.hit = false;
            n.completed = false;
            n.missed = false;
        });

        if (this.player) {
            this.player.stop(); // 0초로 리셋
        }

        // 3초 카운트다운 연출
        await this.runCountdown();

        this.state.isPlaying = true;
        this.state.gameStartTime = performance.now(); // [Fix] 시스템 기준 시작 시간 갱신 (재시작 시 필수!)
        this.state.startTime = this.state.gameStartTime;
        this.state.audioStarted = false; // 오디오 재생 여부 플래그

        this.debug.log("게임을 시작합니다! (리드인 중...)", "info");

        requestAnimationFrame((t) => this.loop(t));
    }

    async runCountdown() {
        const el = this.elements.judgmentEl;
        const counts = ["3", "2", "1", "READY!"];

        for (const msg of counts) {
            el.innerText = msg;
            this.elements.judgmentEl.className = 'judgment-text anim-popup';

            await new Promise(r => setTimeout(r, 800));
        }
        el.innerText = "";
    }

    async loadMidiIntoPlayer(optionalSrc) {
        if (!this.player) return;

        // 1. 이미 정제된 배경음 바이너리가 있다면 절대적 최우선 사용 (Overwriting 방지)
        if (this.state.backgroundMidi) {
            console.log("[GameEngine] Loading Pre-processed Background MIDI binary...");
            await this.player.loadMidi(this.state.backgroundMidi);
            return;
        }

        // 2. 소스 처리 (최초 로드 시)
        const src = optionalSrc || this.state.currentMidiSource;
        if (!src) return;

        console.log("[GameEngine] Fetching original MIDI source for processing...");
        let buffer;
        if (typeof src === 'string') {
            const res = await fetch(src);
            buffer = await res.arrayBuffer();
        } else {
            buffer = src;
        }
        await this.player.loadMidi(buffer);
    }

    returnToMenu() {
        this.state.isPlaying = false;
        if (this.player) this.player.stop();

        // 게임 컨테이너 숨기기
        this.elements.gameContainer.style.visibility = 'hidden';

        // 메인 메뉴 오버레이 표시
        this.elements.overlay.classList.remove('hidden');
        this.elements.overlay.classList.add('visible');
        this.elements.startBtn.innerText = "START SESSION";
    }

    togglePause() {
        if (!this.state.isPlaying) return;
        this.state.isPlaying = false;
        this.player.pause();
        this.elements.overlay.classList.remove('hidden');
        this.elements.overlay.classList.add('visible'); // [Fix] visible도 추가
        this.elements.startBtn.innerText = "RESUME";
    }

    failGame() {
        this.state.isPlaying = false;
        if (this.player) this.player.stop();
        this.elements.failOverlay.classList.add('visible');
    }

    showResults() {
        this.state.isPlaying = false;

        // Calculate Rank
        const total = this.state.stats.perfect + this.state.stats.good + this.state.stats.miss;
        const accuracy = total > 0 ? (this.state.stats.perfect / total) : 0;
        let rank = 'F';
        if (accuracy > 0.95) rank = 'S';
        else if (accuracy > 0.85) rank = 'A';
        else if (accuracy > 0.70) rank = 'B';
        else if (accuracy > 0.50) rank = 'C';

        // Update Result UI
        document.getElementById('result-rank').innerText = rank;
        document.getElementById('stat-perfect').innerText = this.state.stats.perfect;
        document.getElementById('stat-good').innerText = this.state.stats.good;
        document.getElementById('stat-miss').innerText = this.state.stats.miss;
        document.getElementById('stat-maxcombo').innerText = this.state.stats.maxCombo;
        document.getElementById('stat-score').innerText = this.state.score.toString().padStart(6, '0');

        this.elements.resultOverlay.classList.add('visible');
    }

    async start() {
        if (this.state.isPlaying) return;
        await this.beginGameplay();
    }

    checkHit(lane) {
        const now = this.state.currentTime;
        const windowSize = CONFIG.NOTES.JUDGMENT.GOOD * 1000;
        const notes = this.state.notes;
        let idx = this.state.nextLaneNoteIndices[lane];

        while (idx < notes.length) {
            const note = notes[idx];
            if (note.time > now + windowSize) break;

            if (note.lane === lane && !note.hit) {
                const diff = Math.abs(note.time - now);
                if (diff <= windowSize) {
                    note.hit = true;
                    this.createParticles(lane);
                    this.state.laneHitFlash[lane] = 150; // Flash for 150ms
                    this.state.lastHitTime = performance.now();

                    const judgment = this.getJudgment(diff / 1000);
                    this.applyJudgment(judgment);

                    // [요청 반영] 키음 출력 제거
                    // if (this.player && note.originalPitch !== undefined) { ... }

                    // [핵심] 단노트는 즉시 완료처리, 롱노트는 유지 상태 돌입
                    if (note.isLongNote) {
                        this.state.activeLongNotes[lane] = note;
                    } else {
                        note.completed = true;
                    }

                    this.syncCheckIndex();
                    this.state.nextLaneNoteIndices[lane] = idx + 1;
                    return;
                }
            }
            idx++;
        }
    }

    getJudgment(diff) {
        if (diff <= CONFIG.NOTES.JUDGMENT.PERFECT) return "PERFECT";
        if (diff <= CONFIG.NOTES.JUDGMENT.GOOD) return "GOOD";
        return "MISS";
    }

    calculateScore(type, combo) {
        let baseScore = 0;
        if (type === "PERFECT") baseScore = 100;
        else if (type === "GOOD") baseScore = 50;

        // Combo multiplier (simple example)
        let comboMultiplier = 1;
        if (combo >= 50) comboMultiplier = 1.5;
        else if (combo >= 20) comboMultiplier = 1.2;

        return Math.floor(baseScore * comboMultiplier);
    }

    applyJudgment(type) {
        if (type === "MISS") {
            this.state.combo = 0;
            this.state.hp = Math.max(0, this.state.hp - 10);
            this.state.stats.miss++;
            this.debug.log("Oops! Miss", "error");
        } else {
            this.state.combo++;
            this.state.stats.maxCombo = Math.max(this.state.stats.maxCombo, this.state.combo);
            if (type === "PERFECT") {
                this.state.hp = Math.min(100, this.state.hp + 2);
                this.state.stats.perfect++;
            } else {
                this.state.hp = Math.min(100, this.state.hp + 1);
                this.state.stats.good++;
            }
        }

        if (this.state.hp <= 0 && this.state.isPlaying) {
            this.failGame();
        }

        this.state.score += this.calculateScore(type, this.state.combo);

        const el = this.elements.judgmentEl;
        el.innerText = type;
        el.className = type.toLowerCase();

        // 애니메이션 초기화 후 다시 적용
        el.style.animation = 'none';
        void el.offsetWidth; // reflow
        el.style.animation = 'hit 0.3s ease-out forwards';

        this.elements.scoreEl.innerText = String(this.state.score).padStart(6, '0');
        this.elements.comboEl.innerText = this.state.combo;
    }

    loop(timestamp) {
        if (!this.state.isPlaying || !this.player) return;

        // [리드인 시스템] 시스템 시간과 오디오 시간의 동기화
        const leadInMs = (CONFIG.GAME.LEAD_IN || 0) * 1000;
        const elapsedSinceStart = performance.now() - this.state.gameStartTime;

        let newTime;

        // 오디오 재생 전 (리드인 구간: 마이너스 시간)
        if (!this.state.audioStarted) {
            newTime = elapsedSinceStart - leadInMs;

            if (newTime >= 0) {
                this.state.audioStarted = true;
                this.player.play();
                this.debug.log("음악 재생 시작!", "success");
            }
        } else {
            // 오디오 재생 중: 오디오 엔진의 시간과 실시간 보정값 사용
            const audioTime = (this.player.currentTime - (CONFIG.NOTES.JUDGMENT.AUDIO_OFFSET || 0)) * 1000;
            // [Fix] 초기 재생 지연으로 인한 시간 역행(Jumping) 방지
            // 이전 프레임보다 시간이 뒤로 가지 않도록 보정 + 최소 0이상 유지
            newTime = Math.max(this.state.currentTime, audioTime, 0);
        }

        this.state.currentTime = newTime;

        // 오디오 중단 방지 가드 (브라우저 상호작용 이슈 해결)
        if (this.audioCtx && this.audioCtx.state === 'suspended' && this.state.audioStarted) {
            this.player.resumeContext();
        }

        // Missed notes check (Sliding Window Optimization)
        const missThreshold = this.state.currentTime - (CONFIG.NOTES.JUDGMENT.GOOD * 1000) - (CONFIG.NOTES.JUDGMENT.MISS_GRACE * 1000);

        while (this.state.nextCheckIndex < this.state.notes.length) {
            const note = this.state.notes[this.state.nextCheckIndex];

            // 판정 유예 시간을 완전히 벗어난 경우
            if (note.time < missThreshold) {
                if (!note.hit && !note.completed) {
                    note.completed = true;
                    this.applyJudgment("MISS");
                }

                if (note.hit && !note.completed) {
                    break;
                }

                this.state.nextCheckIndex++;

                // 해당 레인의 타격 검색 인덱스 동기화
                if (this.state.nextLaneNoteIndices[note.lane] < this.state.nextCheckIndex) {
                    this.state.nextLaneNoteIndices[note.lane] = this.state.nextCheckIndex;
                }
            } else {
                break;
            }
        }

        // [교정] 롱노트 유지 상태 체크 (강제 오버홀드 미스 제거)
        for (let i = 0; i < CONFIG.NOTES.LANES; i++) {
            const activeLN = this.state.activeLongNotes[i];
            if (activeLN) {
                const now = this.state.currentTime;
                const endTime = activeLN.time + activeLN.duration;
                const releaseWindow = CONFIG.NOTES.JUDGMENT.GOOD * 1000; // 롱노트 떼는 판정 유예 시간

                // 안전장치: 판정선을 너무 한참(1초 이상) 지나간 경우에만 강제 정리
                if (now > endTime + 1000) {
                    if (!activeLN.completed) {
                        activeLN.completed = true;
                        this.syncCheckIndex();
                    }
                    this.state.activeLongNotes[i] = null;
                    continue;
                }

                // 롱노트 유지 중인데 키를 떼서 미스 처리해야 하는 경우
                if (!this.state.keyPressed[i] && now > endTime + releaseWindow) {
                    this.state.activeLongNotes[i] = null;
                    activeLN.completed = true;
                    this.applyJudgment("MISS");

                    if (this.player && activeLN.originalPitch !== undefined) {
                        this.player.triggerNoteOff(activeLN.originalChannel, activeLN.originalPitch);
                    }

                    this.syncCheckIndex();
                    continue;
                }

                // 유지 중 시각 효과
                if (this.state.keyPressed[i]) {
                    if (Math.random() > 0.7) this.createParticles(i);
                }
            }
        }

        this.render();
        this.updateUI();

        // Update timers
        const delta = this._lastTimestamp ? (timestamp - this._lastTimestamp) : 0;
        this.state.laneActive = this.state.laneActive.map(t => Math.max(0, t - delta));
        this.state.laneHitFlash = this.state.laneHitFlash.map(t => Math.max(0, t - delta));
        this.updateParticles(delta);
        this._lastTimestamp = timestamp;

        requestAnimationFrame((t) => this.loop(t));
    }

    updateUI() {
        if (!this.player) return;
        const duration = this.player.duration;
        const current = this.player.currentTime;
        const progress = (current / duration) * 100;
        this.elements.progressBar.style.width = `${progress}%`;

        const fmt = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        const timeStr = `${fmt(current)} / ${fmt(duration)}`;
        if (this.state.lastUIUpdate.time !== timeStr) {
            this.elements.timeDisplay.innerText = timeStr;
            this.state.lastUIUpdate.time = timeStr;
        }

        if (this.state.lastUIUpdate.score !== this.state.score) {
            this.elements.scoreEl.innerText = this.state.score.toString().padStart(6, '0');
            this.state.lastUIUpdate.score = this.state.score;
        }

        if (this.state.lastUIUpdate.combo !== this.state.combo) {
            this.elements.comboEl.innerText = this.state.combo > 0 ? `${this.state.combo} COMBO` : "";
            this.state.lastUIUpdate.combo = this.state.combo;
        }

        if (this.state.lastUIUpdate.hp !== this.state.hp) {
            this.elements.hpBar.style.height = `${this.state.hp}%`;
            this.state.lastUIUpdate.hp = this.state.hp;
        }

        // Auto-show results when finished
        if (this.player && this.player.currentTime >= this.player.duration - 0.1 && this.state.isPlaying) {
            setTimeout(() => this.showResults(), 1000);
            this.state.isPlaying = false;
        }
    }

    render() {
        if (!this.player) return;
        this.ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        const { laneWidth, hitLineY, pixelsPerMs, laneColors, laneGradients, beamGradients } = this.cache;

        // Lane lines & Active feedback
        for (let i = 0; i < CONFIG.NOTES.LANES; i++) {
            const x = i * laneWidth;

            // Draw lane background if active or key pressed
            if (this.state.laneActive[i] > 0 || this.state.keyPressed[i]) {
                const opacity = this.state.keyPressed[i] ? 1.0 : (this.state.laneActive[i] / 200);
                this.ctx.globalAlpha = opacity;
                this.ctx.fillStyle = laneGradients[i];
                this.ctx.fillRect(x, 0, laneWidth, hitLineY);
            }

            // Lane Divider
            if (i > 0) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.state.canvasHeight);
                this.ctx.stroke();
            }

            // [New] Lane Hit Flash (Satisfying hit feedback)
            if (this.state.laneHitFlash[i] > 0) {
                const opacity = this.state.laneHitFlash[i] / 150;
                this.ctx.globalAlpha = opacity;
                this.ctx.fillStyle = beamGradients[i];
                this.ctx.fillRect(x + 5, 0, laneWidth - 10, hitLineY);

                // Core bright beam
                this.ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
                this.ctx.fillRect(x + laneWidth / 2 - 2, 0, 4, hitLineY);
            }
            this.ctx.globalAlpha = 1.0;
        }

        // Side Rails (Gold/Metallic)
        this.ctx.strokeStyle = 'rgba(255, 180, 0, 0.8)';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(2, 0);
        this.ctx.lineTo(2, this.state.canvasHeight);
        this.ctx.moveTo(this.state.canvasWidth - 2, 0);
        this.ctx.lineTo(this.state.canvasWidth - 2, this.state.canvasHeight);
        this.ctx.stroke();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(255, 180, 0, 1)';
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // [New] Guilty Gear Style HUD (Rendered on Canvas)
        const hudY = 70;
        this.ctx.font = '900 42px "Outfit"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Large background shadow for score
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillText(String(this.state.score).padStart(6, '0'), this.state.canvasWidth / 2 + 2, hudY + 2);

        this.ctx.fillStyle = '#fff';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'var(--accent)';
        this.ctx.fillText(String(this.state.score).padStart(6, '0'), this.state.canvasWidth / 2, hudY);
        this.ctx.shadowBlur = 0;

        if (this.state.combo > 0) {
            const comboY = 150;
            this.ctx.font = '700 16px "Outfit"';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.fillText('COMBO', this.state.canvasWidth / 2, comboY - 45);

            const comboColor = this.state.combo >= 100 ? '#ffea00' : 'var(--accent)';
            this.ctx.font = '900 72px "Outfit"';
            this.ctx.fillStyle = comboColor;
            this.ctx.shadowBlur = 25;
            this.ctx.shadowColor = comboColor;
            this.ctx.fillText(this.state.combo, this.state.canvasWidth / 2, comboY);

            // Subtle "Combo" underline like in Guilty Gear
            this.ctx.fillStyle = comboColor;
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillRect(this.state.canvasWidth / 2 - 40, comboY + 20, 80, 4);
            this.ctx.globalAlpha = 1.0;
            this.ctx.shadowBlur = 0;
        }

        const timeWindow = this.state.canvasHeight / pixelsPerMs;
        const startTime = this.state.currentTime - 100;
        const endTime = this.state.currentTime + timeWindow + 100;

        for (let i = this.state.nextCheckIndex; i < this.state.notes.length; i++) {
            const note = this.state.notes[i];
            if (note.time > endTime) break;

            const isActiveLN = note.isLongNote && note.hit && !note.completed;
            if (note.completed) continue;
            if (!isActiveLN && (note.time + (note.duration || 0) < startTime)) continue;

            const x = note.lane * laneWidth + laneWidth / 2;
            const color = laneColors[note.lane];
            const isBeingHeld = note.isLongNote && note.hit && !note.completed;

            const visualTime = isBeingHeld ? this.state.currentTime : note.time;
            const y = hitLineY - (visualTime - this.state.currentTime) * pixelsPerMs;

            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
            this.ctx.fillStyle = color;

            if (note.isLongNote) {
                const endY = hitLineY - (note.time + note.duration - this.state.currentTime) * pixelsPerMs;
                const barWidth = 30;

                const grad = this.ctx.createLinearGradient(0, y, 0, endY);
                grad.addColorStop(0, color);
                grad.addColorStop(0.8, color);
                grad.addColorStop(1, 'white');

                this.ctx.fillStyle = grad;
                this.ctx.fillRect(x - barWidth / 2, Math.min(y, endY), barWidth, Math.abs(y - endY));

                this.ctx.beginPath();
                this.ctx.fillStyle = color;
                this.ctx.arc(x, y, 22, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.fillStyle = 'white';
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 3;
                this.ctx.arc(x, endY, 20, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.fillStyle = color;
                this.ctx.arc(x, endY, 8, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 20, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.shadowBlur = 0;
        }

        // [Enhanced] Thick Judgment Line (Satisfying DJMAX Style)
        const hitFlash = Math.max(0, (200 - (performance.now() - this.state.lastHitTime)) / 200);

        // Thick Background Glow (Cyan) - Doubled thickness (16 -> 32)
        const judgmentColor = 'var(--judgment)';
        this.ctx.fillStyle = `rgba(0, 242, 255, ${0.1 + hitFlash * 0.4})`;
        this.ctx.fillRect(0, hitLineY - 16 - hitFlash * 10, this.state.canvasWidth, 32 + hitFlash * 20);

        // Solid Core Line - Doubled thickness (6 -> 12)
        this.ctx.strokeStyle = judgmentColor;
        this.ctx.lineWidth = 12 + hitFlash * 8; // Ultra Thick!!
        this.ctx.beginPath();
        this.ctx.moveTo(0, hitLineY);
        this.ctx.lineTo(this.state.canvasWidth, hitLineY);
        this.ctx.stroke();

        if (!this.state.isMobile) {
            this.ctx.shadowBlur = 30; // Increased blur for thickness
            this.ctx.shadowColor = judgmentColor;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // Particles
        const isMobile = this.state.isMobile;
        this.cache.activeParticles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            if (isMobile) {
                // Square particles are faster to render than arcs
                const s = 4 * p.life;
                this.ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        this.ctx.globalAlpha = 1.0;
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0); // Cap at 2.0 for performance
        this.state.canvasWidth = this.elements.canvas.clientWidth;
        this.state.canvasHeight = this.elements.canvas.clientHeight;

        this.elements.canvas.width = this.state.canvasWidth * dpr;
        this.elements.canvas.height = this.state.canvasHeight * dpr;
        this.ctx.scale(dpr, dpr);

        this.cache.laneWidth = this.state.canvasWidth / CONFIG.NOTES.LANES;
        this.cache.hitLineY = this.state.canvasHeight - 50;
        this.cache.pixelsPerMs = (CONFIG.NOTES.SCROLL_SPEED / 10) * 2;
        this.cache.laneColors = [0, 1, 2, 3].map(i => CONFIG.VISUAL.COLORS[`LANE_${i}`]);

        // [Optimization] Cache Gradients
        this.cache.laneGradients = this.cache.laneColors.map(color => {
            const grad = this.ctx.createLinearGradient(0, this.cache.hitLineY, 0, 0);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            return grad;
        });

        this.cache.beamGradients = this.cache.laneColors.map(color => {
            const grad = this.ctx.createLinearGradient(0, this.cache.hitLineY, 0, 0);
            grad.addColorStop(0, color);
            grad.addColorStop(0.5, `${color}44`);
            grad.addColorStop(1, 'transparent');
            return grad;
        });
    }

    createParticles(lane) {
        const x = lane * this.cache.laneWidth + this.cache.laneWidth / 2;
        const y = this.cache.hitLineY;
        const color = this.cache.laneColors[lane];
        const count = this.state.isMobile ? 6 : 12;

        for (let i = 0; i < count; i++) {
            // Pick from pool
            const p = this.cache.particlePool.find(obj => obj.life <= 0);
            if (p) {
                p.x = x;
                p.y = y;
                p.vx = (Math.random() - 0.5) * 15;
                p.vy = (Math.random() - 0.5) * 15 - 8;
                p.life = 1.0;
                p.decay = 0.02 + Math.random() * 0.03;
                p.color = color;
                if (!this.cache.activeParticles.includes(p)) {
                    this.cache.activeParticles.push(p);
                }
            }
        }
    }

    updateParticles(delta) {
        const active = this.cache.activeParticles;
        for (let i = active.length - 1; i >= 0; i--) {
            const p = active[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4;
            p.life -= p.decay * (delta / 16);
            if (p.life <= 0) {
                active.splice(i, 1);
            }
        }
    }
}

// Start Engine
new GameEngine();
