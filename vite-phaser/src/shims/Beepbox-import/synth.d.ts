declare module "BeepBox/build/synth/synth.js" {
    export class Synth {
        constructor(song: string);
        play: () => void;
        pause: () => void;
    };
}