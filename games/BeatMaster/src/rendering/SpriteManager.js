/**
 * SpriteManager - 스프라이트 로딩, 캐싱, 렌더링 관리
 * BeatMaster 스프라이트 기반 UI 시스템
 */

import { SPRITE_CONFIG } from '../config/SpriteConfig.js';

export class SpriteManager {
    constructor() {
        this.images = {};
        this.loaded = false;
        this.loadPromise = null;
    }

    /**
     * 모든 에셋 로드
     * @returns {Promise<void>}
     */
    async loadAll() {
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = this._loadAllAssets();
        await this.loadPromise;
        this.loaded = true;
        return this.loadPromise;
    }

    async _loadAllAssets() {
        const assets = SPRITE_CONFIG.ASSETS;
        const loadPromises = [];

        for (const [key, path] of Object.entries(assets)) {
            loadPromises.push(this._loadImage(key, path));
        }

        await Promise.allSettled(loadPromises);
        console.log('[SpriteManager] All assets loaded:', Object.keys(this.images));
    }

    /**
     * 단일 이미지 로드
     * @param {string} key - 에셋 키
     * @param {string} path - 파일 경로
     * @returns {Promise<HTMLImageElement>}
     */
    _loadImage(key, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                console.log(`[SpriteManager] Loaded: ${key} (${img.width}x${img.height})`);
                resolve(img);
            };
            img.onerror = (err) => {
                console.warn(`[SpriteManager] Failed to load: ${key} from ${path}`);
                resolve(null); // Don't reject, just continue
            };
            img.src = path;
        });
    }

    /**
     * 이미지 가져오기
     * @param {string} key - 에셋 키
     * @returns {HTMLImageElement|null}
     */
    get(key) {
        return this.images[key] || null;
    }

    /**
     * 전체 이미지 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} key
     * @param {number} x
     * @param {number} y
     * @param {number} [width]
     * @param {number} [height]
     */
    draw(ctx, key, x, y, width, height) {
        const img = this.get(key);
        if (!img) return;

        if (width !== undefined && height !== undefined) {
            ctx.drawImage(img, x, y, width, height);
        } else {
            ctx.drawImage(img, x, y);
        }
    }

    /**
     * 스프라이트 시트에서 일부 영역 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} key
     * @param {number} sx - 소스 X
     * @param {number} sy - 소스 Y
     * @param {number} sw - 소스 너비
     * @param {number} sh - 소스 높이
     * @param {number} dx - 대상 X
     * @param {number} dy - 대상 Y
     * @param {number} dw - 대상 너비
     * @param {number} dh - 대상 높이
     */
    drawSprite(ctx, key, sx, sy, sw, sh, dx, dy, dw, dh) {
        const img = this.get(key);
        if (!img) return;

        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    /**
     * 중앙 정렬 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} key
     * @param {number} cx - 중심 X
     * @param {number} cy - 중심 Y
     * @param {number} width
     * @param {number} height
     */
    drawCentered(ctx, key, cx, cy, width, height) {
        const img = this.get(key);
        if (!img) return;

        const w = width || img.width;
        const h = height || img.height;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    }

    /**
     * 로드 상태 확인
     * @returns {boolean}
     */
    isLoaded() {
        return this.loaded;
    }
}
