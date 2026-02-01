/**
 * DebugConsole - BeatMaster 전용 디버그 콘솔
 * (RhythmOdyssey 사양 반영)
 */

export class DebugConsole {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.maxLogs = 30;
        this.logs = [];
        this.isVisible = true;

        // 자동 생성 가드
        if (!this.container) {
            this.createContainer();
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'debug-console';
        this.container.classList.add('debug-hidden'); // 기본은 숨김
        document.body.appendChild(this.container);
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('ko-KR', {
            hour12: false,
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const entry = { time: timestamp, message, type };
        this.logs.push(entry);

        if (this.logs.length > this.maxLogs) this.logs.shift();
        this.render(entry);
    }

    render(entry) {
        if (!this.container) return;

        const el = document.createElement('div');
        el.className = `debug-log ${entry.type}`;
        el.innerHTML = `<span class="time">[${entry.time}]</span> <span class="msg">${entry.message}</span>`;

        this.container.appendChild(el);
        this.container.scrollTop = this.container.scrollHeight;

        while (this.container.children.length > this.maxLogs) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    toggle() {
        this.container.classList.toggle('debug-visible');
    }

    clear() {
        this.logs = [];
        if (this.container) this.container.innerHTML = '';
    }
}
