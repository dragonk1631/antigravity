/**
 * NoteVisualizer - MIDI 노트의 3D 시각화 (횡스크롤 버전)
 * 
 * 모든 수치는 GameConfig에서 관리
 */

import * as THREE from 'three';
import { CONFIG } from '../config/GameConfig.js';

export class NoteVisualizer {
    constructor(sceneManager, debug = null) {
        this.sceneManager = sceneManager;
        this.debug = debug;
        this.syncManager = null; // SyncManager 참조 추가

        // 활성 오브젝트들
        this.activeNotes = [];
        this.activeCollectibles = []; // 누락되었던 초기화 추가

        // 오브젝트 풀
        this.notePool = {
            melody: [],
            kick: [],
            snare: [],
            hihat: [],
            jelly: [],
            bird: []
        };

        const colors = CONFIG.VISUAL.COLORS;

        // 소리-모양 직관성 매칭 설정 (지능형 시각화 개편)
        this.noteConfig = {
            melody: {
                geometry: new THREE.IcosahedronGeometry(0.15, 1),
                baseColor: colors.ACCENT_SECONDARY,
                emissive: colors.ACCENT_SECONDARY,
                emissiveIntensity: 0.1
            },
            kick: { // 베이스 드럼 -> 빨간색 뾰족한 가시 (점프 필수)
                geometry: new THREE.ConeGeometry(0.6, 1.2, 4), // 피라미드 형태
                baseColor: 0xff0000,
                emissive: 0x440000,
                emissiveIntensity: 0.8
            },
            snare: { // 스네어 드럼 -> 파란색 긴 가로바 (슬라이드 필수)
                geometry: new THREE.CylinderGeometry(0.3, 0.3, 2.0, 32), // 길이를 3에서 2.0으로 단축 (슬라이드 한 번에 피하기 가능하게)
                baseColor: 0x0088ff,
                emissive: 0x002244,
                emissiveIntensity: 0.8
            },
            hihat: { // 하이햇 -> 황금빛 구체 (아이템)
                geometry: new THREE.SphereGeometry(0.35, 16, 16),
                baseColor: 0xffcc00,
                emissive: 0xffaa00,
                emissiveIntensity: 1.0
            },
            jelly: {
                geometry: new THREE.TorusGeometry(0.3, 0.1, 8, 20), // 도넛 모양
                baseColor: colors.JELLY,
                emissive: 0xffaa00,
                emissiveIntensity: 0.5
            },
            bird: { // 새 -> 날카로운 V자 또는 마름모 형태
                geometry: new THREE.OctahedronGeometry(0.5, 0),
                baseColor: colors.BIRD,
                emissive: 0x440022,
                emissiveIntensity: 0.8
            }
        };

        // CONFIG에서 거리 설정 가져오기
        this.spawnDistance = CONFIG.NOTES.SPAWN_DISTANCE;
        this.despawnDistance = CONFIG.NOTES.DESPAWN_DISTANCE;
    }

