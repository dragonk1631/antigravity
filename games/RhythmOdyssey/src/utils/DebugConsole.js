/**
 * DebugConsole - 화면 내 디버그 콘솔
 */

export class DebugConsole {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.maxLogs = 50;
        this.logs = [];
    }

    /**
     * 로그 추가
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('ko-KR', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });

        const logEntry = {
            time: timestamp,
            message,
            type
        };

        this.logs.push(logEntry);

        // 최대 로그 수 제한
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 화면에 렌더링
        this.render(logEntry);
    }

    /**
     * 로그 엔트리 렌더링
     */
    render(entry) {
        if (!this.container) return;

        const logElement = document.createElement('div');
        logElement.className = `debug-log ${entry.type}`;
        logElement.textContent = `[${entry.time}] ${entry.message}`;

        this.container.appendChild(logElement);

        // 스크롤 최하단으로
        this.container.scrollTop = this.container.scrollHeight;

        // 오래된 DOM 요소 제거
        while (this.container.children.length > this.maxLogs) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    /**
     * 로그 클리어
     */
    clear() {
        this.logs = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * 콘솔 표시/숨기기
     */
    toggle() {
        if (this.container) {
            this.container.style.display =
                this.container.style.display === 'none' ? 'block' : 'none';
        }
    }
}
