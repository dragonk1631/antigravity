/**
 * MidiParser - Simple Single Track Mode (User Request Reset)
 * 사용자 요청에 따라 모든 복잡한 로직을 제거하고, 
 * 오직 첫 번째 유효 트랙만 재생 및 채보하는 단순 모드입니다.
 */

import { CONFIG } from '../config/GameConfig.js';

// GM 드럼 맵 (Legacy Support)
const DRUM_TO_LANE = {
    // Lane 0: Kick
    35: 0, 36: 0,
    // Lane 1: Snare
    38: 1, 40: 1,
    // Lane 2: Clap / Percussion
    39: 2, 50: 2, 54: 2, 56: 2,
    // Lane 3: Hi-Hat / Cymbals
    42: 3, 44: 3, 46: 3, 49: 3, 51: 3, 52: 3
};

export class MidiParser {
    constructor() {
        this.rawMidi = null;
        this.gameData = null;
    }

    async parse(urlOrBuffer, difficulty = 'NORMAL') {
        try {
            const Midi = window.Midi; // index.html에서 로드된 @tonejs/midi
            let buffer;
            if (typeof urlOrBuffer === 'string') {
                const res = await fetch(urlOrBuffer);
                buffer = await res.arrayBuffer();
            } else {
                buffer = urlOrBuffer;
            }

            // 분석을 위해 매번 새로운 Midi 객체 생성 (원본 변조 방지)
            const midi = new Midi(buffer);
            this.gameData = this.analyze(midi, difficulty, buffer);
            return this.gameData;
        } catch (e) {
            console.error("[MidiParser] Parsing failed:", e);
            throw e;
        }
    }

    analyze(midi, difficulty = 'NORMAL', originalBuffer) {
        console.log("%c[MidiParser] 🚀 Executing 4-TRACK LAYERED FILL Mode", "color: #00ffff; font-weight: bold; font-size: 14px;");

        // 1. 트랙 점수 산정 (Scoring)
        const candidates = [];

        console.group("[MidiParser] Scoring Tracks...");
        midi.tracks.forEach((track, idx) => {
            // 노이즈 필터링: 노트 수 너무 적은 트랙 제외
            if (track.notes.length < 10) return;

            // 드럼 제외 (멜로디 중심 채보를 위해)
            if (track.instrument.percussion || track.channel === 9) return;

            let score = 0;
            const noteCount = track.notes.length;
            const avgPitch = noteCount > 0 ? track.notes.reduce((sum, n) => sum + n.midi, 0) / noteCount : 0;

            score += noteCount;
            if (avgPitch > 60) score += 500; // 고음역대 우대

            const name = (track.name || "").toLowerCase();
            if (name.includes('melody') || name.includes('vocal') || name.includes('lead') || name.includes('main')) score += 3000;
            if (name.includes('piano') || name.includes('key') || name.includes('synth')) score += 1500;
            if (name.includes('guitar')) score += 1000;
            if (name.includes('bass')) score -= 500; // 베이스는 최후순위

            console.log(`Track ${idx} [${name}]: Score ${score} (Notes: ${noteCount})`);

            candidates.push({ idx, track, score });
        });
        console.groupEnd();

        // 점수순 정렬 후 상위 4개 선정
        candidates.sort((a, b) => b.score - a.score);
        const selectedTracks = candidates.slice(0, 4); // Top 4

        if (selectedTracks.length === 0) {
            console.error("No playable tracks found.");
            return { duration: midi.duration, bpm: 120, allNotes: [], gameplayChannels: [], backgroundMidi: null };
        }

        console.log(`[Layered Fill] Selected Priority Tracks:`, selectedTracks.map(t => t.idx));

        // 2. 노트 추출 및 변환 함수
        const parseNotes = (trackObj, priority) => {
            return trackObj.track.notes.map(note => ({
                time: Math.round(note.time * 1000),
                duration: Math.round(note.duration * 1000),
                midi: note.midi,
                velocity: note.velocity,
                lane: note.midi % 4,
                priority: priority, // 0(High) ~ 3(Low)
                originalChannel: trackObj.track.channel
            }));
        };

        // 3. 계층적 병합 (Layered Merge)
        // Priority 0 -> 1 -> 2 -> 3 순서로 빈 공간 채우기
        let mergedNotes = [];

        // 시간 충돌 방지 버퍼 (ms) - 너무 빽빽하지 않게
        const GAP_BUFFER = 100;

        selectedTracks.forEach((trackObj, priority) => {
            const newNotes = parseNotes(trackObj, priority);

            if (priority === 0) {
                // 1순위 트랙은 무조건 전량 투입
                mergedNotes = mergedNotes.concat(newNotes);
            } else {
                // 하위 순위 트랙은 "빈 공간"에만 투입 (Fill-in)
                let addedCount = 0;
                newNotes.forEach(note => {
                    const myStart = note.time;
                    const myEnd = note.time + note.duration;

                    let isColliding = false;

                    // 기존에 확보된 노트들과 충돌 검사
                    // (단순 순회: 노트 수가 많지 않으므로 성능 이슈 미미함)
                    for (const existing of mergedNotes) {
                        const exStart = existing.time - GAP_BUFFER;
                        const exEnd = existing.time + existing.duration + GAP_BUFFER;

                        // 범위 겹침 판정
                        if (myStart < exEnd && myEnd > exStart) {
                            isColliding = true;
                            break;
                        }
                    }

                    if (!isColliding) {
                        mergedNotes.push(note);
                        addedCount++;
                    }
                });
                console.log(`[Layered Fill] Priority ${priority} Track: Added ${addedCount} fill-in notes.`);
            }
        });

        // 4. 최종 정렬 및 후처리
        mergedNotes.sort((a, b) => a.time - b.time);

        const processedNotes = [];
        const laneBlockedUntil = [0, 0, 0, 0];

        mergedNotes.forEach(note => {
            // 노트 길이 최소값 보정
            note.duration = Math.max(note.duration, 100);
            note.isLongNote = note.duration >= 300;

            // 최종 물리적 레인 충돌 방지 (안전장치)
            if (note.time >= laneBlockedUntil[note.lane]) {
                processedNotes.push(note);
                laneBlockedUntil[note.lane] = note.time + note.duration + 20;
            }
        });

        // 5. 배경음 설정 (선정된 4개 트랙만 활성화)
        const activeLayoutChannels = selectedTracks.map(t => t.track.channel);

        midi.tracks.forEach((track, idx) => {
            // 선정되지 않은 트랙 데이터 제거 (음소거 효과)
            if (!selectedTracks.some(t => t.idx === idx)) {
                track.notes = [];
            }
        });

        console.log(`[MidiParser] Final Notes Generated: ${processedNotes.length}`);

        return {
            duration: midi.duration,
            bpm: midi.header.tempos[0]?.bpm || 120,
            allNotes: processedNotes,
            gameplayChannels: activeLayoutChannels,
            backgroundMidi: midi.toArray()
        };
    }
}
