/**
 * 메인 진입점
 * 게임 인스턴스를 생성하고 시작합니다.
 */
import { Game } from './Core/Game.js';

// 화면에 에러를 보여주는 함수
function showError(msg) {
    const errorBox = document.createElement('div');
    errorBox.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); color:#ff5555; padding:20px; z-index:9999; font-family:monospace; white-space:pre-wrap; overflow:auto;';
    errorBox.innerHTML = `<h1>⚠️ 실행 오류 (Error)</h1><hr><h3>${msg}</h3><p>이 게임은 보안 정책상 <b>로컬 파일(file://)</b>로 직접 실행하면 작동하지 않을 수 있습니다.<br>VS Code의 <b>Live Server</b> 확장 프로그램을 사용하거나 로컬 웹 서버를 통해 실행해주세요.</p>`;
    document.body.appendChild(errorBox);

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

window.onerror = function (message, source, lineno, colno, error) {
    showError(`${message}\n\nFile: ${source}\nLine: ${lineno}`);
    return true;
};

window.addEventListener('DOMContentLoaded', () => {
    try {
        // 게임 컨테이너 요소 가져오기
        const container = document.getElementById('game-container');
        if (!container) throw new Error("ID가 'game-container'인 요소를 찾을 수 없습니다.");

        // 게임 시작
        const game = new Game(container);

        // 디버깅용 전역 변수
        window.game = game;
    } catch (e) {
        showError(e.toString());
        console.error(e);
    }
});
