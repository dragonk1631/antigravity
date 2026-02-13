/**
 * UIRenderer - Canvas 기반 HUD/UI 렌더링
 * 모든 UI 요소를 Canvas에 직접 그림
 */

import { SPRITE_CONFIG } from '../config/SpriteConfig.js';

export class UIRenderer {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {SpriteManager} spriteManager
     * @param {BitmapFont} bitmapFont
     */
    constructor(ctx, spriteManager, bitmapFont) {
        this.ctx = ctx;
        this.sprites = spriteManager;
        this.font = bitmapFont;
        this.config = SPRITE_CONFIG;
    }

    /**
     * 캔버스 크기 설정
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * HP 바 렌더링
     * @param {number} hp - 0-100
     */
    drawHPBar(hp) {
        const layout = this.config.HUD.HP_BAR;
        const x = this.width * layout.x;
        const y = this.height * layout.y;
        const w = this.width * layout.width;
        const h = this.height * layout.height;

        // 배경
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, w, h);

        // 테두리
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);

        // HP 게이지
        const fillW = (w - 4) * (hp / 100);
        let fillColor = this.config.COLORS.HP_FILL;
        if (hp <= 20) {
            fillColor = this.config.COLORS.HP_CRITICAL;
        } else if (hp <= 40) {
            fillColor = this.config.COLORS.HP_LOW;
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x + 2, y + 2, fillW, h - 4);

        // 라벨
        this.ctx.save();
        this.ctx.font = 'bold 14px "Outfit", sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('LIFE', x + w + 10, y + h / 2);
        this.ctx.restore();
    }

    /**
     * 점수 렌더링
     * @param {number} score
     */
    drawScore(score) {
        const layout = this.config.HUD.SCORE;
        const x = this.width * layout.x;
        const y = this.height * layout.y;

        this.font.drawScore(this.ctx, score, x, y, 8, {
            scale: layout.scale,
            align: layout.align,
            color: this.config.COLORS.SCORE
        });
    }

    /**
     * 콤보 렌더링
     * @param {number} combo
     * @param {number} animScale - 애니메이션 스케일 (1.0 = 기본)
     */
    drawCombo(combo, animScale = 1.0) {
        if (combo <= 0) return;

        const layout = this.config.HUD.COMBO;
        const x = this.width * layout.x;
        const y = this.height * layout.y;
        const scale = layout.scale * animScale;

        // 콤보 숫자
        this.font.drawNumber(this.ctx, combo, x, y, {
            scale: scale,
            align: layout.align,
            color: '#FFFFFF'
        });

        // COMBO 라벨
        this.ctx.save();
        this.ctx.font = `bold ${20 * animScale}px "Outfit", sans-serif`;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('COMBO', x, y + 50 * scale);
        this.ctx.restore();
    }

    /**
     * 진행 바 렌더링
     * @param {number} progress - 0-1
     */
    drawProgressBar(progress) {
        const layout = this.config.HUD.PROGRESS;
        const x = this.width * (layout.x - layout.width / 2);
        const y = this.height * layout.y;
        const w = this.width * layout.width;
        const h = this.height * layout.height;

        // 배경
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(x, y, w, h);

        // 진행
        this.ctx.fillStyle = '#00F2FF';
        this.ctx.fillRect(x, y, w * Math.min(1, progress), h);
    }

    /**
     * 판정 텍스트 렌더링
     * @param {string} judgment - 'PERFECT', 'GOOD', 'MISS'
     * @param {number} alpha - 투명도 (0-1)
     */
    drawJudgment(judgment, alpha = 1.0) {
        if (!judgment || alpha <= 0) return;

        const color = this.config.COLORS.JUDGMENT[judgment] || '#FFFFFF';
        const x = this.width * 0.5;
        const y = this.height * 0.55;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.font = 'bold 48px "Outfit", sans-serif';
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // 글로우 효과
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 20;

        this.ctx.fillText(judgment, x, y);
        this.ctx.restore();
    }

    /**
     * 시간 표시 렌더링
     * @param {number} current - 현재 시간 (초)
     * @param {number} duration - 전체 시간 (초)
     */
    drawTimeDisplay(current, duration) {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        const text = `${formatTime(current)} / ${formatTime(duration)}`;
        const x = this.width * 0.5;
        const y = this.height * 0.03;

        this.ctx.save();
        this.ctx.font = '14px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * 일시정지 오버레이 렌더링
     */
    drawPauseOverlay() {
        // 반투명 배경
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // PAUSED 텍스트
        this.ctx.save();
        this.ctx.font = 'bold 72px "Outfit", sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = '#FF66B2';
        this.ctx.shadowBlur = 20;
        this.ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 50);
        this.ctx.restore();

        // 안내 텍스트
        this.ctx.save();
        this.ctx.font = '24px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Press ESC or tap to resume', this.width / 2, this.height / 2 + 30);
        this.ctx.restore();
    }

    /**
     * 결과 화면 렌더링
     * @param {object} stats - { perfect, good, miss, maxCombo, score }
     * @param {string} rank - 'S', 'A', 'B', 'C', 'F'
     */
    drawResultScreen(stats, rank) {
        // 반투명 배경
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const startY = this.height * 0.15;

        // 타이틀
        this.ctx.save();
        this.ctx.font = 'bold 48px "Outfit", sans-serif';
        this.ctx.fillStyle = '#00F2FF';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SESSION COMPLETE', centerX, startY);
        this.ctx.restore();

        // 랭크
        this.ctx.save();
        this.ctx.font = 'bold 120px "Outfit", sans-serif';
        const rankColors = { S: '#FFD700', A: '#FF66B2', B: '#00F2FF', C: '#44FF44', F: '#FF4444' };
        this.ctx.fillStyle = rankColors[rank] || '#FFFFFF';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.shadowBlur = 30;
        this.ctx.fillText(rank, centerX, startY + 130);
        this.ctx.restore();

        // 스탯
        const statY = startY + 200;
        this.ctx.save();
        this.ctx.font = '24px "Outfit", sans-serif';
        this.ctx.textAlign = 'center';

        const statLabels = ['PERFECT', 'GOOD', 'MISS'];
        const statValues = [stats.perfect, stats.good, stats.miss];
        const statColors = ['#FF66B2', '#44FF44', '#666666'];

        statLabels.forEach((label, i) => {
            const x = centerX + (i - 1) * 150;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.fillText(label, x, statY);
            this.ctx.fillStyle = statColors[i];
            this.ctx.font = 'bold 36px "Outfit", sans-serif';
            this.ctx.fillText(String(statValues[i]), x, statY + 40);
            this.ctx.font = '24px "Outfit", sans-serif';
        });
        this.ctx.restore();

        // 최대 콤보 & 점수
        this.ctx.save();
        this.ctx.font = '20px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`MAX COMBO: ${stats.maxCombo}`, centerX, statY + 100);

        this.ctx.font = 'bold 48px "Outfit", sans-serif';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(String(stats.score).padStart(8, '0'), centerX, statY + 160);
        this.ctx.restore();

        // 안내 텍스트
        this.ctx.save();
        this.ctx.font = '18px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Tap to continue', centerX, this.height - 50);
        this.ctx.restore();
    }

    /**
     * 게임 오버 화면 렌더링
     */
    drawGameOverScreen() {
        // 반투명 배경
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // GAME OVER 텍스트
        this.ctx.save();
        this.ctx.font = 'bold 72px "Outfit", sans-serif';
        this.ctx.fillStyle = '#FF4444';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = '#FF4444';
        this.ctx.shadowBlur = 30;
        this.ctx.fillText('SESSION FAILED', centerX, centerY - 30);
        this.ctx.restore();

        // 안내 텍스트
        this.ctx.save();
        this.ctx.font = '24px "Outfit", sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('HP DEPLETED', centerX, centerY + 30);
        this.ctx.font = '18px "Outfit", sans-serif';
        this.ctx.fillText('Tap to retry', centerX, centerY + 80);
        this.ctx.restore();
    }
}
