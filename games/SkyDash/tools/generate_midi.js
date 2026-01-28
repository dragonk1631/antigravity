/**
 * 간단한 게임 BGM MIDI 파일 생성 스크립트
 * Node.js 또는 브라우저에서 실행 가능
 */

// MIDI 파일 바이너리 생성 함수
function createMidiFile(notes, tempo = 120, ticksPerBeat = 480) {
    const binaryData = [];

    // Helper functions
    const writeString = (str) => {
        for (let i = 0; i < str.length; i++) {
            binaryData.push(str.charCodeAt(i));
        }
    };

    const writeInt32 = (val) => {
        binaryData.push((val >> 24) & 0xff);
        binaryData.push((val >> 16) & 0xff);
        binaryData.push((val >> 8) & 0xff);
        binaryData.push(val & 0xff);
    };

    const writeInt16 = (val) => {
        binaryData.push((val >> 8) & 0xff);
        binaryData.push(val & 0xff);
    };

    const writeVarInt = (val) => {
        const bytes = [];
        bytes.push(val & 0x7f);
        val >>= 7;
        while (val > 0) {
            bytes.push((val & 0x7f) | 0x80);
            val >>= 7;
        }
        bytes.reverse();
        bytes.forEach(b => binaryData.push(b));
    };

    // MIDI Header
    writeString('MThd');
    writeInt32(6);      // Header length
    writeInt16(0);      // Format 0 (single track)
    writeInt16(1);      // Number of tracks
    writeInt16(ticksPerBeat); // Ticks per beat

    // Track chunk (will be written later)
    const trackStartIndex = binaryData.length;
    writeString('MTrk');
    writeInt32(0); // Placeholder for track length

    const trackDataStartIndex = binaryData.length;

    // Set tempo (microseconds per beat)
    const microsecondsPerBeat = Math.round(60000000 / tempo);
    writeVarInt(0); // Delta time
    binaryData.push(0xff, 0x51, 0x03); // Tempo meta event
    binaryData.push((microsecondsPerBeat >> 16) & 0xff);
    binaryData.push((microsecondsPerBeat >> 8) & 0xff);
    binaryData.push(microsecondsPerBeat & 0xff);

    // Write notes
    let currentTime = 0;
    const noteEvents = [];

    // Convert notes to note on/off events
    notes.forEach(note => {
        const startTick = Math.round(note.time * ticksPerBeat);
        const endTick = startTick + Math.round(note.duration * ticksPerBeat);

        noteEvents.push({
            tick: startTick,
            type: 'on',
            note: note.note,
            velocity: note.velocity || 80
        });
        noteEvents.push({
            tick: endTick,
            type: 'off',
            note: note.note,
            velocity: 0
        });
    });

    // Sort events by time
    noteEvents.sort((a, b) => a.tick - b.tick);

    // Write events
    let lastTick = 0;
    noteEvents.forEach(event => {
        const delta = event.tick - lastTick;
        lastTick = event.tick;

        writeVarInt(delta);
        if (event.type === 'on') {
            binaryData.push(0x90); // Note on, channel 0
            binaryData.push(event.note);
            binaryData.push(event.velocity);
        } else {
            binaryData.push(0x80); // Note off, channel 0
            binaryData.push(event.note);
            binaryData.push(0);
        }
    });

    // End of track
    writeVarInt(0);
    binaryData.push(0xff, 0x2f, 0x00);

    // Update track length
    const trackLength = binaryData.length - trackDataStartIndex;
    binaryData[trackStartIndex + 4] = (trackLength >> 24) & 0xff;
    binaryData[trackStartIndex + 5] = (trackLength >> 16) & 0xff;
    binaryData[trackStartIndex + 6] = (trackLength >> 8) & 0xff;
    binaryData[trackStartIndex + 7] = trackLength & 0xff;

    return new Uint8Array(binaryData);
}

// Stage 1: 무한 모드 BGM (밝고 경쾌한 느낌)
const stage1Notes = [];
const scale = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale
for (let bar = 0; bar < 8; bar++) {
    for (let beat = 0; beat < 4; beat++) {
        const time = bar * 4 + beat;
        // 베이스 (낮은 음)
        stage1Notes.push({ note: 36 + (bar % 4), time: time, duration: 0.5 });
        // 멜로디
        const noteIndex = (bar + beat) % scale.length;
        stage1Notes.push({ note: scale[noteIndex], time: time, duration: 0.25, velocity: 90 });
        if (beat % 2 === 0) {
            stage1Notes.push({ note: scale[(noteIndex + 2) % scale.length], time: time + 0.25, duration: 0.25, velocity: 70 });
        }
    }
}

// Stage 2: 타임어택 BGM (빠르고 긴장감)  
const stage2Notes = [];
const minorScale = [60, 62, 63, 65, 67, 68, 70, 72]; // C minor scale
for (let bar = 0; bar < 8; bar++) {
    for (let beat = 0; beat < 4; beat++) {
        const time = bar * 4 + beat;
        // 빠른 베이스
        stage2Notes.push({ note: 36, time: time, duration: 0.25 });
        stage2Notes.push({ note: 36, time: time + 0.5, duration: 0.25 });
        // 긴장감 있는 멜로디
        const noteIndex = ((bar * 2) + beat) % minorScale.length;
        stage2Notes.push({ note: minorScale[noteIndex], time: time, duration: 0.125, velocity: 100 });
        stage2Notes.push({ note: minorScale[(noteIndex + 4) % minorScale.length], time: time + 0.25, duration: 0.125, velocity: 85 });
    }
}

// Stage 3: 메뉴 BGM (차분하고 평화로움)
const stage3Notes = [];
const pentatonic = [60, 62, 64, 67, 69]; // Pentatonic
for (let bar = 0; bar < 8; bar++) {
    for (let beat = 0; beat < 2; beat++) {
        const time = bar * 4 + beat * 2;
        // 느린 베이스
        stage3Notes.push({ note: 48, time: time, duration: 2 });
        // 부드러운 멜로디
        const noteIndex = (bar + beat) % pentatonic.length;
        stage3Notes.push({ note: pentatonic[noteIndex], time: time, duration: 1, velocity: 60 });
        stage3Notes.push({ note: pentatonic[(noteIndex + 2) % pentatonic.length], time: time + 1, duration: 1, velocity: 50 });
    }
}

// 파일 저장 (Node.js 환경)
if (typeof require !== 'undefined') {
    const fs = require('fs');
    const path = require('path');

    const outputDir = './assets/audio/midi';

    fs.writeFileSync(path.join(outputDir, 'stage01.mid'), createMidiFile(stage1Notes, 130));
    fs.writeFileSync(path.join(outputDir, 'stage02.mid'), createMidiFile(stage2Notes, 150));
    fs.writeFileSync(path.join(outputDir, 'stage03.mid'), createMidiFile(stage3Notes, 90));

    console.log('MIDI 파일 생성 완료!');
}

// 브라우저 환경에서 다운로드
if (typeof window !== 'undefined') {
    window.downloadMidi = function (stageNumber) {
        let notes, tempo, filename;
        if (stageNumber === 1) {
            notes = stage1Notes;
            tempo = 130;
            filename = 'stage01.mid';
        } else if (stageNumber === 2) {
            notes = stage2Notes;
            tempo = 150;
            filename = 'stage02.mid';
        } else {
            notes = stage3Notes;
            tempo = 90;
            filename = 'stage03.mid';
        }

        const midiData = createMidiFile(notes, tempo);
        const blob = new Blob([midiData], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    };
}
