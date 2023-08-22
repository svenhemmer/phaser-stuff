# Beepbox
Beepbox is a free online chiptune music editor. It is open source an can be found at https://github.com/johnnesky/beepbox

# Preparations
## Build Beepbox Synth locally
As described in the repository only the synth-directory is needed to replay songs. 

Clone the repository to a location relatively close to your Phaser project, and run

<pre>
npm run build-synth
</pre>

The output will be ceated into a directory build/synth 

## Prepare project
### Add local dependency
Go to your phaser game and add an depencency, using a relative path to import your dependency, e.g. 
<pre>
npm install --save ../beepbox
</pre>

### Allow the usage of js
In the tsconfig.json file in the root-path of your phaser project add a permission to use js into the compiler-options:
<pre>
{
  "compilerOptions": {
    "allowJs": true,
    ...
  }
}
</pre>

### Define Module
As there are no types defined, a module needs to be added, just create any ts declaration file, e.g. synt.d.ts with the following contents:

<pre>
declare module "BeepBox/build/synth/synth.js" {
    export class Synth {
        constructor(song: string);
        pause: () => void;
        play: () => void;
        // More functions if needed, look into the synth.js file to see what the Class provides
    };
}
</pre>

### Add to code
In the file where you want to use beepbox to replay sound add an import, initialize an Instance of Synth with your song, and replay it. For example as follows:

<pre>
import { Synth } from 'BeepBox/build/synth/synth.js';
...

class GameScene extends Scene {
  private synth?: Synth;
  ...

  initSound() {
    this.synth = new Synth("5sbk4l00e0ftaa7g0fj7i0r1w1100f0000d1110c0000h0000v2200o3320b4z8Ql6hkpUsiczhkp5hDxN8Od5hAl6u74z8Ql6hkpUsp24ZFzzQ1E39kxIceEtoV8s66138l1S0L1u2139l1H39McyaeOgKA0TxAU213jj0NM4x8i0o0c86ywz7keUtVxQk1E3hi6OEcB8Atl0q0Qmm6eCexg6wd50oczkhO8VcsEeAc26gG3E1q2U406hG3i6jw94ksf8i5Uo0dZY26kHHzxp2gAgM0o4d516ej7uegceGwd0q84czm6yj8Xa0Q1EIIctcvq0Q1EE3ihE8W1OgV8s46Icxk7o24110w0OdgqMOk392OEWhS1ANQQ4toUctBpzRxx1M0WNSk1I3ANMEXwS3I79xSzJ7q6QtEXgw0");
    this.textbox.setOrigin(0.5, 0.5);
  }

  playSound() {
    this.synth?.play();
  }

  ...

}
</pre>