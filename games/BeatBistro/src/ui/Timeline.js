
import { COLORS, GAME_CONFIG } from '../consts.js';

export default class Timeline {
    constructor(scene, levelData) {
        this.scene = scene;
        this.levelData = levelData;

        // Setup Layers
        this.laneContainer = scene.add.container(0, 0);
        this.noteContainer = scene.add.container(0, 0);
        this.hitLineContainer = scene.add.container(0, 0);

        this.notes = [];
        this.activeVisuals = [];
        this.nextNoteIndex = 0;

        // Layout Config
        this.w = scene.scale.width;
        this.h = scene.scale.height;

        this.laneLeftY = this.h * 0.35; // Top Lane
        this.laneRightY = this.h * 0.55; // Bottom Lane
        this.hitX = this.w * 0.2; // Hit Line at 20% width (Right to Left scroll?) 
        // Prompt said "Rights to Left scroll" or "Right from judgment line"?
        // "Notes move from Right to Judgment Line(Center or Left)"
        // Let's put Judgment Line at Left (20%) and Notes spawn at Right (100%+)

        this.createLanes();
    }

    createLanes() {
        // 1. Lane Tracks (Horizontal Lines)
        // Left Lane (Top) - Blue
        this.scene.add.line(0, 0, 0, this.laneLeftY, this.w, this.laneLeftY, parseInt(COLORS.SECONDARY.replace('#', '0x')))
            .setOrigin(0).setLineWidth(2).setAlpha(0.5);

        // Right Lane (Bottom) - Orange
        this.scene.add.line(0, 0, 0, this.laneRightY, this.w, this.laneRightY, parseInt(COLORS.PRIMARY.replace('#', '0x')))
            .setOrigin(0).setLineWidth(2).setAlpha(0.5);

        // 2. Judgment Line (Vertical)
        this.hitLine = this.scene.add.rectangle(this.hitX, this.h * 0.25, 4, this.h * 0.4, 0xffffff).setOrigin(0.5, 0);

        // Labels
        this.scene.add.text(10, this.laneLeftY - 30, 'LEFT', { fontSize: '12px', color: COLORS.SECONDARY });
        this.scene.add.text(10, this.laneRightY - 30, 'RIGHT', { fontSize: '12px', color: COLORS.PRIMARY });
    }

    spawnNote(noteData) {
        const isLeft = noteData.hand === 'left';
        const y = isLeft ? this.laneLeftY : this.laneRightY;
        const color = isLeft ? COLORS.SECONDARY : COLORS.PRIMARY;
        const noteColorInt = parseInt(color.replace('#', '0x'));

        // Determine Shape based on subdivision
        // We lack strictly "beat division" data in individual note, 
        // but we have levelData.pattern.left/right (e.g. 2, 3)
        const split = isLeft ? this.levelData.pattern.left : this.levelData.pattern.right;

        let visual;

        if (split === 2) {
            // Line Shape (Vertical bar or Dash)
            visual = this.scene.add.rectangle(0, 0, 4, 40, noteColorInt);
        } else if (split === 3) {
            // Triangle
            visual = this.scene.add.triangle(0, 0, 0, -20, 17, 10, -17, 10, noteColorInt);
        } else if (split === 4) {
            // Square
            visual = this.scene.add.rectangle(0, 0, 30, 30, noteColorInt);
        } else {
            // Default Circle
            visual = this.scene.add.circle(0, 0, 15, noteColorInt);
        }

        visual.setPosition(this.w + 50, y); // Spawn off-screen right
        visual.noteData = noteData;

        this.activeVisuals.push(visual);
        this.noteContainer.add(visual); // Add to container if we used one, or just scene
    }

    update(currentGameTime) {
        // Spawn Logic
        // Calculate X based on Time.
        // x = hitX + (timeToHit * speed)
        // If speed is pixels per second. Let's start with 300 px/s?
        const SPEED = 500;

        // 1. Spawn
        // Need to look ahead enough to spawn offscreen
        // Distance from HitX to ScreenWidth = w - hitX
        // Time needed = Dist / Speed
        const lookAheadTime = (this.w - this.hitX + 100) / SPEED;

        while (this.nextNoteIndex < this.notes.length) {
            const note = this.notes[this.nextNoteIndex];
            if (note.time - lookAheadTime < currentGameTime) {
                this.spawnNote(note);
                this.nextNoteIndex++;
            } else {
                break;
            }
        }

        // 2. Move Active Notes
        for (let i = this.activeVisuals.length - 1; i >= 0; i--) {
            const visual = this.activeVisuals[i];
            const timeToHit = visual.noteData.time - currentGameTime;

            const targetX = this.hitX + (timeToHit * SPEED);
            visual.x = targetX;
            visual.y = visual.noteData.hand === 'left' ? this.laneLeftY : this.laneRightY; // Ensure Y stays correct

            // Cleanup Missed
            if (targetX < -50) { // Off screen left
                visual.destroy();
                this.activeVisuals.splice(i, 1);
                // Trigger MISS callback? handled by Game.js usually via ScoreManager check
            }
        }
    }

    setNotes(notes) {
        this.notes = notes;
        this.nextNoteIndex = 0;
        this.activeVisuals.forEach(v => v.destroy());
        this.activeVisuals = [];
    }

    // Quick effect on hit line
    pulseLine() {
        this.scene.tweens.add({
            targets: this.hitLine,
            scaleX: 2,
            duration: 50,
            yoyo: true
        });
    }
}
