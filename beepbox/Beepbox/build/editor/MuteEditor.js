import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "./ColorConfig";
import { ChannelRow } from "./ChannelRow";
export class MuteEditor {
    constructor(_doc) {
        this._doc = _doc;
        this._cornerFiller = HTML.div({ style: `background: ${ColorConfig.editorBackground}; position: sticky; bottom: 0; left: 0; width: 32px; height: 30px;` });
        this.container = HTML.div({ class: "muteEditor" });
        this._buttons = [];
        this._onClick = (event) => {
            const index = this._buttons.indexOf(event.target);
            if (index == -1)
                return;
            this._doc.song.channels[index].muted = !this._doc.song.channels[index].muted;
            this._doc.notifier.changed();
        };
        this.container.addEventListener("click", this._onClick);
    }
    render() {
        if (!this._doc.prefs.enableChannelMuting)
            return;
        if (this._buttons.length != this._doc.song.getChannelCount()) {
            for (let y = this._buttons.length; y < this._doc.song.getChannelCount(); y++) {
                const muteButton = HTML.button({ class: "mute-button", title: "Mute (M), Mute All (⇧M), Solo (S), Exclude (⇧S)", style: `height: ${ChannelRow.patternHeight - 4}px; margin: 2px;` });
                this.container.appendChild(muteButton);
                this._buttons[y] = muteButton;
            }
            for (let y = this._doc.song.getChannelCount(); y < this._buttons.length; y++) {
                this.container.removeChild(this._buttons[y]);
            }
            this._buttons.length = this._doc.song.getChannelCount();
            this.container.appendChild(this._cornerFiller);
        }
        for (let y = 0; y < this._doc.song.getChannelCount(); y++) {
            if (this._doc.song.channels[y].muted) {
                this._buttons[y].classList.add("muted");
            }
            else {
                this._buttons[y].classList.remove("muted");
            }
        }
    }
}
//# sourceMappingURL=MuteEditor.js.map