/**
 * RhythmOdyssey - 메인 진입점
 * 곡 선택 → 게임 시작 플로우 (고품질 MIDI 재생)
 */

import { AudioManager } from './audio/AudioManager.js';
import { MidiParser } from './audio/MidiParser.js';
import { MidiPlayer } from './audio/MidiPlayer.js';
import { Game } from './core/Game.js';
import { DebugConsole } from './utils/DebugConsole.js';
import { CONFIG } from './config/GameConfig.js';

// 전역 상태
const gameState = {
    isLoading: true,
    isPlaying: false,
    selectedSong: null,
    audioManager: null,
    midiParser: null,
    midiPlayer: null,
    game: null,
    debug: null
};

// 곡 목록
const SONG_LIST = [
    {
        id: 'stage01',
        title: 'Stage 01 - First Step',
        file: 'src/audio/midi/stage01.mid',
        difficulty: 'easy',
        icon: '🌟'
    },
    {
        id: 'stage02',
        title: 'Stage 02 - Rising Beat',
        file: 'src/audio/midi/stage02.mid',
        difficulty: 'normal',
        icon: '🔥'
    },
    {
        id: 'stage03',
        title: 'Stage 03 - Final Rush',
        file: 'src/audio/midi/stage03.mid',
        difficulty: 'hard',
        icon: '⚡'
    }
];

/**
 * 로딩 업데이트
 */
function updateLoading(progress, text) {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');

    if (loadingBar) loadingBar.style.width = `${progress}%`;
    if (loadingText) loadingText.textContent = text;
}

/**
 * 로딩 화면 숨기기
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

/**
 * 곡 선택 화면 표시
 */
function showSongSelectScreen() {
    const songSelectScreen = document.getElementById('song-select-screen');
    if (songSelectScreen) {
        songSelectScreen.classList.add('active');
    }
}

/**
 * 곡 선택 화면 숨기기
 */
function hideSongSelectScreen() {
    const songSelectScreen = document.getElementById('song-select-screen');
    if (songSelectScreen) {
        songSelectScreen.classList.remove('active');
    }
}

/**
 * 곡 목록 렌더링
 */
function renderSongList() {
    const songListEl = document.getElementById('song-list');
    if (!songListEl) return;

    songListEl.innerHTML = '';

    SONG_LIST.forEach(song => {
        const songItem = document.createElement('div');
        songItem.className = 'song-item';
        songItem.dataset.songId = song.id;

        songItem.innerHTML = `
            <div class="song-icon">${song.icon}</div>
            <div class="song-info">
                <div class="song-title">${song.title}</div>
                <div class="song-meta">
                    <span class="song-difficulty ${song.difficulty}">${song.difficulty.toUpperCase()}</span>
                </div>
            </div>
        `;

        songItem.addEventListener('click', () => selectSong(song));
        songListEl.appendChild(songItem);
    });
}

/**
 * 곡 선택
 */
function selectSong(song) {
    gameState.selectedSong = song;

    document.querySelectorAll('.song-item').forEach(item => {
        item.classList.remove('selected');
        if (item.dataset.songId === song.id) {
            item.classList.add('selected');
        }
    });

    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.disabled = false;
    }

    gameState.debug?.log(`곡 선택: ${song.title}`, 'info');
}

/**
 * 게임 초기화
 */
