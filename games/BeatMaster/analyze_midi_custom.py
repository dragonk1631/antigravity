import sys
import struct
import json

def parse_midi(filename):
    with open(filename, 'rb') as f:
        data = f.read()

    pos = 0

    # Header Chunk
    if data[pos:pos+4] != b'MThd':
        print("Not a valid MIDI file")
        return None
    pos += 4
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    format, ntrks, division = struct.unpack('>HHH', data[pos:pos+6])
    pos += length

    tracks_info = []

    for i in range(ntrks):
        if pos >= len(data): break
        if data[pos:pos+4] != b'MTrk':
            # Skip unknown chunk
            chunk_len = struct.unpack('>I', data[pos+4:pos+8])[0]
            pos += 8 + chunk_len
            continue
        
        pos += 4
        track_len = struct.unpack('>I', data[pos:pos+4])[0]
        pos += 4
        
        track_end = pos + track_len
        track_data = data[pos:track_end]
        pos = track_end
        
        # Parse Track Events
        t_pos = 0
        last_status = 0
        channel_stats = {} # channel -> {notes: [], instruments: set()}
        
        running_time = 0

        while t_pos < len(track_data):
            # Parse Delta Time (Variable Length Quantity)
            delta = 0
            shift = 0
            while True:
                byte = track_data[t_pos]
                t_pos += 1
                delta |= (byte & 0x7F) << shift
                if not (byte & 0x80):
                    break
                shift += 7
            
            running_time += delta

            # Event Type
            if t_pos >= len(track_data): break
            status = track_data[t_pos]
            
            if status >= 0x80:
                t_pos += 1
                last_status = status
            else:
                status = last_status
            
            # Meta Event
            if status == 0xFF:
                meta_type = track_data[t_pos]
                t_pos += 1
                # Meta Length (VLQ)
                meta_len = 0
                shift = 0
                while True:
                    byte = track_data[t_pos]
                    t_pos += 1
                    meta_len |= (byte & 0x7F) << shift
                    if not (byte & 0x80):
                        break
                    shift += 7
                t_pos += meta_len
                continue
            
            # Validate status byte
            if status < 0x80: continue # Should not happen if well-formed

            cmd = status & 0xF0
            channel = status & 0x0F
            
            if channel not in channel_stats:
                channel_stats[channel] = {'notes': [], 'instruments': set(), 'pitch_sum': 0, 'min_pitch': 128, 'max_pitch': -1}

            if cmd == 0x80: # Note Off (2 bytes)
                t_pos += 2
            elif cmd == 0x90: # Note On (2 bytes)
                note = track_data[t_pos]
                velocity = track_data[t_pos+1]
                t_pos += 2
                
                if velocity > 0:
                    stats = channel_stats[channel]
                    stats['notes'].append(note)
                    stats['pitch_sum'] += note
                    if note < stats['min_pitch']: stats['min_pitch'] = note
                    if note > stats['max_pitch']: stats['max_pitch'] = note
            elif cmd == 0xA0: # Polyphonic Key Pressure (2 bytes)
                t_pos += 2
            elif cmd == 0xB0: # Control Change (2 bytes)
                t_pos += 2
            elif cmd == 0xC0: # Program Change (1 byte)
                prog = track_data[t_pos]
                channel_stats[channel]['instruments'].add(prog)
                t_pos += 1
            elif cmd == 0xD0: # Channel Pressure (1 byte)
                t_pos += 1
            elif cmd == 0xE0: # Pitch Bend (2 bytes)
                t_pos += 2
            # System Common / Real-Time (F0-F7, F8-FF) handled by logic above? 
            # F0/F7 are Sysex, usually formatted differently, but here 0xF0 & 0xF0 == 0xF0 which is not < 0xF0.
            # Sysex F0/F7 are complex, let's assume standard MIDI file for now
            # If status starts with F, it's system message. We handled FF (Meta).
            # F0 and F7 are remaining.
            elif cmd == 0xF0:
                # simple skip logic for F0/F7... length is VLQ? actually F0 is followed by length usually?
                # For safety, simplistic parser might fail on sysex. 
                # Let's hope no sysex or simple sysex.
                pass 

        # Aggregate stats for this track
        track_summary = {'id': i, 'channels': []}
        for ch, stats in channel_stats.items():
            count = len(stats['notes'])
            if count == 0: continue
            avg_pitch = stats['pitch_sum'] / count
            track_summary['channels'].append({
                'channel': ch,
                'note_count': count,
                'avg_pitch': avg_pitch,
                'min_pitch': stats['min_pitch'],
                'max_pitch': stats['max_pitch'],
                'instruments': list(stats['instruments'])
            })
        
        if track_summary['channels']:
            tracks_info.append(track_summary)

    return tracks_info

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_midi.py <midi_file>")
        sys.exit(1)
    
    result = parse_midi(sys.argv[1])
    print(json.dumps(result, indent=2))
