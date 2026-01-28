# Web Game MIDI Implementation Guide

웹 브라우저 및 게임 환경에서 고품질 MIDI 소리를 구현하기 위한 기술적 노하우와 베스트 프랙티스를 정리한 가이드입니다.

---

## 1. 개요: 웹 게임에서 MIDI를 사용하는 이유

- **경량화**: MP3/WAV 대용량 오디오 파일 대신 수십 KB의 데이터만으로 수십 분의 BGM 구현 가능.
- **절차적 제어**: 곡의 템포, 악기 구성, 볼륨 등을 실시간 코드로 제어하여 동적인 게임 상황 대응.
- **오프라인 안정성**: 로컬 SF2(SoundFont) 파일을 활용하면 인터넷 연결 없이도 일관된 고품질 사운드 제공.

## 2. 엔진 기술 선택 (MIDI Engine Comparison)

| 방식 | 특징 | 장점 | 단점 |
| :--- | :--- | :--- | :--- |
| **WASM / AudioWorklet** | SpessaSynth 등 현대적 엔진 | **최상급 성능**, 스레드 분리 | 라이브러리 용량(약 1MB) |
| **JS Web Audio API** | 구형 MIDI.js 방식 | 호환성 높음 | 메인 스레드 부하, 소리 늘어짐 |
| **HTML5 Audio Element** | <audio> 태그 활용 | 구현 매우 단순 | 악기 교체 및 정밀 제어 불가 |

> [!TIP]
> 현대적인 고성능 웹 게임에는 **SpessaSynth**와 같은 **WASM 기반 엔진** 사용을 강력히 권장합니다.

## 3. 핵심 구현 노하우

### 1) 오디오 그래프 연결 (Connection)

합성 엔진(Synthesizer)은 독립적으로 구동되므로, 반드시 `AudioContext.destination`에 수동으로 연결해야 소리가 출력됩니다.

```javascript
this.synth = new window.SpessaSynth.Synthesizer(this.audioContext);
this.synth.connect(this.audioContext.destination); // 이 연결이 없으면 소리가 나지 않음
```

### 2) 브라우저 오토플레이(Autoplay) 정책 대응

사용자의 첫 클릭(Gesture) 전에는 `AudioContext`가 'suspended' 상태로 강제 전환됩니다.

- **노하우**: 초기화(`init`) 단계에서는 에러를 무시하고, 실제 게임 시작 버튼(`pointerdown`) 이벤트에서 `resume()`을 호출하십시오.

### 3) WASM 워커 초기화 동기화

WASM 엔진은 백그라운드 워커에서 별도로 구동되므로, 인스턴스 생성 즉시 데이터를 주입하면 무시될 수 있습니다.

- **노하우**: `await synth.isReady`와 같은 프로미스를 사용하여 엔진이 완전히 준비된 후 사운드폰트나 MIDI를 로드하십시오.

### 4) 자산 최적화 (SoundFont Management)

수백 개의 `.js` 악기 파일 대신, 단일 `.sf2` 파일을 사용하는 것이 네트워크 요청 수를 줄이고 로딩 성공률을 높입니다.

- **노하우**: `TimGM6mb.sf2`와 같은 경량(약 6MB) 고품질 범용 사운드폰트를 로컬에 배치하여 활용하십시오.

## 4. 성능 최적화 (Performance Tuning)

- **오디오 워커 분리**: 오디오 계산을 별도 스레드(AudioWorklet)에서 처리하여 렌더링 프레임(FPS)을 보존하십시오.
- **아토믹 재생(Atomic Play)**: 비동기 로딩 중 중복 재생 요청이 들어올 경우, `isStarting` 플래그를 사용하여 이전 요청을 취소하거나 중복 실행을 차단하십시오.

## 5. 트러블슈팅 가이드

- **소리가 안 날 때**: `AudioContext.state`가 `running`인지, `connect()` 호출이 누락되었는지 확인하십시오.
- **재생이 지연될 때**: MIDI 파일 다운로드와 SF2 압축 해제 시간을 고려하여 `await` 루프를 통한 '로딩 대기' 로직을 초기화 시점에 넣어주십시오.

---
*Created by Antigravity AI Engine*
