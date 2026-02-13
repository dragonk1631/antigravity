# BeatBistro: Game Layout & UI Plan

본 문서는 `BeatBistro` 게임의 UI 구조와 실전적인 Phaser 구현 예시를 정의합니다.

```javascript
import { LEVELS } from '../data/levels.js';
import { COLORS, GAME_CONFIG } from '../consts.js';
import AudioScheduler from '../systems/AudioScheduler.js';
import InputManager from '../systems/InputManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import AdService from '../systems/AdService.js';

export default class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create(data) {
        this.mode = data.mode || 'normal';
        this.playlist = data.playlist || [];
        this.cumulativeScore = data.score || 0;
        
        let levelId = data.levelId;
        if (this.mode === 'daily' && this.playlist.length > 0) {
            levelId = this.playlist[0];
        }

        this.levelData = LEVELS.find(l => l.id === levelId) || LEVELS[0];
        
        // Systems
        this.scoreManager = new ScoreManager();
        this.inputManager = new InputManager(this, (hand, timeMs) => this.handleInput(hand, timeMs));
        this.inputManager.setup();
        this.adService = new AdService(this);
        this.audioCtx = this.sound.context;
        
        this.health = GAME_CONFIG.MAX_HEALTH; 
        this.maxHealth = GAME_CONFIG.MAX_HEALTH;
        this.isRevived = false;

        this.startTime = 0;
        this.isPlaying = false;
        
        this.notes = this.generateNotes(this.levelData);
        this.nextNoteIndex = 0;
        this.activeNotes = [];
        this.nextVisualIndex = 0;

        this.setupUI(); // <-- Major Change Here
        
        // Start Countdown (update font style too)
        // ...
        this.startGame();
    }
    
    setupUI() {
        const w = this.scale.width;
        const h = this.scale.height;
        
        // 1. Background
        this.add.tileSprite(0, 0, w, h, 'bg_tile').setOrigin(0).setAlpha(0.5);
        
        // 2. Top UI Area
        // Level Panel (Top Left)
        const panelLeft = this.add.nineslice(20, 20, 'panel_rounded', 0, 200, 80, 16, 16, 16, 16).setOrigin(0);
        this.add.text(40, 40, `Level ${this.levelData.id}`, { fontSize: '20px', color: COLORS.TEXT_DARK, fontStyle: 'bold' });
        this.add.text(40, 65, `${this.levelData.bpm} BPM`, { fontSize: '14px', color: COLORS.TEXT_LIGHT });
        
        // Combo (Top Center)
        this.add.text(w/2, 30, "COMBO", { fontSize: '16px', color: COLORS.TEXT_DARK, fontStyle: 'bold' }).setOrigin(0.5);
        this.comboText = this.add.text(w/2, 60, "0", { fontSize: '48px', color: COLORS.TEXT_DARK, fontStyle: 'bold' }).setOrigin(0.5);
        
        // Score (Top Right)
        this.add.text(w - 20, 30, "SCORE", { fontSize: '16px', color: COLORS.TEXT_DARK }).setOrigin(1, 0);
        this.scoreText = this.add.text(w - 20, 50, "0", { fontSize: '24px', color: COLORS.TEXT_DARK }).setOrigin(1, 0);
        
        // 3. Central Gauge
        this.add.image(w/2, h * 0.4, 'gauge_bg').setAlpha(0.8);
        // Add rotating hand?
        // this.hand = this.add.rectangle(...)

        // 4. Bottom Input Zones
        // Left (Chop)
        const btnY = h - 100;
        this.btnLeft = this.add.image(w * 0.25, btnY, 'btn_left');
        this.add.image(w * 0.25, btnY - 20, 'icon_knife').setScale(0.8);
        this.add.text(w * 0.25, btnY + 40, "CHOP", { fontSize: '24px', color: COLORS.TEXT_DARK, fontStyle: 'bold' }).setOrigin(0.5);
        
        // Right (Cook)
        this.btnRight = this.add.image(w * 0.75, btnY, 'btn_right');
        this.add.image(w * 0.75, btnY - 20, 'icon_pan').setScale(0.8);
        this.add.text(w * 0.75, btnY + 40, "COOK", { fontSize: '24px', color: COLORS.TEXT_DARK, fontStyle: 'bold' }).setOrigin(0.5);
        
        // Hit Line is effectively btnY
        this.hitY = btnY;
    }
    
    // update() Logic needs to match targetY to hitY
}
```
