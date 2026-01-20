import * as THREE from 'three';
import { GameConfig } from '../Core/GameConfig.js';

/**
 * 플레이어(리더) 및 조작 관리 클래스
 */
export class Player {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.speed = GameConfig.PLAYER_SPEED;
        this.swerveSpeed = GameConfig.SWERVE_SPEED;
        this.maxX = GameConfig.PLAYER_MAX_X;

        this.position = new THREE.Vector3(0, 0, 0);
        this.targetX = 0;

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.isDragging = false;

        // --- 군중 시스템 ---
        this.unitCount = 1;
        this.maxUnits = 500; // 최대 유닛 수
        this.dummy = new THREE.Object3D(); // 임시 계산용 객체

        this.init();
        this.setupInput();
    }

    init() {
        // InstancedMesh 생성 (최대 500마리)
        // 각 유닛은 작은 큐브 (0.5 x 1 x 0.5)
        const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.mesh = new THREE.InstancedMesh(geometry, material, this.maxUnits);

        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 자주 업데이트됨
        this.mesh.castShadow = true;
        this.mesh.frustumCulled = false; // 카메라 시야각 문제 해결
        this.scene.add(this.mesh);

        this.updateFormation();
    }

    setupInput() {
        window.addEventListener('mousedown', (e) => this.onInputStart(e));
        window.addEventListener('touchstart', (e) => this.onInputStart(e.touches[0]));
        window.addEventListener('mousemove', (e) => this.onInputMove(e));
        window.addEventListener('touchmove', (e) => this.onInputMove(e.touches[0]));
        window.addEventListener('mouseup', () => this.onInputEnd());
        window.addEventListener('touchend', () => this.onInputEnd());
    }

    onInputStart(e) {
        this.isDragging = true;
        this.updateTargetX(e.clientX, e.clientY);
    }

    onInputMove(e) {
        if (!this.isDragging) return;
        this.updateTargetX(e.clientX, e.clientY);
    }

    onInputEnd() {
        this.isDragging = false;
    }

    updateTargetX(clientX, clientY) {
        this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.plane, target);

        if (target) {
            this.targetX = Math.max(-this.maxX, Math.min(this.maxX, target.x));
        }
    }

    setUnitCount(count) {
        this.unitCount = count;
        // 최대치 제한
        if (this.unitCount > this.maxUnits) this.unitCount = this.maxUnits;
        if (this.unitCount < 0) this.unitCount = 0;
    }

    updateFormation() {
        // 나선형 배치 (Fermat's Spiral)을 update()에서 실시간 계산하므로 여기선 빈 함수 유지 가능
        // 하지만 초기화 시 호출해주면 좋음
    }

    update(dt) {
        // 1. 군중 중심 이동
        this.position.z -= this.speed * dt;
        this.position.x = THREE.MathUtils.lerp(this.position.x, this.targetX, this.swerveSpeed);

        // 2. 각 유닛 위치 업데이트 (물처럼 흐르는 스웜 효과)
        const time = Date.now() * 0.003;

        // 유닛 크기를 절반으로 줄여서 '바글바글'하게
        const scale = 0.5;

        // 군집 밀도 조정 (작아진 만큼 간격도 좁힘)
        const spread = 0.4;
        const angleStep = 2.4; // Golden Angle approximation (137.5 degrees)

        this.mesh.count = Math.min(this.unitCount, this.maxUnits);

        for (let i = 0; i < this.mesh.count; i++) {
            let localX = 0;
            let localZ = 0;

            // 페르마 나선 (Fermat's Spiral) + 약간의 노이즈 움직임
            if (i > 0) {
                const radius = spread * Math.sqrt(i);
                const angle = i * angleStep;

                // 물처럼 흐르는 효과: 각 유닛마다 고유한 위상의 사인파 적용
                const flowX = Math.sin(time + i * 0.1) * 0.2;
                const flowZ = Math.cos(time + i * 0.05) * 0.2;

                localX = radius * Math.cos(angle) + flowX;
                localZ = radius * Math.sin(angle) + flowZ;

                // 후방으로 갈수록 약간 처지는 느낌 (관성)
                localZ += (i * 0.01);
            }

            // 최종 위치
            this.dummy.position.set(
                this.position.x + localX,
                scale * 0.5, // 바닥에 붙음
                this.position.z + localZ
            );

            // 앞쪽을 향해 조금 회전하거나, 흔들림 추가
            const wobble = Math.sin(time * 2 + i) * 0.1;
            this.dummy.rotation.set(0, wobble, 0);

            // 크기 적용 (작아짐)
            this.dummy.scale.set(scale, scale, scale);

            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }

    getUnitPositions() {
        // 총알 발사 위치 계산 (위 로직과 동일해야 함 - 정확성을 위해 모듈화가 좋지만 일단 복제)
        const positions = [];
        const scale = 0.5;
        const spread = 0.4;
        const angleStep = 2.4;
        const time = Date.now() * 0.003;

        // 성능상 리더 근처 앞쪽 유닛들만 쏘게 할 수도 있음
        // 일단 전체 로직 유지
        const count = Math.min(this.unitCount, this.maxUnits);

        for (let i = 0; i < count; i++) {
            // (위치 계산 로직 중복 - 간단화)
            let localX = 0;
            let localZ = 0;
            if (i > 0) {
                const radius = spread * Math.sqrt(i);
                const angle = i * angleStep;
                // 흐름 효과는 사격 위치엔 덜 중요하므로 생략 가능하나 싱크 맞춤
                const flowX = Math.sin(time + i * 0.1) * 0.2;
                const flowZ = Math.cos(time + i * 0.05) * 0.2;
                localX = radius * Math.cos(angle) + flowX;
                localZ = radius * Math.sin(angle) + flowZ + (i * 0.01);
            }

            const pos = new THREE.Vector3(
                this.position.x + localX,
                0.5, // 높이 조정
                this.position.z + localZ
            );
            positions.push(pos);
        }
        return positions;
    }
}
