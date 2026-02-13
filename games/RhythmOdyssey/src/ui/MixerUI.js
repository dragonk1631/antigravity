/**
 * MixerUI - MIDI 트랙별 볼륨 및 솔로 제어 UI
 */
export class MixerUI {
    constructor(container, midiPlayer) {
        this.container = container;
        this.midiPlayer = midiPlayer;
        this.overlay = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        // 배경 오버레이 생성
        this.overlay = document.createElement('div');
        this.overlay.id = 'mixer-overlay';
        this.overlay.className = 'screen-overlay hidden';
        this.overlay.style.zIndex = '3000'; // 결과 화면보다 위

        const content = document.createElement('div');
        content.className = 'mixer-content';
        content.innerHTML = `
            <div class="mixer-header">
                <h2>TRACK MIXER</h2>
                <button id="close-mixer-btn" class="close-btn">&times;</button>
            </div>
            <div id="mixer-tracks" class="mixer-tracks">
                <!-- 트랙 목록이 동적으로 생성됨 -->
            </div>
        `;

        // 스타일 직접 주입 (편의상)
        const style = document.createElement('style');
        style.textContent = `
            #mixer-overlay {
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
            }
            .mixer-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #0d1117 100%);
                border: 2px solid #6e8efb;
                border-radius: 20px;
                padding: 25px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 0 40px rgba(110, 142, 251, 0.3);
                color: white;
            }
            .mixer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 10px;
            }
            .mixer-header h2 {
                letter-spacing: 2px;
                background: linear-gradient(90deg, #6e8efb, #c44dff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 2rem;
                cursor: pointer;
            }
            .mixer-tracks {
                overflow-y: auto;
                flex: 1;
                padding-right: 10px;
            }
            .mixer-track-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                margin-bottom: 10px;
                transition: background 0.2s;
            }
            .mixer-track-item:hover {
                background: rgba(255,255,255,0.08);
            }
            .track-info {
                flex: 1;
                min-width: 0;
            }
            .track-name {
                font-weight: 700;
                font-size: 0.9rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .track-channel {
                font-size: 0.7rem;
                color: rgba(255,255,255,0.4);
            }
            .track-controls {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .vol-slider {
                width: 80px;
                height: 4px;
                -webkit-appearance: none;
                background: rgba(255,255,255,0.2);
                border-radius: 2px;
                outline: none;
            }
            .vol-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                background: #6e8efb;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 0 5px rgba(110, 142, 251, 0.8);
            }
            .toggle-btn {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.2);
                background: rgba(0,0,0,0.3);
                color: rgba(255,255,255,0.5);
                font-weight: 800;
                cursor: pointer;
                font-size: 0.8rem;
                transition: all 0.2s;
            }
            .toggle-btn.active.solo {
                background: #ffd93d;
                color: #000;
                border-color: #ffd93d;
                box-shadow: 0 0 10px rgba(255, 217, 61, 0.5);
            }
            .toggle-btn.active.mute {
                background: #ff6b6b;
                color: #fff;
                border-color: #ff6b6b;
                box-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
            }
        `;

        document.head.appendChild(style);
        this.overlay.appendChild(content);
        this.container.appendChild(this.overlay);

        document.getElementById('close-mixer-btn').onclick = () => this.toggle(false);
    }

    /**
     * 현재 재생 중인 곡의 트랙 리스트로 믹서 패널 업데이트
     */
    refresh(midiData) {
        if (!midiData || !midiData.tracks) return;

        const trackContainer = document.getElementById('mixer-tracks');
        trackContainer.innerHTML = '';

        // SpessaSynth의 채널별 상태 가져오기
        const channels = this.midiPlayer.getChannelsInfo();

        // 실제 노트가 있는 채널만 또는 모든 트랙 표시
        midiData.tracks.forEach((track, index) => {
            if (track.notes.length === 0) return;

            const channelId = track.channel !== undefined ? track.channel : index;
            const state = channels[channelId] || { volume: 1.0, isMuted: false, isSolo: false };

            const trackEl = document.createElement('div');
            trackEl.className = 'mixer-track-item';

            // 아이콘 결정
            let icon = '🎵';
            const name = track.name || `Track ${index}`;
            if (name.toLowerCase().includes('drum') || track.channel === 9) icon = '🥁';
            else if (name.toLowerCase().includes('bass')) icon = '🎸';
            else if (name.toLowerCase().includes('piano')) icon = '🎹';

            trackEl.innerHTML = `
                <div class="song-icon" style="width: 40px; height: 40px; font-size: 1.2rem;">${icon}</div>
                <div class="track-info">
                    <div class="track-name">${name}</div>
                    <div class="track-channel">CH ${channelId}</div>
                </div>
                <div class="track-controls">
                    <input type="range" class="vol-slider" min="0" max="1" step="0.1" value="${state.volume}" data-ch="${channelId}">
                    <button class="toggle-btn solo ${state.isSolo ? 'active' : ''}" data-ch="${channelId}">S</button>
                    <button class="toggle-btn mute ${state.isMuted ? 'active' : ''}" data-ch="${channelId}">M</button>
                </div>
            `;

            // 이벤트 처리
            const slider = trackEl.querySelector('.vol-slider');
            slider.oninput = (e) => {
                this.midiPlayer.setChannelVolume(channelId, parseFloat(e.target.value));
            };

            const soloBtn = trackEl.querySelector('.solo');
            soloBtn.onclick = () => {
                const isActive = !soloBtn.classList.contains('active');
                soloBtn.classList.toggle('active', isActive);
                this.midiPlayer.setChannelSolo(channelId, isActive);
                // 솔로가 바뀌면 다른 트랙의 뮤트 상태가 UI에 반영되어야 할 수도 있으나 
                // 여기서는 간단히 클릭한 버튼만 활성화 처리
            };

            const muteBtn = trackEl.querySelector('.mute');
            muteBtn.onclick = () => {
                const isActive = !muteBtn.classList.contains('active');
                muteBtn.classList.toggle('active', isActive);
                this.midiPlayer.setChannelMute(channelId, isActive);
            };

            trackContainer.appendChild(trackEl);
        });
    }

    toggle(force) {
        this.isOpen = force !== undefined ? force : !this.isOpen;
        if (this.isOpen) {
            this.overlay.classList.remove('hidden');
        } else {
            this.overlay.classList.add('hidden');
        }
    }
}
