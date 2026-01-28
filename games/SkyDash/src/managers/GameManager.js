/**
 * GameManager
 * 게임의 설정, 점수, 리더보드 등 영구 데이터를 관리하는 싱글톤 클래스입니다.
 * LocalStorage를 사용하여 데이터를 브라우저에 저장합니다.
 */
class GameManager {
    constructor() {
        if (GameManager.instance) {
            return GameManager.instance;
        }
        GameManager.instance = this;

        this.initSettings();
        this.initLeaderboard();

        this.currentMode = 'infinite'; // 'infinite' or '100'
        this.currentScore = 0;
        this.currentTime = 0;
        this.isCleared = false;
    }

    /**
     * 설정을 초기화하거나 로드합니다.
     */
    initSettings() {
        const saved = localStorage.getItem('skydash_settings');
        if (saved) {
            this.settings = JSON.parse(saved);
            // 새 설정 항목이 없으면 기본값 추가
            if (!this.settings.musicMode) {
                this.settings.musicMode = 'fm'; // 'fm' or 'midi'
            }
        } else {
            // 기본 설정
            this.settings = {
                characterColor: '#f39c12',
                stairColor: '#2ed573',
                bgColor: '#1e3c72',
                musicMode: 'fm' // 'fm' (FM 합성) or 'midi' (MIDI 파일)
            };
        }
    }

    /**
     * 설정을 저장합니다.
     */
    saveSettings() {
        localStorage.setItem('skydash_settings', JSON.stringify(this.settings));
    }

    /**
     * 설정 값을 변경합니다.
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    /**
     * 리더보드를 초기화하거나 로드합니다.
     */
    initLeaderboard() {
        const saved = localStorage.getItem('skydash_leaderboard');
        this.leaderboard = saved ? JSON.parse(saved) : [];
    }

    /**
     * 게임 결과를 리더보드에 저장합니다.
     * @param {string} mode - 'infinite' or '100'
     * @param {number} score - 점수 (무한모드 중요)
     * @param {number} time - 걸린 시간 (100계단 모드 중요)
     */
    saveScore(mode, score, time, maxCombo) {
        const entry = {
            mode: mode,
            score: score,
            time: time,
            maxCombo: maxCombo || 0,
            date: Date.now()
        };

        this.leaderboard.push(entry);

        // 정렬: 모드 무관하게 저장하되, 가져올 때 필터링
        // 단순 저장을 위해 여기서는 정렬하지 않거나, 전체 정렬

        // 상위 100개만 저장 (전체)
        if (this.leaderboard.length > 100) {
            // 오래된 순으로 삭제하거나 점수 낮은 순 삭제?
            // 일단 단순 슬라이스
            this.leaderboard = this.leaderboard.slice(-100);
        }

        localStorage.setItem('skydash_leaderboard', JSON.stringify(this.leaderboard));
    }

    /**
     * 특정 모드의 리더보드를 가져와 정렬하여 반환합니다.
     */
    getLeaderboard(mode) {
        let filtered = this.leaderboard.filter(item => item.mode === mode);

        filtered.sort((a, b) => {
            if (mode === 'infinite') {
                return b.score - a.score; // 점수 내림차순
            } else {
                // 100계단: 성공한 것(점수>=100) 우선, 그 중 시간 짧은 순
                const aSuccess = a.score >= 100;
                const bSuccess = b.score >= 100;

                if (aSuccess && bSuccess) return a.time - b.time;
                if (aSuccess && !bSuccess) return -1;
                if (!aSuccess && bSuccess) return 1;
                return b.score - a.score; // 둘 다 실패시 많이 간 순
            }
        });

        return filtered.slice(0, 20); // 상위 20개
    }
}
