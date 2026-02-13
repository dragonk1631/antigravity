/**
 * SpriteConfig - 스프라이트 좌표 및 설정 정의
 * BeatMaster 스프라이트 기반 UI 시스템
 */

export const SPRITE_CONFIG = {
    // 기존 에셋 (개별 PNG 파일)
    ASSETS: {
        BACKGROUND: 'assets/bg_art.png',
        LANE: 'assets/lane.png',
        NOTE: 'assets/note.png',
        TITLE: 'assets/title.png'
    },

    // 노트 스프라이트 시트 설정 (4열 x 5행) - 이미지 정밀 분석 결과
    NOTE_SHEET: {
        COLS: 4,
        ROWS: 5,
        SPRITE_WIDTH: 256,    // 1024 / 4 = 256
        SPRITE_HEIGHT: 204.8, // 1024 / 5 = 204.8
        // 레인별 스프라이트 매핑 (row, col)
        LANE_SPRITES: [
            { row: 0, col: 0 }, // Lane 0 (핑크): 핑크 하트 (Row 0)
            { row: 1, col: 1 }, // Lane 1 (노란): 노란 별 (Row 1)
            { row: 1, col: 2 }, // Lane 2 (시안): 파란 별 (Row 1)
            { row: 1, col: 3 }  // Lane 3 (초록): 핑크 별 (Row 1)
        ],
        // 롱노트용 스프라이트 (Row 2~3 활용)
        LONG_NOTE_SPRITES: [
            { row: 2, col: 0 }, // Lane 0: 파란/보라 별? (Row 2) - 대체
            { row: 2, col: 1 }, // Lane 1: 노란 별 (Row 2)
            { row: 2, col: 2 }, // Lane 2: 파란 별 (Row 2)
            { row: 3, col: 2 }  // Lane 3: 파란 사각형? (Row 3, Col 2) - 대체
        ]
    },

    // UI 레이어 순서
    LAYERS: {
        BACKGROUND: 0,
        LANES: 1,
        NOTES: 2,
        EFFECTS: 3,
        HUD: 4,
        OVERLAY: 5
    },

    // 비트맵 폰트 설정
    BITMAP_FONT: {
        GLYPH_WIDTH: 32,
        GLYPH_HEIGHT: 48,
        CHARS: '0123456789:.-+ABCDEFGHIJKLMNOPQRSTUVWXYZ ',
        COLS: 10,
        SPACING: 2
    },

    // 메뉴 레이아웃 설정
    MENU: {
        TITLE_Y: 0.12,           // 타이틀 Y 위치 (화면 비율)
        SONG_LIST_Y: 0.35,       // 곡 목록 시작 Y
        SONG_LIST_HEIGHT: 0.35,  // 곡 목록 영역 높이
        SONG_ITEM_HEIGHT: 50,    // 각 곡 항목 높이 (px)
        DIFFICULTY_Y: 0.72,      // 난이도 선택 Y
        PLAY_BUTTON_Y: 0.85,     // 플레이 버튼 Y
        SIDE_PADDING: 0.1        // 좌우 패딩 (화면 비율)
    },

    // HUD 레이아웃 설정
    HUD: {
        HP_BAR: {
            x: 0.02,
            y: 0.02,
            width: 0.25,
            height: 0.04
        },
        SCORE: {
            x: 0.98,
            y: 0.02,
            align: 'right',
            scale: 1.0
        },
        COMBO: {
            x: 0.5,
            y: 0.4,
            align: 'center',
            scale: 2.0
        },
        PROGRESS: {
            x: 0.5,
            y: 0.01,
            width: 0.3,
            height: 0.01
        }
    },

    // 게임 레이아웃
    GAME: {
        HORIZON_Y: 0.15,
        HIT_LINE_Y: 0.85,
        LANE_COUNT: 4
    },

    // 색상 설정
    COLORS: {
        LANE: ['#FF66B2', '#FFD700', '#00FFFF', '#39FF14'],
        HP_FILL: '#00FF88',
        HP_LOW: '#FFCC00',
        HP_CRITICAL: '#FF3333',
        SCORE: '#FFFFFF',
        COMBO: '#FFFFFF',
        PRIMARY: '#FF007A',
        ACCENT: '#00F2FF',
        JUDGMENT: {
            PERFECT: '#FF66B2',
            GOOD: '#44FF44',
            MISS: '#666666'
        }
    },

    // 난이도 설정
    DIFFICULTIES: ['EASY', 'NORMAL', 'HARD'],

    // [New] 절차적 노트 렌더링 스타일 설정 (Rainbow Palette)
    NOTE_STYLES: [
        // Lane 0: Pink Heart (Mint Beam)
        {
            shape: 'HEART',
            gradient: ['#42F5BF', '#FF5E94'],
            border: '#FFFFFF',
            glow: '#FF5E94'
        },
        // Lane 1: Yellow Heart (Purple Beam)
        {
            shape: 'HEART',
            gradient: ['#8A2387', '#FFD700'],
            border: '#FFFFFF',
            glow: '#FFD700'
        },
        // Lane 2: Cyan Heart (Red Beam)
        {
            shape: 'HEART',
            gradient: ['#FF416C', '#4FFFFF'],
            border: '#FFFFFF',
            glow: '#4FFFFF'
        },
        // Lane 3: Blue Heart (Orange Beam)
        {
            shape: 'HEART',
            gradient: ['#F7971E', '#5E8FFF'],
            border: '#FFFFFF',
            glow: '#5E8FFF'
        }
    ],

    // [New] 절차적 레인 렌더링 스타일 (참조 이미지 기반)
    LANE_STYLES: {
        // 트랙 배경 (Starry Dark)
        BACKGROUND_GRADIENT: ['#050510', '#1A1A2E'],
        BACKGROUND_COLOR_TOP: '#050510',
        BACKGROUND_COLOR_BOTTOM: '#1A1A2E',

        // 사이드 테두리 (Neon Glow)
        BORDER_COLOR: '#FFFFFF',
        BORDER_GLOW: 'rgba(255, 255, 255, 0.4)',
        BORDER_WIDTH: 3,

        // 레인 구분선
        DIVIDER_COLOR: 'rgba(255, 255, 255, 0.15)',

        // 판정선 (Iconic Bar style like reference)
        JUDGMENT_LINE_HEIGHT: 20,
        JUDGMENT_BASE_COLOR: 'rgba(255, 255, 255, 0.1)',
        JUDGMENT_ICONS: [
            { shape: 'HEART', color: '#FF5E94' },
            { shape: 'HEART', color: '#FFD700' },
            { shape: 'HEART', color: '#4FFFFF' },
            { shape: 'HEART', color: '#5E8FFF' }
        ],

        // 아이콘 크기 확대
        ICON_SCALE: 1.3,

        // 각 레인별 빔 효과 (키 눌렀을 때) - Rainbow/Pastel Aesthetic with Particles
        ACTIVE_BEAMS: [
            ['#42F5BF', '#FF5E94'],
            ['#8A2387', '#FFD700'],
            ['#FF416C', '#4FFFFF'],
            ['#F7971E', '#5E8FFF']
        ],
        BEAM_OPACITY: 0.8,
        SPARKLE_COLOR: '#FFFFFF'
    }
};
