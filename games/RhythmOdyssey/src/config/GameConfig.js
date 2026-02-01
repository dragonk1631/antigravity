/**
 * GameConfig - 게임 수치 설정 파일
 * 모든 게임 밸런스 관련 수치를 한 곳에서 관리
 * 
 * 사용법: import { CONFIG } from './config/GameConfig.js';
 */

export const CONFIG = {

    // ==========================================
    // 🎮 게임 일반 설정
    // ==========================================
    GAME: {
        // 스크롤 속도 (초당 이동 유닛)
        SCROLL_SPEED: 8,

        // BPM (기본값, MIDI에서 덮어쓰기 가능)
        DEFAULT_BPM: 140,

        // 최대 델타타임 (프레임 스킵 방지)
        MAX_DELTA_TIME: 0.1,

        // 디버그 콘솔 표시
        SHOW_DEBUG_CONSOLE: false,

        // 상세 로그 출력 여부 (콘솔)
        VERBOSE_LOGGING: false,

        // === 플레이어 스탯 (동적) ===
        PLAYER_STATS: {
            MAX_HP: 100,
            DAMAGE_MISS: 10,
            HEAL_PERFECT: 2,
            START_GRACE_PERIOD: 3.5, // 시작 후 3.5초간 대미지 무시 (안정적 진입을 위해)
        }
    },

    // ==========================================
    // 🏃 플레이어 설정
    // ==========================================
    PLAYER: {
        // === 위치 ===
        // 화면 기준 X 위치 (카메라 기준 오프셋)
        SCREEN_X: -3,

        // 바닥 Y 위치
        GROUND_Y: 0.7,

        // === 점프 ===
        // 점프 힘 (높을수록 높이 점프)
        JUMP_FORCE: 10,

        // 중력 (높을수록 빨리 떨어짐)
        GRAVITY: 40,

        // 최대 점프 횟수 (이단 점프 제거)
        MAX_JUMPS: 1,

        // === 슬라이드 ===
        // 슬라이드 지속 시간 (초)
        SLIDE_DURATION: 0.5,

        // 슬라이드 시 몸 높이 비율 (1 = 100%)
        SLIDE_HEIGHT_RATIO: 0.4,

        // === 무적 ===
        // 피격 후 무적 시간 (초)
        INVINCIBLE_DURATION: 1.5,

        // 무적 깜빡임 속도
        INVINCIBLE_BLINK_SPEED: 10,

        // === 애니메이션 ===
        // 달리기 바운스 크기
        RUN_BOUNCE_AMPLITUDE: 0.1,

        // === 공격 ===
        // 공격 지속 시간 (초)
        ATTACK_DURATION: 0.3,
    },

    // ==========================================
    // 💎 점수 설정
    // ==========================================
    SCORE: {
        // === 기본 점수 ===
        // 아이템 획득 기본 점수
        ITEM_BASE_SCORE: 100,

        // 회피 성공 기본 점수
        DODGE_BASE_SCORE: 200,

        // === 콤보 보너스 ===
        // 콤보당 점수 증가율 (10콤보마다 이 비율만큼 증가)
        COMBO_MULTIPLIER_PER_10: 0.1,

        // 콤보 표시 최소값 (이 이상일 때 화면에 표시)
        COMBO_DISPLAY_MIN: 3,

        // === 코인 ===
        // 아이템당 코인 획득량
        COINS_PER_ITEM: 1,
    },

    // ==========================================
    // 🎵 노트/장애물 설정
    // ==========================================
    NOTES: {
        // === 스폰 ===
        // 스폰 거리 (플레이어 기준 오른쪽)
        SPAWN_DISTANCE: 25,

        // 제거 거리 (플레이어 기준 왼쪽)
        DESPAWN_DISTANCE: -10,

        // === 판정 ===
        // 판정 범위 (초 단위 오차)
        RHYTHM: {
            PERFECT: 0.12,    // ±120ms (100 -> 120)
            GREAT: 0.22,      // ±220ms (180 -> 220)
            GOOD: 0.35,       // ±350ms (280 -> 350)
            HIT_ZONE_X: -3.0,  // 중요: PLAYER.SCREEN_X와 반드시 일치해야 함!

            // 싱크 보정 (초 단위, +값이면 시각 노트가 뒤로 밀림)
            // 브라우저 오디오 레이턴시에 따라 조정 (0.05 ~ 0.1 추천)
            SYNC_OFFSET: 0.08
        },

        // === 점수 ===
        // 노트 판정별 점수
        SCORE: {
            PERFECT: 1000,
            GREAT: 500,
            GOOD: 200,
            MISS: 0,
        },

        // === 장애물 위치 ===
        // Kick (점프 장애물) Y 위치 - 바닥(0) 위에 올라오도록 조정
        KICK_Y: 0.6,

        // Snare (슬라이드 장애물) Y 위치 - 아래로 지나갈 수 있도록 충분히 높게 조정
        SNARE_Y: 1.6,

        // BIRD (공격 장애물) Y 위치 - 공격으로 잡아야 함 (회피 불가 높이)
        BIRD_Y: 0.8,

        // Hi-Hat (아이템) Y 범위
        HIHAT_Y_MIN: 0.7,
        HIHAT_Y_MAX: 2.2,

        // === 아이템(코인) 높이 설정 ===
        COIN_HEIGHTS: {
            DEFAULT: 1.3, // 달리기 상태에서 획득 가능
            JUMP: 2.4,    // 점프해야 획득 가능
            SLIDE: 0.2,   // 슬라이딩해야 획득 가능
        },

        // === 멜로디 노트 ===
        // 멜로디 노트 Z 위치 (배경으로 밀어냄)
        MELODY_Z: -1,

        // 피치 to Y 변환 범위
        PITCH_MIN: 48,  // C3
        PITCH_MAX: 84,  // C6
        PITCH_Y_MIN: 1,
        PITCH_Y_MAX: 2.0, // 2.2 -> 2.0 (공격 리치 안으로 더 확실히 유도)

        // === 애니메이션 ===
        // 회전 속도
        ROTATION_SPEED: 2,

        // 펄스 속도
        PULSE_SPEED: 8,

        // 바운스 속도 (젤리/하이햇)
        BOUNCE_SPEED: 6,
    },

    // ==========================================
    // 🎨 비주얼 설정
    // ==========================================
    VISUAL: {
        // === 카메라 ===
        // 카메라 뷰 높이 (직교 카메라)
        CAMERA_VIEW_HEIGHT: 12,

        // 카메라 Y 위치
        CAMERA_Y: 3,

        // === 색상 ===
        COLORS: {
            // 배경
            SKY: 0x2d1b4e,
            SKY_BOTTOM: 0x0d1117,
            GROUND: 0x3d2a5c,
            GROUND_LIGHT: 0x5a3d7a,

            // 악센트
            ACCENT: 0xc44dff,
            ACCENT_SECONDARY: 0x6e8efb,

            // 플레이어
            PLAYER_BODY: 0xffb347,

            // 장애물/아이템
            OBSTACLE_KICK: 0xff6b9d,
            OBSTACLE_SNARE: 0xc44dff,
            BIRD: 0xff4de4, // 핑크/마젠타 새
            COLLECTIBLE: 0x4ade80,
            JELLY: 0xffd93d,
        },

        // === 이펙트 ===
        // 피격 플래시 색상
        HIT_FLASH_COLOR: 0xff0000,

        // 피격 플래시 지속 시간 (ms)
        HIT_FLASH_DURATION: 100,

        // 피격 플래시 지속 시간 (ms)
        HIT_FLASH_DURATION: 100,
    },

    // ==========================================
    // 🔊 오디오 설정
    // ==========================================
    AUDIO: {
        // 마스터 볼륨 (0~1)
        MASTER_VOLUME: 0.8,

        // 효과음 볼륨
        SFX_VOLUME: 0.6,

        // 획득 사운드 주파수 (Hz)
        COLLECT_SOUND_FREQ: 880,

        // 회피 성공 사운드 주파수
        DODGE_SOUND_FREQ: 660,

        // 피격 사운드 주파수
        HIT_SOUND_FREQ: 110,

        // === 액션 효과음 ===
        JUMP_SFX_FREQ: 600,
        SLIDE_SFX_FREQ: 300,
        ATTACK_SFX_FREQ: 800,
    },

    // ==========================================
    // 📱 터치 설정
    // ==========================================
    TOUCH: {
        // 화면 상단 비율 (이 위를 터치하면 점프)
        JUMP_ZONE_RATIO: 0.5,
    },

    // ==========================================
    // 💾 저장 설정
    // ==========================================
    STORAGE: {
        // 로컬 스토리지 키
        HIGH_SCORE_KEY: 'rhythmOdyssey_highScore',
        SETTINGS_KEY: 'rhythmOdyssey_settings',
    },
};

