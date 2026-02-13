# 📱 Phaser 3 / HTML5 Canvas 모바일 최적화 가이드

> **작성일**: 2026-01-28  
> **적용 프로젝트**: SkyDash  
> **결과**: 모바일 30fps → 90fps (3배 성능 향상)

---

## 📊 최적화 효과 요약

| 최적화 기술 | 성능 영향 | 난이도 |
| :--- | :--- | :--- |
| DPR 고정 | ⭐⭐⭐⭐⭐ (매우 큼) | 쉬움 |
| Graphics → 정적 텍스처 | ⭐⭐⭐⭐⭐ (매우 큼) | 중간 |
| 블렌드 모드 최적화 | ⭐⭐⭐⭐ (큼) | 쉬움 |
| 잔상/오오라 비활성화 | ⭐⭐⭐ (중간) | 쉬움 |
| 프레임 스킵 최적화 | ⭐⭐ (작음) | 쉬움 |

---

## 🔥 핵심 최적화 기술

### 1. devicePixelRatio (DPR) 고정 ⭐⭐⭐⭐⭐

**문제**: 모바일 기기의 DPR이 2~3인 경우, 720×1280 게임이 실제로는 1440×2560 ~ 2160×3840 해상도로 렌더링됩니다. 픽셀 수가 4~9배 증가하여 GPU 부하가 급격히 늘어납니다.

**해결책**: Phaser 설정에서 `resolution: 1`로 강제 고정

```javascript
// main.js
const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        resolution: 1  // ⬅️ 핵심! DPR 무시하고 1x 해상도 유지
    }
};
```

**효과**: 즉시 2~3배 성능 향상 (가장 효과적인 최적화)

---

### 2. Graphics 객체 → 정적 텍스처 변환 ⭐⭐⭐⭐⭐

**문제**: `Graphics.fillRoundedRect()`, `Graphics.fillCircle()` 등을 매 프레임 또는 객체 생성 시 호출하면 CPU/GPU 병목 발생

**해결책**: 텍스처를 한 번만 생성하고 `Image` 객체로 재사용

```javascript
// ❌ Before: 매번 Graphics로 그리기
class Stair {
    drawStair() {
        this.graphics.clear();
        this.graphics.fillStyle(0xbdc3c7, 1);
        this.graphics.fillRoundedRect(-45, 0, 90, 35, 4);
    }
}

// ✅ After: 정적 텍스처 1회 생성 후 재사용
class Stair {
    constructor(scene) {
        // 텍스처가 없으면 한 번만 생성
        if (!scene.textures.exists('stair_texture')) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xbdc3c7, 1);
            g.fillRoundedRect(0, 0, 90, 35, 4);
            g.generateTexture('stair_texture', 90, 35);
            g.destroy();
        }
        
        // Image로 재사용
        this.stairImage = scene.add.image(0, 0, 'stair_texture');
    }
}
```

**효과**: 수십 개의 계단이 있어도 드로우 콜이 거의 증가하지 않음

---

### 3. 에너지 바 렌더링 최적화

**문제**: 매 프레임 `Graphics.clear()` + `fillRoundedRect()` 호출

```javascript
// ❌ Before: 매 프레임 Graphics 재생성
update() {
    this.energyBar.clear();
    this.energyBar.fillStyle(0xff0000, 1);
    this.energyBar.fillRoundedRect(x, y, width * percent, height, 8);
}
```

**해결책**: 미리 생성한 텍스처의 `scaleX`만 조절

```javascript
// ✅ After: scaleX로 크기 조절 (GPU 친화적)
create() {
    // 텍스처 1회 생성
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, barWidth, barHeight, 8);
    g.generateTexture('energyBarFill', barWidth, barHeight);
    g.destroy();
    
    this.energyBarFill = this.add.image(x, y, 'energyBarFill');
}

update() {
    // scaleX만 조절 (매우 빠름)
    this.energyBarFill.setScale(percent, 1);
    this.energyBarFill.setTint(percent > 0.5 ? 0xff9f43 : 0xe74c3c);
}
```

---

### 4. 블렌드 모드 최적화 ⭐⭐⭐⭐

**문제**: `ADD` 블렌드 모드는 GPU에서 추가적인 계산 필요 (오버드로우 증가)

**해결책**: 모바일에서는 `NORMAL` 블렌드 모드 사용

```javascript
// ❌ Before: ADD 블렌드 (화려하지만 느림)
this.particles = this.add.particles(0, 0, 'pixel', {
    blendMode: 'ADD',  // GPU 오버드로우 발생
    lifespan: 1000
});

// ✅ After: NORMAL 블렌드 + 수명 단축
this.particles = this.add.particles(0, 0, 'pixel', {
    blendMode: 'NORMAL',  // 성능 최적화
    lifespan: this.isMobile ? 600 : 1000  // 모바일: 빨리 사라짐
});
```

---

### 5. 모바일 감지 및 조건부 효과 ⭐⭐⭐

**핵심 패턴**: 모바일에서는 불필요한 시각 효과를 비활성화

