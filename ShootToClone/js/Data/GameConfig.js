/**
 * 게임 밸런스 및 설정 데이터
 */
export const GameConfig = {
    // 플레이어
    PLAYER_SPEED: 0,        // 전진 속도 (고정 카메라이므로 0)
    PLAYER_MOVE_SPEED: 20,  // 좌우 이동 반응 속도
    FIRE_RATE: 0.5,         // 발사 간격 (초당 2발)
    BULLET_SPEED: 200,       // 총알 속도 (2배로 증가)

    // 맵
    GATE_INTERVAL: 3.3,

    // 유닛
    MAX_UNITS: 100,
    UNIT_SPAWN_COOLDOWN: 0.1,
    UNIT_FIRE_RATE: 0.5,    // 유닛 발사 간격 (플레이어보다 느리게)

    // 적군
    ENEMY_SPAWN_RATE: 0.5,  // 프레임당 생성 확률
    ENEMY_SPEED: 7,         // 적군 이동 속도
    ENEMY_HP: 1,

    // 보스 & 미니보스
    MINI_BOSS_HP: 50,
    MINI_BOSS_SPEED: 5,
    MINI_BOSS_ATTACK_INTERVAL: 1.0,
    MINI_BOSS_ATTACK_DAMAGE: 2,

    BOSS_HP: 200,
    BOSS_SPEED: 4,
    BOSS_INTERVAL: 30,
    BOSS_ATTACK_INTERVAL: 2.0,
    BOSS_ATTACK_DAMAGE: 10,

    // 아이템 & 레벨
    ITEM_HP: 50,            // 아이템 HP (중간보스급)
    ITEM_DURATION: 5000,    // 아이템 효과 지속 시간 (ms)
    ITEM_FIRE_RATE_MULT: 0.5, // 연사속도 아이템 (배율)

    LEVEL_UP_INTERVAL: 30,  // 레벨업 주기 (초)
    LEVEL_HP_MULT_BASE: 2,  // 레벨업 당 HP 배수

    // SideTouch 설정
    WALL_X_POS: 7.2,
    ITEM_FEVER_DURATION: 5.0,
    ITEM_SPAWN_INTERVAL: 100,
};
