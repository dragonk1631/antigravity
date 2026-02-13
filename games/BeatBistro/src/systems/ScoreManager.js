import { JUDGE } from '../consts.js';

export default class ScoreManager {
    constructor() {
        this.reset();
    }

    resetCombo() {
        this.combo = 0;
    }

    reset() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.stats = { perfect: 0, good: 0, miss: 0 };
        this.history = []; // { delta: ms, result: string }
        this.totalNotes = 0;
    }

    setTotalNotes(count) {
        this.totalNotes = count;
    }

    judge(timeDiffMs) {
        const diff = Math.abs(timeDiffMs);
        let result = 'MISS';

        if (diff <= JUDGE.PERFECT) {
            result = 'PERFECT';
        } else if (diff <= JUDGE.GOOD) {
            result = 'GOOD';
        }

        // Store signed delta for error bar (positive = late, negative = early usually, but here diff is Abs. 
        // We need original signed delta from caller.
        // Wait, caller passed timeDiffMs (Abs(diff) done inside). 
        // Actually let's assume input is SIGNED.

        // Shield Logic
        if (result === 'MISS' && this.hasShield) {
            console.log("Shield Activated!");
            this.hasShield = false;
            result = 'GOOD'; // Convert to Good(Combo kept)
            // Trigger UI callback if needed? ScoreManager usually just logic.
            // Caller Game.js checks return value.
            // Better: Return 'GOOD' but notify game. 
            // Actually let's just return 'GOOD' and Game won't know diff unless we assume 'GOOD' from 'MISS' delta is shield.
            // Let's stick to standard returns for now, but Game.js handles effect.
            // Wait, if I return GOOD here, addResult logic for GOOD runs.
        }

        this.addResult(result, timeDiffMs);
        return result;
    }

    activateShield() {
        this.hasShield = true;
    }

    addResult(result, deltaMs) {
        // Record history
        if (result !== 'MISS') { // Only record hit error for hits, or maybe record miss as null?
            this.history.push({ delta: deltaMs, result });
            // Limit history size? No, keep all for replay/graph potentially, 
            // but for visualizer we only need recent 20.
        } else {
            this.history.push({ delta: null, result: 'MISS' });
        }

        if (result === 'MISS') {
            this.combo = 0;
            this.stats.miss++;
        } else {
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            if (result === 'PERFECT') {
                this.score += 100 + (this.combo * 1);
                this.stats.perfect++;
            } else {
                this.score += 60 + (this.combo * 0.5);
                this.stats.good++;
            }
        }
    }

    getAccuracy() {
        const total = this.stats.perfect + this.stats.good + this.stats.miss;
        if (total === 0) return 0;
        // Simple weighted accuracy: Perfect 100%, Good 50%, Miss 0%
        const weighted = (this.stats.perfect * 100) + (this.stats.good * 50);
        return (weighted / total).toFixed(1);
    }

    getRecentDeltas(count = 20) {
        return this.history.filter(h => h.result !== 'MISS').slice(-count);
    }
}
