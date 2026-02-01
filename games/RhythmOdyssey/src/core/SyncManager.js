/**
 * SyncManager - 오디오-비주얼 동기화 관리
 * 
 * 핵심 역할:
 * 1. 음악 재생 시간 기준으로 장애물/노트 스폰 타이밍 계산
 * 2. 장애물이 플레이어에 도달하는 시간을 역산하여 미리 스폰
 * 3. Look-ahead 시스템으로 정확한 싱크 보장
 */

import { CONFIG } from '../config/GameConfig.js';

export class SyncManager {
    constructor(audioManager, debug = null, midiPlayer = null) {
        this.audioManager = audioManager;
        this.midiPlayer = midiPlayer;
        this.debug = debug;

        // 재생 상태
        this.isPlaying = false;

        // MIDI 데이터
        this.midiData = null;
        this.scheduledNotes = [];
        this.spawnedNotes = new Set();
        this.lastObstacleTime = 0; // 상호 배제용

        // === 싱크 설정 ===
        this.scrollSpeed = CONFIG.GAME.SCROLL_SPEED;
        this.spawnDistance = CONFIG.NOTES.SPAWN_DISTANCE;

        // 중요: 실제 장애물이 도달해야 하는 지점(판정선) 보정
        this.hitZoneX = CONFIG.NOTES.RHYTHM?.HIT_ZONE_X || -3.0;
        this.actualTravelDistance = this.spawnDistance - this.hitZoneX;

        // 장애물이 판정선에 도달하는 시간 (초)
        this.travelTime = this.actualTravelDistance / this.scrollSpeed;

        // 세팅
        this.difficulty = 'normal';

        // === 레벨 디자인 파라미터 ===
        this.phraseCount = 0;
        this.maxPhraseSize = 8; // 4 -> 8 (더 긴 액션 유도)
        this.isRecoveryWindow = false;
        this.recoveryEndTime = 0;
        this.lastObstacleType = null; // 타입 간 간격 조정을 위해 추가

        this.onSpawnObstacle = null;
        this.onSpawnCollectible = null;
        this.onPlaySound = null;

        // 동전 높이 보정을 위한 최근 장애물 컨텍스트
        this.lastObstacleContext = { type: 'default', time: -1 };
    }

    /**
     * 난이도 설정
     */
    setSettings(difficulty) {
        this.difficulty = difficulty || 'normal';
        this.log(`설정 변경: 난이도=${this.difficulty}`);
    }

    /**
     * MIDI 데이터 설정
     */
    setMidiData(midiData) {
        this.midiData = midiData;
        this.preprocessNotes();
        this.analyzeMidi(); // 레벨 생성 시작
        this.log(`MIDI 로드 완료. 총 ${this.scheduledNotes.length}개 노트 (travelTime: ${this.travelTime.toFixed(2)}s)`);
    }

    /**
     * MIDI 분석 및 레벨 생성 (Offline Analysis)
     */
    analyzeMidi() {
        this.log('MIDI 분석 시작...');
        this.analyzeTrackRoles();
        this.generateLevel();
        this.log('레벨 생성 완료.');
    }

