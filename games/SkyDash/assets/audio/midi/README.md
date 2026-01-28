# MIDI 폴더

MIDI 음악 파일을 저장합니다.

## 재생 방법

현재 게임은 절차적 FM 합성(SoundManager.js)을 사용합니다.
MIDI 파일을 사용하려면 다음 라이브러리 중 하나를 추가해야 합니다:

### 옵션 1: Tone.js + @tonejs/midi

```javascript
import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';

const midi = await Midi.fromUrl('assets/audio/midi/song.mid');
const synth = new Tone.PolySynth().toDestination();

midi.tracks.forEach(track => {
    track.notes.forEach(note => {
        synth.triggerAttackRelease(note.name, note.duration, note.time);
    });
});
```

### 옵션 2: MIDIjs (CDN)

```html
<script src="https://galvanize-rbi-assets.s3.amazonaws.com/jsw/MIDIjs/MIDIjs.min.js"></script>
<script>
MIDIjs.play('assets/audio/midi/song.mid');
</script>
```

## 네이밍 규칙

- 소문자 + 언더스코어 사용
- 예: `menu_theme.mid`, `game_bgm_01.mid`
