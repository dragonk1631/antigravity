/**
 * I18nManager
 * 게임 내 모든 텍스트의 다국어 번역을 관리합니다.
 */
class I18nManager {
    static translations = {
        en: {
            // Main Menu
            "menu.infinite": "🚀 Infinite Mode",
            "menu.timeattack": "⏱ 100 Steps Time Attack",
            "menu.leaderboard": "🏆 Leaderboard",
            "menu.settings": "⚙ Settings",
            "menu.credit": "Developed with Antigravity",

            // Settings
            "settings.title": "SETTINGS",
            "settings.back": "Back to Menu",
            "settings.character_color": "Character Color",
            "settings.stair_color": "Stair Color",
            "settings.background_color": "Background Color",

            // Leaderboard
            "leaderboard.title": "LEADERBOARD",
            "leaderboard.infinite": "Infinite",
            "leaderboard.100steps": "100 Steps",
            "leaderboard.back": "Back",
            "leaderboard.header_infinite": "Rank   Score   Combo   Date",
            "leaderboard.header_100": "Rank   Time   Combo   Date",
            "leaderboard.no_records": "No Records Yet",
            "leaderboard.fail": "(Fail)",

            // Game Scene
            "game.combo_popup": " COMBO!",

            // Game Over / Success
            "gameover.success": "SUCCESS!",
            "gameover.failed": "GAME OVER",
            "gameover.new_record": "🎉 New Record! (+{val})",
            "gameover.first_record": "First Record!",
            "gameover.shorter": "{val}s Shorter! (BEST)",
            "gameover.over": "{val}s Over",
            "gameover.steps": " / 100 STEPS",
            "gameover.prev_best": "Previous Best: {val}",
            "gameover.prev_highest": "Previous Best: {val}s",
            "gameover.restart": "🔄 Try Again",
            "gameover.menu": "🏠 Back to Menu",

            // Controls (Keyboard Guide)
            "controls.turn": "Z / ←",
            "controls.climb": "X / →"
        },
        ko: {
            // Main Menu
            "menu.infinite": "🚀 무한 모드",
            "menu.timeattack": "⏱ 100계단 타임어택",
            "menu.leaderboard": "🏆 리더보드",
            "menu.settings": "⚙ 설정",
            "menu.credit": "Antigravity로 개발됨",

            // Settings
            "settings.title": "설정",
            "settings.back": "메뉴로 이동",
            "settings.character_color": "캐릭터 색상",
            "settings.stair_color": "계단 색상",
            "settings.background_color": "배경 색상",

            // Leaderboard
            "leaderboard.title": "리더보드",
            "leaderboard.infinite": "무한 모드",
            "leaderboard.100steps": "100계단",
            "leaderboard.back": "뒤로가기",
            "leaderboard.header_infinite": "순위   점수   콤보   날짜",
            "leaderboard.header_100": "순위   시간   콤보   날짜",
            "leaderboard.no_records": "기록이 없습니다",
            "leaderboard.fail": "(실패)",

            // Game Scene
            "game.combo_popup": " 콤보!",

            // Game Over / Success
            "gameover.success": "성공!",
            "gameover.failed": "게임 오버",
            "gameover.new_record": "🎉 신기록 경신! (+{val})",
            "gameover.first_record": "첫 기록 달성!",
            "gameover.shorter": "{val}s 단축! (BEST)",
            "gameover.over": "{val}s 오버",
            "gameover.steps": " / 100 계단",
            "gameover.prev_best": "이전 기록: {val}",
            "gameover.prev_highest": "이전 최고 기록: {val}s",
            "gameover.restart": "🔄 다시 도전",
            "gameover.menu": "🏠 메뉴로 이동",

            // Controls (Keyboard Guide)
            "controls.turn": "Z / ←",
            "controls.climb": "X / →"
        },
        ja: {
            // Main Menu
            "menu.infinite": "🚀 無限モード",
            "menu.timeattack": "⏱ 100階段タイムアタック",
            "menu.leaderboard": "🏆 リーダーボード",
            "menu.settings": "⚙ 設定",
            "menu.credit": "Antigravityで開発されました",

            // Settings
            "settings.title": "設定",
            "settings.back": "メニューに戻る",
            "settings.character_color": "キャラクターの色",
            "settings.stair_color": "階段の色",
            "settings.background_color": "背景の色",

            // Leaderboard
            "leaderboard.title": "リーダーボード",
            "leaderboard.infinite": "無限モード",
            "leaderboard.100steps": "100階段",
            "leaderboard.back": "戻る",
            "leaderboard.header_infinite": "順位   スコア   コンボ   日付",
            "leaderboard.header_100": "順位   タイム   コンボ   日付",
            "leaderboard.no_records": "記録がありません",
            "leaderboard.fail": "(失敗)",

            // Game Scene
            "game.combo_popup": " コンボ!",

            // Game Over / Success
            "gameover.success": "成功！",
            "gameover.failed": "ゲームオーバー",
            "gameover.new_record": "🎉 新記録更新! (+{val})",
            "gameover.first_record": "初記録達成！",
            "gameover.shorter": "{val}s 短縮! (BEST)",
            "gameover.over": "{val}s オーバー",
            "gameover.steps": " / 100 階段",
            "gameover.prev_best": "以前の記録: {val}",
            "gameover.prev_highest": "以前の最高記録: {val}s",
            "gameover.restart": "🔄 再挑戦",
            "gameover.menu": "🏠 メニューに戻る",

            // Controls (Keyboard Guide)
            "controls.turn": "Z / ←",
            "controls.climb": "X / →"
        }
    };

    /**
     * 현재 설정된 언어에 맞는 텍스트를 가져옵니다.
     * @param {string} key - 번역 키
     * @param {object} params - 템플릿 변수 (예: {val: 10})
     */
    static get(key, params = {}) {
        const gm = window.gameManager || new GameManager();
        const lang = gm.settings.language || 'en';
        let text = this.translations[lang][key] || key;

        // 변수 치환 ({val} 형태)
        Object.keys(params).forEach(p => {
            text = text.replace(`{${p}}`, params[p]);
        });

        return text;
    }
}
