import { LEVELS } from '../data/levels.js';

export default class DailyManager {
    constructor() {
    }

    getDailySeed() {
        // Local date YYYYMMDD
        const now = new Date();
        return (now.getFullYear() * 10000) + ((now.getMonth() + 1) * 100) + now.getDate();
    }

    // Simple Linear Congruential Generator
    pseudoRandom(seed) {
        let value = seed;
        return function () {
            value = (value * 9301 + 49297) % 233280;
            return value / 233280;
        }
    }

    getDailyStages() {
        const seed = this.getDailySeed();
        const rand = this.pseudoRandom(seed);

        // Copy list to avoid mutation
        const pool = [...LEVELS];
        const selected = [];

        // Pick 3 distinct levels
        for (let i = 0; i < 3; i++) {
            if (pool.length === 0) break;
            const idx = Math.floor(rand() * pool.length);
            selected.push(pool[idx].id);
            pool.splice(idx, 1);
        }

        return selected;
    }
}
