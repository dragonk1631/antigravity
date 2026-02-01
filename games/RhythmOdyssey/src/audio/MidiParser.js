/**
 * MidiParser - MIDI 데이터 파싱
 * @tonejs/midi 라이브러리로 실제 .mid 파일 파싱
 */

import * as ToneMidi from '@tonejs/midi';
// CDN에 따라 named export나 default export가 다를 수 있어 호환성 확보
const Midi = ToneMidi.Midi || ToneMidi.default || ToneMidi;
import { CONFIG } from '../config/GameConfig.js';

export class MidiParser {
    constructor(debug = null) {
        this.debug = debug;
        this.midiData = null;
        this.rawMidi = null;  // Midi 객체
    }

    /**
     * .mid 파일 URL에서 로드
     */
    async loadFromUrl(url) {
        try {
            this.log(`MIDI 로드 중: ${url}`);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            this.rawMidi = new Midi(arrayBuffer);

            // 내부 포맷으로 변환
            this.midiData = this.convertToGameFormat(this.rawMidi);

            this.log(`로드 완료: ${this.rawMidi.name || 'Untitled'}`);
            this.log(`트랙: ${this.rawMidi.tracks.length}, BPM: ${this.getBPM().toFixed(1)}`);

            return this.midiData;

        } catch (error) {
            this.log(`로드 실패: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * File 객체에서 로드 (드래그앤드롭 등)
     */
    async loadFromFile(file) {
        try {
            this.log(`파일 로드 중: ${file.name}`);

            const arrayBuffer = await file.arrayBuffer();
            this.rawMidi = new Midi(arrayBuffer);

            this.midiData = this.convertToGameFormat(this.rawMidi);

            this.log(`파일 로드 완료: ${file.name}`);
            return this.midiData;

        } catch (error) {
            this.log(`파일 로드 실패: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * @tonejs/midi 형식 → 게임 내부 형식 변환 (지능형 분석 추가)
     */
    convertToGameFormat(midi) {
        const tracks = [];

        midi.tracks.forEach((track, index) => {
            // 1. 트랙 성격 분석
            const isDrum = track.channel === 9 ||
                track.name?.toLowerCase().includes('drum') ||
                track.name?.toLowerCase().includes('percussion');

            // 저음부 트랙(베이스) 감지
            const isBass = track.name?.toLowerCase().includes('bass');

            // 2. 노트별 에너지 및 중요도 분석
            const notes = track.notes.map((note, i, arr) => {
                // 에너지 계산 (속도 + 밀도)
                // 밀도가 너무 높으면(0.25초 미만) 장애물 대신 아이템으로 강제 전환 유도
                const prev = arr[i - 1]; // 제거되었던 변수 정의 복구
                const isTooDense = (prev && (note.time - prev.time < 0.15));
                const density = isTooDense ? 2 : 1;

                // 중요도 점수 (0!~1)
                // 벨로시티 기반 + 박자 위치 보정 + 트랙 특성
                let importance = note.velocity;

                // 정박(Beat) 인근일수록 높은 점수 부여 (리듬감 강화)
                const bpm = midi.header.tempos[0]?.bpm || 120;
                const beats = note.time * (bpm / 60);
                const beatOffset = Math.abs(beats - Math.round(beats));
                if (beatOffset < 0.1) importance *= 1.3; // 정박 강조
                else if (Math.abs(beatOffset - 0.5) < 0.1) importance *= 1.1; // 엇박(8분음표) 강조

                if (isDrum) importance *= 1.5; // 드럼 중요도 대폭 상향
                if (isBass) importance *= 1.2;

                return {
                    id: `${index}-${i}`,
                    time: note.time,
                    midi: note.midi,
                    name: note.name,
                    velocity: note.velocity,
                    duration: note.duration,
                    importance: importance,
                    density: density,
                    // 드럼 트랙이면 장애물 타입 결정, 아니면 주파수 기반 (밀도가 높으면 아이템으로 강제)
                    obstacleType: (isDrum && !isTooDense) ? this.drumToObstacle(note.midi) : null
                };
            });

            // 3. 트랙 메타데이터 구성
            tracks.push({
                name: track.name || (isDrum ? 'Drums' : (isBass ? 'Bass' : `Track ${index}`)),
                channel: track.channel,
                isDrum: isDrum,
                isBass: isBass,
                noteCount: notes.length,
                avgDensity: notes.length / (midi.duration || 1),
                notes: notes.sort((a, b) => a.time - b.time)
            });
        });

        // 4. 장애물 생성용 주 트랙 결정
        // 드럼 > 베이스 > 적절한 밀도의 가장 긴 트랙 순서
        const primaryTrack = tracks.find(t => t.isDrum && t.noteCount > 5) ||
            tracks.find(t => t.isBass && t.noteCount > 5) ||
            tracks.filter(t => t.avgDensity < 5) // 초당 5개 미만인 트랙 중 선정
                .reduce((prev, curr) => (prev.noteCount > curr.noteCount) ? prev : curr, tracks[0]);

        if (primaryTrack) {
            this.log(`주 트랙 선정: ${primaryTrack.name} (Count: ${primaryTrack.noteCount}, Density: ${primaryTrack.avgDensity.toFixed(2)})`);
            primaryTrack.isPrimary = true;
        }

        return {
            header: {
                name: midi.name || 'Untitled',
                ppq: midi.header.ppq,
                tempos: midi.header.tempos.map(t => ({ bpm: t.bpm })),
                duration: midi.duration
            },
            tracks: tracks
        };
    }

    /**
     * 드럼 노트 → 장애물 타입
     */
    drumToObstacle(midiNote) {
        // GM 드럼 맵
        switch (midiNote) {
            case 35: case 36:  // Acoustic/Bass Drum
                return 'jump';
            case 38: case 40:  // Acoustic/Electric Snare
                return 'slide';
            case 42: case 44: case 46:  // Hi-Hat
            case 49: case 51: case 52: case 53: case 55: case 57: case 59:  // Cymbals
                return 'item';
            default:
                return 'item';
        }
    }

    /**
     * JSON 형태의 MIDI 데이터 직접 로드
     */
    loadFromData(data) {
        this.midiData = data;
        this.log('MIDI 데이터 로드 완료');
        return this.midiData;
    }

    /**
     * MIDI 데이터 반환
     */
    getMidiData() {
        return this.midiData;
    }

    /**
     * BPM 반환
     */
    getBPM() {
        // rawMidi가 있으면 첫 템포 사용
        if (this.rawMidi && this.rawMidi.header.tempos.length > 0) {
            return this.rawMidi.header.tempos[0].bpm;
        }
        // midiData가 있으면 사용
        if (this.midiData?.header?.tempos?.[0]?.bpm) {
            return this.midiData.header.tempos[0].bpm;
        }
        return 120; // 기본값
    }

    /**
     * 곡 길이 (초)
     */
    getDuration() {
        if (this.rawMidi) {
            return this.rawMidi.duration;
        }
        if (this.midiData?.header?.duration) {
            return this.midiData.header.duration;
        }
        // 계산
        if (this.midiData?.tracks) {
            let maxTime = 0;
            this.midiData.tracks.forEach(track => {
                track.notes.forEach(note => {
                    const endTime = note.time + note.duration;
                    if (endTime > maxTime) maxTime = endTime;
                });
            });
            return maxTime;
        }
        return 0;
    }

    /**
     * 드럼 트랙 노트 반환
     */
    getDrumNotes() {
        if (!this.midiData?.tracks) return [];

        const drumTrack = this.midiData.tracks.find(t =>
            t.channel === 9 ||
            t.name?.toLowerCase().includes('drum')
        );
        return drumTrack ? drumTrack.notes : [];
    }

    /**
     * 멜로디 트랙 노트 반환
     */
    getMelodyNotes() {
        if (!this.midiData?.tracks) return [];

        const melodyTrack = this.midiData.tracks.find(t =>
            t.channel !== 9 &&
            !t.name?.toLowerCase().includes('drum')
        );
        return melodyTrack ? melodyTrack.notes : [];
    }

    /**
     * 로그
     */
    log(message, type = 'info') {
        if (type === 'error' || type === 'warn' || CONFIG.GAME.VERBOSE_LOGGING) {
            if (this.debug) {
                this.debug.log(`[MIDI] ${message}`, type);
            }
            console.log(`[MidiParser] ${message}`);
        }
    }
}
