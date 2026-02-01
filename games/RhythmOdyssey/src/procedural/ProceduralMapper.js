/**
 * ProceduralMapper - 절차적 생성 통합 클래스
 * MIDI 데이터를 게임 요소로 변환
 */

export class ProceduralMapper {
    constructor(debug = null) {
        this.debug = debug;

        // 피치 매핑 설정
        this.pitchConfig = {
            minPitch: 36, // C2
            maxPitch: 84, // C6
            minHeight: 0,
            maxHeight: 10
        };

        // 드럼 매핑 (GM Standard)
        this.drumMap = {
            35: { type: 'kick', obstacle: 'jump' },
            36: { type: 'kick', obstacle: 'jump' },
            38: { type: 'snare', obstacle: 'slide' },
            40: { type: 'snare', obstacle: 'slide' },
            42: { type: 'hihat-closed', obstacle: 'item' },
            44: { type: 'hihat-pedal', obstacle: 'item' },
            46: { type: 'hihat-open', obstacle: 'item' },
            49: { type: 'crash', obstacle: 'powerup' },
            51: { type: 'ride', obstacle: 'item' }
        };

        // 조성 분석
        this.keyAnalysis = {
            major: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
            minor: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb']
        };

        // 색상 팔레트 (조성별)
        this.colorPalettes = {
            major: {
                primary: 0x4ecdc4,
                secondary: 0x45b7d1,
                accent: 0xffd93d,
                background: 0x87CEEB,
                warm: true
            },
            minor: {
                primary: 0x9b59b6,
                secondary: 0x3498db,
                accent: 0xe94560,
                background: 0x1a1a2e,
                warm: false
            }
        };
    }

    /**
     * 피치를 Y 좌표(높이)로 변환
     */
    pitchToHeight(midiPitch) {
        const { minPitch, maxPitch, minHeight, maxHeight } = this.pitchConfig;
        const clamped = Math.max(minPitch, Math.min(maxPitch, midiPitch));
        const normalized = (clamped - minPitch) / (maxPitch - minPitch);
        return minHeight + normalized * (maxHeight - minHeight);
    }

    /**
     * 피치를 트랙 레인(X 좌표)으로 변환
     */
    pitchToLane(midiPitch, laneCount = 3) {
        // 옥타브 내 위치로 레인 결정
        const octavePosition = midiPitch % 12;
        const laneIndex = Math.floor(octavePosition / (12 / laneCount));

        // 중앙 기준 좌우 배치 (-1, 0, 1 등)
        const centerLane = Math.floor(laneCount / 2);
        return (laneIndex - centerLane) * 2.5;
    }

    /**
     * 드럼 노트를 장애물 타입으로 변환
     */
    drumToObstacle(midiNote) {
        const mapping = this.drumMap[midiNote];
        if (!mapping) return null;

        return {
            type: mapping.obstacle,
            drumType: mapping.type,
            actionRequired: this.getRequiredAction(mapping.obstacle)
        };
    }

    /**
     * 장애물 타입에 따른 필요 행동
     */
    getRequiredAction(obstacleType) {
        switch (obstacleType) {
            case 'jump': return { action: 'jump', key: 'Space/Up' };
            case 'slide': return { action: 'slide', key: 'Down' };
            case 'item': return { action: 'collect', key: null };
            case 'powerup': return { action: 'collect', key: null };
            default: return null;
        }
    }

    /**
     * 템포를 게임 속도로 변환
     */
    bpmToSpeed(bpm) {
        // 기본 속도: 120 BPM = 속도 1.0
        return bpm / 120;
    }

    /**
     * 벨로시티를 스케일로 변환
     */
    velocityToScale(velocity) {
        // velocity: 0~1 → scale: 0.5~1.5
        return 0.5 + velocity;
    }

    /**
     * 벨로시티를 밝기/강도로 변환
     */
    velocityToIntensity(velocity) {
        return 0.3 + velocity * 0.7;
    }

    /**
     * 노트 데이터에서 조성 추정
     */
    analyzeKey(notes) {
        if (!notes || notes.length === 0) return 'minor';

        // 피치 클래스 히스토그램
        const pitchClasses = new Array(12).fill(0);

        notes.forEach(note => {
            const pc = note.midi % 12;
            pitchClasses[pc] += note.velocity || 1;
        });

        // 장조/단조 프로파일과 비교 (간단한 휴리스틱)
        // C Major: C D E F G A B = 0, 2, 4, 5, 7, 9, 11
        // A Minor: A B C D E F G = 9, 11, 0, 2, 4, 5, 7

        const majorProfile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
        const minorProfile = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0];

