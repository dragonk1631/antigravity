export const COLORS = {
    // Theme Palette
    BG: '#FFF8E7', // Cream/Beige (Background)
    TEXT_DARK: '#2C2C2C', // Dark Grey (Main Text)
    TEXT_LIGHT: '#8B8B8B', // Light Grey (Sub Text)

    PRIMARY: '#FFB347', // Pastel Orange (Right)
    SECONDARY: '#87CEEB', // Pastel Blue (Left)

    ACCENT: '#FF6F61', // Coral/Red (Miss/Fire)
    SUCCESS: '#66CDAA', // Green (Perfect)

    // UI Elements
    PANEL_BG: '#FFFFFF',
    PANEL_BORDER: '#2C2C2C',

    GUIDE: '#E0E0E0',

    LANE_LEFT: '#87CEEB', // Blue
    LANE_RIGHT: '#FFB347'  // Orange
};

export const JUDGE = {
    PERFECT: 45, // ms
    GOOD: 90,    // ms
    MISS: 120    // ms window to allow input
};

export const GAME_CONFIG = {
    LOOK_AHEAD_TIME: 0.1, // 100ms
    SCHEDULE_INTERVAL: 25, // 25ms
    NOTE_SPEED: 500, // px per second (adjust as needed)
    HIT_LINE_Y: 0.8, // 80% of screen height
    MAX_HEALTH: 100
};
