/**
 * Game - 게임 메인 루프 (횡스크롤 + 싱크 시스템)
 * 
 * SyncManager를 통한 오디오-비주얼 동기화
 */

import * as THREE from 'three';
import { CONFIG } from '../config/GameConfig.js';
import { SceneManager } from '../graphics/SceneManager.js';
import { NoteVisualizer } from '../graphics/NoteVisualizer.js';
import { Player } from '../gameplay/Player.js';
import { SyncManager } from './SyncManager.js?v=GM_ANALYSIS';
import { JudgmentUI } from '../ui/JudgmentUI.js';

export class Game {
    constructor(container, audioManager, midiData, debug = null, midiPlayer = null) {
        this.container = container;
        this.audioManager = audioManager;
        this.midiData = midiData;
        this.debug = debug;
        this.midiPlayer = midiPlayer;  // SpessaSynth 고품질 재생기

        // 게임 시스템
        this.sceneManager = null;
        this.noteVisualizer = null;
        this.player = null;
        this.syncManager = null;
        this.judgmentUI = null;

        // 게임 상태
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.coins = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hp = CONFIG.GAME.PLAYER_STATS?.MAX_HP || 100;
        this.maxHp = this.hp;
        this.lastJudgment = '';
        this.highScore = parseInt(localStorage.getItem(CONFIG.STORAGE.HIGH_SCORE_KEY) || '0');

        // 게임 시작 유예 시간 (Grace Period)
        this.graceTimer = 0;
        this.isGracePeriod = false;

        // 시간 관리
        this.clock = {
            deltaTime: 0,
            elapsedTime: 0,
            lastTime: 0
        };

        this.animationFrameId = null;
    }

    async init() {
        this.log('게임 초기화 시작');

        // 씬 매니저 초기화
        this.sceneManager = new SceneManager(this.container, this.debug);
        this.sceneManager.init();

        // 노트 시각화 초기화
        this.noteVisualizer = new NoteVisualizer(this.sceneManager, this.debug);

        // 플레이어 생성
        this.player = new Player(this.sceneManager, this.debug);
        this.player.create();

        // UI 시스템
        this.judgmentUI = new JudgmentUI(this.container);

        // 싱크 매니저 초기화
        this.syncManager = new SyncManager(this.audioManager, this.debug, this.midiPlayer);
        this.syncManager.setMidiData(this.midiData);

        // NoteVisualizer에 싱크 매니저 주입 (위치 계산용)
        this.noteVisualizer.setSyncManager(this.syncManager);

        // 판정선 가이드 생성
        const hitZoneX = CONFIG.NOTES.RHYTHM?.HIT_ZONE_X || -3.0; // NOTES.RHYTHM으로 수정
        this.noteVisualizer.createHitZone(hitZoneX);

        // BPM 설정
        const bpm = this.syncManager.getBPM();
        this.player.setBPM(bpm);
        this.log(`BPM: ${bpm}`);

        // 싱크 매니저 콜백 설정
        this.setupSyncCallbacks();

        // UI 초기화
        this.initUI();

        this.log('게임 초기화 완료');

        return this;
    }

    /**
     * 싱크 매니저 및 플레이어 콜백 설정
     */
    setupSyncCallbacks() {
        if (!this.syncManager) return;

        // 장애물 스폰 콜백
        this.syncManager.onSpawnObstacle = (note, type) => {
            // NoteVisualizer에 타입 문자열을 직접 전달 ('kick', 'snare', 'bird')
            this.noteVisualizer.spawnDrumNote(note, type);
        };

        // 수집 아이템 스폰 콜백
        this.syncManager.onSpawnCollectible = (note, noteType, context = 'default') => {
            if (noteType === 'melody') {
                this.noteVisualizer.spawnMelodyNote(note);
            } else {
                // 드럼 트랙인 경우 context(동시 발생 장애물)를 사용하여 높이 결정
                this.noteVisualizer.spawnDrumNote(note, true, context);
            }
        };

        // 플레이어 액션 콜백 (SFX 및 시각 효과)
        if (this.player) {
            this.player.onJump = () => {
                this.noteVisualizer.pulseHitZone();
                this.audioManager.playJumpSFX();
            };
            this.player.onSlide = () => {
                this.noteVisualizer.pulseHitZone();
                this.audioManager.playSlideSFX();
            };
            this.player.onAttack = () => {
                this.noteVisualizer.pulseHitZone();
                this.audioManager.playAttackSFX();
            };
        }
    }

