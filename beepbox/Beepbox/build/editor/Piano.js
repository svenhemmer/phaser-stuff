import { Config } from "../synth/SynthConfig";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "./ColorConfig";
export class Piano {
    constructor(_doc) {
        this._doc = _doc;
        this._pianoContainer = HTML.div({ style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;" });
        this._drumContainer = HTML.div({ style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;" });
        this._preview = HTML.div({ style: `width: 100%; height: 40px; border: 2px solid ${ColorConfig.primaryText}; position: absolute; box-sizing: border-box; pointer-events: none;` });
        this.container = HTML.div({ style: "width: 32px; height: 100%; overflow: hidden; position: relative; flex-shrink: 0; touch-action: none;" }, this._pianoContainer, this._drumContainer, this._preview);
        this._editorHeight = 481;
        this._pianoKeys = [];
        this._pianoLabels = [];
        this._mouseY = 0;
        this._mouseDown = false;
        this._mouseOver = false;
        this._playedPitch = -1;
        this._renderedScale = -1;
        this._renderedDrums = false;
        this._renderedKey = -1;
        this._renderedPitchCount = -1;
        this._renderedLiveInputPitches = [];
        this._whenMouseOver = (event) => {
            if (this._mouseOver)
                return;
            this._mouseOver = true;
            this._updatePreview();
        };
        this._whenMouseOut = (event) => {
            if (!this._mouseOver)
                return;
            this._mouseOver = false;
            this._updatePreview();
        };
        this._whenMousePressed = (event) => {
            event.preventDefault();
            this._doc.synth.maintainLiveInput();
            this._mouseDown = true;
            const boundingRect = this.container.getBoundingClientRect();
            this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            this._updateCursorPitch();
            this._playLiveInput();
            this._updatePreview();
        };
        this._whenMouseMoved = (event) => {
            if (this._mouseDown || this._mouseOver)
                this._doc.synth.maintainLiveInput();
            const boundingRect = this.container.getBoundingClientRect();
            this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            this._updateCursorPitch();
            if (this._mouseDown)
                this._playLiveInput();
            this._updatePreview();
        };
        this._whenMouseReleased = (event) => {
            if (this._mouseDown)
                this._releaseLiveInput();
            this._mouseDown = false;
            this._updatePreview();
        };
        this._whenTouchPressed = (event) => {
            event.preventDefault();
            this._doc.synth.maintainLiveInput();
            this._mouseDown = true;
            const boundingRect = this.container.getBoundingClientRect();
            this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            this._updateCursorPitch();
            this._playLiveInput();
        };
        this._whenTouchMoved = (event) => {
            event.preventDefault();
            this._doc.synth.maintainLiveInput();
            const boundingRect = this.container.getBoundingClientRect();
            this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            this._updateCursorPitch();
            if (this._mouseDown)
                this._playLiveInput();
        };
        this._whenTouchReleased = (event) => {
            event.preventDefault();
            this._mouseDown = false;
            this._releaseLiveInput();
        };
        this._onAnimationFrame = () => {
            window.requestAnimationFrame(this._onAnimationFrame);
            let liveInputChanged = false;
            const liveInputPitchCount = !this._doc.performance.pitchesAreTemporary() ? this._doc.synth.liveInputPitches.length : 0;
            if (this._renderedLiveInputPitches.length != liveInputPitchCount) {
                liveInputChanged = true;
            }
            for (let i = 0; i < liveInputPitchCount; i++) {
                if (this._renderedLiveInputPitches[i] != this._doc.synth.liveInputPitches[i]) {
                    this._renderedLiveInputPitches[i] = this._doc.synth.liveInputPitches[i];
                    liveInputChanged = true;
                }
            }
            this._renderedLiveInputPitches.length = liveInputPitchCount;
            if (liveInputChanged) {
                this._updatePreview();
            }
        };
        this._documentChanged = () => {
            const isDrum = this._doc.song.getChannelIsNoise(this._doc.channel);
            this._pitchCount = isDrum ? Config.drumCount : this._doc.getVisiblePitchCount();
            this._pitchHeight = this._editorHeight / this._pitchCount;
            this._updateCursorPitch();
            if (this._mouseDown)
                this._playLiveInput();
            if (!this._doc.prefs.showLetters)
                return;
            if (this._renderedScale == this._doc.song.scale && this._renderedKey == this._doc.song.key && this._renderedDrums == isDrum && this._renderedPitchCount == this._pitchCount)
                return;
            this._renderedScale = this._doc.song.scale;
            this._renderedKey = this._doc.song.key;
            this._renderedDrums = isDrum;
            this._pianoContainer.style.display = isDrum ? "none" : "flex";
            this._drumContainer.style.display = isDrum ? "flex" : "none";
            if (!isDrum) {
                if (this._renderedPitchCount != this._pitchCount) {
                    this._pianoContainer.innerHTML = "";
                    for (let i = 0; i < this._pitchCount; i++) {
                        const pianoLabel = HTML.div({ class: "piano-label", style: "font-weight: bold; -webkit-text-stroke-width: 0; font-size: 11px; font-family: sans-serif; position: absolute; padding-left: 15px;" });
                        const pianoKey = HTML.div({ class: "piano-button", style: "background: gray;" }, pianoLabel);
                        this._pianoContainer.appendChild(pianoKey);
                        this._pianoLabels[i] = pianoLabel;
                        this._pianoKeys[i] = pianoKey;
                    }
                    this._pianoLabels.length = this._pitchCount;
                    this._pianoKeys.length = this._pitchCount;
                    this._renderedPitchCount = this._pitchCount;
                }
                for (let j = 0; j < this._pitchCount; j++) {
                    const pitchNameIndex = (j + Config.keys[this._doc.song.key].basePitch) % Config.pitchesPerOctave;
                    const isWhiteKey = Config.keys[pitchNameIndex].isWhiteKey;
                    this._pianoKeys[j].style.background = isWhiteKey ? ColorConfig.whitePianoKey : ColorConfig.blackPianoKey;
                    if (!Config.scales[this._doc.song.scale].flags[j % Config.pitchesPerOctave]) {
                        this._pianoKeys[j].classList.add("disabled");
                        this._pianoLabels[j].style.display = "none";
                    }
                    else {
                        this._pianoKeys[j].classList.remove("disabled");
                        this._pianoLabels[j].style.display = "";
                        const label = this._pianoLabels[j];
                        label.style.color = Config.keys[pitchNameIndex].isWhiteKey ? "black" : "white";
                        label.textContent = Piano.getPitchName(pitchNameIndex, j);
                    }
                }
            }
            this._updatePreview();
        };
        for (let i = 0; i < Config.drumCount; i++) {
            const scale = (1.0 - (i / Config.drumCount) * 0.35) * 100;
            this._drumContainer.appendChild(HTML.div({ class: "drum-button", style: `background-size: ${scale}% ${scale}%;` }));
        }
        this.container.addEventListener("mousedown", this._whenMousePressed);
        document.addEventListener("mousemove", this._whenMouseMoved);
        document.addEventListener("mouseup", this._whenMouseReleased);
        this.container.addEventListener("mouseover", this._whenMouseOver);
        this.container.addEventListener("mouseout", this._whenMouseOut);
        this.container.addEventListener("touchstart", this._whenTouchPressed);
        this.container.addEventListener("touchmove", this._whenTouchMoved);
        this.container.addEventListener("touchend", this._whenTouchReleased);
        this.container.addEventListener("touchcancel", this._whenTouchReleased);
        this._doc.notifier.watch(this._documentChanged);
        this._documentChanged();
        window.requestAnimationFrame(this._onAnimationFrame);
    }
    _updateCursorPitch() {
        const scale = Config.scales[this._doc.song.scale].flags;
        const mousePitch = Math.max(0, Math.min(this._pitchCount - 1, this._pitchCount - (this._mouseY / this._pitchHeight)));
        if (scale[Math.floor(mousePitch) % Config.pitchesPerOctave] || this._doc.song.getChannelIsNoise(this._doc.channel)) {
            this._cursorPitch = Math.floor(mousePitch);
        }
        else {
            let topPitch = Math.floor(mousePitch) + 1;
            let bottomPitch = Math.floor(mousePitch) - 1;
            while (!scale[topPitch % Config.pitchesPerOctave]) {
                topPitch++;
            }
            while (!scale[(bottomPitch) % Config.pitchesPerOctave]) {
                bottomPitch--;
            }
            let topRange = topPitch;
            let bottomRange = bottomPitch + 1;
            if (topPitch % Config.pitchesPerOctave == 0 || topPitch % Config.pitchesPerOctave == 7) {
                topRange -= 0.5;
            }
            if (bottomPitch % Config.pitchesPerOctave == 0 || bottomPitch % Config.pitchesPerOctave == 7) {
                bottomRange += 0.5;
            }
            this._cursorPitch = mousePitch - bottomRange > topRange - mousePitch ? topPitch : bottomPitch;
        }
    }
    _playLiveInput() {
        const octaveOffset = this._doc.getBaseVisibleOctave(this._doc.channel) * Config.pitchesPerOctave;
        const currentPitch = this._cursorPitch + octaveOffset;
        if (this._playedPitch == currentPitch)
            return;
        this._doc.performance.removePerformedPitch(this._playedPitch);
        this._playedPitch = currentPitch;
        this._doc.performance.addPerformedPitch(currentPitch);
    }
    _releaseLiveInput() {
        this._doc.performance.removePerformedPitch(this._playedPitch);
        this._playedPitch = -1;
    }
    _updatePreview() {
        this._preview.style.visibility = (!this._mouseOver || this._mouseDown) ? "hidden" : "visible";
        if (this._mouseOver && !this._mouseDown) {
            const boundingRect = this.container.getBoundingClientRect();
            const pitchHeight = this._pitchHeight / (this._editorHeight / (boundingRect.bottom - boundingRect.top));
            this._preview.style.left = "0px";
            this._preview.style.top = pitchHeight * (this._pitchCount - this._cursorPitch - 1) + "px";
            this._preview.style.height = pitchHeight + "px";
        }
        const octaveOffset = this._doc.getBaseVisibleOctave(this._doc.channel) * Config.pitchesPerOctave;
        const container = this._doc.song.getChannelIsNoise(this._doc.channel) ? this._drumContainer : this._pianoContainer;
        const children = container.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (this._renderedLiveInputPitches.indexOf(i + octaveOffset) == -1) {
                child.classList.remove("pressed");
            }
            else {
                child.classList.add("pressed");
            }
        }
    }
    static getPitchName(pitchNameIndex, scaleIndex) {
        let text;
        if (Config.keys[pitchNameIndex].isWhiteKey) {
            text = Config.keys[pitchNameIndex].name;
        }
        else {
            const shiftDir = Config.blackKeyNameParents[scaleIndex % Config.pitchesPerOctave];
            text = Config.keys[(pitchNameIndex + Config.pitchesPerOctave + shiftDir) % Config.pitchesPerOctave].name;
            if (shiftDir == 1) {
                text += "♭";
            }
            else if (shiftDir == -1) {
                text += "♯";
            }
        }
        return text;
    }
}
//# sourceMappingURL=Piano.js.map