        let majorScore = 0;
        let minorScore = 0;

        for (let i = 0; i < 12; i++) {
            majorScore += pitchClasses[i] * majorProfile[i];
            minorScore += pitchClasses[i] * minorProfile[i];
        }

        const result = majorScore > minorScore ? 'major' : 'minor';
        this.log(`조성 분석: ${result} (Major: ${majorScore.toFixed(0)}, Minor: ${minorScore.toFixed(0)})`);

        return result;
    }

    /**
     * 조성에 따른 색상 팔레트 반환
     */
    getPalette(key = 'minor') {
        return this.colorPalettes[key] || this.colorPalettes.minor;
    }

    /**
     * 노트 시간을 게임 Z 좌표로 변환
     */
    timeToZ(noteTime, currentTime, speed = 1) {
        const timeOffset = noteTime - currentTime;
        // 초당 30 유닛 이동 기준
        return -timeOffset * 30 * speed;
    }

    /**
     * MIDI 노트를 게임 오브젝트 데이터로 변환
     */
    noteToGameObject(note, trackType = 'melody') {
        if (trackType === 'drums') {
            const obstacle = this.drumToObstacle(note.midi);
            if (!obstacle) return null;

            return {
                type: obstacle.type,
                position: {
                    x: (Math.random() - 0.5) * 6, // 랜덤 레인
                    y: obstacle.type === 'slide' ? 2.5 : 0.5,
                    z: 0 // 나중에 timeToZ로 계산
                },
                scale: this.velocityToScale(note.velocity),
                intensity: this.velocityToIntensity(note.velocity),
                time: note.time,
                duration: note.duration,
                requiresJump: obstacle.type === 'jump',
                requiresSlide: obstacle.type === 'slide',
                isCollectible: obstacle.type === 'item' || obstacle.type === 'powerup'
            };
        } else {
            // 멜로디 노트 (배경 장식)
            return {
                type: 'melody',
                position: {
                    x: this.pitchToLane(note.midi),
                    y: this.pitchToHeight(note.midi),
                    z: 0
                },
                scale: this.velocityToScale(note.velocity),
                intensity: this.velocityToIntensity(note.velocity),
                time: note.time,
                duration: note.duration,
                pitch: note.midi,
                requiresJump: false,
                requiresSlide: false,
                isCollectible: false
            };
        }
    }

    /**
     * 전체 MIDI 데이터를 게임 레벨 데이터로 변환
     */
    midiToLevel(midiData) {
        if (!midiData || !midiData.tracks) {
            this.log('MIDI 데이터 없음', 'error');
            return null;
        }

        const level = {
            name: midiData.header?.name || 'Unknown',
            bpm: midiData.header?.tempos?.[0]?.bpm || 120,
            duration: 0,
            key: 'minor',
            objects: [],
            obstacles: [],
            collectibles: []
        };

        // 멜로디 트랙 처리
        const melodyTrack = midiData.tracks.find(t => t.channel !== 9);
        if (melodyTrack && melodyTrack.notes) {
            level.key = this.analyzeKey(melodyTrack.notes);

            melodyTrack.notes.forEach(note => {
                const obj = this.noteToGameObject(note, 'melody');
                if (obj) level.objects.push(obj);
            });
        }

        // 드럼 트랙 처리
        const drumTrack = midiData.tracks.find(t => t.channel === 9 || t.name === 'Drums');
        if (drumTrack && drumTrack.notes) {
            drumTrack.notes.forEach(note => {
                const obj = this.noteToGameObject(note, 'drums');
                if (obj) {
                    if (obj.isCollectible) {
                        level.collectibles.push(obj);
                    } else {
                        level.obstacles.push(obj);
                    }
                }
            });
        }

        // 레벨 길이 계산
        const allNotes = [...(level.objects), ...(level.obstacles), ...(level.collectibles)];
        if (allNotes.length > 0) {
            level.duration = Math.max(...allNotes.map(n => n.time + (n.duration || 0)));
        }

        this.log(`레벨 생성 완료: ${level.objects.length}개 배경, ${level.obstacles.length}개 장애물, ${level.collectibles.length}개 아이템`);

        return level;
    }

    /**
     * 로그 출력
     */
    log(message, type = 'info') {
        if (this.debug) {
            this.debug.log(`[Procedural] ${message}`, type);
        }
        console.log(`[ProceduralMapper] ${message}`);
    }
}
