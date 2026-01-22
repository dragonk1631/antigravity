import * as THREE from 'three';
import { Gate } from '../Objects/Gate.js';
import { Enemy } from '../Objects/Enemy.js';
import { Boss } from '../Objects/Boss.js';
import { GameConfig } from '../Core/GameConfig.js';

/**
 * 게임 월드 및 무한 바닥 관리 클래스
 */
export class Level {
    constructor(scene) {
        this.scene = scene;
        this.chunks = [];
        this.gates = [];
        this.enemies = [];
        this.bosses = []; // 보스 목록
        this.chunkSize = 50;
        this.visibleChunks = 5;

        this.init();
    }

    init() {
        // 초기 청크 생성
        for (let i = 0; i < this.visibleChunks; i++) {
            this.addChunk(i * this.chunkSize);
        }
    }

    addChunk(zPosition) {
        // 바닥 (도로)
        const geometry = new THREE.PlaneGeometry(20, this.chunkSize);

        // 체크무늬 효과를 위해 청크마다 색상 교차
        // zPosition / chunkSize가 청크 인덱스
        const index = Math.round(zPosition / this.chunkSize);
        const isEven = index % 2 === 0;

        const material = new THREE.MeshStandardMaterial({
            color: isEven ? 0x999999 : 0x777777, // 연회색 / 진회색 교차
            roughness: 0.8
        });

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;

        // 수정: 플레이어는 -Z 방향으로 전진한다고 가정.
        // zPosition 인자를 양수로 받아 음수 좌표로 배치
        const centerZ = -(zPosition + (this.chunkSize / 2));
        floor.position.z = centerZ;

        floor.receiveShadow = true;
        this.scene.add(floor);

        // 그리드 헬퍼 (시각적 가이드)
        const grid = new THREE.GridHelper(20, 10, 0x000000, 0x555555);
        grid.position.z = centerZ;
        grid.position.y = 0.01; // 바닥보다 살짝 위
        this.scene.add(grid);

        // --- 게이트 생성 (양자택일 구조) ---
        // 첫 번째 청크(시작지점)는 비워두기
        if (zPosition > 0) {
            // 적어도 하나는 좋은 게이트여야 함
            const leftIsGood = Math.random() > 0.5;
            // 왼쪽이 나쁘면 오른쪽은 무조건 좋아야 함. 왼쪽이 좋으면 오른쪽은 랜덤.
            const rightIsGood = !leftIsGood ? true : (Math.random() > 0.5);

            // 왼쪽 게이트 (-2.5)
            const leftGate = new Gate(this.scene, -2.5, centerZ, leftIsGood);
            this.gates.push(leftGate);

            // 오른쪽 게이트 (+2.5)
            const rightGate = new Gate(this.scene, 2.5, centerZ, rightIsGood);
            this.gates.push(rightGate);

            // --- 적군 생성 (확률적) ---
            if (Math.random() < GameConfig.ENEMY_SPAWN_CHANCE) {
                const enemyZ = centerZ - 15;

                // 탱크냐 일반이냐
                let type = 'NORMAL';
                if (Math.random() < GameConfig.TANK_SPAWN_CHANCE) {
                    type = 'TANK';
                }

                const enemy = new Enemy(this.scene, enemyZ, type);
                this.enemies.push(enemy);
                console.log("Enemy Spawned:", type, "at", enemyZ, "HP:", enemy.unitCount);
            }
        }
        // 청크 객체 저장
        this.chunks.push({
            mesh: floor,
            grid: grid,
            zEnd: -(zPosition + this.chunkSize)
        });
    }

    update(dt, playerZ) {
        // 무한 맵 로직
        // 가장 뒤에 있는 청크가 플레이어보다 훨씬 뒤로 갔다면 제거하고 앞에 새 청크 생성

        // chunks[0]이 가장 플레이어와 가까운(지나온) 청크
        // 플레이어 Z는 계속 감소함 (0 -> -10 -> -100)
        // 청크의 zEnd보다 플레이어 Z가 더 작아지면(더 멀리 가면) 해당 청크는 지나친 것.

        const lastChunk = this.chunks[0];
        // 청크 삭제 마진 (플레이어가 20만큼 더 지나가면 삭제)
        if (playerZ < lastChunk.zEnd - 20) {
            // 씬에서 제거
            this.scene.remove(lastChunk.mesh);
            this.scene.remove(lastChunk.grid);

            // 배열에서 제거
            this.chunks.shift();

            // 맨 앞에 새 청크 추가
            // 현재 배열의 마지막 청크의 끝 지점을 기준으로 새 청크 생성
            // 주의: addChunk는 '몇 번째 청크인지(인덱스 * 길이)'를 양수로 기대하게 작성됨. 로직 수정 필요.
            // 간단하게: 현재 가장 먼(배열 끝) 청크의 zEnd를 기준으로 
            // zPosition = abs(zEnd)

            const prevLastChunk = this.chunks[this.chunks.length - 1];
            const newStartZ = Math.abs(prevLastChunk.zEnd);
            this.addChunk(newStartZ);
        }
    }
}