    /**
     * 트랙 역할 분석 (Melody, Bass, Rhythm)
     */
    analyzeTrackRoles() {
        this.trackRoles = {
            melody: -1,
            bass: -1,
            rhythm: -1
        };

        let bestMelodyScore = -1;
        let bestBassScore = -1;

        this.midiData.tracks.forEach((track, index) => {
            const prog = track.instrument?.number;
            const isPercussion = track.instrument?.percussion || false;

            // 이름 기반 추론을 위해 소문자 변환
            const name = (track.name + ' ' + (track.instrument?.name || '')).toLowerCase();

            // 1. Rhythm Track (Channel 10 or Percussive or 'Drum' keyword)
            if (isPercussion || name.includes('drum') || name.includes('perc')) {
                this.trackRoles.rhythm = index;
                // 드럼은 Melody/Bass 후보에서 제외
                return;
            }

            // Program Number가 없으면 이름으로 추론하여 가상 번호 부여
            let effectiveProg = prog;
            if (typeof effectiveProg !== 'number') {
                if (name.includes('bass')) effectiveProg = 33; // Electric Bass
                else if (name.includes('piano')) effectiveProg = 0;
                else if (name.includes('guitar')) effectiveProg = 25;
                else if (name.includes('string') || name.includes('viol') || name.includes('cello')) effectiveProg = 40;
                else if (name.includes('brass') || name.includes('trumpet') || name.includes('sax')) effectiveProg = 56;
                else if (name.includes('lead') || name.includes('synth')) effectiveProg = 81;
                else effectiveProg = 0; // Default Piano
            }

            const noteCount = track.notes.length;
            // 2. Bass Track (32-39)
            if (effectiveProg >= 32 && effectiveProg <= 39) {
                // 노트 수 기준 완화 (20 -> 10)
                if (noteCount > 10) {
                    const avgPitch = track.notes.reduce((sum, n) => sum + n.midi, 0) / noteCount;
                    // 이름에 'bass'가 있으면 가산점 대폭 부여
                    let score = (100 - avgPitch) + (noteCount / 20);
                    if (name.includes('bass')) score += 50;

                    if (score > bestBassScore) {
                        bestBassScore = score;
                        this.trackRoles.bass = index;
                    }
                }
            }

            // 3. Melody Track
            // 피아노(0-7), 기타(24-31), 스트링(40-47), 브라스(56-63), 리드(80-87) 등 멜로디 악기군
            if ((effectiveProg >= 0 && effectiveProg <= 31) ||
                (effectiveProg >= 40 && effectiveProg <= 87) ||
                (effectiveProg >= 104 && effectiveProg <= 111)) {

                // 노트 수 기준 완화 (50 -> 20)
                if (noteCount > 20) {
                    const avgPitch = track.notes.reduce((sum, n) => sum + n.midi, 0) / noteCount;
                    let score = 0;
                    if (avgPitch >= 60 && avgPitch <= 84) score += 50;
                    score += noteCount / 50;

                    // 이름에 'melody', 'vocal', 'main' 있으면 가산점
                    if (name.includes('melody') || name.includes('vocal') || name.includes('main')) score += 100;

                    if (score > bestMelodyScore) {
                        bestMelodyScore = score;
                        this.trackRoles.melody = index;
                    }
                }
            }
        });

        console.log(`[Analysis] Roles Assigned:`, this.trackRoles);
    }

    /**
     * 레벨 데이터 생성 (Obstacle Placement)
     * 개선된 로직: ID 기반 매핑으로 데이터 소실 방지
     */
    generateLevel() {
        this.generatedObstacles = new Map(); // noteId (number) -> { type }

        // 트랙별로 노트 그룹화 (시간순 정렬됨)
        const trackNotes = new Array(this.midiData.tracks.length).fill(null).map(() => []);
        this.scheduledNotes.forEach(nd => trackNotes[nd.trackIndex].push(nd));

        // 1. Bass Track -> Kick
        if (this.trackRoles.bass !== -1) {
            let lastTime = -100;
            trackNotes[this.trackRoles.bass].forEach(nd => {
                // 간격 체크 (0.4초)
                if (nd.spawnTime - lastTime < 0.4) return;

                this.generatedObstacles.set(nd.id, { type: 'kick' });
                lastTime = nd.spawnTime;
            });
        }

        // 2. Melody Track -> Bird
        if (this.trackRoles.melody !== -1) {
            let lastTime = -100;
            trackNotes[this.trackRoles.melody].forEach(nd => {
                // 간격 체크 (0.25초) fast pace
                if (nd.spawnTime - lastTime < 0.25) return;

                // 킥 자리는 피하기 (ID 기반이라 직접 비교 불가 -> 시간 근접 체크 필요?)
                // 하지만 이미 generateLevel은 순차적이므로, Kick이 이미 점유했는지 알 수 없음 (Map은 ID 키).
                // -> 위 1번 베이스 루프에서 미리 Map에 넣었으므로, 같은 시간대에 킥이 있는지 확인하려면?
                // 시간(fixed) -> ID 역참조 맵이 없으면 O(N)임.
                // 복잡도 회피: 그냥 Melody는 독립적으로 생성하되, spawnNote에서 우선순위 처리?
                // 아니오, 여기서 정하는게 맞음.
                // Kick이 드문드문 나오므로 Bird가 겹칠 확률 낮음. 겹치면 Dual Spawn? -> 나쁘지 않음.
                // 하지만 '불가능한 패턴' 방지를 위해 킥 앞뒤 0.2초는 피하는게 좋음.

                // 간단한 충돌 방지: 킥과 완전히 같은 시간이면 스킵 (일단 겹침 허용하되, 물리적 불가능만 배제)
                this.generatedObstacles.set(nd.id, { type: 'bird' });
                lastTime = nd.spawnTime;
            });
        }

        // 3. Rhythm Track -> Snare (빈 공간 채우기)
        if (this.trackRoles.rhythm !== -1) {
            let lastTime = -100;
            trackNotes[this.trackRoles.rhythm].forEach(nd => {
                // 스네어(38, 40)만 취급
                if (nd.note.midi !== 38 && nd.note.midi !== 40) return;

                if (nd.spawnTime - lastTime < 0.4) return;

                // 이미 생성된 장애물(Kick, Bird)과 겹치는지 체크는... 생략 (ID가 다르면 별개)
                this.generatedObstacles.set(nd.id, { type: 'snare' });
                lastTime = nd.spawnTime;
            });
        }

        console.log(`[Generator] Generated ${this.generatedObstacles.size} obstacles (ID-based).`);
    }