/**
 * 설정값 가져오기 헬퍼 함수
 * @example getConfig('PLAYER.JUMP_FORCE') // 12
 */
export function getConfig(path) {
    const keys = path.split('.');
    let value = CONFIG;

    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            console.warn(`[GameConfig] 설정값을 찾을 수 없음: ${path}`);
            return undefined;
        }
    }

    return value;
}

/**
 * 런타임에 설정값 변경 (디버그용)
 * @example setConfig('PLAYER.JUMP_FORCE', 15)
 */
export function setConfig(path, newValue) {
    const keys = path.split('.');
    let obj = CONFIG;

    for (let i = 0; i < keys.length - 1; i++) {
        if (obj && typeof obj === 'object' && keys[i] in obj) {
            obj = obj[keys[i]];
        } else {
            console.error(`[GameConfig] 잘못된 경로: ${path}`);
            return false;
        }
    }

    const lastKey = keys[keys.length - 1];
    if (obj && typeof obj === 'object' && lastKey in obj) {
        const oldValue = obj[lastKey];
        obj[lastKey] = newValue;
        console.log(`[GameConfig] ${path}: ${oldValue} → ${newValue}`);
        return true;
    }

    console.error(`[GameConfig] 잘못된 경로: ${path}`);
    return false;
}

// 개발 편의를 위해 전역 접근 가능하게 설정 (디버그용)
if (typeof window !== 'undefined') {
    window.GAME_CONFIG = CONFIG;
    window.setGameConfig = setConfig;
    window.getGameConfig = getConfig;
}
