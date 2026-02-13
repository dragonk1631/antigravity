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
        SCROLL_SPEED: 4.0,
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
        SOUNDFONTS: {
            GENERALUSER: {
                name: 'GeneralUser GS (Balanced)',
                url: 'public/assets/soundfonts/GeneralUser_GS.sf2',
                size: '30 MB',
                license: 'Free',
                description: 'Balanced quality and size'
            }
        },
        DEFAULT_SOUNDFONT: 'GENERALUSER',
        QUALITY: {
            REVERB_ENABLED: true,      // Spatial depth and ambience
            CHORUS_ENABLED: true,       // Richer, fuller sound
            INTERPOLATION: 'linear'     // 'linear' or 'cubic' for higher quality
        }
    },
    VISUAL: {
        COLORS: {
            LANE_0: '#FF0055', // Neon Pink/Red
            LANE_1: '#FFD700', // Neon Gold
            LANE_2: '#00FFFF', // Neon Cyan
            LANE_3: '#39FF14', // Neon Green
            SIDE_RAIL: 'rgba(255, 180, 0, 0.8)',      // 사이드 레일 색상
            LANE_DIVIDER: 'rgba(255, 255, 255, 0.05)', // 레인 구분선
            COMBO_GOLD: '#ffea00',                    // 100+ 콤보 색상
            BEAM_CORE: 'rgba(255, 255, 255, 0.4)'     // 히트 빔 코어 색상
        },
        FONTS: {
            COMBO_LABEL: '700 18px "Outfit"',        // COMBO 라벨 폰트
            COMBO_LABEL_COLOR: 'rgba(255, 255, 255, 0.6)'
        },
        COMBO_GOLD_THRESHOLD: 100,                   // 골드 콤보 임계값
        COMBO_OPACITY: 0.5                           // 콤보 반투명도
    },
    // [신규] 레이아웃 설정 (하드코딩 값 중앙화)
    LAYOUT: {
        HIT_LINE_Y: 0.85,          // 판정선 위치 (화면 하단 85%)
        SCORE_Y: 0.76,             // 점수 표시 위치
        COMBO_Y: 150,              // 콤보 표시 Y 위치 (픽셀)
        COMBO_FONT_SIZE: 96,       // 콤보 폰트 크기
        COMBO_LABEL_SPACING: 55,   // COMBO 라벨과 숫자 간격
        TOUCH_ZONE_TOP: 0.75,       // 터치 영역 시작 위치 (화면 하단 75%)
        SCORE_LABEL: 16,           // SCORE 라벨 폰트 크기
        SCORE_FONT_SIZE: 28        // 점수 폰트 크기
    },
    // [신규] HP 설정
    HP: {
        INITIAL: 100,              // 초기 HP
        MISS_PENALTY: 10,          // Miss 시 HP 감소량
        PERFECT_HEAL: 2,           // Perfect 시 HP 회복량
        GOOD_HEAL: 1,              // Good 시 HP 회복량
        LOW_THRESHOLD: 40,         // HP 위험 임계값 (노란색)
        CRITICAL_THRESHOLD: 20     // HP 위기 임계값 (빨간색)
    },
    // [신규] 점수 설정
    SCORING: {
        PERFECT_BASE: 100,         // Perfect 기본 점수
        GOOD_BASE: 50,             // Good 기본 점수
        COMBO_MULTIPLIER: {
            50: 1.5,               // 50 콤보 이상 시 배율
            20: 1.2                // 20 콤보 이상 시 배율
        },
        MILESTONES: [100, 50, 25, 10]  // 콤보 마일스톤
    },
    // [신규] 애니메이션 설정
    ANIMATION: {
        LANE_ACTIVE_FADE: 200,     // 레인 활성화 페이드 시간
        LANE_HIT_FLASH: 150,       // 히트 플래시 지속 시간
        SCREEN_GLOW_DURATION: 800, // 화면 글로우 지속 시간
        PARTICLE_POOL_SIZE: 200    // 파티클 풀 크기
    }
};
