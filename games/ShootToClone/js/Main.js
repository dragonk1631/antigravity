import { Game } from './Core/Game.js';

window.onload = () => {
    const container = document.getElementById('game-container');
    const loading = document.getElementById('loading');

    // 게임 인스턴스 생성
    const game = new Game(container);

    // 로딩 완료 후 화면 제거 (간단처리)
    setTimeout(() => {
        loading.style.display = 'none';
    }, 1000);
};
