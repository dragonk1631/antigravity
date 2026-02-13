/**
 * BitmapFont - 비트맵 폰트 렌더링
 * 스프라이트 시트 기반 텍스트 렌더링
 */

import { SPRITE_CONFIG } from '../config/SpriteConfig.js';

export class BitmapFont {
    /**
     * @param {SpriteManager} spriteManager
     */
    constructor(spriteManager) {
        this.spriteManager = spriteManager;
        this.config = SPRITE_CONFIG.BITMAP_FONT;
        this.glyphMap = this._buildGlyphMap();
    }

    /**
     * 문자별 글리프 맵 생성
     * @returns {Map<string, {col: number, row: number}>}
     */
    _buildGlyphMap() {
        const map = new Map();
        const chars = this.config.CHARS;
        const cols = this.config.COLS;

        for (let i = 0; i < chars.length; i++) {
            map.set(chars[i], {
                col: i % cols,
                row: Math.floor(i / cols)
            });
        }
        return map;
    }

    /**
     * 텍스트 렌더링
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} text
     * @param {number} x
     * @param {number} y
     * @param {object} options
     */
    drawText(ctx, text, x, y, options = {}) {
        const {
            scale = 1,
            align = 'left',
            color = null,
            spacing = this.config.SPACING
        } = options;

        const glyphW = this.config.GLYPH_WIDTH;
        const glyphH = this.config.GLYPH_HEIGHT;
        const charWidth = (glyphW + spacing) * scale;
        const totalWidth = text.length * charWidth - spacing * scale;

        // 정렬 계산
        let startX = x;
        if (align === 'center') {
            startX = x - totalWidth / 2;
        } else if (align === 'right') {
            startX = x - totalWidth;
        }

        const fontSheet = this.spriteManager.get('FONT_SHEET');

        // 폰트 시트가 없으면 Canvas 기본 폰트로 폴백
        if (!fontSheet) {
            this._drawFallbackText(ctx, text, startX, y, scale, color);
            return;
        }

        // 글리프 렌더링
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            const glyph = this.glyphMap.get(char);

            if (glyph) {
                const sx = glyph.col * glyphW;
                const sy = glyph.row * glyphH;
                const dx = startX + i * charWidth;
                const dw = glyphW * scale;
                const dh = glyphH * scale;

                ctx.drawImage(fontSheet, sx, sy, glyphW, glyphH, dx, y, dw, dh);
            }
        }
    }

    /**
     * 폴백 텍스트 렌더링 (Canvas 기본 폰트)
     */
    _drawFallbackText(ctx, text, x, y, scale, color) {
        ctx.save();
        ctx.font = `bold ${48 * scale}px "Outfit", sans-serif`;
        ctx.fillStyle = color || '#FFFFFF';
        ctx.textBaseline = 'top';

        // 글로우 효과
        ctx.shadowColor = color || '#FFFFFF';
        ctx.shadowBlur = 10 * scale;

        ctx.fillText(text, x, y);
        ctx.restore();
    }

    /**
     * 숫자 전용 렌더링 (점수, 콤보용)
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} value
     * @param {number} x
     * @param {number} y
     * @param {object} options
     */
    drawNumber(ctx, value, x, y, options = {}) {
        const text = String(value);
        this.drawText(ctx, text, x, y, options);
    }

    /**
     * 패딩된 점수 렌더링
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} score
     * @param {number} x
     * @param {number} y
     * @param {number} [digits=8]
     * @param {object} options
     */
    drawScore(ctx, score, x, y, digits = 8, options = {}) {
        const text = String(score).padStart(digits, '0');
        this.drawText(ctx, text, x, y, options);
    }
}