```javascript
// 모바일 감지
this.isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

// 조건부 효과 적용
if (!this.isMobile) {
    this.createAfterimage();  // 잔상 효과 (데스크톱만)
    this.aura.setVisible(true);  // 오오라 (데스크톱만)
}

// 파티클 수 조절
const particleCount = this.isMobile ? 4 : 8;
this.emitter.emitParticleAt(x, y, particleCount);
```

**비활성화 대상 (모바일)**:

- 잔상(Afterimage) 효과
- 오오라(Aura) 효과
- 속도선(Speed Lines) TileSprite
- 피버 모드 파티클

---

### 6. 프레임 스킵 최적화 ⭐⭐

**문제**: 매 프레임 실행할 필요 없는 로직이 60fps로 실행됨

**해결책**: N프레임마다 실행

```javascript
update(time, delta) {
    // 오디오 필터: 5프레임마다 실행 (충분함)
    if (time % 5 < 1) {
        soundManager.setEnvIntensity(intensity);
    }
    
    // 배경색 보간: 3프레임마다 실행
    if (this.bgColor !== this.targetBgColor && time % 3 < 1) {
        // 색상 보간 로직...
    }
}
```

---

### 7. 오브젝트 풀링 ⭐⭐⭐

**문제**: 계단, 파티클 등을 매번 `new`로 생성하면 GC(가비지 컬렉션) 발생

**해결책**: 미리 풀을 생성하고 재사용

```javascript
// 풀 초기화 (30개 미리 생성)
this.stairPool = [];
for (let i = 0; i < 30; i++) {
    const stair = new Stair(this, -1000, -1000);
    stair.setActive(false);
    stair.setVisible(false);
    this.stairPool.push(stair);
}

// 사용 시: 풀에서 가져오기
const stair = this.stairPool.pop();
stair.reuse(x, y);

// 반납 시: 풀에 되돌리기
stair.setActive(false);
stair.setVisible(false);
this.stairPool.push(stair);
```

---

### 8. 파괴 효과 최적화 ⭐⭐

**문제**: 계단 파괴 시 6개의 파편이 생성되어 트윈 애니메이션 실행

**해결책**: 모바일에서 파편 수 50% 감소

```javascript
shatter() {
    const shardsCount = this.scene.isMobile ? 3 : 6;
    const duration = this.scene.isMobile ? 400 : 600;
    
    for (let i = 0; i < shardsCount; i++) {
        // 파편 생성...
    }
}
```

---

## 🛠️ 디버깅 도구

### FPS 카운터 추가

```javascript
// createUI()에 추가
this.fpsText = this.add.text(10, 10, 'FPS: 60', {
    fontFamily: 'monospace',
    fontSize: '20px',
    color: '#00ff00',
    backgroundColor: '#000000aa'
}).setScrollFactor(0).setDepth(200);

// update()에서 업데이트
const fps = Math.round(1000 / delta);
this.fpsText.setText(`FPS: ${fps}`);

// 색상으로 상태 표시
if (fps >= 55) this.fpsText.setColor('#00ff00');  // 녹색: 양호
else if (fps >= 30) this.fpsText.setColor('#ffff00');  // 노랑: 주의
else this.fpsText.setColor('#ff0000');  // 빨강: 문제
```

---

## ⚠️ 흔한 실수

### 1. deltaTime 미사용

```javascript
// ❌ 프레임 기반 (FPS 떨어지면 게임도 느려짐)
this.x += 5;

// ✅ deltaTime 기반 (FPS와 무관하게 일정한 속도)
this.x += 300 * (delta / 1000);
```

### 2. 큰 TileSprite 사용

```javascript
// ❌ 전체 화면 크기 TileSprite (모바일에서 느림)
this.speedLines = this.add.tileSprite(0, 0, 720, 1280, 'texture');

// ✅ 모바일에서는 비활성화
if (!this.isMobile) {
    this.speedLines = this.add.tileSprite(...);
} else {
    this.speedLines = { alpha: 0, setAlpha: () => {} };  // 더미
}
```

### 3. 매 프레임 텍스트 변경

```javascript
// ❌ 매 프레임 setText (비용이 큼)
update() {
    this.scoreText.setText(this.score);  // 변경 없어도 호출
}

// ✅ 변경 시에만 호출
if (this.displayedScore !== this.score) {
    this.scoreText.setText(this.score);
    this.displayedScore = this.score;
}
```

---

## 📋 최적화 체크리스트

- [ ] `resolution: 1` 설정 확인
- [ ] Graphics 객체 → 정적 텍스처 변환
- [ ] ADD 블렌드 → NORMAL 변환
- [ ] 모바일 감지 로직 추가
- [ ] 불필요한 효과 조건부 비활성화
- [ ] 오브젝트 풀링 적용
- [ ] FPS 카운터로 성능 모니터링
- [ ] 파티클 수/수명 조절
- [ ] 프레임 스킵 적용 (비중요 로직)

---

## 🔗 참고 자료

- [Phaser 3 Performance Tips](https://phaser.io)
- [HTML5 Canvas Optimization (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [web.dev Canvas Performance](https://web.dev/articles/canvas-performance)
