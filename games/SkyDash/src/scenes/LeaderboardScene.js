/**
 * LeaderboardScene
 * 게임의 순위를 보여주는 리더보드 화면입니다.
 */
class LeaderboardScene extends Phaser.Scene {
    constructor() {
        super('LeaderboardScene');
        this.gm = new GameManager();
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 배경
        this.add.rectangle(0, 0, width, height, 0x111111).setOrigin(0);

        // 리더보드 음악 시작
        if (window.soundManager) {
            window.soundManager.startBGM('leaderboard');
        }

        // 타이틀
        this.add.text(width / 2, 60, I18nManager.get('leaderboard.title'), {
            fontFamily: 'Arial',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // 탭 버튼 (Infinite / 100 Steps)
        this.createTabButton(width / 2 - 120, 140, I18nManager.get('leaderboard.infinite'), 'infinite');
        this.createTabButton(width / 2 + 120, 140, I18nManager.get('leaderboard.100steps'), '100');

        // 리스트 컨테이너
        this.listContainer = this.add.container(0, 200);

        // 뒤로가기
        const backBtn = this.add.rectangle(width / 2, height - 80, 200, 60, 0x666666).setInteractive();
        this.add.text(width / 2, height - 80, I18nManager.get('leaderboard.back'), { fontSize: '24px' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));

        // 초기 보기: Infinite
        this.showLeaderboard('infinite');
    }

    createTabButton(x, y, text, mode) {
        const btn = this.add.rectangle(x, y, 200, 50, 0x333333).setInteractive();
        const label = this.add.text(x, y, text, { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);

        btn.on('pointerdown', () => {
            this.showLeaderboard(mode);
            // 활성 버튼 시각적 처리 생략 (간단 구현)
        });

        return btn;
    }

    showLeaderboard(mode) {
        this.listContainer.removeAll(true);

        const data = this.gm.getLeaderboard(mode);
        const startY = 0;
        const rowHeight = 50;

        // 헤더
        const headerText = mode === 'infinite' ? I18nManager.get('leaderboard.header_infinite') : I18nManager.get('leaderboard.header_100');
        this.listContainer.add(this.add.text(360, -30, headerText, {
            fontSize: '20px', color: '#888888'
        }).setOrigin(0.5));

        if (data.length === 0) {
            this.listContainer.add(this.add.text(360, 100, I18nManager.get('leaderboard.no_records'), {
                fontSize: '28px', color: '#555555'
            }).setOrigin(0.5));
            return;
        }

        data.forEach((entry, index) => {
            const y = startY + index * rowHeight;
            const rank = index + 1;

            let scoreStr = '';
            if (mode === 'infinite') {
                scoreStr = `${entry.score}`;
            } else {
                scoreStr = entry.score >= 100 ? `${entry.time.toFixed(2)}s` : `${entry.score} ${I18nManager.get('leaderboard.fail')}`;
            }

            const date = new Date(entry.date).toLocaleDateString();

            const rowBg = this.add.rectangle(360, y, 600, 40, index % 2 === 0 ? 0x222222 : 0x1a1a1a);

            const rankText = this.add.text(100, y, `#${rank}`, { fontSize: '24px', color: '#ffd700' }).setOrigin(0, 0.5);
            const scoreText = this.add.text(280, y, scoreStr, { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5, 0.5);
            const comboTextLine = this.add.text(420, y, `${entry.maxCombo || 0}`, { fontSize: '24px', color: '#3498db' }).setOrigin(0.5, 0.5);
            const dateText = this.add.text(620, y, date, { fontSize: '18px', color: '#aaaaaa' }).setOrigin(1, 0.5);

            this.listContainer.add([rowBg, rankText, scoreText, comboTextLine, dateText]);
        });
    }
}
