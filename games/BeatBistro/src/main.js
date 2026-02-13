import Boot from './scenes/Boot.js';
import Preload from './scenes/Preload.js';
import Menu from './scenes/Menu.js';
import WorldMap from './scenes/WorldMap.js';
import Game from './scenes/Game.js';
import Result from './scenes/Result.js';
import MetronomeTestScene from './scenes/MetronomeTestScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import { COLORS } from './consts.js';

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: COLORS.BG,
    parent: 'app',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        Boot,
        Preload,
        Menu,
        MetronomeTestScene,
        SettingsScene,
        WorldMap,
        Game,
        Result
    ]
};

const game = new Phaser.Game(config);
