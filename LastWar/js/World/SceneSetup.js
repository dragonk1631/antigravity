import * as THREE from 'three';

/**
 * Three.js 씬, 카메라, 기본 조명, 안개 등을 설정하는 클래스
 */
export class SceneSetup {
    constructor() {
        // 1. 씬 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // 하늘색 (Sky Blue)
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100); // 거리감 있는 안개

        // 2. 카메라 생성 (Perspective)
        this.camera = new THREE.PerspectiveCamera(
            60, // FOV
            window.innerWidth / window.innerHeight, // Aspect
            0.1, // Near
            1000 // Far
        );
        // 초기 위치 (Game.js에서 계속 업데이트됨)
        this.camera.position.set(0, 15, 20);
        this.camera.lookAt(0, 0, 0);

        // 3. 조명 설정
        this.setupLights();
    }

    setupLights() {
        // 환경광 (전체적으로 밝게)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // 직사광 (그림자 생성용, 태양)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 50, 20);
        dirLight.castShadow = true;

        // 그림자 품질 설정
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;

        // 그림자 범위 (게임 플레이 영역 커버)
        const d = 30;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;

        this.scene.add(dirLight);
    }
}