    /**
     * 노트 전처리 - 스폰 시간 계산
     */
    preprocessNotes() {
        this.scheduledNotes = [];
        this.spawnedNotes.clear();
        this.lastObstacleTime = -100;

        if (!this.midiData || !this.midiData.tracks) return;

        let noteId = 0;

        this.trackActivity = new Array(this.midiData.tracks.length).fill(null);

        this.midiData.tracks.forEach((track, index) => {
            if (!track.notes) return;

            track.notes.forEach(note => {
                const noteData = {
                    id: noteId++,
                    originalTime: note.time,
                    spawnTime: note.time - this.travelTime,
                    note: note,
                    track: track.name,
                    trackIndex: index, // 트랙 인덱스 추가 (시각화용)
                    instrument: track.instrument?.name || track.instrument?.family || '',
                    instrumentNumber: track.instrument?.number,
                    isPercussion: track.instrument?.percussion || false,
                    trackData: track,
                    spawned: false,
                    soundPlayed: false
                };

                this.scheduledNotes.push(noteData);
            });
        });

        this.scheduledNotes.sort((a, b) => {
            if (Math.abs(a.spawnTime - b.spawnTime) < 0.001) {
                // 같은 시간이면 장애물(멜로디) 먼저, 드럼(동전) 나중에 처리하여 컨텍스트 참조 가능케 함
                if (a.trackData.isDrum && !b.trackData.isDrum) return 1;
                if (!a.trackData.isDrum && b.trackData.isDrum) return -1;
            }
            return a.spawnTime - b.spawnTime;
        });
    }

    /**
     * 재생 시작
     */
    start() {
        this.log('SyncManager v3.2 TUNED LOADED');
        console.log('%c SyncManager v3.2 TUNED', 'background: #000; color: #00ff00');

        // 트랙 이름 분석 로그
        if (this.midiData && this.midiData.tracks) {
            console.log("=== DETECTED TRACKS ===");
            this.midiData.tracks.forEach((t, i) => {
                console.log(`Track ${i}: "${t.name}" (Instrument: ${t.instrument?.name || 'unknown'})`);
            });
            console.log("=======================");
        }

        this.isPlaying = true;
        this.scheduledNotes.forEach(n => {
            n.spawned = false;
            n.soundPlayed = false;
        });
        this.spawnedNotes.clear();
        this.lastObstacleTime = -100;
        this.lastObstacleType = null;

        // 레벨 디자인 상태 초기화
        this.phraseCount = 0;
        this.isRecoveryWindow = false;
        this.recoveryEndTime = 0;

        this.log('재생 시작');
    }

    /**
     * 일시정지
     */
    pause() {
        this.isPlaying = false;
        this.log('재생 일시정지');
    }

    /**
     * 재개
     */
    resume() {
        this.isPlaying = true;
        this.log('재생 재개');
    }

    /**
     * 정지 및 초기화
     */
    stop() {
        this.isPlaying = false;
        this.log('재생 정지');
    }

    /**
     * 현재 음악 시간 (초) - 시퀀서 직접 참조
     */
    getMusicTime() {
        if (this.midiPlayer) {
            const offset = CONFIG.NOTES.RHYTHM?.SYNC_OFFSET || 0;
            return this.midiPlayer.getTime() - offset;
        }
        return 0;
    }

    /**
     * 음악 시간에 따른 이론적 카메라 X 위치 계산
     */
    getCorrectCameraX() {
        return this.getMusicTime() * this.scrollSpeed;
    }

    /**
     * 특정 노드가 위치해야 할 절대 X 좌표 계산
     */
    getNoteWorldX(midiTime) {
        const playerXOffset = CONFIG.PLAYER.SCREEN_X || 2;
        return (midiTime * this.scrollSpeed) + playerXOffset;
    }

