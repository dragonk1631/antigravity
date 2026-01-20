import * as THREE from 'three';

/**
 * 수학 연산 게이트 클래스
 * 캔버스를 이용해 텍스트 텍스처를 생성합니다.
 */
export class Gate {
    constructor(scene, xPosition, zPosition, fixedType = null) {
        this.scene = scene;
        this.position = new THREE.Vector3(xPosition, 1.5, zPosition);

        // 랜덤 속성 생성 (고정 타입 있으면 그것 사용)
        this.generateRandomType(fixedType);

        this.init();

        // 게이트가 좋은지 나쁜지 외부에서 알 수 있게 저장
        this.isGood = (this.type === 'BLUE');
    }

    generateRandomType(fixedType) {
        // fixedType이 있으면 그것을 따름 (true=Good, false=Bad)
        let isGood;
        if (fixedType !== null) {
            isGood = fixedType;
        } else {
            // 50% 확률
            isGood = Math.random() > 0.5;
        }

        if (isGood) {
            this.type = 'BLUE';
            this.color = 0x0088ff;
            // 곱하기 or 더하기
            if (Math.random() > 0.6) { // 곱하기 확률 좀 낮춤
                this.operation = 'x';
                this.value = 2; // x2 고정 (x3, x4는 너무 큼)
            } else {
                this.operation = '+';
                this.value = Math.floor(Math.random() * 5) + 2; // +2 ~ +6 (천천히 늘어나게)
            }
        } else {
            this.type = 'RED';
            this.color = 0xff3333;
            // 나누기 or 빼기
            if (Math.random() > 0.5) {
                this.operation = '/';
                this.value = 2; // /2
            } else {
                this.operation = '-';
                this.value = Math.floor(Math.random() * 5) + 5; // -5 ~ -9
            }
        }

        this.text = `${this.operation}${this.value}`;
    }

    createTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; // 해상도 증가
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // 배경 투명 유지

        // 텍스트 설정
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 160px Arial'; // 폰트 크기 증가
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 텍스트 그리기
        ctx.fillText(this.text, 256, 128);

        // 캔버스를 텍스처로 변환
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    init() {
        this.group = new THREE.Group();
        this.group.position.copy(this.position);

        // 좌/우 랜덤 위치 제거 - 생성자에서 전달받음
        // this.group.position.x = (Math.random() * 6) - 3;

        // 1. 게이트 프레임 (외곽선 느낌의 패널)
        // BoxGeometry로 약간의 두께감을 주어 물체처럼 보이게 함
        const panelGeo = new THREE.BoxGeometry(3.8, 3, 0.2);
        const panelMat = new THREE.MeshStandardMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.6, // 반투명 본체
            roughness: 0.1,
            metalness: 0.1
        });
        this.panel = new THREE.Mesh(panelGeo, panelMat);
        this.group.add(this.panel);

        // 2. 테두리 (가시성 향상)
        const borderGeo = new THREE.BoxGeometry(4, 3.2, 0.15);
        const borderMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // 흰색 테두리
        this.border = new THREE.Mesh(borderGeo, borderMat);
        // 패널보다 약간 뒤에 위치하거나 감싸게
        // 여기선 간단하게 패널과 겹치지 않게 사이즈 조절
        // 또는 EdgesGeometry 사용 가능하지만 Box로 단순화
        // 그냥 텍스트 가시성만 확보하면 되므로 패널만 제대로 보여도 됨. 일단 패널만 집중.

        // 3. 텍스트 라벨 (패널 앞면에 부착)
        const textGeo = new THREE.PlaneGeometry(3.5, 1.75);
        const textTexture = this.createTexture();
        const textMat = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true, // 글자만 보이게
            side: THREE.FrontSide
        });
        this.label = new THREE.Mesh(textGeo, textMat);
        this.label.position.z = 0.11; // 패널(두께 0.2의 절반 0.1)보다 아주 살짝 앞
        this.group.add(this.label);

        // 씬에 그룹 추가
        this.scene.add(this.group);

        // 충돌 체크를 위해 대표 메쉬(Bounding Box용)를 this.mesh로 할당 (호환성 유지)
        this.mesh = this.panel;
    }
}
