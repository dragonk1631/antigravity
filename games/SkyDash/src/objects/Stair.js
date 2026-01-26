/**
 * Stair
 * 참고 이미지 스타일의 회색 콘크리트 계단 객체입니다.
 */
class Stair extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height) {
        super(scene, x, y);
        scene.add.existing(this);

        this.stepWidth = width;
        this.stepHeight = height;

        this.graphics = scene.add.graphics();
        this.add(this.graphics);

        this.drawStair();
    }

    drawStair() {
        const w = 90; // 실제 보이는 너비
        const h = 35; // 높이
        this.graphics.clear();

        // 1. 하단 그림자/입체감 (어두운 회색)
        this.graphics.fillStyle(0x444444, 1);
        this.graphics.fillRoundedRect(-w / 2, 5, w, h, 4);

        // 2. 메인 블록 몸체 (밝은 회색)
        // const stairBaseColor = parseInt(this.scene.gm.settings.stairColor.replace('#', '0x'));
        this.graphics.fillStyle(0xbdc3c7, 1);
        this.graphics.fillRoundedRect(-w / 2, 0, w, h - 5, 4);

        // 3. 디테일: 질감 표현 (점박이)
        this.graphics.fillStyle(0x7f8c8d, 0.5);
        const points = [[-20, 8], [10, 15], [25, 5], [-30, 18], [5, 22]];
        points.forEach(p => {
            this.graphics.fillCircle(p[0], p[1], 2);
        });

        // 4. 상단 하이라이트
        this.graphics.fillStyle(0xffffff, 0.4);
        this.graphics.fillRect(-w / 2 + 5, 2, w - 10, 3);
    }

    shatter() {
        if (this.isShattered) return;
        this.isShattered = true;

        const w = 90;
        const h = 35;
        this.graphics.clear();

        // Create shards
        const shardsCount = 6;
        for (let i = 0; i < shardsCount; i++) {
            const shard = this.scene.add.graphics();
            const sx = this.x + (Math.random() - 0.5) * w;
            const sy = this.y + (Math.random() - 0.5) * h;

            shard.setPosition(sx, sy);
            shard.fillStyle(0xbdc3c7, 1);
            shard.fillRoundedRect(-10, -5, 20, 10, 2);

            this.scene.tweens.add({
                targets: shard,
                y: sy + 200 + Math.random() * 300,
                x: sx + (Math.random() - 0.5) * 100,
                angle: Math.random() * 360,
                alpha: 0,
                duration: 600 + Math.random() * 400,
                ease: 'Cubic.easeIn',
                onComplete: () => shard.destroy()
            });
        }

        // Hide flag if any
        this.hideFlag();

        // The container will be deactivated by GameScene later, 
        // but we hide the visual immediately
        this.setVisible(false);
    }

    /**
     * 오브젝트 풀에서 재사용을 위해 상태를 초기화합니다.
     */
    reuse(x, y) {
        this.isShattered = false;
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.drawStair(); // 다시 그리기
        this.hideFlag(); // 재사용 시 깃발 숨김
    }

    /**
     * 계단 위에 순위 깃발을 표시합니다.
     */
    showFlag(rank) {
        if (this.flagContainer) this.flagContainer.destroy();

        this.flagContainer = this.scene.add.container(0, -20);
        this.add(this.flagContainer);

        // 순위별 색상 결정
        let flagColor;
        if (rank === 1) flagColor = 0xf1c40f; // Gold
        else if (rank === 2) flagColor = 0xbdc3c7; // Silver
        else if (rank === 3) flagColor = 0xcd7f32; // Bronze
        else flagColor = 0x3498db; // Others: Blue

        // 깃대
        const pole = this.scene.add.rectangle(40, -40, 4, 80, 0x333333);

        // 깃발 천
        const cloth = this.scene.add.graphics();
        cloth.fillStyle(flagColor, 1);
        cloth.fillTriangle(40, -80, 40, -40, 85, -60);
        cloth.lineStyle(2, 0xffffff, 0.8);
        cloth.strokeTriangle(40, -80, 40, -40, 85, -60);

        // 순위 숫자
        const label = this.scene.add.text(48, -68, rank, {
            fontFamily: 'Arial',
            fontSize: '22px',
            fontStyle: 'bold',
            color: rank <= 3 ? '#000000' : '#ffffff'
        }).setOrigin(0.5);

        this.flagContainer.add([pole, cloth, label]);
        this.flagContainer.setDepth(100);
    }

    hideFlag() {
        if (this.flagContainer) {
            this.flagContainer.destroy();
            this.flagContainer = null;
        }
    }
}
