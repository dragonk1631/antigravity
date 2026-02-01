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
            gameplayChannels: []
        };

        this.cache = {
            laneWidth: 0,
            hitLineY: 0,
            pixelsPerMs: 0
        };

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
            fullscreenBtn: document.getElementById('fullscreen-btn')
        };

        if (this.elements.debugConsole) this.elements.debugConsole.style.display = 'none';
        this.ctx = this.elements.canvas.getContext('2d');
        this.init();
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindEvents();

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

        console.log("[GameEngine] Initialized with modules");
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

        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            this.handleKeyDown(e);
        });
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // 터치 존 이벤트 바인딩 (Pointer Events for Multi-touch)
        this.elements.touchZones.forEach(zone => {
            const lane = parseInt(zone.getAttribute('data-lane'));

            zone.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                zone.releasePointerCapture(e.pointerId); // 멀티터치 간섭 방지
                this.triggerLaneDown(lane);
                zone.classList.add('active');
            });

            zone.addEventListener('pointerup', (e) => {
                e.preventDefault();
                this.triggerLaneUp(lane);
                zone.classList.remove('active');
            });

            zone.addEventListener('pointerleave', (e) => {
                e.preventDefault();
                this.triggerLaneUp(lane);
                zone.classList.remove('active');
            });

            zone.addEventListener('pointercancel', (e) => {
                e.preventDefault();
                this.triggerLaneUp(lane);
                zone.classList.remove('active');
            });
        });
    }

    triggerLaneDown(lane) {
        if (!this.state.isPlaying) return;
        this.state.keyPressed[lane] = true;
        this.state.laneActive[lane] = 200;
        // [요청 반영] 드럼 소리 제거
        // this.player.playNote(lane); 
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
            const gameData = await this.parser.parse(src, this.state.difficulty);
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

        this.elements.overlay.classList.add('hidden');
        this.resize(); // [Fix] Ensure canvas size is correct after unhiding

        // 3초 카운트다운 연출
        await this.runCountdown();

        this.state.isPlaying = true;
        this.state.gameStartTime = performance.now(); // 시스템 기준 시작 시간
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

    togglePause() {
        if (!this.state.isPlaying) return;
        this.state.isPlaying = false;
        this.player.pause();
        this.elements.overlay.classList.remove('hidden');
        this.elements.startBtn.innerText = "RESUME";
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

    applyJudgment(type) {
        if (type === "MISS") {
            this.state.combo = 0;
            this.debug.log("Oops! Miss", "error");
        } else {
            this.state.combo++;
            this.state.score += (type === "PERFECT" ? 100 : 50);
        }

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

        // Update lane feedback timers & particles
        const delta = this._lastTimestamp ? (timestamp - this._lastTimestamp) : 0;
        this.state.laneActive = this.state.laneActive.map(t => Math.max(0, t - delta));
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

        const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
        this.elements.timeDisplay.innerText = `${fmt(current)} / ${fmt(duration)}`;
    }

    render() {
        if (!this.player) return;
        this.ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

        const { laneWidth, hitLineY, pixelsPerMs, laneColors } = this.cache;

        // Lane lines & Active feedback
        for (let i = 0; i < CONFIG.NOTES.LANES; i++) {
            const x = i * laneWidth;

            // Draw lane background if active or key pressed
            if (this.state.laneActive[i] > 0 || this.state.keyPressed[i]) {
                const opacity = this.state.keyPressed[i] ? 1.0 : (this.state.laneActive[i] / 200);
                const color = laneColors[i];
                const gradient = this.ctx.createLinearGradient(0, hitLineY, 0, 0);
                gradient.addColorStop(0, `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
                gradient.addColorStop(1, 'transparent');

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x, 0, laneWidth, hitLineY);
            }

            // Lane Divider
            if (i > 0) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.state.canvasHeight);
                this.ctx.stroke();
            }
        }

        // Notes Rendering Optimization
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

        // Hit line
        this.ctx.fillStyle = 'rgba(255, 0, 122, 0.2)';
        this.ctx.fillRect(0, hitLineY - 5, this.state.canvasWidth, 10);

        // Particles
        this.state.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
    }

    resize() {
        this.state.canvasWidth = this.elements.canvas.clientWidth;
        this.state.canvasHeight = this.elements.canvas.clientHeight;
        this.elements.canvas.width = this.state.canvasWidth;
        this.elements.canvas.height = this.state.canvasHeight;

        this.cache.laneWidth = this.state.canvasWidth / CONFIG.NOTES.LANES;
        this.cache.hitLineY = this.state.canvasHeight - 50;
        this.cache.pixelsPerMs = (CONFIG.NOTES.SCROLL_SPEED / 10) * 2;
        this.cache.laneColors = [0, 1, 2, 3].map(i => CONFIG.VISUAL.COLORS[`LANE_${i}`]);
    }

    createParticles(lane) {
        const x = lane * this.cache.laneWidth + this.cache.laneWidth / 2;
        const y = this.cache.hitLineY;
        const color = this.cache.laneColors[lane];

        for (let i = 0; i < 8; i++) {
            this.state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 5,
                life: 1.0,
                color
            });
        }
    }

    updateParticles(delta) {
        for (let i = this.state.particles.length - 1; i >= 0; i--) {
            const p = this.state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // 중력
            p.life -= delta / 500;
            if (p.life <= 0) this.state.particles.splice(i, 1);
        }
    }
}

// Start Engine
new GameEngine();
