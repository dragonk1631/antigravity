import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameConfig } from '../Data/GameConfig.js';
import { Item } from '../Objects/Item.js';
import { TextureHelper } from '../Utils/TextureHelper.js';

export class Level {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.panels = [];
        this.items = [];
        this.nextPanelZ = 0;
        this.nextItemZ = -30;

        this.init();
    }

    init() {
        // 1. Water Ocean (Far below)
        import('../Utils/Water.js').then(({ Water }) => {
            this.water = new Water(500, 500);
            this.water.position.y = -10; // Below bridge
            this.water.position.z = -50;
            this.scene.add(this.water);
        });

        // 2. Bridge (Road) construction
        this.createBridge();

        // 3. 패널 텍스처 미리 생성
        this.panelTexture = TextureHelper.createPlusOneTexture();
        this.createPanelBelt();
    }

    createBridge() {
        // Main Road
        const roadWidth = 20; // Enough for player movement (-8 to 8)
        const roadLength = 200; // Long strip

        const roadGeo = new THREE.BoxGeometry(roadWidth, 1, roadLength);
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a3a, // Dark Asphalt Gray
            roughness: 0.9,
            metalness: 0.05
        });

        this.road = new THREE.Mesh(roadGeo, roadMat);
        this.road.position.set(0, -0.5, -40); // Feet at 0, so road top at 0 (y=-0.5, height=1)
        this.road.receiveShadow = true;
        this.scene.add(this.road);

        // Railings
        const railGeo = new THREE.BoxGeometry(0.5, 2, roadLength);
        const railMat = new THREE.MeshStandardMaterial({ color: 0xffb3d9 }); // Pastel Pink

        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(-(roadWidth / 2 + 0.25), 0.5, -40);
        leftRail.castShadow = true;
        leftRail.receiveShadow = true;
        this.scene.add(leftRail);
        this.leftRail = leftRail;

        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.set((roadWidth / 2 + 0.25), 0.5, -40);
        rightRail.castShadow = true;
        rightRail.receiveShadow = true;
        this.scene.add(rightRail);
        this.rightRail = rightRail;
    }

    createPanelBelt() {
        // 플레이어 위치는 z=15
        // 화면 위쪽은 약 z=-60 (보이지 않는 영역 포함)
        // 패널 간격 1.5m (약간 좁혀서 빈틈X)
        const panelSpacing = 1.5;
        const startZ = -60; // 화면 맨 위 (바깥쪽)
        const endZ = 25; // 플레이어보다 아래까지

        for (let z = startZ; z < endZ; z += panelSpacing) {
            this.spawnPanel(z);
        }
    }

    update(playerZ) {
        // 무한 그리드 효과
        // 플레이어가 이동함에 따라 그리드도 따라가되, 
        // 10칸(grid spacing)만큼 움직이면 다시 원위치하는 착시 사용 (이 게임은 플레이어가 가만히 있고 세상이 움직이는게 아니라, 플레이어가 앞으로 감)
        // 하지만 여기선 플레이어 Z에 맞춰 그리드를 계속 앞으로 이동시킴

        // Water Animation
        // Water Animation
        if (this.water) {
            this.water.update(1 / 60);
            this.water.position.z = playerZ - 50;
        }

        // Bridge Infinite Scroll
        // Move bridge so it's always under player. 
        // In a real runner, we spawn chunks. Here simple hack: stick to player Z
        if (this.road) {
            this.road.position.z = playerZ - 20; // Slightly ahead/behind
            this.leftRail.position.z = playerZ - 20;
            this.rightRail.position.z = playerZ - 20;
        }

        // 패널 스크롤 (아래로 이동) - 원본 로직 유지
        const dt = 1 / 60; // 근사값
        for (let i = 0; i < this.panels.length; i++) {
            const panel = this.panels[i];
            // 아래로 이동
            panel.mesh.position.z += GameConfig.ENEMY_SPEED * dt;

            // 화면 아래로 벗어나면 위쪽으로 재배치
            if (panel.mesh.position.z > 25) {
                panel.mesh.position.z = -60;
                panel.hit = false; // 다시 사용 가능
            }
        }

        // 아이템 관리
        this.manageItems(playerZ);
    }

    spawnPanel(z) {
        // 가로로 긴 패널
        const geometry = new THREE.BoxGeometry(4, 0.6, 1);
        const material = new THREE.MeshStandardMaterial({
            map: this.panelTexture,
            transparent: true,
            opacity: 0.5,            // 반투명으로 변경 (0.9 → 0.5)
            emissive: 0xff8800,      // 주황색 발광 (+1 텍스처와 매칭)
            emissiveIntensity: 0.2    // 발광 강도 감소 (가시성 개선)
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(GameConfig.WALL_X_POS, 1, z);
        this.scene.add(mesh);
        this.panels.push({ mesh: mesh, hit: false });
    }

    manageItems(playerZ) {
        // Item spawns ahead of player at regular intervals
        if (playerZ < this.nextItemZ) {
            this.spawnItem(this.nextItemZ);
            this.nextItemZ -= GameConfig.ITEM_SPAWN_INTERVAL; // Move spawn point further back
        }

        // Remove items that are behind player
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.items[i].position.z > playerZ + 20) {
                this.items[i].kill();
                this.items.splice(i, 1);
            }
        }
    }

    spawnItem(z, type = null) {
        const x = (Math.random() - 0.5) * 10;
        // 타입이 지정되지 않으면 랜덤하게 선택
        if (!type) {
            const types = ['FIRE_RATE', 'SHIELD'];
            type = types[Math.floor(Math.random() * types.length)];
        }
        const item = new Item(this.scene, new THREE.Vector3(x, 0.5, z), type);
        this.items.push(item);
    }
}
