import type { Loader } from "../models/loader";
import type { TiledMapConfig } from "../models/loaders/tiled";

export const createTiledLoader = (scene: Phaser.Scene, config: TiledMapConfig): Loader<Phaser.Tilemaps.Tilemap> => {

    return {
        preload: function (): void {
            scene.load.image(config.img.key, 'assets/' + config.img.path);
            scene.load.tilemapTiledJSON(config.json.key, 'assets/' + config.json.path);
        },
        create: function (): Phaser.Tilemaps.Tilemap {
            const conf = { key: 'map', ...config }
            const map = scene.make.tilemap(conf);
            const tiles = map.addTilesetImage(conf.mapName, config.img.key);
            if (!tiles) {
                throw('No tiles found for ' + config.img.key);
            }
            map.createLayer(0, tiles, 0, 0);
            scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
            return map;
        }
    };
};