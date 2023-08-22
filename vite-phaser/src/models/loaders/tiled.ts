export type TiledMapConfig = {
    json: {
        key: string;
        path: string;
        tileWidth?: number;
        tileHeight?: number;
    };
    img: {
        key: string;
        path: string;
    }
    key?: string;
    mapName?: string;
}