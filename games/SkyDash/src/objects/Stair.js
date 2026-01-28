/**
 * Stair
 * 참고 이미지 스타일의 회색 콘크리트 계단 객체입니다.
 * 모바일 최적화: 정적 텍스처 사용으로 매번 Graphics 드로잉 방지
 */
class Stair extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height, tileFrame = null) {
        super(scene, x, y);
        scene.add.existing(this);

        this.stepWidth = width;
        this.stepHeight = height;
        this.tileFrame = tileFrame;

        // 1. 타일셋 이미지가 지정된 경우 해당 타일 사용, 없으면 Graphics 텍스처 사용
        if (this.tileFrame !== null && scene.textures.exists('tileset')) {
            this.stairImage = scene.add.sprite(0, 0, 'tileset', this.tileFrame);

            // 픽셀 아트 잘림 방지를 위해 중앙 원점으로 설정하고 컨테이너 중앙에 배치
            this.stairImage.setOrigin(0.5, 0.5);
            this.stairImage.y = this.stepHeight / 2;

            // 논리 영역을 가득 채우면서도 비율을 유지하려면 정사각형으로 크게 설정하는 것이 안전할 수 있음
            this.stairImage.setDisplaySize(this.stepWidth, this.stepHeight);
        } else {
            // 정적 텍스처 생성 (한 번만 - 성능 최적화) 폴백
            if (!scene.textures.exists('stair_texture')) {
                const g = scene.make.graphics({ x: 0, y: 0, add: false });
                const w = 90;
                const h = 35;

                g.fillStyle(0x444444, 1);
                g.fillRoundedRect(-w / 2 + 45, 5, w, h, 4);
                g.fillStyle(0xbdc3c7, 1);
                g.fillRoundedRect(-w / 2 + 45, 0, w, h - 5, 4);
                g.fillStyle(0x7f8c8d, 0.5);
                const points = [[-20 + 45, 8], [10 + 45, 15], [25 + 45, 5], [-30 + 45, 18], [5 + 45, 22]];
                points.forEach(p => g.fillCircle(p[0], p[1], 2));
                g.fillStyle(0xffffff, 0.4);
                g.fillRect(-w / 2 + 5 + 45, 2, w - 10, 3);

                g.generateTexture('stair_texture', 90, 40);
                g.destroy();
            }
            this.stairImage = scene.add.image(0, 0, 'stair_texture');
            this.stairImage.setOrigin(0.5, 0);
        }

        this.add(this.stairImage);
    }

    /**
     * @deprecated 정적 텍스처 사용으로 더 이상 필요 없음
     */
    drawStair() {
        // 정적 텍스처 사용으로 매 프레임 드로잉 제거
    }

    shatter() {
        if (this.isShattered) return;
        this.isShattered = true;

        // 이미지 숨기기
        this.stairImage.setVisible(false);

        const w = 90;
        const h = 35;

        // 모바일에서는 파편 수 50% 감소
        const isMobile = this.scene.isMobile;
        const shardsCount = isMobile ? 3 : 6;

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
                duration: isMobile ? 400 : 600 + Math.random() * 400, // 모바일: 빨리 사라짐
                ease: 'Cubic.easeIn',
                onComplete: () => shard.destroy()
            });
        }

        // Hide flag if any
        this.hideFlag();

        // 컨테이너 숨김
        this.setVisible(false);
    }

    /**
     * 오브젝트 풀에서 재사용을 위해 상태를 초기화합니다.
     * @param {number} x
     * @param {number} y
     * @param {number|null} tileFrame
     * @param {number} direction 1 (오른쪽 위), -1 (왼쪽 위)
     */
    reuse(x, y, tileFrame = null, direction = 1) {
        this.isShattered = false;
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.stairImage.setVisible(true);
        this.hideFlag();

        // 타일 프레임 갱신
        if (tileFrame !== null && this.scene.textures.exists('tileset')) {
            this.stairImage.setTexture('tileset', tileFrame);
            this.stairImage.setDisplaySize(this.stepWidth, this.stepHeight);
            this.stairImage.setOrigin(0.5, 0.5);
            this.stairImage.y = this.stepHeight / 2;

            // 377번 계단 타일의 좌우 반전 처리
            // direction 1(오른쪽)일 때와 -1(왼쪽)일 때 계단 모양을 맞춤
            if (tileFrame === 377) {
                this.stairImage.setFlipX(direction === -1);
            } else {
                this.stairImage.setFlipX(false);
            }
        } else if (!this.tileFrame) {
            this.stairImage.setTexture('stair_texture');
            this.stairImage.setOrigin(0.5, 0);
            this.stairImage.y = 0;
            this.stairImage.setFlipX(false);
        }
    }

    /**
     * 계단 위에 순위 깃발을 표시합니다.
     * 성능 최적화: 텍스처 기반 깃발 (미래 개선 가능)
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
