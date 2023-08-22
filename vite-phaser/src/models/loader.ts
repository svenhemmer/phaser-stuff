export type Loader<Resource> = {
    preload: () => void;
    create: () => Resource;
};