    /**
     * 판정 결과 처리 (아이템 획득 시 점수 등)
     */
    handleJudgment(judgment, type, diff = 0) {
        const scores = CONFIG.NOTES.SCORE;

        if (judgment === 'COLLECT') {
            const baseScore = scores?.PERFECT || 1000;
            const comboMultiplier = 1 + (Math.floor(this.combo / 10) * 0.1);
            this.score += Math.floor(baseScore * comboMultiplier);
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        }

        if (this.onGameUpdate) this.onGameUpdate();
    }

    /**
     * 드럼 타입 결정
     */
    getDrumType(midiNote) {
        switch (midiNote) {
            case 36: case 35: return 'kick';
            case 38: case 40: return 'snare';
            default: return 'hihat';
        }
    }

    initUI() {
        const highScoreEl = document.getElementById('high-score');
        if (highScoreEl) {
            highScoreEl.textContent = this.highScore.toLocaleString();
        }

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retry());
        }

        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.backToMenu());
        }
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.clock.lastTime = performance.now();

        // 유예 시간 초기화
        this.graceTimer = CONFIG.GAME.PLAYER_STATS?.START_GRACE_PERIOD || 3.0;
        this.isGracePeriod = true;

        const hud = document.getElementById('hud');
        const controls = document.getElementById('controls');
        const startOverlay = document.getElementById('start-overlay');

        if (hud) hud.style.display = 'block';
        if (controls) controls.style.display = 'flex';
        if (startOverlay) startOverlay.classList.add('hidden');

        // 게임 시작 유예 시간 설정
        this.isGracePeriod = true;
        this.graceTimer = CONFIG.GAME.PLAYER_STATS?.START_GRACE_PERIOD || 3.0;

        // 싱크 매니저 시작
        this.syncManager.start();

        // MIDI 플레이어 시작
        if (this.midiPlayer) {
            this.midiPlayer.setTime(0);
            this.midiPlayer.play();
        }

        // 게임 루프 시작
        this.gameLoop();

        this.log('게임 시작');
    }

    gameLoop() {
        if (!this.isRunning) return;

        const now = performance.now();
        this.clock.deltaTime = (now - this.clock.lastTime) / 1000;
        this.clock.elapsedTime += this.clock.deltaTime;
        this.clock.lastTime = now;

        // 유예 시간 업데이트
        if (this.isGracePeriod) {
            this.graceTimer -= this.clock.deltaTime;
            if (this.graceTimer <= 0) {
                this.isGracePeriod = false;
                this.log('Grace Period 종료! 이제부터 대미지를 입습니다.', 'warn');
            }
        }

        if (this.clock.deltaTime > CONFIG.GAME.MAX_DELTA_TIME) {
            this.clock.deltaTime = 0.016;
        }

        if (!this.isPaused) {
            this.update(this.clock.deltaTime, this.clock.elapsedTime);
        }

        this.sceneManager.render();
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime, elapsedTime) {
        // 싱크 매니저 업데이트 (스폰/사운드 타이밍 관리)
        this.syncManager.update();

        // 씬 스크롤 (정밀 음악 시간 기반)
        const musicTime = this.syncManager.getMusicTime();
        this.sceneManager.updateScrollFromTime(musicTime);

        // 곡 종료 감지 (SpessaSynth duration 기반)
        if (this.midiPlayer) {
            const duration = this.midiPlayer.getDuration();
            if (duration > 0 && musicTime >= duration - 0.1) {
                this.gameClear();
                return;
            }
        }

        // 플레이어 업데이트
        if (this.player) {
            this.player.update(deltaTime, elapsedTime);
        }

        // 노트 시각화 업데이트
        if (this.noteVisualizer) {
            this.noteVisualizer.update(deltaTime);
            this.checkCollisions();
        }

        this.updateHUD();
    }

    checkCollisions() {
        if (!this.player) return;

        const playerBox = this.player.getBoundingBox();
        const playerX = this.player.getWorldX();
        const notesToCheck = this.noteVisualizer.activeNotes;

        for (let i = notesToCheck.length - 1; i >= 0; i--) {
            const note = notesToCheck[i];
            const userData = note.userData;

            // 무적 상태일 때 장애물 충돌은 무시하지만 아이템 수집은 허용
            if (this.player.isInvincible && userData.isObstacle) continue;
            const noteX = note.position.x;

            // X축 근접 검사 (성능 최적화)
            if (Math.abs(noteX - playerX) < 3.0) {
                const noteBox = new THREE.Box3().setFromObject(note);

                // 판정 범위를 실제 모델보다 미세하게 작게 설정하여 "아슬아슬하게 피했다"는 느낌 강화
                noteBox.expandByScalar(-0.2);
                if (playerBox.intersectsBox(noteBox)) {
                    this.handleCollision(note, i);
                }
            }
        }
    }

    handleCollision(note, index) {
        const userData = note.userData;

        if (userData.isObstacle) {
            // 특별 타입: 새(Bird) - 공격으로 처치 가능
            if (userData.type === 'bird' && this.player.isAttacking) {
                this.log('새 처치!', 'success');
                this.handleJudgment('PERFECT', 'bird'); // 새 처치는 무조건 퍼펙트 판정
                this.noteVisualizer.removeNote(note);
                return;
            }

            // 장애물 속성에 따른 회피 여부 판단 (상태 기반 판정)
            let isDodged = false;
            if (userData.requiresJump && (this.player.state === 'jumping' || this.player.state === 'doubleJump')) {
                isDodged = true;
            } else if (userData.requiresSlide && this.player.state === 'sliding') {
                isDodged = true;
            }

            if (isDodged) {
                // 회피 성공
                this.dodgeSuccess(note);
                this.noteVisualizer.removeNote(note);
                return;
            }

            // 장애물 충돌: 데미지
            if (!this.isGracePeriod && !this.player.isInvincible) {
                this.playerHit(note);
                this.noteVisualizer.removeNote(note);
            }
        } else if (userData.isCollectible) {
            // 아이템 및 코인 수집
            this.collectItem(note);
            this.noteVisualizer.removeNote(note);
        }
    }

    collectItem(note) {
        const comboMultiplier = 1 + Math.floor(this.combo / 10) * CONFIG.SCORE.COMBO_MULTIPLIER_PER_10;
        const points = CONFIG.SCORE.ITEM_BASE_SCORE * comboMultiplier;

        this.score += Math.floor(points);
        this.coins += CONFIG.SCORE.COINS_PER_ITEM;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        this.player.playCollectEffect();
        this.audioManager.playTone(CONFIG.AUDIO.COLLECT_SOUND_FREQ, 0.08, 'sine');
    }

    dodgeSuccess(note) {
        const comboMultiplier = 1 + Math.floor(this.combo / 10) * CONFIG.SCORE.COMBO_MULTIPLIER_PER_10;
        const points = CONFIG.SCORE.DODGE_BASE_SCORE * comboMultiplier;

        this.score += Math.floor(points);
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        this.audioManager.playTone(CONFIG.AUDIO.DODGE_SOUND_FREQ, 0.05, 'square');
    }

    playerHit(note) {
        this.combo = 0;

        // HP 감소
        this.hp = Math.max(0, this.hp - (CONFIG.GAME.PLAYER_STATS?.DAMAGE || 10));

        this.player.playHitEffect();
        this.audioManager.playTone(CONFIG.AUDIO.HIT_SOUND_FREQ, 0.2, 'sawtooth');

        this.log(`피격! HP: ${this.hp}`, 'error');
        this.updateHUD(); // HP바 즉시 갱신 필요

        if (this.hp <= 0) {
            this.gameClear(); // Game Over 처리 (임시)
        }
    }

    updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) {
            scoreEl.textContent = Math.floor(this.score).toLocaleString();
        }

        const coinEl = document.getElementById('coin-count');
        if (coinEl) {
            coinEl.textContent = this.coins.toLocaleString();
        }

        const comboDisplay = document.getElementById('combo-display');
        const comboCount = document.getElementById('combo-count');
        if (comboDisplay && comboCount) {
            if (this.combo >= (CONFIG.SCORE?.COMBO_DISPLAY_MIN || 2)) {
                comboCount.textContent = this.combo;
                comboDisplay.classList.remove('hidden');

                // 콤보 애니메이션 리셋
                comboCount.style.animation = 'none';
                comboCount.offsetHeight; // trigger reflow
                comboCount.style.animation = 'scaleBump 0.1s ease-out';
            } else {
                comboDisplay.classList.add('hidden');
            }
        }

        const hpBar = document.getElementById('hp-fill');
        if (hpBar) {
            const hpPercent = (this.hp / this.maxHp) * 100;
            hpBar.style.width = `${Math.max(0, hpPercent)}%`;

            if (hpPercent > 50) {
                hpBar.style.backgroundColor = '#4ade80';
            } else if (hpPercent > 20) {
                hpBar.style.backgroundColor = '#ffd93d';
            } else {
                hpBar.style.backgroundColor = '#ff6b6b';
            }
        }

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(CONFIG.STORAGE.HIGH_SCORE_KEY, this.highScore.toString());
        }

        const highScoreEl = document.getElementById('high-score');
        if (highScoreEl) {
            highScoreEl.textContent = this.highScore.toLocaleString();
        }

        // 디버그 오버레이 업데이트
        this.updateDebugOverlay();
    }

    updateDebugOverlay() {
        if (!this.syncManager || !this.syncManager.midiData) return;

        // 1. 오버레이 컨테이너 초기화 (최초 1회)
        let container = document.getElementById('midi-track-list');
        if (!container) {
            const overlay = document.getElementById('midi-debug-overlay');
            if (overlay) {
                container = document.createElement('div');
                container.id = 'midi-track-list';
                container.style.marginTop = '10px';
                container.style.maxHeight = '300px';
                container.style.overflowY = 'auto';
                container.style.fontSize = '10px';
                overlay.appendChild(container);
            } else {
                return;
            }
        }

        // 2. 트랙별 상태 렌더링
        const tracks = this.syncManager.midiData.tracks;
        const activity = this.syncManager.trackActivity || [];
        const roles = this.syncManager.trackRoles || { melody: -1, bass: -1, rhythm: -1 }; // 역할 정보 가져오기
        const now = performance.now();

        let html = '<div style="margin-bottom:5px; padding-bottom:5px; border-bottom:1px solid #555;">';
        html += `<span style="color:#ff4de4">Melody: ${roles.melody}</span> | `;
        html += `<span style="color:#ff6b9d">Bass: ${roles.bass}</span> | `;
        html += `<span style="color:#c44dff">Rhythm: ${roles.rhythm}</span>`;
        html += '</div>';

        html += '<table style="width:100%; border-collapse: collapse;">';
        tracks.forEach((track, index) => {
            const act = activity[index];
            const isActive = act && (now - act.time < act.duration * 1000 + 100);
            const activeColor = isActive ? '#0f0' : '#333';
            let value = isActive ? `♪ ${act.note}` : '-';

            // 역할 표시
            let roleIcon = '';
            if (index === roles.melody) roleIcon = '🎤';
            else if (index === roles.bass) roleIcon = '🎸';
            else if (index === roles.rhythm) roleIcon = '🥁';

            // 악기 이름
            const instName = (track.instrument?.name || 'Unknown').substring(0, 15);

            html += `
                <tr style="color: ${isActive ? '#fff' : '#666'}; background: ${isActive ? 'rgba(0,255,0,0.1)' : 'transparent'}">
                    <td style="width: 20px;">${index}</td>
                    <td style="width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${roleIcon} ${instName}</td>
                    <td style="text-align: right; font-weight: bold; color: ${activeColor}">${value}</td>
                </tr>
            `;
        });
        html += '</table>';

        container.innerHTML = html;

        // 기존 Last Spawn 정보도 업데이트
        if (this.syncManager.lastSpawnInfo) {
            const info = this.syncManager.lastSpawnInfo;
            const typeEl = document.getElementById('debug-spawn-type');
            const trackEl = document.getElementById('debug-spawn-track');
            const instEl = document.getElementById('debug-spawn-inst');
            const pitchEl = document.getElementById('debug-spawn-pitch');

            if (typeEl) {
                typeEl.textContent = info.type.toUpperCase();
                typeEl.style.color = info.type === 'kick' ? '#ff6b9d' : (info.type === 'bird' ? '#ff4de4' : '#c44dff');
            }
            if (trackEl) trackEl.textContent = `Track: ${info.track || 'Untitled'}`;
            if (instEl) instEl.textContent = `Inst: ${info.instrument || 'Unknown'} (Prog: ${info.prog})`;
            if (pitchEl) pitchEl.textContent = `Note: ${info.pitch} @ ${info.time}s`;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.syncManager.pause();
            if (this.midiPlayer) this.midiPlayer.pause();
            this.log('일시정지');
        } else {
            this.syncManager.resume();
            if (this.midiPlayer) this.midiPlayer.play();
            this.clock.lastTime = performance.now();
            this.log('재개');
        }
    }

    stop() {
        this.isRunning = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.syncManager.stop();
        if (this.midiPlayer) this.midiPlayer.stop();
        this.log('게임 정지');
    }

    /**
     * 게임 오버 처리
     */
    gameOver() {
        if (!this.isRunning) return;

        this.log('게임 오버!', 'error');
        this.stop();

        this.showResultScreen(false);
    }

    /**
     * 곡 클리어 처리
     */
    gameClear() {
        if (!this.isRunning) return;

        this.log('곡 클리어!', 'success');
        this.stop();

        this.showResultScreen(true);
    }

    /**
     * 결과 화면 표시 (통합)
     */
    showResultScreen(isClear) {
        const resultScreen = document.getElementById('result-screen');
        const titleEl = document.getElementById('result-title');
        const rankEl = document.getElementById('result-rank');
        const finalScoreEl = document.getElementById('final-score');
        const finalComboEl = document.getElementById('final-combo');
        const finalCoinsEl = document.getElementById('final-coins');

        if (titleEl) {
            titleEl.textContent = isClear ? 'SONG CLEAR!' : 'GAME OVER';
            titleEl.className = `result-title ${isClear ? 'clear' : ''}`;
        }

        if (finalScoreEl) finalScoreEl.textContent = Math.floor(this.score).toLocaleString();
        if (finalComboEl) finalComboEl.textContent = this.maxCombo.toLocaleString();
        if (finalCoinsEl) finalCoinsEl.textContent = this.coins.toLocaleString();

        // 랭크 계산
        const rank = this.calculateRank(isClear);
        if (rankEl) {
            rankEl.textContent = rank;
            // 랭크별 색상 (옵션)
            if (rank === 'S') rankEl.style.color = '#ffd93d';
            else if (rank === 'A') rankEl.style.color = '#4ade80';
            else if (rank === 'B') rankEl.style.color = '#6e8efb';
            else rankEl.style.color = '#ff6b6b';
        }

        if (resultScreen) {
            resultScreen.classList.remove('hidden');
        }
    }

    /**
     * 랭크 계산 로직
     */
    calculateRank(isClear) {
        if (!isClear) return 'F';

        // HP와 콤보 기반 점수 (0~100)
        const hpScore = (this.hp / this.maxHp) * 40; // 최대 40점
        const comboScore = Math.min(60, (this.maxCombo / 50) * 60); // 예: 50콤보 이상이면 만점(60점)

        const total = hpScore + comboScore;

        if (total >= 90) return 'S';
        if (total >= 70) return 'A';
        if (total >= 40) return 'B';
        return 'C';
    }

    /**
     * 메인 메뉴로 돌아가기
     */
    backToMenu() {
        this.stop();

        // 모든 오버레이 숨기기
        const overlays = document.querySelectorAll('.screen-overlay');
        overlays.forEach(o => o.classList.add('hidden'));

        // HUD 및 컨트롤 숨기기
        const hud = document.getElementById('hud');
        const controls = document.getElementById('controls');
        if (hud) hud.style.display = 'none';
        if (controls) controls.style.display = 'none';

        // 곡 선택 화면 표시
        const songSelectScreen = document.getElementById('song-select-screen');
        if (songSelectScreen) songSelectScreen.classList.add('active');

        this.log('메인 메뉴로 이동');
    }

    /**
     * 재시도 (재시작)
     */
    retry() {
        this.log('재시도 시작');

        // UI 초기화 (결과 화면 등 모든 오버레이 숨기기)
        const resultScreen = document.getElementById('result-screen');
        if (resultScreen) resultScreen.classList.add('hidden');

        const overlays = document.querySelectorAll('.screen-overlay');
        overlays.forEach(o => o.classList.add('hidden'));

        // 상태 초기화
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hp = this.maxHp;
        this.coins = 0;

        // 매니저 초기화 및 재시작
        this.noteVisualizer.reset();
        this.player.reset();

        // 다시 시작 (약간의 지연 후)
        setTimeout(() => {
            this.start();
        }, 100);
    }

    log(message, type = 'info') {
        if (type === 'error' || type === 'warn' || CONFIG.GAME.VERBOSE_LOGGING) {
            if (this.debug) {
                this.debug.log(`[Game] ${message}`, type);
            }
            console.log(`[Game] ${message}`);
        }
    }
}