async function init() {
    console.log('🎵 RhythmOdyssey 초기화 시작');

    try {
        // 디버그 콘솔 초기화
        updateLoading(10, '디버그 시스템 초기화...');
        gameState.debug = new DebugConsole('debug-console');
        gameState.debug.log('RhythmOdyssey v0.5.0 (SpessaSynth)', 'info');

        // 오디오 매니저 초기화
        updateLoading(20, '오디오 시스템 초기화...');
        gameState.audioManager = new AudioManager(gameState.debug);
        await gameState.audioManager.init();
        gameState.debug.log('AudioManager 초기화 완료', 'success');

        // MIDI 파서 초기화
        updateLoading(30, 'MIDI 파서 초기화...');
        gameState.midiParser = new MidiParser(gameState.debug);
        gameState.debug.log('MidiParser 초기화 완료', 'success');

        // MIDI 플레이어 인스턴스만 생성 (초기화는 게임 시작 시로 연기)
        gameState.midiPlayer = new MidiPlayer(
            gameState.audioManager.getContext(),
            gameState.debug
        );
        gameState.debug.log('MidiPlayer 대기 중...', 'info');

        // 곡 목록 렌더링
        updateLoading(90, '곡 목록 로드...');

        // 곡 목록 렌더링
        updateLoading(90, '곡 목록 로드...');
        renderSongList();

        // 완료
        updateLoading(100, '완료!');
        gameState.debug.log('🎮 곡을 선택하세요', 'success');

        setTimeout(() => {
            hideLoadingScreen();
            showSongSelectScreen();
            gameState.isLoading = false;
            setupEventListeners();
        }, 500);

    } catch (error) {
        console.error('초기화 실패:', error);
        updateLoading(0, `오류: ${error.message}`);
    }
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    // 설정 버튼 이벤트 리스너
    const setupOptionButtons = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.option-btn');
            if (!btn) return;

            // 해당 그룹 내 다른 버튼 비활성화
            container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            gameState.debug?.log(`설정 변경: ${containerId} -> ${btn.dataset.value}`, 'info');
        });
    };

    setupOptionButtons('difficulty-options');
}

/**
 * 게임 시작
 */
async function startGame() {
    if (!gameState.selectedSong || gameState.isPlaying) return;

    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.textContent = '🎵 로딩 중...';
        startBtn.disabled = true;
    }

    try {
        gameState.debug.log(`${gameState.selectedSong.title} 로드 중...`, 'info');

        // 1. 오디오 컨텍스트 시작 (사용자 제스처 내에서)
        await gameState.audioManager.start();

        // 2. MidiPlayer 초기화 (경고 방지를 위해 Context 시작 후 수행)
        if (!gameState.midiPlayer.isReady) {
            gameState.debug.log('MIDI 엔진 초기화 중...', 'info');
            await gameState.midiPlayer.init();

            // SoundFont 로드
            try {
                await gameState.midiPlayer.loadSoundFont('public/assets/soundfonts/TimGM6mb.sf2');
            } catch (sfError) {
                gameState.debug.log('SoundFont 로드 실패, 기본 사운드 사용', 'warn');
            }
        }

        // 3. MIDI 데이터 로드 및 파싱 (게임 로직용)
        const midiData = await gameState.midiParser.loadFromUrl(gameState.selectedSong.file);

        // 4. MIDI 파일 실제 재생 준비 (MidiPlayer)
        const response = await fetch(gameState.selectedSong.file);
        const midiBuffer = await response.arrayBuffer();
        await gameState.midiPlayer.loadMidi(midiBuffer);

        const difficulty = document.querySelector('#difficulty-options .option-btn.active')?.dataset.value || 'normal';

        // 곡 선택 화면 숨기기
        hideSongSelectScreen();

        // 게임 인스턴스 생성
        const container = document.getElementById('canvas-container');
        gameState.game = new Game(
            container,
            gameState.audioManager,
            midiData,
            gameState.debug,
            gameState.midiPlayer
        );
        await gameState.game.init();

        // 싱크 매니저에 설정 주입
        if (gameState.game.syncManager) {
            gameState.game.syncManager.setSettings(difficulty);
        }

        // 게임 시작
        gameState.isPlaying = true;
        gameState.game.start();

        // 고품질 MIDI 재생 시작
        gameState.midiPlayer.play();

        gameState.debug.log(`🎮 게임 시작! (난이도: ${difficulty})`, 'success');

    } catch (error) {
        console.error('게임 시작 실패:', error);
        gameState.debug.log(`게임 시작 실패: ${error.message}`, 'error');

        if (startBtn) {
            startBtn.textContent = '🎮 게임 시작';
            startBtn.disabled = false;
        }
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);
