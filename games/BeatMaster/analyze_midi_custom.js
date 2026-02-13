const fs = require('fs');

function parseMidi(filename) {
    const data = fs.readFileSync(filename);
    let pos = 0;

    // Header Chunk
    if (data.toString('ascii', pos, pos + 4) !== 'MThd') {
        throw new Error("Not a valid MIDI file");
    }
    pos += 4;
    const length = data.readUInt32BE(pos);
    pos += 4;
    const format = data.readUInt16BE(pos);
    const ntrks = data.readUInt16BE(pos + 2);
    const division = data.readUInt16BE(pos + 4);
    pos += length;

    const tracksInfo = [];

    for (let i = 0; i < ntrks; i++) {
        if (pos >= data.length) break;

        if (data.toString('ascii', pos, pos + 4) !== 'MTrk') {
            // Skip unknown chunk
            const chunkLen = data.readUInt32BE(pos + 4);
            pos += 8 + chunkLen;
            continue;
        }

        pos += 4;
        const trackLen = data.readUInt32BE(pos);
        pos += 4;

        const trackEnd = pos + trackLen;
        let tPos = pos;
        let lastStatus = 0;
        const channelStats = {};

        while (tPos < trackEnd) {
            // Delta Time
            let delta = 0;
            let shift = 0;
            while (true) {
                const byte = data[tPos++];
                delta |= (byte & 0x7F) << shift;
                if (!(byte & 0x80)) break;
                shift += 7;
            }

            if (tPos >= trackEnd) break;

            let status = data[tPos];
            if (status >= 0x80) {
                tPos++;
                lastStatus = status;
            } else {
                status = lastStatus;
            }

            // Meta Event
            if (status === 0xFF) {
                const type = data[tPos++]; // Meta Type
                let metaLen = 0;
                let shift = 0;
                while (true) {
                    const byte = data[tPos++];
                    metaLen |= (byte & 0x7F) << shift;
                    if (!(byte & 0x80)) break;
                    shift += 7;
                }

                // Track Name (0x03)
                if (type === 0x03) {
                    const name = data.toString('ascii', tPos, tPos + metaLen);
                    // Add to track info if not exists
                }

                tPos += metaLen;
                continue;
            }

            // Sysex (F0, F7)
            if (status === 0xF0 || status === 0xF7) {
                let sysexLen = 0;
                let shift = 0;
                while (true) {
                    const byte = data[tPos++];
                    sysexLen |= (byte & 0x7F) << shift;
                    if (!(byte & 0x80)) break;
                    shift += 7;
                }
                tPos += sysexLen;
                continue;
            }

            const cmd = status & 0xF0;
            const channel = status & 0x0F;

            if (!channelStats[channel]) {
                channelStats[channel] = { notes: [], instruments: new Set(), pitchSum: 0, minPitch: 128, maxPitch: -1 };
            }

            if (cmd === 0x80) { // Note Off
                tPos += 2;
            } else if (cmd === 0x90) { // Note On
                const note = data[tPos++];
                const velocity = data[tPos++];
                if (velocity > 0) {
                    const stats = channelStats[channel];
                    stats.notes.push(note);
                    stats.pitchSum += note;
                    if (note < stats.minPitch) stats.minPitch = note;
                    if (note > stats.maxPitch) stats.maxPitch = note;
                }
            } else if (cmd === 0xA0 || cmd === 0xB0 || cmd === 0xE0) { // 2 bytes
                tPos += 2;
            } else if (cmd === 0xC0 || cmd === 0xD0) { // 1 byte
                if (cmd === 0xC0) {
                    const prog = data[tPos];
                    channelStats[channel].instruments.add(prog);
                }
                tPos++;
            }
        }

        pos = trackEnd;

        // Summarize
        const trackSummary = { id: i, channels: [] };
        for (const [ch, stats] of Object.entries(channelStats)) {
            const count = stats.notes.length;
            if (count === 0) continue;
            trackSummary.channels.push({
                channel: parseInt(ch),
                note_count: count,
                avg_pitch: stats.pitchSum / count,
                min_pitch: stats.minPitch,
                max_pitch: stats.maxPitch,
                instruments: Array.from(stats.instruments)
            });
        }
        if (trackSummary.channels.length > 0) {
            tracksInfo.push(trackSummary);
        }
    }
    return tracksInfo;
}

const filename = process.argv[2];
if (!filename) {
    console.log("Usage: node analyze_midi_custom.js <filename>");
    process.exit(1);
}

try {
    const result = parseMidi(filename);
    console.log(JSON.stringify(result, null, 2));
} catch (e) {
    console.error(e);
}
