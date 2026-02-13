export default class SaveManager {
    constructor() {
        this.STORAGE_KEY = 'beatbistro_save_v1';
        this.data = this.load();
    }

    load() {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        } else {
            return this.getDefaultData();
        }
    }

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    }

    getDefaultData() {
        return {
            version: 1,
            starsByLevel: {}, // { levelId: 1~3 }
            xp: 0,
            rank: 1,
            ownedCosmetics: ['default'],
            equippedCosmetics: { note: 'default', sfx: 'default' }
        };
    }

    getStars(levelId) {
        return this.data.starsByLevel[levelId] || 0;
    }

    isLevelUnlocked(levelId) {
        if (levelId === 1) return true;
        // Check if previous level has at least 1 star
        const prevStars = this.getStars(levelId - 1);
        return prevStars > 0;
    }

    // Returns true if new record (more stars)
    submitLevelResult(levelId, score, stars) {
        const currentStars = this.getStars(levelId);
        let isNewRecord = false;

        if (stars > currentStars) {
            this.data.starsByLevel[levelId] = stars;
            isNewRecord = true;
        }

        // Add XP (simple formula: score / 100)
        const earnedXP = Math.floor(score / 10);
        this.data.xp += earnedXP;

        // Rank logic (simple: 1000 XP per rank)
        this.data.rank = 1 + Math.floor(this.data.xp / 1000);

        this.save();
        return { isNewRecord, earnedXP, rank: this.data.rank };
    }
}
