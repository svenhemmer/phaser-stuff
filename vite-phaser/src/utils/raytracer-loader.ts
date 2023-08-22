import type { Loader, RaycasterWrapper, Shape } from '../models';

import PhaserRaycaster from 'phaser-raycaster';

export const createRaycasterLoader = (scene: Phaser.Scene, raycasterPlugin: PhaserRaycaster): Loader<RaycasterWrapper> => {
    return {
        preload: () => {},
    
        create: () => {
            const raycaster = raycasterPlugin.createRaycaster();
            return wrapperCreator(scene, raycaster);
        }
    }
}

const wrapperCreator = (scene: Phaser.Scene, raycaster: Raycaster) => {

    let blockingObjects: Shape[] = [];
    let cameraIntersections: Phaser.Geom.Point[] = [];

    const cameraRay = raycaster.createRay({
        origin: {
          x: 0,
          y: 0
        }
    });
      
    const overlay = scene.add.graphics();

    const drawCameraFov = () => {
        overlay.clear();

        overlay.fillStyle(0x000000, 0.95).fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height);

        const lightGraphics = scene.make.graphics();
        lightGraphics.fillStyle(0xffffff);
        lightGraphics.fillPoints(cameraIntersections);
        
        const maskLight = new Phaser.Display.Masks.BitmapMask(scene, lightGraphics);

        // maskGraphics.fillCircle(cameraRay.origin.x, cameraRay.origin.y, 300);
        
        maskLight.invertAlpha = true;

        overlay.setMask(maskLight);
      }

    const wrapper: RaycasterWrapper = {
        setPosition: (x: number, y: number) => {
            cameraRay.setOrigin(x, y);
            cameraIntersections = cameraRay.castCircle({
                objects: blockingObjects
            });
            drawCameraFov();
        },
        
        getMask: () => {
            return new Phaser.Display.Masks.BitmapMask(scene);
        },

        addGameObjects: (objects: Shape[]) => {
            blockingObjects = [];
            blockingObjects.push(...objects);
            raycaster.mapGameObjects([ ...blockingObjects ]);
        },
    };

    return wrapper;
}