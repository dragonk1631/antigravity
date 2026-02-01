/**
 * JudgmentUI - 판정 결과 및 상세 타이밍 시각화
 */
export class JudgmentUI {
    constructor(container) {
        this.container = container;
        this.element = this.createUIElement();
        this.container.appendChild(this.element);

        // 상세 타이밍 텍스트
        this.timingElement = this.createTimingElement();
        this.container.appendChild(this.timingElement);

        // 타이밍 메터 (Visual Meter)
        this.meterContainer = this.createMeterElement();
        this.container.appendChild(this.meterContainer);

        this.fadeTimeout = null;
        this.timingTimeout = null;
    }

    createUIElement() {
        const div = document.createElement('div');
        div.id = 'judgment-text';
        div.style.position = 'absolute';
        div.style.top = '35%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.fontSize = '64px';
        div.style.fontWeight = '800';
        div.style.fontFamily = "'Outfit', sans-serif";
        div.style.pointerEvents = 'none';
        div.style.zIndex = '1000';
        div.style.opacity = '0';
        div.style.transition = 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        return div;
    }

    createTimingElement() {
        const div = document.createElement('div');
        div.id = 'timing-detail';
        div.style.position = 'absolute';
        div.style.top = '45%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.fontSize = '24px';
        div.style.fontWeight = '600';
        div.style.fontFamily = "'Outfit', sans-serif";
        div.style.pointerEvents = 'none';
        div.style.zIndex = '1000';
        div.style.opacity = '0';
        return div;
    }

    createMeterElement() {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.bottom = '100px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.width = '300px';
        container.style.height = '10px';
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        container.style.borderRadius = '5px';
        container.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        container.style.pointerEvents = 'none';

        // 중앙선
        const center = document.createElement('div');
        center.style.position = 'absolute';
        center.style.left = '50%';
        center.style.top = '0';
        center.style.width = '2px';
        center.style.height = '100%';
        center.style.backgroundColor = '#00ffff';
        container.appendChild(center);

        // 히트 마커 (움직이는 점)
        this.hitMarker = document.createElement('div');
        this.hitMarker.style.position = 'absolute';
        this.hitMarker.style.left = '50%';
        this.hitMarker.style.top = '-5px';
        this.hitMarker.style.width = '10px';
        this.hitMarker.style.height = '20px';
        this.hitMarker.style.backgroundColor = '#fff';
        this.hitMarker.style.borderRadius = '2px';
        this.hitMarker.style.opacity = '0';
        this.hitMarker.style.transition = 'left 0.1s ease-out';
        container.appendChild(this.hitMarker);

        return container;
    }

    show(judgment, diff = 0) {
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        if (this.timingTimeout) clearTimeout(this.timingTimeout);

        // 1. 주요 판정 텍스트
        this.element.textContent = judgment;
        let color = '#ffffff';
        let glow = 'rgba(255,255,255,0.5)';

        switch (judgment) {
            case 'PERFECT': color = '#ffcc00'; glow = 'rgba(255,204,0,0.8)'; break;
            case 'GREAT': color = '#00ff66'; glow = 'rgba(0,255,102,0.8)'; break;
            case 'GOOD': color = '#00ccff'; glow = 'rgba(0,204,255,0.8)'; break;
            case 'MISS': color = '#ff3300'; glow = 'rgba(255,51,0,0.8)'; break;
        }

        this.element.style.color = color;
        this.element.style.textShadow = `0 0 20px ${glow}`;
        this.element.style.opacity = '1';
        this.element.style.transform = 'translate(-50%, -50%) scale(1.3)';

        setTimeout(() => {
            this.element.style.transform = 'translate(-50%, -50%) scale(1.0)';
        }, 50);

        // 2. 상세 타이밍 (Early / Late)
        if (judgment !== 'MISS') {
            const ms = Math.round(diff * 1000);
            const isEarly = diff < 0;
            const timingText = isEarly ? `EARLY ${Math.abs(ms)}ms` : `LATE ${ms}ms`;

            this.timingElement.textContent = timingText;
            this.timingElement.style.color = isEarly ? '#ffaaaa' : '#aaaaff';
            this.timingElement.style.opacity = '1';

            // 3. 메터 업데이트 (-0.5s ~ 0.5s 범위)
            const range = 0.5;
            const percent = 50 + (diff / range) * 50;
            const clamped = Math.max(0, Math.min(100, percent));

            this.hitMarker.style.left = `${clamped}%`;
            this.hitMarker.style.opacity = '1';
            this.hitMarker.style.backgroundColor = color;
        } else {
            this.timingElement.style.opacity = '0';
            this.hitMarker.style.opacity = '0';
        }

        // 전체 페이드 아웃
        this.fadeTimeout = setTimeout(() => {
            this.element.style.opacity = '0';
            this.hitMarker.style.opacity = '0';
        }, 600);

        this.timingTimeout = setTimeout(() => {
            this.timingElement.style.opacity = '0';
        }, 1000);
    }
}
