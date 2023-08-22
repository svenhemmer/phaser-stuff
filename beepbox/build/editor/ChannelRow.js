import { ColorConfig } from "./ColorConfig";
import { HTML } from "imperative-html/dist/esm/elements-strict";
export class Box {
    constructor(channel, color) {
        this._text = document.createTextNode("");
        this._label = HTML.div({ class: "channelBoxLabel" }, this._text);
        this.container = HTML.div({ class: "channelBox", style: `margin: 1px; height: ${ChannelRow.patternHeight - 2}px;` }, this._label);
        this._renderedIndex = -1;
        this.container.style.background = ColorConfig.uiWidgetBackground;
        this._label.style.color = color;
    }
    setWidth(width) {
        this.container.style.width = (width - 2) + "px";
    }
    setIndex(index, selected, color) {
        if (this._renderedIndex != index) {
            this._renderedIndex = index;
            this._text.data = String(index);
        }
        this._label.style.color = selected ? ColorConfig.invertedText : color;
        this.container.style.background = selected ? color : (index == 0) ? "none" : ColorConfig.uiWidgetBackground;
    }
}
export class ChannelRow {
    constructor(_doc, index) {
        this._doc = _doc;
        this.index = index;
        this._renderedBarWidth = -1;
        this._boxes = [];
        this.container = HTML.div({ class: "channelRow" });
    }
    render() {
        const barWidth = this._doc.getBarWidth();
        if (this._boxes.length != this._doc.song.barCount) {
            for (let x = this._boxes.length; x < this._doc.song.barCount; x++) {
                const box = new Box(this.index, ColorConfig.getChannelColor(this._doc.song, this.index).secondaryChannel);
                box.setWidth(barWidth);
                this.container.appendChild(box.container);
                this._boxes[x] = box;
            }
            for (let x = this._doc.song.barCount; x < this._boxes.length; x++) {
                this.container.removeChild(this._boxes[x].container);
            }
            this._boxes.length = this._doc.song.barCount;
        }
        if (this._renderedBarWidth != barWidth) {
            this._renderedBarWidth = barWidth;
            for (let x = 0; x < this._boxes.length; x++) {
                this._boxes[x].setWidth(barWidth);
            }
        }
        for (let i = 0; i < this._boxes.length; i++) {
            const pattern = this._doc.song.getPattern(this.index, i);
            const selected = (i == this._doc.bar && this.index == this._doc.channel);
            const dim = (pattern == null || pattern.notes.length == 0);
            const box = this._boxes[i];
            if (i < this._doc.song.barCount) {
                const colors = ColorConfig.getChannelColor(this._doc.song, this.index);
                box.setIndex(this._doc.song.channels[this.index].bars[i], selected, dim && !selected ? colors.secondaryChannel : colors.primaryChannel);
                box.container.style.visibility = "visible";
            }
            else {
                box.container.style.visibility = "hidden";
            }
        }
    }
}
ChannelRow.patternHeight = 28;
//# sourceMappingURL=ChannelRow.js.map