    /**
     * 판정선(Hit Zone) 가이드 생성
     */
    createHitZone(x) {
        const height = 15;
        // 밝은 네온 시안색 라인
        const geometry = new THREE.PlaneGeometry(0.15, height);
        this.hitZoneMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const hitZone = new THREE.Mesh(geometry, this.hitZoneMaterial);
        hitZone.position.set(x, height / 2, CONFIG.NOTES.MELODY_Z + 1);
        hitZone.rotation.y = Math.PI / 2;

        // 바닥 가이드 라인 추가 (플레이어 발밑)
        const floorGeo = new THREE.PlaneGeometry(0.2, 5);
        this.floorLineMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4
        });
        const floorLine = new THREE.Mesh(floorGeo, this.floorLineMaterial);
        floorLine.rotation.x = -Math.PI / 2;
        floorLine.position.set(x, 0.05, 0);
        this.sceneManager.scene.add(floorLine);

        this.sceneManager.scene.add(hitZone);
        this.hitZone = hitZone;

        return hitZone;
    }

    /**
     * 입력 시 판정선 즉각 점멸 (조작감 피드백)
     */
    pulseHitZone() {
        if (!this.hitZoneMaterial || !this.floorLineMaterial) return;

        // 즉시 매우 밝게
        this.hitZoneMaterial.opacity = 1.0;
        this.hitZoneMaterial.color.setHex(0xffffff);
        this.floorLineMaterial.opacity = 0.8;

        // 서서히 원래대로
        setTimeout(() => {
            if (this.hitZoneMaterial) {
                this.hitZoneMaterial.opacity = 0.6;
                this.hitZoneMaterial.color.setHex(0x00ffff);
            }
            if (this.floorLineMaterial) {
                this.floorLineMaterial.opacity = 0.4;
            }
        }, 100);
    }

    /**
     * SyncManager 설정
     */
    setSyncManager(syncManager) {
        this.syncManager = syncManager;
    }

    /**
     * 멜로디 노트 (배경 장식)
     */
    spawnMelodyNote(note) {
        const config = this.noteConfig.melody;
        const mesh = this.getFromPool('melody') || this.createNoteMesh(config);

        const y = this.pitchToY(note.midi);
        const x = this.syncManager.getNoteWorldX(note.time);

        mesh.position.set(x, y, CONFIG.NOTES.MELODY_Z);

        const scale = 0.5 + note.velocity * 0.5;
        mesh.scale.set(scale, scale, scale);

        const hue = (note.midi % 12) / 12;
        mesh.material.color.setHSL(hue, 0.7, 0.5);
        mesh.material.emissive.setHSL(hue, 0.8, 0.3);

        mesh.visible = true;
        mesh.userData = {
            type: 'melody',
            note: note,
            spawnTime: performance.now()
        };

        this.sceneManager.add(mesh);
        this.activeNotes.push(mesh);

        return mesh;
    }

    /**
     * 드럼 노트 (장애물/아이템)
     */
    spawnDrumNote(note, typeOrCollectible = false, context = 'default') {
        let type = 'hihat';
        let y = CONFIG.NOTES.COIN_HEIGHTS.DEFAULT;
        let isCollectible = false;

        if (typeof typeOrCollectible === 'boolean') {
            isCollectible = typeOrCollectible;
            if (isCollectible) {
                type = 'hihat';
                if (context === 'jump') y = CONFIG.NOTES.COIN_HEIGHTS.JUMP;
                else if (context === 'slide') y = CONFIG.NOTES.COIN_HEIGHTS.SLIDE;
            } else {
                // 기존 기본 장애물 로직 (드럼 전용)
                if (note.midi === 36 || note.midi === 35) {
                    type = 'kick';
                    y = 0.6;
                } else if (note.midi === 38 || note.midi === 40) {
                    type = 'snare';
                    y = 1.8;
                }
            }
        } else {
            // 명시적 타입 지정 (예: 'bird')
            type = typeOrCollectible;
            if (type === 'bird') {
                // y = this.pitchToY(note.midi); // 멜로디 피치 매핑 (UserReq: 피할 수 없게 수정)
                y = CONFIG.NOTES.BIRD_Y; // 플레이어 허리 높이 (점프/슬라이드 모두 피격 범위)
            } else if (type === 'kick' || type === 'jump') {
                type = 'kick';
                y = CONFIG.NOTES.KICK_Y;
            } else if (type === 'snare' || type === 'slide') {
                type = 'snare';
                y = CONFIG.NOTES.SNARE_Y;
            }
        }

        const config = this.noteConfig[type] || this.noteConfig.hihat;
        const mesh = this.getFromPool(type) || this.createNoteMesh(config);

        const x = this.syncManager.getNoteWorldX(note.time);
        mesh.position.set(x, y, 0);

        const scale = (type === 'bird' ? 1.5 : 0.8) + note.velocity * 0.3;
        mesh.scale.set(scale, scale, scale);

        mesh.visible = true;

        // 타입별 초기 회전 설정
        if (type === 'snare') {
            mesh.rotation.z = Math.PI / 2;
        } else if (type === 'bird') {
            mesh.rotation.y = -Math.PI / 2; // 플레이어를 향하게
        } else {
            mesh.rotation.set(0, 0, 0);
        }

        mesh.userData = {
            type: type,
            note: note,
            spawnTime: performance.now(),
            isObstacle: !isCollectible,
            isCollectible: isCollectible,
            requiresJump: type === 'kick',
            requiresSlide: type === 'snare',
            requiresAttack: type === 'bird'
        };

        this.sceneManager.add(mesh);
        this.activeNotes.push(mesh);

        return mesh;
    }

    /**
     * 노트 메쉬 생성
     */
    createNoteMesh(config) {
        const material = new THREE.MeshStandardMaterial({
            color: config.baseColor,
            emissive: config.emissive,
            emissiveIntensity: config.emissiveIntensity,
            flatShading: true,
            transparent: true,
            opacity: 0.95
        });

        const mesh = new THREE.Mesh(config.geometry, material);
        mesh.castShadow = true;

        return mesh;
    }

    /**
     * 피치를 Y로 변환
     */
    pitchToY(midi) {
        const { PITCH_MIN, PITCH_MAX, PITCH_Y_MIN, PITCH_Y_MAX } = CONFIG.NOTES;
        const clamped = Math.max(PITCH_MIN, Math.min(PITCH_MAX, midi));
        return PITCH_Y_MIN + ((clamped - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * (PITCH_Y_MAX - PITCH_Y_MIN);
    }

    /**
     * 매 프레임 업데이트
     */
    update(deltaTime) {
        const cameraX = this.sceneManager.getCameraX();

        for (let i = this.activeNotes.length - 1; i >= 0; i--) {
            const note = this.activeNotes[i];
            const relativeX = note.position.x - cameraX;

            const age = (performance.now() - note.userData.spawnTime) / 1000;

            const pulse = 1 + Math.sin(age * CONFIG.NOTES.PULSE_SPEED) * 0.05;
            const baseScale = note.userData.type === 'jelly' ? 0.8 : 1;

            if (note.userData.type === 'melody' || note.userData.type === 'hihat' || note.userData.type === 'jelly') {
                note.rotation.y += deltaTime * CONFIG.NOTES.ROTATION_SPEED;

                // 아이템은 추가 회전축으로 더 다이내믹하게
                if (note.userData.type === 'hihat' || note.userData.type === 'jelly') {
                    note.rotation.z += deltaTime * (CONFIG.NOTES.ROTATION_SPEED * 0.8);
                    note.position.y += Math.sin(age * CONFIG.NOTES.BOUNCE_SPEED) * deltaTime * 0.2;
                }
            } else if (note.userData.type === 'kick') {
                // 킥(가시)은 숨쉬듯 수축/이완하며 경고
                note.scale.y = baseScale * pulse * (0.9 + Math.sin(age * 12) * 0.1);
            }

            // 기본 스케일 적용 (킥은 위에서 y값만 따로 처리했으므로 제외하거나 덮어쓰지 않도록 주의)
            if (note.userData.type !== 'kick') {
                note.scale.setScalar(baseScale * pulse);
            }

            if (relativeX < this.despawnDistance) {
                this.despawnNote(note, i);
            }
        }
    }

    despawnNote(note, index) {
        note.visible = false;
        this.sceneManager.remove(note);
        this.activeNotes.splice(index, 1);

        const type = note.userData.type;
        if (this.notePool[type]) {
            this.notePool[type].push(note);
        }
    }

    removeNote(note) {
        const index = this.activeNotes.indexOf(note);
        if (index !== -1) {
            this.despawnNote(note, index);
        }
    }

    getFromPool(type) {
        if (this.notePool[type] && this.notePool[type].length > 0) {
            return this.notePool[type].pop();
        }
        return null;
    }

    clearAll() {
        for (let i = this.activeNotes.length - 1; i >= 0; i--) {
            this.despawnNote(this.activeNotes[i], i);
        }
    }

    /**
     * 초기화 (재시작 시 호출)
     */
    reset() {
        // 모든 활성 장애물 제거
        [...this.activeNotes].forEach(note => this.removeNote(note));

        // 모든 활성 아이템 제거
        [...this.activeCollectibles].forEach(item => {
            if (item.parent) item.parent.remove(item);
            this.returnToPool('hihat', item);
        });

        this.activeNotes = [];
        this.activeCollectibles = [];

        this.log('NoteVisualizer 초기화 완료');
    }

    log(message, type = 'info') {
        if (this.debug) {
            this.debug.log(`[NoteViz] ${message}`, type);
        }
    }
}
