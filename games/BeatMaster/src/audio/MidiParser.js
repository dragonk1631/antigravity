/**
 * MidiParser - All-Track Layered Fill Mode + Full Audio + Difficulty Support
 * 우선순위 기반 전체 트랙 계층형 노트 생성 (Main -> Sub1 -> ... -> Sub N)
 * 배경음: 모든 트랙 재생 (드럼 포함)
 * 난이도별 로직:
 * - EASY: GapBuffer 1000ms, MinInterval 500ms (단선율, 매우 여유로움)
 * - NORMAL: GapBuffer 100ms, MinInterval 80ms (단선율, 표준)
 * - HARD: GapBuffer 20ms, MinInterval 40ms (코드/Chord 허용, 고밀도)
 */

import { CONFIG } from '../config/GameConfig.js';

export class MidiParser {
    constructor() {
        this.rawMidi = null;
        this.gameData = null;
    }

    async parse(urlOrBuffer, difficulty = 'NORMAL', isMobile = false) {
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
            this.gameData = this.analyze(midi, difficulty, buffer, isMobile);
            return this.gameData;
        } catch (e) {
            console.error("[MidiParser] Parsing failed:", e);
            throw e;
        }
    }

    analyze(midi, difficulty = 'NORMAL', originalBuffer, isMobile = false) {
        // 난이도별 파라미터 설정
        let gapBuffer = 100;
        let maxTracks = 0;
        let minInterval = 0;

        switch (difficulty) {
            case 'EASY':
                console.log("%c[MidiParser] 🚀 Mode: EASY (Very Chill)", "color: #00ff00; font-weight: bold;");
                gapBuffer = 1000;
                maxTracks = 0;
                minInterval = 500;
                break;
            case 'HARD':
                console.log("%c[MidiParser] 🚀 Mode: HARD (Extreme Chords & Density)", "color: #ff0000; font-weight: bold;");
                gapBuffer = 20;
                maxTracks = 0;
                minInterval = 40;
                break;
            default: // NORMAL
                console.log("%c[MidiParser] 🚀 Mode: NORMAL (Standard Gap-Fill)", "color: #00ffff; font-weight: bold;");
                gapBuffer = 100;
                maxTracks = 0;
                minInterval = 80;
                break;
        }

        // 1. 트랙 점수 산정 (Scoring)
        const candidates = [];

        console.group("[MidiParser] Scoring Tracks...");
        midi.tracks.forEach((track, idx) => {
            // 노이즈 필터링: 노트 수 너무 적은 트랙 제외
            if (track.notes.length < 10) return;

            // 드럼 제외 (노트 생성 후보군에서만 제외)
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

        // 점수순 정렬
        candidates.sort((a, b) => b.score - a.score);

        // 난이도별 트랙 개수 제한 적용
        const selectedTracks = maxTracks > 0 ? candidates.slice(0, maxTracks) : candidates;

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
                priority: priority, // 0(High) ~ N(Low)
                originalChannel: trackObj.track.channel
            }));
        };

        // 3. 계층적 병합 (Layered Merge)
        let mergedNotes = [];
        const GAP_BUFFER = gapBuffer;

        selectedTracks.forEach((trackObj, priority) => {
            const newNotes = parseNotes(trackObj, priority);

            // [HARD 전용] 1순위와 2순위 트랙을 모두 메인으로 취급하여 동시 입력(Chord) 유도
            const isAlwaysAddPriority = (difficulty === 'HARD') ? (priority < 2) : (priority === 0);

            if (isAlwaysAddPriority) {
                // 이 순위의 트랙들은 빈 공간 여부 상관없이 전량이 투입됨 (후속 필터에서 걸러짐)
                mergedNotes = mergedNotes.concat(newNotes);
            } else {
                // 하위 순위 트랙은 "빈 공간"에만 투입 (Fill-in)
                let addedCount = 0;
                newNotes.forEach(note => {
                    const myStart = note.time;
                    const myEnd = note.time + note.duration;

                    let isColliding = false;

                    // 기존에 확보된 노트들과 충돌 검사
                    for (const existing of mergedNotes) {
                        const exStart = existing.time - GAP_BUFFER;
                        const exEnd = existing.time + existing.duration + GAP_BUFFER;

                        // [핵심 변경] 모바일은 같은 손 그룹(0+1, 2+3) 동시 노트 방지
                        const isTimeOverlapping = (myStart < exEnd && myEnd > exStart);
                        const isSameLane = (note.lane === existing.lane);
                        const isSameHandGroup = isMobile && (Math.floor(note.lane / 2) === Math.floor(existing.lane / 2));

                        if (difficulty === 'HARD') {
                            if (isTimeOverlapping && (isSameLane || isSameHandGroup)) {
                                isColliding = true;
                                break;
                            }
                        } else {
                            // EASY/NORMAL에서도 모바일이면 같은 손 그룹 충돌 체크
                            if (isTimeOverlapping && (isSameLane || isSameHandGroup)) {
                                isColliding = true;
                                break;
                            }
                        }
                    }

                    if (!isColliding) {
                        mergedNotes.push(note);
                        addedCount++;
                    }
                });
                console.log(`[Layered Fill] Priority ${priority} (Track ${trackObj.idx}): Added ${addedCount} fill-in notes.`);
            }
        });

        // 4. 최종 정렬 및 후처리 (연타 방지 포함)
        mergedNotes.sort((a, b) => a.time - b.time);

        const processedNotes = [];
        const laneBlockedUntil = [0, 0, 0, 0];

        let lastNoteTime = -9999; // 연타 방지용

        mergedNotes.forEach(note => {
            // [최종 수정] 연타 방지: 이전 노트와 '간격이 존재하면서' 너무 좁으면 스킵
            // 동시 입력(Chord)인 경우(note.time === lastNoteTime)는 간격이 0이므로 허용
            const timeDiff = note.time - lastNoteTime;
            if (timeDiff > 0 && timeDiff < minInterval) {
                return;
            }

            // 노트 길이 최소값 보정
            note.duration = Math.max(note.duration, 100);
            note.isLongNote = note.duration >= 300;

            // 최종 물리적 레인 충돌 방지
            const isBlocked = note.time < laneBlockedUntil[note.lane];
            // [모바일 전용] 같은 손 그룹 연타/동시 입력 방지
            const handGroup = Math.floor(note.lane / 2);
            const isHandGroupBlocked = isMobile && (note.time < laneBlockedUntil[handGroup * 2] || note.time < laneBlockedUntil[handGroup * 2 + 1]);

            if (!isBlocked && !isHandGroupBlocked) {
                processedNotes.push(note);

                // Add extra spacing after long notes to prevent immediate follow-up notes
                const extraSpacing = note.isLongNote ? 200 : 20;
                laneBlockedUntil[note.lane] = note.time + note.duration + extraSpacing;

                // 모바일인 경우 해당 손 그룹의 다른 레인도 최소한의 간격(20ms)은 확보
                if (isMobile) {
                    const otherLane = (note.lane % 2 === 0) ? note.lane + 1 : note.lane - 1;
                    laneBlockedUntil[otherLane] = Math.max(laneBlockedUntil[otherLane], note.time + 20);
                }

                lastNoteTime = note.time; // 유효 노트 등록 시 시간 갱신
            }
        });

        // 5. 배경음 설정 (모든 트랙 연주 허용)
        const activeLayoutChannels = selectedTracks.map(t => t.track.channel);

        // 중요: 모든 트랙이 소리나도록 기존 음소거 처리는 주석 유지
        /*
        midi.tracks.forEach((track, idx) => {
            if (!selectedTracks.some(t => t.idx === idx)) {
                track.notes = [];
            }
        });
        */

        console.log(`[MidiParser] Final Notes Generated: ${processedNotes.length} (Audio: Full Tracks)`);

        return {
            duration: midi.duration,
            bpm: midi.header.tempos[0]?.bpm || 120,
            allNotes: processedNotes,
            gameplayChannels: activeLayoutChannels,
            backgroundMidi: midi.toArray()
        };
    }
}
