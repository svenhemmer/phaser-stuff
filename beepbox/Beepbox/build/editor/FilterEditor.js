import { FilterCoefficients, FrequencyResponse } from "../synth/filtering";
import { Config } from "../synth/SynthConfig";
import { FilterControlPoint } from "../synth/synth";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "./ColorConfig";
import { ChangeSequence } from "./Change";
import { ChangeFilterAddPoint, ChangeFilterMovePoint } from "./changes";
import { prettyNumber } from "./EditorConfig";
export class FilterEditor {
    constructor(_doc, useNoteFilter = false) {
        this._doc = _doc;
        this._editorWidth = 120;
        this._editorHeight = 26;
        this._responsePath = SVG.path({ fill: ColorConfig.uiWidgetBackground, "pointer-events": "none" });
        this._controlPointPath = SVG.path({ fill: "currentColor", "pointer-events": "none" });
        this._dottedLinePath = SVG.path({ fill: "none", stroke: "currentColor", "stroke-width": 1, "stroke-dasharray": "3, 2", "pointer-events": "none" });
        this._highlight = SVG.circle({ fill: "white", stroke: "none", "pointer-events": "none", r: 4 });
        this._svg = SVG.svg({ style: `background-color: ${ColorConfig.editorBackground}; touch-action: none;`, width: "100%", height: "100%", viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight, preserveAspectRatio: "none" }, this._responsePath, this._dottedLinePath, this._highlight, this._controlPointPath);
        this._label = HTML.div({ style: "position: absolute; bottom: 0; left: 2px; font-size: 8px; line-height: 1; pointer-events: none;" });
        this.container = HTML.div({ class: "filterEditor", style: "height: 100%; position: relative;" }, this._svg, this._label);
        this._pointRadius = 2;
        this._useNoteFilter = false;
        this._touchMode = false;
        this._mouseX = 0;
        this._mouseY = 0;
        this._mouseOver = false;
        this._mouseDown = false;
        this._mouseDragging = false;
        this._addingPoint = false;
        this._deletingPoint = false;
        this._addedType = 2;
        this._selectedIndex = 0;
        this._freqStart = 0;
        this._gainStart = 0;
        this._dragChange = null;
        this._renderedSelectedIndex = -1;
        this._renderedPointCount = -1;
        this._renderedPointTypes = -1;
        this._renderedPointFreqs = -1;
        this._renderedPointGains = -1;
        this._whenMouseOver = (event) => {
            this._mouseOver = true;
        };
        this._whenMouseOut = (event) => {
            this._mouseOver = false;
            this._updatePath();
        };
        this._whenMousePressed = (event) => {
            event.preventDefault();
            this._touchMode = false;
            const boundingRect = this._svg.getBoundingClientRect();
            this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
            this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseX))
                this._mouseX = 0;
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            this._whenCursorPressed();
        };
        this._whenTouchPressed = (event) => {
            event.preventDefault();
            this._touchMode = true;
            const boundingRect = this._svg.getBoundingClientRect();
            this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
            this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseX))
                this._mouseX = 0;
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            this._whenCursorPressed();
        };
        this._whenMouseMoved = (event) => {
            if (this.container.offsetParent == null)
                return;
            const boundingRect = this._svg.getBoundingClientRect();
            this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
            this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseX))
                this._mouseX = 0;
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            if (!this._mouseDown)
                this._updateCursor();
            this._whenCursorMoved();
        };
        this._whenTouchMoved = (event) => {
            if (this.container.offsetParent == null)
                return;
            if (this._mouseDown)
                event.preventDefault();
            const boundingRect = this._svg.getBoundingClientRect();
            this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
            this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
            if (isNaN(this._mouseX))
                this._mouseX = 0;
            if (isNaN(this._mouseY))
                this._mouseY = 0;
            if (!this._mouseDown)
                this._updateCursor();
            this._whenCursorMoved();
        };
        this._whenCursorReleased = (event) => {
            if (this.container.offsetParent == null)
                return;
            if (this._mouseDown && this._doc.lastChangeWas(this._dragChange) && this._dragChange != null) {
                if (!this._addingPoint && !this._mouseDragging && !this._touchMode) {
                    if (this._selectedIndex < this._filterSettings.controlPointCount && this._selectedIndex != -1) {
                        const point = this._filterSettings.controlPoints[this._selectedIndex];
                        this._doc.record(new ChangeFilterAddPoint(this._doc, this._filterSettings, point, this._selectedIndex, this._useNoteFilter, true));
                    }
                }
                else {
                    this._doc.record(this._dragChange);
                }
                this._updatePath();
            }
            this._dragChange = null;
            this._mouseDragging = false;
            this._deletingPoint = false;
            this._mouseDown = false;
            this._updateCursor();
        };
        this._useNoteFilter = useNoteFilter;
        this.container.addEventListener("mousedown", this._whenMousePressed);
        this.container.addEventListener("mouseover", this._whenMouseOver);
        this.container.addEventListener("mouseout", this._whenMouseOut);
        document.addEventListener("mousemove", this._whenMouseMoved);
        document.addEventListener("mouseup", this._whenCursorReleased);
        this.container.addEventListener("touchstart", this._whenTouchPressed);
        this.container.addEventListener("touchmove", this._whenTouchMoved);
        this.container.addEventListener("touchend", this._whenCursorReleased);
        this.container.addEventListener("touchcancel", this._whenCursorReleased);
    }
    _xToFreq(x) {
        return Config.filterFreqRange * x / this._editorWidth - 0.5;
    }
    _freqToX(freq) {
        return this._editorWidth * (freq + 0.5) / Config.filterFreqRange;
    }
    _yToGain(y) {
        return (Config.filterGainRange - 1) * (1 - (y - .5) / (this._editorHeight - 1));
    }
    _gainToY(gain) {
        return (this._editorHeight - 1) * (1 - gain / (Config.filterGainRange - 1)) + .5;
    }
    _whenCursorPressed() {
        this._mouseDown = true;
        const sequence = new ChangeSequence();
        this._dragChange = sequence;
        this._doc.setProspectiveChange(this._dragChange);
        this._updateCursor();
        this._whenCursorMoved();
    }
    _updateCursor() {
        this._freqStart = this._xToFreq(this._mouseX);
        this._gainStart = this._yToGain(this._mouseY);
        this._addingPoint = true;
        this._selectedIndex = -1;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let i = 0; i < this._filterSettings.controlPointCount; i++) {
            const point = this._filterSettings.controlPoints[i];
            const distance = Math.sqrt(Math.pow(this._freqToX(point.freq) - this._mouseX, 2) + Math.pow(this._gainToY(point.gain) - this._mouseY, 2));
            if ((distance <= 13 || this._filterSettings.controlPointCount >= Config.filterMaxPoints) && distance < nearestDistance) {
                nearestDistance = distance;
                this._selectedIndex = i;
                this._addingPoint = false;
            }
        }
        if (this._addingPoint) {
            const ratio = this._mouseX / this._editorWidth;
            if (ratio < 0.2) {
                this._addedType = 1;
            }
            else if (ratio < 0.8) {
                this._addedType = 2;
            }
            else {
                this._addedType = 0;
            }
        }
    }
    _whenCursorMoved() {
        if (this._dragChange != null && this._doc.lastChangeWas(this._dragChange)) {
            this._dragChange.undo();
        }
        else {
            this._mouseDown = false;
        }
        this._dragChange = null;
        this._deletingPoint = false;
        if (this._mouseDown) {
            const sequence = new ChangeSequence();
            this._dragChange = sequence;
            this._doc.setProspectiveChange(this._dragChange);
            if (this._addingPoint) {
                const gain = Math.max(0, Math.min(Config.filterGainRange - 1, Math.round(this._yToGain(this._mouseY))));
                const freq = this._findNearestFreqSlot(this._filterSettings, this._xToFreq(this._mouseX), -1);
                if (freq >= 0 && freq < Config.filterFreqRange) {
                    const point = new FilterControlPoint();
                    point.type = this._addedType;
                    point.freq = freq;
                    point.gain = gain;
                    sequence.append(new ChangeFilterAddPoint(this._doc, this._filterSettings, point, this._filterSettings.controlPointCount, this._useNoteFilter));
                }
                else {
                    this._deletingPoint = true;
                }
            }
            else if (this._selectedIndex >= this._filterSettings.controlPointCount || this._selectedIndex == -1) {
                this._dragChange = null;
                this._mouseDown = false;
            }
            else {
                const freqDelta = this._xToFreq(this._mouseX) - this._freqStart;
                const gainDelta = this._yToGain(this._mouseY) - this._gainStart;
                const point = this._filterSettings.controlPoints[this._selectedIndex];
                const gain = Math.max(0, Math.min(Config.filterGainRange - 1, Math.round(point.gain + gainDelta)));
                const freq = this._findNearestFreqSlot(this._filterSettings, point.freq + freqDelta, this._selectedIndex);
                if (Math.round(freqDelta) != 0.0 || Math.round(gainDelta) != 0.0 || freq != point.freq || gain != point.gain) {
                    this._mouseDragging = true;
                }
                if (freq >= 0 && freq < Config.filterFreqRange) {
                    sequence.append(new ChangeFilterMovePoint(this._doc, point, point.freq, freq, point.gain, gain));
                }
                else {
                    sequence.append(new ChangeFilterAddPoint(this._doc, this._filterSettings, point, this._selectedIndex, this._useNoteFilter, true));
                    this._deletingPoint = true;
                }
            }
        }
        if (this._mouseDown || this._mouseOver) {
            this._updatePath();
        }
    }
    _findNearestFreqSlot(filterSettings, targetFreq, ignoreIndex) {
        const roundedFreq = Math.round(targetFreq);
        let lowerFreq = roundedFreq;
        let upperFreq = roundedFreq;
        let tryingLower = (roundedFreq <= targetFreq);
        while (true) {
            let foundConflict = false;
            const currentFreq = tryingLower ? lowerFreq : upperFreq;
            for (let i = 0; i < filterSettings.controlPointCount; i++) {
                if (i == ignoreIndex)
                    continue;
                if (filterSettings.controlPoints[i].freq == currentFreq) {
                    foundConflict = true;
                    break;
                }
            }
            if (!foundConflict)
                return currentFreq;
            tryingLower = !tryingLower;
            if (tryingLower)
                lowerFreq--;
            if (!tryingLower)
                upperFreq++;
        }
    }
    static _circlePath(cx, cy, radius, reverse = false) {
        return `M ${cx - radius} ${cy} ` +
            `a ${radius} ${radius} 0 1 ${reverse ? 1 : 0} ${radius * 2} 0 ` +
            `a ${radius} ${radius} 0 1 ${reverse ? 1 : 0} ${-radius * 2} 0 `;
    }
    _updatePath() {
        this._highlight.style.display = "none";
        this._label.textContent = "";
        let controlPointPath = "";
        let dottedLinePath = "";
        for (let i = 0; i < this._filterSettings.controlPointCount; i++) {
            const point = this._filterSettings.controlPoints[i];
            const pointX = this._freqToX(point.freq);
            const pointY = this._gainToY(point.gain);
            controlPointPath += FilterEditor._circlePath(pointX, pointY, this._pointRadius);
            if (point.type == 1) {
                dottedLinePath += "M " + 0 + " " + pointY + " L " + pointX + " " + pointY + " ";
            }
            else if (point.type == 0) {
                dottedLinePath += "M " + this._editorWidth + " " + pointY + " L " + pointX + " " + pointY + " ";
            }
            if (this._selectedIndex == i && this._mouseOver && !this._mouseDown) {
                this._highlight.setAttribute("cx", String(pointX));
                this._highlight.setAttribute("cy", String(pointY));
                this._highlight.style.display = "";
            }
            if ((this._selectedIndex == i || (this._addingPoint && this._mouseDown && i == this._filterSettings.controlPointCount - 1)) && (this._mouseOver || this._mouseDown) && !this._deletingPoint) {
                this._label.textContent = (i + 1) + ": " + Config.filterTypeNames[point.type];
            }
        }
        this._controlPointPath.setAttribute("d", controlPointPath);
        this._dottedLinePath.setAttribute("d", dottedLinePath);
        if (this._addingPoint && !this._mouseDown && this._mouseOver) {
            this._label.textContent = "+ " + Config.filterTypeNames[this._addedType];
        }
        const standardSampleRate = 44800;
        const filters = [];
        for (let i = 0; i < this._filterSettings.controlPointCount; i++) {
            const point = this._filterSettings.controlPoints[i];
            const filter = new FilterCoefficients();
            point.toCoefficients(filter, standardSampleRate);
            filters.push(filter);
        }
        const response = new FrequencyResponse();
        let responsePath = "M 0 " + this._editorHeight + " ";
        for (let i = -1; i <= Config.filterFreqRange; i++) {
            const hz = FilterControlPoint.getHzFromSettingValue(i);
            const cornerRadiansPerSample = 2.0 * Math.PI * hz / standardSampleRate;
            const real = Math.cos(cornerRadiansPerSample);
            const imag = Math.sin(cornerRadiansPerSample);
            let linearGain = 1.0;
            for (const filter of filters) {
                response.analyzeComplex(filter, real, imag);
                linearGain *= response.magnitude();
            }
            const gainSetting = Math.log2(linearGain) / Config.filterGainStep + Config.filterGainCenter;
            const y = this._gainToY(gainSetting);
            const x = this._freqToX(i);
            responsePath += "L " + prettyNumber(x) + " " + prettyNumber(y) + " ";
        }
        responsePath += "L " + this._editorWidth + " " + this._editorHeight + " L 0 " + this._editorHeight + " z ";
        this._responsePath.setAttribute("d", responsePath);
    }
    render() {
        const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
        const filterSettings = this._useNoteFilter ? instrument.noteFilter : instrument.eqFilter;
        if (this._filterSettings != filterSettings) {
            this._dragChange = null;
            this._mouseDown = false;
        }
        this._filterSettings = filterSettings;
        if (!this._mouseDown)
            this._updateCursor();
        let pointTypes = 0;
        let pointFreqs = 0;
        let pointGains = 0;
        for (let i = 0; i < filterSettings.controlPointCount; i++) {
            const point = filterSettings.controlPoints[i];
            pointTypes = pointTypes * 3 + point.type;
            pointFreqs = pointFreqs * Config.filterFreqRange + point.freq;
            pointGains = pointGains * Config.filterGainRange + point.gain;
        }
        if (this._renderedSelectedIndex != this._selectedIndex ||
            this._renderedPointCount != filterSettings.controlPointCount ||
            this._renderedPointTypes != pointTypes ||
            this._renderedPointFreqs != pointFreqs ||
            this._renderedPointGains != pointGains) {
            this._renderedSelectedIndex = this._selectedIndex;
            this._renderedPointCount = filterSettings.controlPointCount;
            this._renderedPointTypes = pointTypes;
            this._renderedPointFreqs = pointFreqs;
            this._renderedPointGains = pointGains;
            this._updatePath();
        }
    }
}
//# sourceMappingURL=FilterEditor.js.map