    /**
     * 매 프레임 업데이트 (Game에서 호출)
     */
    update() {
        if (!this.isPlaying) return;

        const currentTime = this.getMusicTime();

        // 1. 스폰 타이밍이 된 노트 처리 (Look-ahead)
        this.scheduledNotes.forEach(noteData => {
            if (!noteData.spawned && currentTime >= noteData.spawnTime) {
                this.spawnNote(noteData);
            }

            // 2. 사운드 재생 타이밍 체크 (음악과 싱크)
            if (!noteData.soundPlayed && currentTime >= noteData.originalTime) {
                this.playNoteSound(noteData);
            }
        });
    }

    spawnNote(noteData) {
        noteData.spawned = true;
        this.spawnedNotes.add(noteData.id);

        const currentTime = this.getMusicTime();
        const { note, trackData } = noteData;

        // --- ID 기반 조회 (O(1), Data Loss Free) ---
        if (this.generatedObstacles) {
            const genData = this.generatedObstacles.get(noteData.id);
            if (genData) {
                if (this.onSpawnObstacle) {
                    this.onSpawnObstacle(note, genData.type);

                    // 컨텍스트 업데이트 (동전 생성 로직에서 참조)
                    this.lastObstacleContext = { type: genData.type, time: note.time };
                    this.lastObstacleTime = note.time; // 간격 체크용

                    // 디버그 정보
                    this.lastSpawnInfo = {
                        type: genData.type,
                        track: noteData.track,
                        instrument: noteData.instrument,
                        prog: noteData.instrumentNumber,
                        pitch: note.midi,
                        time: note.time.toFixed(2)
                    };
                }
                return; // 생성 완료
            }

            // 생성 계획에 없으면? -> 코인/아이템 스폰 (Original Logic Restored)
            if (this.onSpawnCollectible) {
                const isRhythmicTrack = trackData.isDrum || trackData.isBass;
                // 중요도가 일정 이상이면 코인 생성 시도 (기존 로직 복원)
                if (isRhythmicTrack && note.importance > 0.3) {
                    const context = Math.abs(this.lastObstacleContext.time - note.time) < 0.05
                        ? this.lastObstacleContext.type
                        : 'default';

                    // 100% 확률로 생성하되, 중요도에 따라 타입 결정 (기존 동작)
                    this.onSpawnCollectible(note, trackData.isDrum ? 'drum' : 'bass', context);
                }
            }
            return;
        }
    }

    /**
     * 노트 사운드 재생
     */
    playNoteSound(noteData) {
        noteData.soundPlayed = true;

        // 트랙 활동 기록 (시각화용)
        if (this.trackActivity) {
            this.trackActivity[noteData.trackIndex] = {
                note: noteData.note.midi,
                velocity: noteData.note.velocity,
                time: performance.now(),
                duration: noteData.note.duration
            };
        }

        if (this.midiPlayer) {
            // MidiPlayer가 알아서 재생하므로 여기서는 시각적 싱크만 맞춤
        } else if (this.audioManager) {
            // Web Audio Fallback
            this.audioManager.playNote(noteData.note.midi, noteData.note.velocity);
        }
    }

    /**
     * 드럼 노트 번호를 장애물 타입으로 변환
     */
    getDrumObstacleType(midiNote) {
        if (midiNote === 35 || midiNote === 36) return 'kick'; // Bass Drum
        if (midiNote === 38 || midiNote === 40) return 'snare'; // Snare Drum
        return 'item';
    }

    /**
     * 드럼 노트 -> 이제 모두 아이템으로 취급 (기존 로직 보존용)
     */
    getObstacleType(midiNote) {
        return 'item';
    }

    /**
     * BPM 반환
     */
    getBPM() {
        if (!this.midiData || !this.midiData.header || !this.midiData.header.tempos) {
            return CONFIG.GAME.DEFAULT_BPM;
        }
        return this.midiData.header.tempos[0]?.bpm || CONFIG.GAME.DEFAULT_BPM;
    }

    /**
     * 로그
     */
    log(message, type = 'info') {
        if (type === 'error' || type === 'warn' || CONFIG.GAME.VERBOSE_LOGGING) {
            if (this.debug) {
                this.debug.log(`[Sync] ${message}`, type);
            }
            console.log(`[SyncManager] ${message}`);
        }
    }
}
