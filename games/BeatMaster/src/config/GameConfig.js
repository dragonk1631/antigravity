/**
 * GameConfig - BeatMaster용 설정 파일
 */

export const CONFIG = {
    GAME: {
        VERBOSE_LOGGING: false,
        DEFAULT_BPM: 120,
        LEAD_IN: 2.0, // 곡 시작 전 노트가 떨어지는 유예 시간 (초)
    },
    NOTES: {
        SCROLL_SPEED: 12.0,
        JUDGMENT: {
            PERFECT: 0.080, // ±80ms
            GOOD: 0.160,    // ±160ms (약간 더 엄격하게 조정하여 긴장감 유지)
            MISS: 0.250,    // ±250ms 초과 시
            MISS_GRACE: 0.200, // 유예 시간 상향 (Release 판정 고려)
            AUDIO_OFFSET: 0.045,
            LONG_NOTE_MIN_MS: 500, // 롱노트로 간주할 최소 길이 (0.5초)
            RELEASE_WINDOW: 0.250  // [신규] 롱노트 떼기(Release) 판정 유예 범위 (±250ms)
        },
        LANES: 4,
        LANE_KEYS: ['d', 'f', 'j', 'k'],
        DIFFICULTY: {
            DEFAULT: 'NORMAL',
            THRESHOLD: {
                EASY: 1.5,   // 기존 2.5 -> 더 많은 정박 노트 허용
                NORMAL: 0.8, // 기존 1.2 -> 중간 강도의 연주도 채보화
                HARD: 0.05   // 기존 0.1 -> 세밀한 고스트 노트까지 최대한 보존
            }
        }
    },
    AUDIO: {
        MASTER_VOLUME: 1.0,
        SOUNDFONT_URL: 'public/assets/soundfonts/TimGM6mb.sf2'
    },
    VISUAL: {
        COLORS: {
            LANE_0: '#ff007a', // Kick
            LANE_1: '#ccff00', // Snare
            LANE_2: '#00ff66', // Clap (3rd Lane)
            LANE_3: '#00f2ff'  // Hat
        }
    }
};
