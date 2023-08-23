import type { Loader } from "../models/loader";
import type { TiledMapConfig } from "../models/loaders/tiled";

export const createTiledLoader = (scene: Phaser.Scene, config: TiledMapConfig): Loader<Phaser.Tilemaps.Tilemap> => {

    return {
        preload: () => {
            scene.load.image(config.img.key, '/' + config.img.path);
            scene.load.tilemapTiledJSON(config.json.key, '/' + config.json.path);
        },
        
        create: () => {
            const conf = { key: 'map', ...config }
            const map = scene.make.tilemap(conf);
            const tiles = map.addTilesetImage(conf.mapName? conf.mapName: config.img.key, config.img.key);
            if (!tiles) {
                throw('No tiles found for ' + config.img.key);
            }
            map.createLayer(0, tiles, 0, 0);
            map.setCollision([20, 48]);
            scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            return map;
        }
    };
};