import './style.css'
import { Scene, Game, WEBGL, GameObjects } from 'phaser';
import { Synth } from 'BeepBox/build/synth/synth.js';
import { createTiledLoader, createRaycasterLoader } from './utils';
import PhaserRaycaster from 'phaser-raycaster';
import { RaycasterWrapper } from './models';

const canvas = document.getElementById('game') as HTMLCanvasElement;

class GameScene extends Scene {
  private textbox: GameObjects.Text | undefined;

  private synth?: Synth;
  private isPlayingSong = false;

  private tiledLoader;
  private raycasterWrapper!: RaycasterWrapper;

  //Autowired plugins
  private raycasterPlugin!: PhaserRaycaster;

  constructor() {
    super(config);

    this.tiledLoader = createTiledLoader(this, {
      json: { key: 'map', path: 'simple-map.json', tileWidth: 32, tileHeight: 32},
      img: { key: 'tiles', path: 'gridtiles.png'},
      key: 'map'
    });
  }

  preload() {
    this.tiledLoader.preload();
  }

  create() {
    this.tiledLoader.create();

    const raycasterLoader = createRaycasterLoader(this, this.raycasterPlugin);
    this.raycasterWrapper = raycasterLoader.create();

    this.input.on('pointerdown', this.triggerMusic);

    const r1 = this.add.rectangle(550, 350, 168, 148);
    const e1 = this.physics.add.existing(r1, false);

    const r2 = this.add.rectangle(400, 150, 148, 148);
    const e2 = this.physics.add.existing(r2, true);

    const r3 = this.add.rectangle(100, 450, 148, 148);
    const e3 = this.physics.add.existing(r3);

    this.raycasterWrapper.addGameObjects([e1, e2, e3]);
    
    this.input.on('pointermove', ({ x, y }: MouseEvent) => this.raycasterWrapper.setPosition(x, y), this);
  }

  triggerMusic() {
    if (!this.synth) { 
      this.synth = new Synth("5sbk4l00e0ftaa7g0fj7i0r1w1100f0000d1110c0000h0000v2200o3320b4z8Ql6hkpUsiczhkp5hDxN8Od5hAl6u74z8Ql6hkpUsp24ZFzzQ1E39kxIceEtoV8s66138l1S0L1u2139l1H39McyaeOgKA0TxAU213jj0NM4x8i0o0c86ywz7keUtVxQk1E3hi6OEcB8Atl0q0Qmm6eCexg6wd50oczkhO8VcsEeAc26gG3E1q2U406hG3i6jw94ksf8i5Uo0dZY26kHHzxp2gAgM0o4d516ej7uegceGwd0q84czm6yj8Xa0Q1EIIctcvq0Q1EE3ihE8W1OgV8s46Icxk7o24110w0OdgqMOk392OEWhS1ANQQ4toUctBpzRxx1M0WNSk1I3ANMEXwS3I79xSzJ7q6QtEXgw0");
    }
    if (!this.isPlayingSong) {
      this.synth.play();
      this.isPlayingSong = true;
    }
    else {
      this.synth.pause();
      this.isPlayingSong = false;
    }
  }

  update(_: number, delta: number) {
    if (!this.textbox) {
      return;
    }

    this.textbox.rotation += 0.0005 * delta;
  }
}

const config = {
  type: WEBGL,
  width: window.innerWidth,
  height: window.innerHeight,
  canvas,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: true
    }
  },
  scene: [
    GameScene
  ],
  plugins: {
    scene: [
      {
        key: 'PhaserRaycaster',
        plugin: PhaserRaycaster,
        mapping: 'raycasterPlugin'
      }
    ]
  }
}

new Game(config);
