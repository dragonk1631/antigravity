export const LEVELS = [
    // --- 2:3 POLYRHYTHM (Levels 1-10) ---
    {
        id: 1,
        title: "Genesis Pattern",
        bpm: 90,
        pattern: { left: 2, right: 3 },
        duration: 30,
        difficulty: 1,
        mutation: null,
        thresholds: { star1: 1000, star2: 3000, star3: 4500 }
    },
    {
        id: 2,
        title: "Sine Wave", // Was Morning Coffee
        bpm: 95,
        pattern: { left: 2, right: 3 },
        duration: 40,
        difficulty: 1,
        mutation: null,
        thresholds: { star1: 1500, star2: 4000, star3: 6000 }
    },
    {
        id: 3,
        title: "Tri-Force", // Was Lunch Rush
        bpm: 100,
        pattern: { left: 2, right: 3 },
        duration: 45,
        difficulty: 2,
        mutation: null,
        thresholds: { star1: 2000, star2: 5000, star3: 7500 }
    },
    {
        id: 4,
        title: "Hidden Layer", // Was Hidden Spice
        bpm: 105,
        pattern: { left: 2, right: 3 },
        duration: 45,
        difficulty: 2,
        mutation: "HIDE_GUIDE_LEFT",
        thresholds: { star1: 2000, star2: 5000, star3: 7500 }
    },
    {
        id: 5,
        title: "Parallel Crossing", // Was Double Order
        bpm: 110,
        pattern: { left: 2, right: 3 },
        duration: 50,
        difficulty: 3,
        mutation: "ACCENT_BONUS",
        thresholds: { star1: 2500, star2: 6000, star3: 9000 }
    },
    {
        id: 6,
        title: "Hexagon Beat", // Was Chef's Special
        bpm: 120,
        pattern: { left: 2, right: 3 },
        duration: 50,
        difficulty: 3,
        mutation: null,
        thresholds: { star1: 3000, star2: 7000, star3: 10000 }
    },
    {
        id: 7,
        title: "Blind Sync", // Was Blind Taste
        bpm: 125,
        pattern: { left: 2, right: 3 },
        duration: 55,
        difficulty: 4,
        mutation: "HIDE_GUIDE_RIGHT",
        thresholds: { star1: 3500, star2: 8000, star3: 11000 }
    },
    {
        id: 8,
        title: "Phase Shift", // Was Pepper Corns
        bpm: 135,
        pattern: { left: 2, right: 3 },
        duration: 60,
        difficulty: 4,
        mutation: "SWAP_PHASE",
        thresholds: { star1: 4000, star2: 9000, star3: 12000 }
    },
    {
        id: 9,
        title: "High Velocity", // Was High Heat
        bpm: 140,
        pattern: { left: 2, right: 3 },
        duration: 60,
        difficulty: 5,
        mutation: null,
        thresholds: { star1: 4500, star2: 10000, star3: 13000 }
    },
    {
        id: 10,
        title: "Full Spectrum", // Was Dinner Service
        bpm: 150,
        pattern: { left: 2, right: 3 },
        duration: 70,
        difficulty: 5,
        mutation: "SILENCE_ONE_HAND_SEGMENT",
        thresholds: { star1: 5000, star2: 11000, star3: 15000 }
    },

    // --- 3:4 POLYRHYTHM (Levels 11-15) ---
    {
        id: 11,
        title: "Poly-Genesis", // Was New Menu
        bpm: 90,
        pattern: { left: 3, right: 4 },
        duration: 45,
        difficulty: 6,
        mutation: null,
        thresholds: { star1: 3000, star2: 7000, star3: 10000 }
    },
    {
        id: 12,
        title: "Complex Ratio", // Was Complex Curry
        bpm: 100,
        pattern: { left: 3, right: 4 },
        duration: 50,
        difficulty: 7,
        mutation: null,
        thresholds: { star1: 3500, star2: 8000, star3: 11000 }
    },
    {
        id: 13,
        title: "Rhythmic Grid", // Was Rhythmic Roast
        bpm: 115,
        pattern: { left: 3, right: 4 },
        duration: 60,
        difficulty: 8,
        mutation: "ACCENT_BONUS",
        thresholds: { star1: 4500, star2: 10000, star3: 14000 }
    },
    {
        id: 14,
        title: "Geometric Test", // Was Sous Chef Test
        bpm: 130,
        pattern: { left: 3, right: 4 },
        duration: 60,
        difficulty: 9,
        mutation: "HIDE_GUIDE_LEFT",
        thresholds: { star1: 5000, star2: 11000, star3: 15000 }
    },
    {
        id: 15,
        title: "Poly-Master", // Was Master Chef
        bpm: 140,
        pattern: { left: 3, right: 4 },
        duration: 90,
        difficulty: 10,
        mutation: "SWAP_PHASE",
        thresholds: { star1: 8000, star2: 18000, star3: 25000 }
    }
];
