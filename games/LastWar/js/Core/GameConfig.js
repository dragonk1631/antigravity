/**
 * 게임의 모든 밸런스 및 설정값을 관리하는 파일
 * 여기의 숫자들만 바꾸면 게임의 난이도와 조작감이 변합니다.
 */
export const GameConfig = {
    // --- 플레이어 설정 ---
    PLAYER_SPEED: 15,           // 속도 증가 (10 -> 15)
    SWERVE_SPEED: 0.1,          // 좌우 이동 반응 속도 (Lerp)
    PLAYER_MAX_X: 6,            // 도로 폭 약간 넓힘
    STARTING_UNIT_COUNT: 1,     // 게임 시작 시 유닛 수
    MAX_UNITS: 2000,            // 최대 유닛 수 대폭 증가 (500 -> 2000)

    // --- 전투 및 사격 ---
    FIRE_RATE: 0.1,             // 기관총처럼 발사 (0.5 -> 0.1)
    BULLET_SPEED: 60,           // 탄속 증가
    BULLET_RANGE: 15,           // 사거리 (m)
    BULLET_LIMIT: 500,          // 총알 수 대폭 증가 (200 -> 500)

    // --- 레벨 및 적군 ---
    CHUNK_SIZE: 50,             // 맵 생성 단위 길이
    GATE_SPAWN_CHANCE: 1.0,     // (현재 로직상엔 없지만 추후 확장용)
    ENEMY_SPAWN_CHANCE: 0.7,    // 적군 출현 확률 (70%)

    // 적 체력 밸런스
    ENEMY_NORMAL_HP: 5,        // 일반 적 체력 (쉽게 잡힘)
    ENEMY_TANK_HP_BASE: 100,    // 탱크(중간보스) 기본 체력
    TANK_SPAWN_CHANCE: 0.2,     // 탱크 출현 확률 (20%)

    // 거리 비례 증가 (탱크에도 적용)
    ENEMY_HP_DIST_FACTOR: 0.1,

    // --- 보스 ---
    BOSS_SPAWN_DISTANCE: 300,   // 보스 등장 간격 (m)
    BOSS_HP_BASE: 500,          // 보스 기본 체력
    BOSS_SIZE: 3,               // 보스 크기 배율

    // --- 게임 상태 ---
    GAME_OVER_CONDITION: 0,     // 유닛 0명 되면 게임 오버
};
