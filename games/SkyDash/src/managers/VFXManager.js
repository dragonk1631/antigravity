/**
 * VFXManager
 * 게임 내 다양한 파티클 효과와 시각적 연출을 관리하는 클래스입니다.
 * 모바일 최적화: 파티클 수 감소, ADD 블렌드 제거, 조건부 비활성화
 */
class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.emitters = {};
        this.isMobile = scene.isMobile || false; // 모바일 감지
        this.init();
    }

    init() {
        // 이미 텍스처가 존재할 수 있으므로 체크 후 생성
        if (!this.scene.textures.exists('pixel_smoke')) {
            const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff);
            graphics.fillRect(0, 0, 8, 8);
            graphics.generateTexture('pixel_smoke', 8, 8);
        }

        // 1. 착지 먼지 효과 에미터 (모바일 최적화)
        this.emitters.landing = this.scene.add.particles(0, 0, 'pixel_smoke', {
            speed: { min: 20, max: this.isMobile ? 60 : 100 },
            angle: { min: 180, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: this.isMobile ? 250 : 400, // 모바일: 빨리 사라짐
            gravityY: 100,
            blendMode: 'NORMAL', // 성능 최적화: ADD -> NORMAL
            emitting: false
        });

        // 2. 콤보 불꽃 효과 에미터 (모바일 최적화)
        this.emitters.combo = this.scene.add.particles(0, 0, 'pixel_smoke', {
            speed: { min: 100, max: this.isMobile ? 150 : 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: this.isMobile ? 350 : 600, // 모바일: 빨리 사라짐
            gravityY: 200,
            blendMode: 'NORMAL', // 성능 최적화: ADD -> NORMAL
            emitting: false
        });
    }

    /**
     * 특정 위치에 착지 먼지 효과를 생성합니다.
     */
    playLanding(x, y) {
        // 모바일에서는 파티클 수 감소
        const count = this.isMobile ? 4 : 8;
        this.emitters.landing.emitParticleAt(x, y, count);
    }

    /**
     * 특정 위치에 콤보 달성 축하 효과를 생성합니다.
     */
    playComboCelebration(x, y, color = 0xffff00) {
        // 모바일에서는 파티클 수 감소
        const count = this.isMobile ? 8 : 15;
        this.emitters.combo.setParticleTint(color);
        this.emitters.combo.emitParticleAt(x, y, count);
    }

    /**
     * 피버 모드 진입 시 지속적인 파티클 효과를 활성화합니다.
     * 모바일에서는 비활성화 (성능 보존)
     */
    startFeverFollow(target) {
        // 모바일에서는 피버 파티클 비활성화
        if (this.isMobile) return;

        this.feverEmitter = this.scene.add.particles(0, 0, 'pixel_smoke', {
            follow: target,
            speed: { min: 50, max: 150 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            blendMode: 'NORMAL', // 성능 최적화
            tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00], // 무지개 효과
            frequency: 50
        });
    }

    stopFeverFollow() {
        if (this.feverEmitter) {
            this.feverEmitter.stop();
            this.scene.time.delayedCall(1000, () => this.feverEmitter.destroy());
            this.feverEmitter = null;
        }
    }
}
