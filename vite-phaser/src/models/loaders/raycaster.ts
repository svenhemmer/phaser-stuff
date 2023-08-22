export type Shape =
    Phaser.GameObjects.Rectangle | Phaser.GameObjects.Ellipse | Phaser.GameObjects.Curve;

export type RaycasterWrapper = {
    setPosition: (x: number, y: number) => void;
    getMask: () => Phaser.Display.Masks.BitmapMask;
    addGameObjects: (objects: Shape[]) => void;
}