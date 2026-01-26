/**
 * GameConfig.js
 * 게임의 밸런스 및 설정을 관리하는 전역 객체입니다.
 * 이 파일의 수치를 수정하여 게임의 난이도와 손맛을 조절할 수 있습니다.
 */
const GameConfig = {
    // 계단 기본 설정
    STAIR: {
        WIDTH: 100,
        HEIGHT: 80
    },

    // 플레이어 캐릭터 설정
    PLAYER: {
        SCALE: 4.0,          // 캐릭터 스프라이트 배율
        PREVIEW_SCALE: 5.0   // 메인 메뉴 캐릭터 배율
    },

    // 콤보 시스템 설정
    COMBO: {
        ENERGY_THRESHOLD: 0.97, // 콤보가 유지되기 위해 필요한 최소 에너지 비율 (0.0 ~ 1.0)
        TIMER: 2.0,            // 콤보 유지 시간 (초)
        POPUP_THRESHOLD: 5      // 팝업 효과가 나타나기 시작하는 콤보 수
    },

    // 에너지 및 난이도 설정
    ENERGY: {
        MAX: 100,
        RECOVERY_PER_STEP: 10,   // 계단을 오를 때 회복되는 에너지 양
        DECAY_BASE: 10,          // 기본 에너지 감소 속도 (초당)
        DIFFICULTY_SCALE: 200    // 난이도 상승 계수 (이 점수마다 감소 속도가 100%씩 증가)
    },

    // UI 레이아웃 설정
    UI: {
        BAR_WIDTH_PERCENT: 0.8,  // 화면 너비 대비 에너지 바의 비율
        BAR_HEIGHT: 50,          // 에너지 바 높이
        BAR_Y: 40,               // 에너지 바의 Y 위치
        COMBO_OFFSET_Y: 5        // 에너지 바 하단으로부터 콤보 텍스트의 간격
    }
};
