/**
 * Player
 * 플레이어 캐릭터의 이동, 애니메이션, 상태를 관리하는 클래스입니다.
 * 모바일 최적화: 잔상 효과 비활성화, 오오라 단순화
 */
class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        scene.add.existing(this);

        // 모바일 감지
        this.isMobile = scene.isMobile || false;

        // 오오라 레이어 (몸 뒤에 표시) - 모바일에서는 단순화
        if (!this.isMobile) {
            this.aura = scene.add.graphics();
            this.add(this.aura);
            this.createAuraPulse();
            this.aura.setVisible(false);
        } else {
            // 모바일에서는 더미 객체
            this.aura = { setVisible: () => { }, clear: () => { } };
        }

        // 플레이어 인덱스 (기본값 player01)
        this.playerIndex = scene.gm?.settings.playerIndex || 1;
        const playerKey = `player${this.playerIndex.toString().padStart(2, '0')}`;
        this.playerKey = playerKey;

        this.sprite = scene.add.sprite(0, 0, playerKey);
        this.add(this.sprite);

        // 캐릭터 원본 크기는 1.0으로 유지하고, 사용하는 씬에서 컨테이너 배율로 조절합니다.
        this.sprite.setOrigin(0.5, 0.8); // 발 부분을 기준점으로 설정

        this.gridX = 0;
        this.gridY = 0;
        this.direction = 1; // 1: Right, -1: Left

        this.updateDirection();
    }

    createAuraPulse() {
        if (this.isMobile) return; // 모바일에서는 건너뜀

        this.scene.tweens.add({
            targets: this.aura,
            alpha: 0.3,
            scale: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    updateDirection() {
        // 스프라이트가 이미 방향별로 존재하므로 별도의 FlipX 처리는 필요하지 않거나 상황에 맞춰야 합니다.
        if (this.direction === 1) {
            this.sprite.setFlipX(false);
            this.sprite.play(`${this.playerKey}_walk-right`);
        } else {
            this.sprite.setFlipX(false);
            this.sprite.play(`${this.playerKey}_walk-left`);
        }

        // 초기 대기 상태에서는 천천히 움직이도록 설정
        this.sprite.anims.timeScale = 0.4;
    }

    drawCharacter() {
        // 모바일에서는 건너뜀
        if (this.isMobile) return;

        this.aura.clear();
        // --- Aura (Dynamic Glow) ---
        this.aura.fillStyle(0xffffff, 0.4);
        this.aura.fillCircle(0, -45, 60);
        this.aura.fillStyle(0x3498db, 0.2);
        this.aura.fillCircle(0, -45, 85);
    }

    turn() {
        // 기존 진행 중인 모든 애니메이션(특히 스케일 변화) 즉시 종료
        this.scene.tweens.killTweensOf(this);

        this.direction *= -1;
        this.updateDirection();

        this.sprite.scaleY = 1.0; // 스쿼시 효과 초기화
        this.sprite.angle = 0;    // 각도 초기화
    }

    /**
     * 계단을 오릅니다. 절대 좌표로 이동하여 위치 어긋남을 방지합니다.
     */
    climbTo(targetX, targetY) {
        // 모바일에서는 잔상 효과 비활성화 (성능 최적화)
        if (!this.isMobile) {
            this.createAfterimage();
        }

        this.gridX += this.direction;
        this.gridY += 1;

        // 점프 시에만 오오라 활성화 (데스크톱만)
        if (!this.isMobile) {
            this.aura.setVisible(true);
        }

        // Jump animation
        this.scene.tweens.add({
            targets: this,
            y: targetY,
            x: targetX,
            duration: 120,
            ease: 'Cubic.easeOut',
            onStart: () => {
                // 점프 시 애니메이션 재생 (첫 프레임부터 시작하도록 강제, 속도 정상화)
                if (this.direction === 1) this.sprite.play('walk-right', true);
                else this.sprite.play('walk-left', true);
                this.sprite.anims.timeScale = 1.0;

                // 스쿼시 효과 (모바일에서도 유지 - 가벼운 효과)
                this.scene.tweens.add({
                    targets: this.sprite,
                    scaleY: 0.8,
                    duration: 60,
                    yoyo: true
                });
            },
            onComplete: () => {
                // 착지 시 오오라 비활성화 및 애니메이션 속도 감소 (대기 모드)
                if (!this.isMobile) {
                    this.aura.setVisible(false);
                }
                this.sprite.anims.timeScale = 0.4;
            }
        });
    }

    createAfterimage() {
        // 모바일에서는 호출되지 않음 (climbTo에서 체크)
        if (this.isMobile) return;

        // 잔상 효과: 현재 플레이어 스프라이트의 텍스처와 프레임을 그대로 복제하여 잔상 생성
        const ghost = this.scene.add.sprite(this.x, this.y, 'player', this.sprite.frame.name);

        // 현재 스케일, 각도, 뒤집기 상태 복사
        ghost.setScale(this.scaleX, this.scaleY);
        ghost.setAngle(this.angle + this.sprite.angle);
        ghost.setAlpha(0.6);
        ghost.setDepth(this.depth - 1); // 플레이어 뒤에 표시

        // 하얀색 틴트를 입혀 "잔상" 느낌 강조 (화이트 블룸 효과)
        ghost.setTint(0xffffff);

        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            scaleX: this.scaleX * 1.2,
            scaleY: this.scaleY * 1.2,
            duration: 400,
            ease: 'Power2',
            onComplete: () => ghost.destroy()
        });
    }

    fall() {
        this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y + 1200,
            angle: 720,
            alpha: 0,
            duration: 1200,
            ease: 'Expo.easeIn'
        });
    }
}
