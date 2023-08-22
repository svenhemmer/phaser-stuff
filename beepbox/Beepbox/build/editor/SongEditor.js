import { Config, getPulseWidthRatio, effectsIncludeTransition, effectsIncludeChord, effectsIncludePitchShift, effectsIncludeDetune, effectsIncludeVibrato, effectsIncludeNoteFilter, effectsIncludeDistortion, effectsIncludeBitcrusher, effectsIncludePanning, effectsIncludeChorus, effectsIncludeEcho, effectsIncludeReverb } from "../synth/SynthConfig";
import { EditorConfig, isMobile, prettyNumber } from "./EditorConfig";
import { ColorConfig } from "./ColorConfig";
import "./Layout";
import { Synth } from "../synth/synth";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { TipPrompt } from "./TipPrompt";
import { PatternEditor } from "./PatternEditor";
import { EnvelopeEditor } from "./EnvelopeEditor";
import { FadeInOutEditor } from "./FadeInOutEditor";
import { FilterEditor } from "./FilterEditor";
import { MuteEditor } from "./MuteEditor";
import { TrackEditor } from "./TrackEditor";
import { ChannelRow } from "./ChannelRow";
import { LayoutPrompt } from "./LayoutPrompt";
import { LoopEditor } from "./LoopEditor";
import { SpectrumEditor } from "./SpectrumEditor";
import { HarmonicsEditor } from "./HarmonicsEditor";
import { BarScrollBar } from "./BarScrollBar";
import { OctaveScrollBar } from "./OctaveScrollBar";
import { MidiInputHandler } from "./MidiInput";
import { KeyboardLayout } from "./KeyboardLayout";
import { Piano } from "./Piano";
import { BeatsPerBarPrompt } from "./BeatsPerBarPrompt";
import { MoveNotesSidewaysPrompt } from "./MoveNotesSidewaysPrompt";
import { SongDurationPrompt } from "./SongDurationPrompt";
import { SustainPrompt } from "./SustainPrompt";
import { ChannelSettingsPrompt } from "./ChannelSettingsPrompt";
import { ExportPrompt } from "./ExportPrompt";
import { ImportPrompt } from "./ImportPrompt";
import { SongRecoveryPrompt } from "./SongRecoveryPrompt";
import { RecordingSetupPrompt } from "./RecordingSetupPrompt";
import { ChangeTempo, ChangeChorus, ChangeEchoDelay, ChangeEchoSustain, ChangeReverb, ChangeVolume, ChangePan, ChangePatternSelection, ChangeSupersawDynamism, ChangeSupersawSpread, ChangeSupersawShape, ChangePulseWidth, ChangeFeedbackAmplitude, ChangeOperatorAmplitude, ChangeOperatorFrequency, ChangeDrumsetEnvelope, ChangePasteInstrument, ChangePreset, pickRandomPresetValue, ChangeRandomGeneratedInstrument, ChangeScale, ChangeDetectKey, ChangeKey, ChangeRhythm, ChangeFeedbackType, ChangeAlgorithm, ChangeCustomizeInstrument, ChangeChipWave, ChangeNoiseWave, ChangeTransition, ChangeToggleEffects, ChangeVibrato, ChangeUnison, ChangeChord, ChangeSong, ChangePitchShift, ChangeDetune, ChangeDistortion, ChangeStringSustain, ChangeBitcrusherFreq, ChangeBitcrusherQuantization, ChangeAddEnvelope, ChangeAddChannelInstrument, ChangeRemoveChannelInstrument } from "./changes";
const { a, button, div, input, select, span, optgroup, option } = HTML;
function buildOptions(menu, items) {
    for (let index = 0; index < items.length; index++) {
        menu.appendChild(option({ value: index }, items[index]));
    }
    return menu;
}
function buildPresetOptions(isNoise) {
    const menu = select();
    menu.appendChild(optgroup({ label: "Edit" }, option({ value: "copyInstrument" }, "Copy Instrument (⇧C)"), option({ value: "pasteInstrument" }, "Paste Instrument (⇧V)"), option({ value: "randomPreset" }, "Random Preset (R)"), option({ value: "randomGenerated" }, "Random Generated (⇧R)")));
    const customTypeGroup = optgroup({ label: EditorConfig.presetCategories[0].name });
    if (isNoise) {
        customTypeGroup.appendChild(option({ value: 2 }, EditorConfig.valueToPreset(2).name));
        customTypeGroup.appendChild(option({ value: 3 }, EditorConfig.valueToPreset(3).name));
        customTypeGroup.appendChild(option({ value: 4 }, EditorConfig.valueToPreset(4).name));
    }
    else {
        customTypeGroup.appendChild(option({ value: 0 }, EditorConfig.valueToPreset(0).name));
        customTypeGroup.appendChild(option({ value: 6 }, EditorConfig.valueToPreset(6).name));
        customTypeGroup.appendChild(option({ value: 8 }, EditorConfig.valueToPreset(8).name));
        customTypeGroup.appendChild(option({ value: 5 }, EditorConfig.valueToPreset(5).name));
        customTypeGroup.appendChild(option({ value: 7 }, EditorConfig.valueToPreset(7).name));
        customTypeGroup.appendChild(option({ value: 3 }, EditorConfig.valueToPreset(3).name));
        customTypeGroup.appendChild(option({ value: 1 }, EditorConfig.valueToPreset(1).name));
    }
    menu.appendChild(customTypeGroup);
    for (let categoryIndex = 1; categoryIndex < EditorConfig.presetCategories.length; categoryIndex++) {
        const category = EditorConfig.presetCategories[categoryIndex];
        const group = optgroup({ label: category.name });
        let foundAny = false;
        for (let presetIndex = 0; presetIndex < category.presets.length; presetIndex++) {
            const preset = category.presets[presetIndex];
            if ((preset.isNoise == true) == isNoise) {
                group.appendChild(option({ value: (categoryIndex << 6) + presetIndex }, preset.name));
                foundAny = true;
            }
        }
        if (foundAny)
            menu.appendChild(group);
    }
    return menu;
}
function setSelectedValue(menu, value) {
    const stringValue = value.toString();
    if (menu.value != stringValue)
        menu.value = stringValue;
}
class Slider {
    constructor(input, _doc, _getChange) {
        this.input = input;
        this._doc = _doc;
        this._getChange = _getChange;
        this._change = null;
        this._value = 0;
        this._oldValue = 0;
        this._whenInput = () => {
            const continuingProspectiveChange = this._doc.lastChangeWas(this._change);
            if (!continuingProspectiveChange)
                this._oldValue = this._value;
            this._change = this._getChange(this._oldValue, parseInt(this.input.value));
            this._doc.setProspectiveChange(this._change);
        };
        this._whenChange = () => {
            this._doc.record(this._change);
            this._change = null;
        };
        input.addEventListener("input", this._whenInput);
        input.addEventListener("change", this._whenChange);
    }
    updateValue(value) {
        this._value = value;
        this.input.value = String(value);
    }
}
export class SongEditor {
    constructor(_doc) {
        this._doc = _doc;
        this.prompt = null;
        this._keyboardLayout = new KeyboardLayout(this._doc);
        this._patternEditorPrev = new PatternEditor(this._doc, false, -1);
        this._patternEditor = new PatternEditor(this._doc, true, 0);
        this._patternEditorNext = new PatternEditor(this._doc, false, 1);
        this._muteEditor = new MuteEditor(this._doc);
        this._trackEditor = new TrackEditor(this._doc);
        this._loopEditor = new LoopEditor(this._doc);
        this._octaveScrollBar = new OctaveScrollBar(this._doc);
        this._piano = new Piano(this._doc);
        this._playButton = button({ class: "playButton", type: "button", title: "Play (Space)" }, span("Play"));
        this._pauseButton = button({ class: "pauseButton", style: "display: none;", type: "button", title: "Pause (Space)" }, "Pause");
        this._recordButton = button({ class: "recordButton", style: "display: none;", type: "button", title: "Record (Ctrl+Space)" }, span("Record"));
        this._stopButton = button({ class: "stopButton", style: "display: none;", type: "button", title: "Stop Recording (Space)" }, "Stop Recording");
        this._prevBarButton = button({ class: "prevBarButton", type: "button", title: "Previous Bar (left bracket)" });
        this._nextBarButton = button({ class: "nextBarButton", type: "button", title: "Next Bar (right bracket)" });
        this._volumeSlider = input({ title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "75", value: "50", step: "1" });
        this._fileMenu = select({ style: "width: 100%;" }, option({ selected: true, disabled: true, hidden: false }, "File"), option({ value: "new" }, "+ New Blank Song"), option({ value: "import" }, "↑ Import Song... (" + EditorConfig.ctrlSymbol + "O)"), option({ value: "export" }, "↓ Export Song... (" + EditorConfig.ctrlSymbol + "S)"), option({ value: "copyUrl" }, "⎘ Copy Song URL"), option({ value: "shareUrl" }, "⤳ Share Song URL"), option({ value: "shortenUrl" }, "… Shorten Song URL"), option({ value: "viewPlayer" }, "▶ View in Song Player"), option({ value: "copyEmbed" }, "⎘ Copy HTML Embed Code"), option({ value: "songRecovery" }, "⚠ Recover Recent Song..."));
        this._editMenu = select({ style: "width: 100%;" }, option({ selected: true, disabled: true, hidden: false }, "Edit"), option({ value: "undo" }, "Undo (Z)"), option({ value: "redo" }, "Redo (Y)"), option({ value: "copy" }, "Copy Pattern (C)"), option({ value: "pasteNotes" }, "Paste Pattern Notes (V)"), option({ value: "pasteNumbers" }, "Paste Pattern Numbers (" + EditorConfig.ctrlSymbol + "⇧V)"), option({ value: "insertBars" }, "Insert Bar (⏎)"), option({ value: "deleteBars" }, "Delete Selected Bars (⌫)"), option({ value: "insertChannel" }, "Insert Channel (" + EditorConfig.ctrlSymbol + "⏎)"), option({ value: "deleteChannel" }, "Delete Selected Channels (" + EditorConfig.ctrlSymbol + "⌫)"), option({ value: "selectAll" }, "Select All (A)"), option({ value: "selectChannel" }, "Select Channel (⇧A)"), option({ value: "duplicatePatterns" }, "Duplicate Reused Patterns (D)"), option({ value: "transposeUp" }, "Move Notes Up (+ or ⇧+)"), option({ value: "transposeDown" }, "Move Notes Down (- or ⇧-)"), option({ value: "moveNotesSideways" }, "Move All Notes Sideways..."), option({ value: "beatsPerBar" }, "Change Beats Per Bar..."), option({ value: "barCount" }, "Change Song Length..."), option({ value: "channelSettings" }, "Channel Settings... (Q)"));
        this._optionsMenu = select({ style: "width: 100%;" }, option({ selected: true, disabled: true, hidden: false }, "Preferences"), option({ value: "autoPlay" }, "Auto Play on Load"), option({ value: "autoFollow" }, "Show And Play The Same Bar"), option({ value: "enableNotePreview" }, "Hear Preview of Added Notes"), option({ value: "showLetters" }, "Show Piano Keys"), option({ value: "showFifth" }, 'Highlight "Fifth" of Song Key'), option({ value: "notesOutsideScale" }, "Allow Adding Notes Not in Scale"), option({ value: "setDefaultScale" }, "Use Current Scale as Default"), option({ value: "showChannels" }, "Show Notes From All Channels"), option({ value: "showScrollBar" }, "Show Octave Scroll Bar"), option({ value: "alwaysShowSettings" }, "Customize All Instruments"), option({ value: "instrumentCopyPaste" }, "Instrument Copy/Paste Buttons"), option({ value: "enableChannelMuting" }, "Enable Channel Muting"), option({ value: "displayBrowserUrl" }, "Display Song Data in URL"), option({ value: "layout" }, "Choose Layout..."), option({ value: "colorTheme" }, "Light Theme"), option({ value: "recordingSetup" }, "Set Up Note Recording..."));
        this._scaleSelect = buildOptions(select(), Config.scales.map(scale => scale.name));
        this._keySelect = buildOptions(select(), Config.keys.map(key => key.name).reverse());
        this._tempoSlider = new Slider(input({ style: "margin: 0; width: 4em; flex-grow: 1; vertical-align: middle;", type: "range", min: "0", max: "14", value: "7", step: "1" }), this._doc, (oldValue, newValue) => new ChangeTempo(this._doc, oldValue, Math.round(120.0 * Math.pow(2.0, (-4.0 + newValue) / 9.0))));
        this._tempoStepper = input({ style: "width: 3em; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1" });
        this._chorusSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.chorusRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeChorus(this._doc, oldValue, newValue));
        this._chorusRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chorus") }, "Chorus:"), this._chorusSlider.input);
        this._reverbSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.reverbRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeReverb(this._doc, oldValue, newValue));
        this._reverbRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("reverb") }, "Reverb:"), this._reverbSlider.input);
        this._echoSustainSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoSustainRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeEchoSustain(this._doc, oldValue, newValue));
        this._echoSustainRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("echoSustain") }, "Echo:"), this._echoSustainSlider.input);
        this._echoDelaySlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.echoDelayRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeEchoDelay(this._doc, oldValue, newValue));
        this._echoDelayRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("echoDelay") }, "Echo Delay:"), this._echoDelaySlider.input);
        this._rhythmSelect = buildOptions(select(), Config.rhythms.map(rhythm => rhythm.name));
        this._pitchedPresetSelect = buildPresetOptions(false);
        this._drumPresetSelect = buildPresetOptions(true);
        this._algorithmSelect = buildOptions(select(), Config.algorithms.map(algorithm => algorithm.name));
        this._algorithmSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("algorithm") }, "Algorithm:"), div({ class: "selectContainer" }, this._algorithmSelect));
        this._instrumentButtons = [];
        this._instrumentAddButton = button({ type: "button", class: "add-instrument last-button" });
        this._instrumentRemoveButton = button({ type: "button", class: "remove-instrument" });
        this._instrumentsButtonBar = div({ class: "instrument-bar" }, this._instrumentRemoveButton, this._instrumentAddButton);
        this._instrumentsButtonRow = div({ class: "selectRow", style: "display: none;" }, span({ class: "tip", onclick: () => this._openPrompt("instrumentIndex") }, "Instrument:"), this._instrumentsButtonBar);
        this._instrumentCopyButton = button({ type: "button", class: "copy-instrument", title: "Copy Instrument (⇧C)" }, "Copy");
        this._instrumentPasteButton = button({ type: "button", class: "paste-instrument", title: "Paste Instrument (⇧V)" }, "Paste");
        this._instrumentCopyPasteRow = div({ class: "instrumentCopyPasteRow", style: "display: none;" }, this._instrumentCopyButton, this._instrumentPasteButton);
        this._instrumentVolumeSlider = new Slider(input({ style: "margin: 0;", type: "range", min: -(Config.volumeRange - 1), max: "0", value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeVolume(this._doc, oldValue, -newValue));
        this._instrumentVolumeSliderRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("instrumentVolume") }, "Volume:"), this._instrumentVolumeSlider.input);
        this._panSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.panMax, value: Config.panCenter, step: "1" }), this._doc, (oldValue, newValue) => new ChangePan(this._doc, oldValue, newValue));
        this._panSliderRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pan") }, "Panning:"), this._panSlider.input);
        this._chipWaveSelect = buildOptions(select(), Config.chipWaves.map(wave => wave.name));
        this._chipNoiseSelect = buildOptions(select(), Config.chipNoises.map(wave => wave.name));
        this._chipWaveSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipWave") }, "Wave:"), div({ class: "selectContainer" }, this._chipWaveSelect));
        this._chipNoiseSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chipNoise") }, "Noise:"), div({ class: "selectContainer" }, this._chipNoiseSelect));
        this._fadeInOutEditor = new FadeInOutEditor(this._doc);
        this._fadeInOutRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("fadeInOut") }, "Fade In/Out:"), this._fadeInOutEditor.container);
        this._transitionSelect = buildOptions(select(), Config.transitions.map(transition => transition.name));
        this._transitionRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("transition") }, "Transition:"), div({ class: "selectContainer" }, this._transitionSelect));
        this._effectsSelect = select(option({ selected: true, disabled: true, hidden: false }));
        this._eqFilterEditor = new FilterEditor(this._doc);
        this._eqFilterRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("eqFilter") }, "EQ Filter:"), this._eqFilterEditor.container);
        this._noteFilterEditor = new FilterEditor(this._doc, true);
        this._noteFilterRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("noteFilter") }, "Note Filter:"), this._noteFilterEditor.container);
        this._supersawDynamismSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.supersawDynamismMax, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeSupersawDynamism(this._doc, oldValue, newValue));
        this._supersawDynamismRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("supersawDynamism") }, "Dynamism:"), this._supersawDynamismSlider.input);
        this._supersawSpreadSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.supersawSpreadMax, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeSupersawSpread(this._doc, oldValue, newValue));
        this._supersawSpreadRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("supersawSpread") }, "Spread:"), this._supersawSpreadSlider.input);
        this._supersawShapeSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.supersawShapeMax, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeSupersawShape(this._doc, oldValue, newValue));
        this._supersawShapeRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("supersawShape") }, "Saw↔Pulse:"), this._supersawShapeSlider.input);
        this._pulseWidthSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.pulseWidthRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangePulseWidth(this._doc, oldValue, newValue));
        this._pulseWidthRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pulseWidth") }, "Pulse Width:"), this._pulseWidthSlider.input);
        this._pitchShiftSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.pitchShiftRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangePitchShift(this._doc, oldValue, newValue));
        this._pitchShiftTonicMarkers = [div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "50%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.tonic, left: "100%" } })];
        this._pitchShiftFifthMarkers = [div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 7 / 24) + "%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig.fifthNote, left: (100 * 19 / 24) + "%" } })];
        this._pitchShiftMarkerContainer = div({ style: "display: flex; position: relative;" }, this._pitchShiftSlider.input, div({ class: "pitchShiftMarkerContainer" }, this._pitchShiftTonicMarkers, this._pitchShiftFifthMarkers));
        this._pitchShiftRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pitchShift") }, "Pitch Shift:"), this._pitchShiftMarkerContainer);
        this._detuneSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.detuneMax, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeDetune(this._doc, oldValue, newValue));
        this._detuneRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("detune") }, "Detune:"), this._detuneSlider.input);
        this._distortionSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.distortionRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeDistortion(this._doc, oldValue, newValue));
        this._distortionRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("distortion") }, "Distortion:"), this._distortionSlider.input);
        this._bitcrusherQuantizationSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherQuantizationRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeBitcrusherQuantization(this._doc, oldValue, newValue));
        this._bitcrusherQuantizationRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("bitcrusherQuantization") }, "Bit Crush:"), this._bitcrusherQuantizationSlider.input);
        this._bitcrusherFreqSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.bitcrusherFreqRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeBitcrusherFreq(this._doc, oldValue, newValue));
        this._bitcrusherFreqRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("bitcrusherFreq") }, "Freq Crush:"), this._bitcrusherFreqSlider.input);
        this._stringSustainSlider = new Slider(input({ style: "margin: 0;", type: "range", min: "0", max: Config.stringSustainRange - 1, value: "0", step: "1" }), this._doc, (oldValue, newValue) => new ChangeStringSustain(this._doc, oldValue, newValue));
        this._stringSustainLabel = span({ class: "tip", onclick: () => this._openPrompt("stringSustain") }, "Sustain:");
        this._stringSustainRow = div({ class: "selectRow" }, this._stringSustainLabel, this._stringSustainSlider.input);
        this._unisonSelect = buildOptions(select(), Config.unisons.map(unison => unison.name));
        this._unisonSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("unison") }, "Unison:"), div({ class: "selectContainer" }, this._unisonSelect));
        this._chordSelect = buildOptions(select(), Config.chords.map(chord => chord.name));
        this._chordSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("chords") }, "Chords:"), div({ class: "selectContainer" }, this._chordSelect));
        this._vibratoSelect = buildOptions(select(), Config.vibratos.map(vibrato => vibrato.name));
        this._vibratoSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("vibrato") }, "Vibrato:"), div({ class: "selectContainer" }, this._vibratoSelect));
        this._phaseModGroup = div({ class: "editor-controls" });
        this._feedbackTypeSelect = buildOptions(select(), Config.feedbacks.map(feedback => feedback.name));
        this._feedbackRow1 = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackType") }, "Feedback:"), div({ class: "selectContainer" }, this._feedbackTypeSelect));
        this._spectrumEditor = new SpectrumEditor(this._doc, null);
        this._spectrumRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("spectrum") }, "Spectrum:"), this._spectrumEditor.container);
        this._harmonicsEditor = new HarmonicsEditor(this._doc);
        this._harmonicsRow = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("harmonics") }, "Harmonics:"), this._harmonicsEditor.container);
        this._envelopeEditor = new EnvelopeEditor(this._doc);
        this._drumsetGroup = div({ class: "editor-controls" });
        this._feedbackAmplitudeSlider = new Slider(input({ type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude" }), this._doc, (oldValue, newValue) => new ChangeFeedbackAmplitude(this._doc, oldValue, newValue));
        this._feedbackRow2 = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("feedbackVolume") }, "Fdback Vol:"), this._feedbackAmplitudeSlider.input);
        this._customizeInstrumentButton = button({ type: "button", class: "customize-instrument" }, "Customize Instrument");
        this._addEnvelopeButton = button({ type: "button", class: "add-envelope" });
        this._customInstrumentSettingsGroup = div({ class: "editor-controls" }, this._eqFilterRow, this._fadeInOutRow, this._chipWaveSelectRow, this._chipNoiseSelectRow, this._algorithmSelectRow, this._phaseModGroup, this._feedbackRow1, this._feedbackRow2, this._spectrumRow, this._harmonicsRow, this._drumsetGroup, this._supersawDynamismRow, this._supersawSpreadRow, this._supersawShapeRow, this._pulseWidthRow, this._stringSustainRow, this._unisonSelectRow, div({ style: `margin: 2px 0; margin-left: 2em; display: flex; align-items: center;` }, span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("effects") }, "Effects")), div({ class: "effects-menu" }, this._effectsSelect)), this._transitionRow, this._chordSelectRow, this._pitchShiftRow, this._detuneRow, this._vibratoSelectRow, this._noteFilterRow, this._distortionRow, this._bitcrusherQuantizationRow, this._bitcrusherFreqRow, this._panSliderRow, this._chorusRow, this._echoSustainRow, this._echoDelayRow, this._reverbRow, div({ style: `margin: 2px 0; margin-left: 2em; display: flex; align-items: center;` }, span({ style: `flex-grow: 1; text-align: center;` }, span({ class: "tip", onclick: () => this._openPrompt("envelopes") }, "Envelopes")), this._addEnvelopeButton), this._envelopeEditor.container);
        this._instrumentSettingsGroup = div({ class: "editor-controls" }, div({ style: `margin: 3px 0; text-align: center; color: ${ColorConfig.secondaryText};` }, "Instrument Settings"), this._instrumentsButtonRow, this._instrumentCopyPasteRow, this._instrumentVolumeSliderRow, div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("instrumentType") }, "Type:"), div({ class: "selectContainer" }, this._pitchedPresetSelect, this._drumPresetSelect)), this._customizeInstrumentButton, this._customInstrumentSettingsGroup);
        this._promptContainer = div({ class: "promptContainer", style: "display: none;" });
        this._zoomInButton = button({ class: "zoomInButton", type: "button", title: "Zoom In" });
        this._zoomOutButton = button({ class: "zoomOutButton", type: "button", title: "Zoom Out" });
        this._patternEditorRow = div({ style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;" }, this._patternEditorPrev.container, this._patternEditor.container, this._patternEditorNext.container);
        this._patternArea = div({ class: "pattern-area" }, this._piano.container, this._patternEditorRow, this._octaveScrollBar.container, this._zoomInButton, this._zoomOutButton);
        this._trackContainer = div({ class: "trackContainer" }, this._trackEditor.container, this._loopEditor.container);
        this._trackVisibleArea = div({ style: "position: absolute; width: 100%; height: 100%; pointer-events: none;" });
        this._trackAndMuteContainer = div({ class: "trackAndMuteContainer" }, this._muteEditor.container, this._trackContainer, this._trackVisibleArea);
        this._barScrollBar = new BarScrollBar(this._doc);
        this._trackArea = div({ class: "track-area" }, this._trackAndMuteContainer, this._barScrollBar.container);
        this._menuArea = div({ class: "menu-area" }, div({ class: "selectContainer menu file" }, this._fileMenu), div({ class: "selectContainer menu edit" }, this._editMenu), div({ class: "selectContainer menu preferences" }, this._optionsMenu));
        this._songSettingsArea = div({ class: "song-settings-area" }, div({ class: "editor-controls" }, div({ style: `margin: 3px 0; text-align: center; color: ${ColorConfig.secondaryText};` }, "Song Settings"), div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("scale") }, "Scale:"), div({ class: "selectContainer" }, this._scaleSelect)), div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("key") }, "Key:"), div({ class: "selectContainer" }, this._keySelect)), div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("tempo") }, "Tempo:"), span({ style: "display: flex;" }, this._tempoSlider.input, this._tempoStepper)), div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("rhythm") }, "Rhythm:"), div({ class: "selectContainer" }, this._rhythmSelect))));
        this._instrumentSettingsArea = div({ class: "instrument-settings-area" }, this._instrumentSettingsGroup);
        this._settingsArea = div({ class: "settings-area noSelection" }, div({ class: "version-area" }, div({ style: `text-align: center; margin: 3px 0; color: ${ColorConfig.secondaryText};` }, EditorConfig.versionDisplayName, " ", a({ class: "tip", target: "_blank", href: EditorConfig.releaseNotesURL }, EditorConfig.version))), div({ class: "play-pause-area" }, div({ class: "playback-bar-controls" }, this._playButton, this._pauseButton, this._recordButton, this._stopButton, this._prevBarButton, this._nextBarButton), div({ class: "playback-volume-controls" }, span({ class: "volume-speaker" }), this._volumeSlider)), this._menuArea, this._songSettingsArea, this._instrumentSettingsArea);
        this.mainLayer = div({ class: "beepboxEditor", tabIndex: "0" }, this._patternArea, this._trackArea, this._settingsArea, this._promptContainer);
        this._wasPlaying = false;
        this._currentPromptName = null;
        this._highlightedInstrumentIndex = -1;
        this._renderedInstrumentCount = 0;
        this._renderedIsPlaying = false;
        this._renderedIsRecording = false;
        this._renderedShowRecordButton = false;
        this._renderedCtrlHeld = false;
        this._ctrlHeld = false;
        this._deactivatedInstruments = false;
        this._operatorRows = [];
        this._operatorAmplitudeSliders = [];
        this._operatorFrequencySelects = [];
        this._drumsetSpectrumEditors = [];
        this._drumsetEnvelopeSelects = [];
        this._refocusStage = () => {
            this.mainLayer.focus({ preventScroll: true });
        };
        this._onFocusIn = (event) => {
            if (this._doc.synth.recording && event.target != this.mainLayer && event.target != this._stopButton && event.target != this._volumeSlider) {
                this._refocusStage();
            }
        };
        this.whenUpdated = () => {
            const prefs = this._doc.prefs;
            this._muteEditor.container.style.display = prefs.enableChannelMuting ? "" : "none";
            const trackBounds = this._trackVisibleArea.getBoundingClientRect();
            this._doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left - (prefs.enableChannelMuting ? 32 : 0)) / this._doc.getBarWidth());
            this._doc.trackVisibleChannels = Math.floor((trackBounds.bottom - trackBounds.top - 30) / ChannelRow.patternHeight);
            this._barScrollBar.render();
            this._muteEditor.render();
            this._trackEditor.render();
            this._trackAndMuteContainer.scrollLeft = this._doc.barScrollPos * this._doc.getBarWidth();
            this._trackAndMuteContainer.scrollTop = this._doc.channelScrollPos * ChannelRow.patternHeight;
            this._piano.container.style.display = prefs.showLetters ? "" : "none";
            this._octaveScrollBar.container.style.display = prefs.showScrollBar ? "" : "none";
            this._barScrollBar.container.style.display = this._doc.song.barCount > this._doc.trackVisibleBars ? "" : "none";
            if (this._doc.getFullScreen()) {
                const semitoneHeight = this._patternEditorRow.clientHeight / this._doc.getVisiblePitchCount();
                const targetBeatWidth = semitoneHeight * 5;
                const minBeatWidth = this._patternEditorRow.clientWidth / (this._doc.song.beatsPerBar * 3);
                const maxBeatWidth = this._patternEditorRow.clientWidth / (this._doc.song.beatsPerBar + 2);
                const beatWidth = Math.max(minBeatWidth, Math.min(maxBeatWidth, targetBeatWidth));
                const patternEditorWidth = beatWidth * this._doc.song.beatsPerBar;
                this._patternEditorPrev.container.style.width = patternEditorWidth + "px";
                this._patternEditor.container.style.width = patternEditorWidth + "px";
                this._patternEditorNext.container.style.width = patternEditorWidth + "px";
                this._patternEditorPrev.container.style.flexShrink = "0";
                this._patternEditor.container.style.flexShrink = "0";
                this._patternEditorNext.container.style.flexShrink = "0";
                this._patternEditorPrev.container.style.display = "";
                this._patternEditorNext.container.style.display = "";
                this._patternEditorPrev.render();
                this._patternEditorNext.render();
                this._zoomInButton.style.display = "";
                this._zoomOutButton.style.display = "";
                this._zoomInButton.style.right = prefs.showScrollBar ? "24px" : "4px";
                this._zoomOutButton.style.right = prefs.showScrollBar ? "24px" : "4px";
            }
            else {
                this._patternEditor.container.style.width = "";
                this._patternEditor.container.style.flexShrink = "";
                this._patternEditorPrev.container.style.display = "none";
                this._patternEditorNext.container.style.display = "none";
                this._zoomInButton.style.display = "none";
                this._zoomOutButton.style.display = "none";
            }
            this._patternEditor.render();
            const optionCommands = [
                (prefs.autoPlay ? "✓ " : "　") + "Auto Play on Load",
                (prefs.autoFollow ? "✓ " : "　") + "Show And Play The Same Bar",
                (prefs.enableNotePreview ? "✓ " : "　") + "Hear Preview of Added Notes",
                (prefs.showLetters ? "✓ " : "　") + "Show Piano Keys",
                (prefs.showFifth ? "✓ " : "　") + 'Highlight "Fifth" of Song Key',
                (prefs.notesOutsideScale ? "✓ " : "　") + "Allow Adding Notes Not in Scale",
                (prefs.defaultScale == this._doc.song.scale ? "✓ " : "　") + "Use Current Scale as Default",
                (prefs.showChannels ? "✓ " : "　") + "Show Notes From All Channels",
                (prefs.showScrollBar ? "✓ " : "　") + "Show Octave Scroll Bar",
                (prefs.alwaysShowSettings ? "✓ " : "　") + "Customize All Instruments",
                (prefs.instrumentCopyPaste ? "✓ " : "　") + "Instrument Copy/Paste Buttons",
                (prefs.enableChannelMuting ? "✓ " : "　") + "Enable Channel Muting",
                (prefs.displayBrowserUrl ? "✓ " : "　") + "Display Song Data in URL",
                "　Choose Layout...",
                (prefs.colorTheme == "light classic" ? "✓ " : "　") + "Light Theme",
                "　Set Up Note Recording...",
            ];
            for (let i = 0; i < optionCommands.length; i++) {
                const option = this._optionsMenu.children[i + 1];
                if (option.textContent != optionCommands[i])
                    option.textContent = optionCommands[i];
            }
            const channel = this._doc.song.channels[this._doc.channel];
            const instrumentIndex = this._doc.getCurrentInstrument();
            const instrument = channel.instruments[instrumentIndex];
            const wasActive = this.mainLayer.contains(document.activeElement);
            const activeElement = document.activeElement;
            const colors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);
            for (let i = this._effectsSelect.childElementCount - 1; i < Config.effectOrder.length; i++) {
                this._effectsSelect.appendChild(option({ value: i }));
            }
            this._effectsSelect.selectedIndex = 0;
            for (let i = 0; i < Config.effectOrder.length; i++) {
                let effectFlag = Config.effectOrder[i];
                const selected = ((instrument.effects & (1 << effectFlag)) != 0);
                const label = (selected ? "✓ " : "　") + Config.effectNames[effectFlag];
                const option = this._effectsSelect.children[i + 1];
                if (option.textContent != label)
                    option.textContent = label;
            }
            setSelectedValue(this._scaleSelect, this._doc.song.scale);
            this._scaleSelect.title = Config.scales[this._doc.song.scale].realName;
            setSelectedValue(this._keySelect, Config.keys.length - 1 - this._doc.song.key);
            this._tempoSlider.updateValue(Math.max(0, Math.min(28, Math.round(4.0 + 9.0 * Math.log2(this._doc.song.tempo / 120.0)))));
            this._tempoStepper.value = this._doc.song.tempo.toString();
            setSelectedValue(this._rhythmSelect, this._doc.song.rhythm);
            if (this._doc.song.getChannelIsNoise(this._doc.channel)) {
                this._pitchedPresetSelect.style.display = "none";
                this._drumPresetSelect.style.display = "";
                setSelectedValue(this._drumPresetSelect, instrument.preset);
            }
            else {
                this._pitchedPresetSelect.style.display = "";
                this._drumPresetSelect.style.display = "none";
                setSelectedValue(this._pitchedPresetSelect, instrument.preset);
            }
            if (prefs.instrumentCopyPaste) {
                this._instrumentCopyPasteRow.style.display = "";
            }
            else {
                this._instrumentCopyPasteRow.style.display = "none";
            }
            if (!prefs.alwaysShowSettings && instrument.preset != instrument.type) {
                this._customizeInstrumentButton.style.display = "";
                this._customInstrumentSettingsGroup.style.display = "none";
            }
            else {
                this._customizeInstrumentButton.style.display = "none";
                this._customInstrumentSettingsGroup.style.display = "";
                if (instrument.type == 2) {
                    this._chipNoiseSelectRow.style.display = "";
                    setSelectedValue(this._chipNoiseSelect, instrument.chipNoise);
                }
                else {
                    this._chipNoiseSelectRow.style.display = "none";
                }
                if (instrument.type == 3) {
                    this._spectrumRow.style.display = "";
                    this._spectrumEditor.render();
                }
                else {
                    this._spectrumRow.style.display = "none";
                }
                if (instrument.type == 5 || instrument.type == 7) {
                    this._harmonicsRow.style.display = "";
                    this._harmonicsEditor.render();
                }
                else {
                    this._harmonicsRow.style.display = "none";
                }
                if (instrument.type == 7) {
                    this._stringSustainRow.style.display = "";
                    this._stringSustainSlider.updateValue(instrument.stringSustain);
                    this._stringSustainLabel.textContent = Config.enableAcousticSustain ? "Sustain (" + Config.sustainTypeNames[instrument.stringSustainType].substring(0, 1).toUpperCase() + "):" : "Sustain:";
                }
                else {
                    this._stringSustainRow.style.display = "none";
                }
                if (instrument.type == 4) {
                    this._drumsetGroup.style.display = "";
                    this._fadeInOutRow.style.display = "none";
                    for (let i = 0; i < Config.drumCount; i++) {
                        setSelectedValue(this._drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
                        this._drumsetSpectrumEditors[i].render();
                    }
                }
                else {
                    this._drumsetGroup.style.display = "none";
                    this._fadeInOutRow.style.display = "";
                    this._fadeInOutEditor.render();
                }
                if (instrument.type == 0) {
                    this._chipWaveSelectRow.style.display = "";
                    setSelectedValue(this._chipWaveSelect, instrument.chipWave);
                }
                else {
                    this._chipWaveSelectRow.style.display = "none";
                }
                if (instrument.type == 1) {
                    this._algorithmSelectRow.style.display = "";
                    this._phaseModGroup.style.display = "";
                    this._feedbackRow1.style.display = "";
                    this._feedbackRow2.style.display = "";
                    setSelectedValue(this._algorithmSelect, instrument.algorithm);
                    setSelectedValue(this._feedbackTypeSelect, instrument.feedbackType);
                    this._feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
                    for (let i = 0; i < Config.operatorCount; i++) {
                        const isCarrier = (i < Config.algorithms[instrument.algorithm].carrierCount);
                        this._operatorRows[i].style.color = isCarrier ? ColorConfig.primaryText : "";
                        setSelectedValue(this._operatorFrequencySelects[i], instrument.operators[i].frequency);
                        this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
                        const operatorName = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
                        this._operatorFrequencySelects[i].title = operatorName + " Frequency";
                        this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
                    }
                }
                else {
                    this._algorithmSelectRow.style.display = "none";
                    this._phaseModGroup.style.display = "none";
                    this._feedbackRow1.style.display = "none";
                    this._feedbackRow2.style.display = "none";
                }
                if (instrument.type == 8) {
                    this._supersawDynamismRow.style.display = "";
                    this._supersawSpreadRow.style.display = "";
                    this._supersawShapeRow.style.display = "";
                    this._supersawDynamismSlider.updateValue(instrument.supersawDynamism);
                    this._supersawSpreadSlider.updateValue(instrument.supersawSpread);
                    this._supersawShapeSlider.updateValue(instrument.supersawShape);
                }
                else {
                    this._supersawDynamismRow.style.display = "none";
                    this._supersawSpreadRow.style.display = "none";
                    this._supersawShapeRow.style.display = "none";
                }
                if (instrument.type == 6 || instrument.type == 8) {
                    this._pulseWidthRow.style.display = "";
                    this._pulseWidthSlider.input.title = prettyNumber(getPulseWidthRatio(instrument.pulseWidth) * 100) + "%";
                    this._pulseWidthSlider.updateValue(instrument.pulseWidth);
                }
                else {
                    this._pulseWidthRow.style.display = "none";
                }
                if (effectsIncludeTransition(instrument.effects)) {
                    this._transitionRow.style.display = "";
                    setSelectedValue(this._transitionSelect, instrument.transition);
                }
                else {
                    this._transitionRow.style.display = "none";
                }
                if (effectsIncludeChord(instrument.effects)) {
                    this._chordSelectRow.style.display = "";
                    setSelectedValue(this._chordSelect, instrument.chord);
                }
                else {
                    this._chordSelectRow.style.display = "none";
                }
                if (effectsIncludePitchShift(instrument.effects)) {
                    this._pitchShiftRow.style.display = "";
                    this._pitchShiftSlider.updateValue(instrument.pitchShift);
                    this._pitchShiftSlider.input.title = (instrument.pitchShift - Config.pitchShiftCenter) + " semitone(s)";
                    for (const marker of this._pitchShiftFifthMarkers) {
                        marker.style.display = prefs.showFifth ? "" : "none";
                    }
                }
                else {
                    this._pitchShiftRow.style.display = "none";
                }
                if (effectsIncludeDetune(instrument.effects)) {
                    this._detuneRow.style.display = "";
                    this._detuneSlider.updateValue(instrument.detune);
                    this._detuneSlider.input.title = (Synth.detuneToCents(instrument.detune - Config.detuneCenter)) + " cent(s)";
                }
                else {
                    this._detuneRow.style.display = "none";
                }
                if (effectsIncludeVibrato(instrument.effects)) {
                    this._vibratoSelectRow.style.display = "";
                    setSelectedValue(this._vibratoSelect, instrument.vibrato);
                }
                else {
                    this._vibratoSelectRow.style.display = "none";
                }
                if (effectsIncludeNoteFilter(instrument.effects)) {
                    this._noteFilterRow.style.display = "";
                    this._noteFilterEditor.render();
                }
                else {
                    this._noteFilterRow.style.display = "none";
                }
                if (effectsIncludeDistortion(instrument.effects)) {
                    this._distortionRow.style.display = "";
                    this._distortionSlider.updateValue(instrument.distortion);
                }
                else {
                    this._distortionRow.style.display = "none";
                }
                if (effectsIncludeBitcrusher(instrument.effects)) {
                    this._bitcrusherQuantizationRow.style.display = "";
                    this._bitcrusherFreqRow.style.display = "";
                    this._bitcrusherQuantizationSlider.updateValue(instrument.bitcrusherQuantization);
                    this._bitcrusherFreqSlider.updateValue(instrument.bitcrusherFreq);
                }
                else {
                    this._bitcrusherQuantizationRow.style.display = "none";
                    this._bitcrusherFreqRow.style.display = "none";
                }
                if (effectsIncludePanning(instrument.effects)) {
                    this._panSliderRow.style.display = "";
                    this._panSlider.updateValue(instrument.pan);
                }
                else {
                    this._panSliderRow.style.display = "none";
                }
                if (effectsIncludeChorus(instrument.effects)) {
                    this._chorusRow.style.display = "";
                    this._chorusSlider.updateValue(instrument.chorus);
                }
                else {
                    this._chorusRow.style.display = "none";
                }
                if (effectsIncludeEcho(instrument.effects)) {
                    this._echoSustainRow.style.display = "";
                    this._echoSustainSlider.updateValue(instrument.echoSustain);
                    this._echoDelayRow.style.display = "";
                    this._echoDelaySlider.updateValue(instrument.echoDelay);
                    this._echoDelaySlider.input.title = (Math.round((instrument.echoDelay + 1) * Config.echoDelayStepTicks / (Config.ticksPerPart * Config.partsPerBeat) * 1000) / 1000) + " beat(s)";
                }
                else {
                    this._echoSustainRow.style.display = "none";
                    this._echoDelayRow.style.display = "none";
                }
                if (effectsIncludeReverb(instrument.effects)) {
                    this._reverbRow.style.display = "";
                    this._reverbSlider.updateValue(instrument.reverb);
                }
                else {
                    this._reverbRow.style.display = "none";
                }
                if (instrument.type == 0 || instrument.type == 5 || instrument.type == 7) {
                    this._unisonSelectRow.style.display = "";
                    setSelectedValue(this._unisonSelect, instrument.unison);
                }
                else {
                    this._unisonSelectRow.style.display = "none";
                }
                this._envelopeEditor.render();
            }
            for (let chordIndex = 0; chordIndex < Config.chords.length; chordIndex++) {
                let hidden = (!Config.instrumentTypeHasSpecialInterval[instrument.type] && Config.chords[chordIndex].customInterval);
                const option = this._chordSelect.children[chordIndex];
                if (hidden) {
                    if (!option.hasAttribute("hidden")) {
                        option.setAttribute("hidden", "");
                    }
                }
                else {
                    option.removeAttribute("hidden");
                }
            }
            if (this._doc.song.layeredInstruments || this._doc.song.patternInstruments) {
                this._instrumentsButtonRow.style.display = "";
                this._instrumentsButtonBar.style.setProperty("--text-color-lit", colors.primaryNote);
                this._instrumentsButtonBar.style.setProperty("--text-color-dim", colors.secondaryNote);
                this._instrumentsButtonBar.style.setProperty("--background-color-lit", colors.primaryChannel);
                this._instrumentsButtonBar.style.setProperty("--background-color-dim", colors.secondaryChannel);
                const maxInstrumentsPerChannel = this._doc.song.getMaxInstrumentsPerChannel();
                while (this._instrumentButtons.length < channel.instruments.length) {
                    const instrumentButton = button(String(this._instrumentButtons.length + 1));
                    this._instrumentButtons.push(instrumentButton);
                    this._instrumentsButtonBar.insertBefore(instrumentButton, this._instrumentRemoveButton);
                }
                for (let i = this._renderedInstrumentCount; i < channel.instruments.length; i++) {
                    this._instrumentButtons[i].style.display = "";
                }
                for (let i = channel.instruments.length; i < this._renderedInstrumentCount; i++) {
                    this._instrumentButtons[i].style.display = "none";
                }
                this._renderedInstrumentCount = channel.instruments.length;
                while (this._instrumentButtons.length > maxInstrumentsPerChannel) {
                    this._instrumentsButtonBar.removeChild(this._instrumentButtons.pop());
                }
                this._instrumentRemoveButton.style.display = (channel.instruments.length > Config.instrumentCountMin) ? "" : "none";
                this._instrumentAddButton.style.display = (channel.instruments.length < maxInstrumentsPerChannel) ? "" : "none";
                if (channel.instruments.length < maxInstrumentsPerChannel) {
                    this._instrumentRemoveButton.classList.remove("last-button");
                }
                else {
                    this._instrumentRemoveButton.classList.add("last-button");
                }
                if (channel.instruments.length > 1) {
                    if (this._highlightedInstrumentIndex != instrumentIndex) {
                        const oldButton = this._instrumentButtons[this._highlightedInstrumentIndex];
                        if (oldButton != null)
                            oldButton.classList.remove("selected-instrument");
                        const newButton = this._instrumentButtons[instrumentIndex];
                        newButton.classList.add("selected-instrument");
                        this._highlightedInstrumentIndex = instrumentIndex;
                    }
                }
                else {
                    const oldButton = this._instrumentButtons[this._highlightedInstrumentIndex];
                    if (oldButton != null)
                        oldButton.classList.remove("selected-instrument");
                    this._highlightedInstrumentIndex = -1;
                }
                if (this._doc.song.layeredInstruments && this._doc.song.patternInstruments) {
                    for (let i = 0; i < channel.instruments.length; i++) {
                        if (this._doc.recentPatternInstruments[this._doc.channel].indexOf(i) != -1) {
                            this._instrumentButtons[i].classList.remove("deactivated");
                        }
                        else {
                            this._instrumentButtons[i].classList.add("deactivated");
                        }
                    }
                    this._deactivatedInstruments = true;
                }
                else if (this._deactivatedInstruments) {
                    for (let i = 0; i < channel.instruments.length; i++) {
                        this._instrumentButtons[i].classList.remove("deactivated");
                    }
                    this._deactivatedInstruments = false;
                }
            }
            else {
                this._instrumentsButtonRow.style.display = "none";
            }
            this._instrumentSettingsGroup.style.color = colors.primaryNote;
            this._eqFilterEditor.render();
            this._instrumentVolumeSlider.updateValue(-instrument.volume);
            this._addEnvelopeButton.disabled = (instrument.envelopeCount >= Config.maxEnvelopeCount);
            this._volumeSlider.value = String(prefs.volume);
            if (wasActive && activeElement != null && activeElement.clientWidth == 0) {
                this._refocusStage();
            }
            this._setPrompt(this._doc.prompt);
            if (prefs.autoFollow && !this._doc.synth.playing) {
                this._doc.synth.goToBar(this._doc.bar);
            }
            if (this._doc.addedEffect) {
                const envButtonRect = this._addEnvelopeButton.getBoundingClientRect();
                const instSettingsRect = this._instrumentSettingsArea.getBoundingClientRect();
                const settingsRect = this._settingsArea.getBoundingClientRect();
                this._instrumentSettingsArea.scrollTop += Math.max(0, envButtonRect.top - (instSettingsRect.top + instSettingsRect.height));
                this._settingsArea.scrollTop += Math.max(0, envButtonRect.top - (settingsRect.top + settingsRect.height));
                this._doc.addedEffect = false;
            }
            if (this._doc.addedEnvelope) {
                this._instrumentSettingsArea.scrollTop = this._instrumentSettingsArea.scrollHeight;
                this._settingsArea.scrollTop = this._settingsArea.scrollHeight;
                this._doc.addedEnvelope = false;
            }
        };
        this.updatePlayButton = () => {
            if (this._renderedIsPlaying != this._doc.synth.playing || this._renderedIsRecording != this._doc.synth.recording || this._renderedShowRecordButton != this._doc.prefs.showRecordButton || this._renderedCtrlHeld != this._ctrlHeld) {
                this._renderedIsPlaying = this._doc.synth.playing;
                this._renderedIsRecording = this._doc.synth.recording;
                this._renderedShowRecordButton = this._doc.prefs.showRecordButton;
                this._renderedCtrlHeld = this._ctrlHeld;
                if (document.activeElement == this._playButton || document.activeElement == this._pauseButton || document.activeElement == this._recordButton || document.activeElement == this._stopButton) {
                    this._refocusStage();
                }
                this._playButton.style.display = "none";
                this._pauseButton.style.display = "none";
                this._recordButton.style.display = "none";
                this._stopButton.style.display = "none";
                this._prevBarButton.style.display = "";
                this._nextBarButton.style.display = "";
                this._playButton.classList.remove("shrunk");
                this._recordButton.classList.remove("shrunk");
                this._patternEditorRow.style.pointerEvents = "";
                this._octaveScrollBar.container.style.pointerEvents = "";
                this._octaveScrollBar.container.style.opacity = "";
                this._trackContainer.style.pointerEvents = "";
                this._loopEditor.container.style.opacity = "";
                this._instrumentSettingsArea.style.pointerEvents = "";
                this._instrumentSettingsArea.style.opacity = "";
                this._menuArea.style.pointerEvents = "";
                this._menuArea.style.opacity = "";
                this._songSettingsArea.style.pointerEvents = "";
                this._songSettingsArea.style.opacity = "";
                if (this._doc.synth.recording) {
                    this._stopButton.style.display = "";
                    this._prevBarButton.style.display = "none";
                    this._nextBarButton.style.display = "none";
                    this._patternEditorRow.style.pointerEvents = "none";
                    this._octaveScrollBar.container.style.pointerEvents = "none";
                    this._octaveScrollBar.container.style.opacity = "0.5";
                    this._trackContainer.style.pointerEvents = "none";
                    this._loopEditor.container.style.opacity = "0.5";
                    this._instrumentSettingsArea.style.pointerEvents = "none";
                    this._instrumentSettingsArea.style.opacity = "0.5";
                    this._menuArea.style.pointerEvents = "none";
                    this._menuArea.style.opacity = "0.5";
                    this._songSettingsArea.style.pointerEvents = "none";
                    this._songSettingsArea.style.opacity = "0.5";
                }
                else if (this._doc.synth.playing) {
                    this._pauseButton.style.display = "";
                }
                else if (this._doc.prefs.showRecordButton) {
                    this._playButton.style.display = "";
                    this._recordButton.style.display = "";
                    this._playButton.classList.add("shrunk");
                    this._recordButton.classList.add("shrunk");
                }
                else if (this._ctrlHeld) {
                    this._recordButton.style.display = "";
                }
                else {
                    this._playButton.style.display = "";
                }
            }
            window.requestAnimationFrame(this.updatePlayButton);
        };
        this._onTrackAreaScroll = (event) => {
            this._doc.barScrollPos = (this._trackAndMuteContainer.scrollLeft / this._doc.getBarWidth());
        };
        this._disableCtrlContextMenu = (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
                return false;
            }
            return true;
        };
        this._tempoStepperCaptureNumberKeys = (event) => {
            switch (event.keyCode) {
                case 8:
                case 13:
                case 38:
                case 40:
                case 37:
                case 39:
                case 48:
                case 49:
                case 50:
                case 51:
                case 52:
                case 53:
                case 54:
                case 55:
                case 56:
                case 57:
                    event.stopPropagation();
                    break;
            }
        };
        this._whenKeyPressed = (event) => {
            this._ctrlHeld = event.ctrlKey;
            if (this.prompt) {
                if (event.keyCode == 27) {
                    this._doc.undo();
                }
                return;
            }
            if (this._doc.synth.recording) {
                if (!event.ctrlKey && !event.metaKey) {
                    this._keyboardLayout.handleKeyEvent(event, true);
                }
                if (event.keyCode == 32) {
                    this._toggleRecord();
                    event.preventDefault();
                    this._refocusStage();
                }
                else if (event.keyCode == 80 && (event.ctrlKey || event.metaKey)) {
                    this._toggleRecord();
                    event.preventDefault();
                    this._refocusStage();
                }
                return;
            }
            const needControlForShortcuts = (this._doc.prefs.pressControlForShortcuts != event.getModifierState("CapsLock"));
            const canPlayNotes = (!event.ctrlKey && !event.metaKey && needControlForShortcuts);
            if (canPlayNotes)
                this._keyboardLayout.handleKeyEvent(event, true);
            switch (event.keyCode) {
                case 27:
                    if (!event.ctrlKey && !event.metaKey) {
                        new ChangePatternSelection(this._doc, 0, 0);
                        this._doc.selection.resetBoxSelection();
                    }
                    break;
                case 32:
                    if (event.ctrlKey) {
                        this._toggleRecord();
                    }
                    else if (event.shiftKey) {
                        if (this._trackEditor.movePlayheadToMouse() || this._patternEditor.movePlayheadToMouse()) {
                            if (!this._doc.synth.playing)
                                this._doc.performance.play();
                        }
                    }
                    else {
                        this._togglePlay();
                    }
                    event.preventDefault();
                    this._refocusStage();
                    break;
                case 80:
                    if (canPlayNotes)
                        break;
                    if (event.ctrlKey || event.metaKey) {
                        this._toggleRecord();
                        event.preventDefault();
                        this._refocusStage();
                    }
                    break;
                case 90:
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        this._doc.redo();
                    }
                    else {
                        this._doc.undo();
                    }
                    event.preventDefault();
                    break;
                case 89:
                    if (canPlayNotes)
                        break;
                    this._doc.redo();
                    event.preventDefault();
                    break;
                case 67:
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        this._copyInstrument();
                    }
                    else {
                        this._doc.selection.copy();
                    }
                    event.preventDefault();
                    break;
                case 13:
                    if (event.ctrlKey || event.metaKey) {
                        this._doc.selection.insertChannel();
                    }
                    else {
                        this._doc.selection.insertBars();
                    }
                    event.preventDefault();
                    break;
                case 8:
                    if (event.ctrlKey || event.metaKey) {
                        this._doc.selection.deleteChannel();
                    }
                    else {
                        this._doc.selection.deleteBars();
                    }
                    event.preventDefault();
                    break;
                case 65:
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        this._doc.selection.selectChannel();
                    }
                    else {
                        this._doc.selection.selectAll();
                    }
                    event.preventDefault();
                    break;
                case 68:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.duplicatePatterns();
                        event.preventDefault();
                    }
                    break;
                case 70:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.synth.snapToStart();
                        if (this._doc.prefs.autoFollow) {
                            this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 72:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.synth.goToBar(this._doc.bar);
                        this._doc.synth.snapToBar();
                        if (this._doc.prefs.autoFollow) {
                            this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 77:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        if (this._doc.prefs.enableChannelMuting) {
                            this._doc.selection.muteChannels(event.shiftKey);
                            event.preventDefault();
                        }
                    }
                    break;
                case 81:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._openPrompt("channelSettings");
                        event.preventDefault();
                    }
                    break;
                case 83:
                    if (canPlayNotes)
                        break;
                    if (event.ctrlKey || event.metaKey) {
                        this._openPrompt("export");
                        event.preventDefault();
                    }
                    else {
                        if (this._doc.prefs.enableChannelMuting) {
                            this._doc.selection.soloChannels(event.shiftKey);
                            event.preventDefault();
                        }
                    }
                    break;
                case 79:
                    if (canPlayNotes)
                        break;
                    if (event.ctrlKey || event.metaKey) {
                        this._openPrompt("import");
                        event.preventDefault();
                    }
                    break;
                case 86:
                    if (canPlayNotes)
                        break;
                    if ((event.ctrlKey || event.metaKey) && event.shiftKey && !needControlForShortcuts) {
                        this._doc.selection.pasteNumbers();
                    }
                    else if (event.shiftKey) {
                        this._pasteInstrument();
                    }
                    else {
                        this._doc.selection.pasteNotes();
                    }
                    event.preventDefault();
                    break;
                case 73:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey) && event.shiftKey) {
                        const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
                        const instrumentObject = instrument.toJsonObject();
                        delete instrumentObject["preset"];
                        delete instrumentObject["volume"];
                        delete instrumentObject["pan"];
                        const panningEffectIndex = instrumentObject["effects"].indexOf(Config.effectNames[2]);
                        if (panningEffectIndex != -1)
                            instrumentObject["effects"].splice(panningEffectIndex, 1);
                        for (let i = 0; i < instrumentObject["envelopes"].length; i++) {
                            const envelope = instrumentObject["envelopes"][i];
                            if (envelope["target"] == "panning" || envelope["target"] == "none" || envelope["envelope"] == "none") {
                                instrumentObject["envelopes"].splice(i, 1);
                                i--;
                            }
                        }
                        this._copyTextToClipboard(JSON.stringify(instrumentObject));
                        event.preventDefault();
                    }
                    break;
                case 82:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        if (event.shiftKey) {
                            this._randomGenerated();
                        }
                        else {
                            this._randomPreset();
                        }
                        event.preventDefault();
                    }
                    break;
                case 219:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.synth.goToPrevBar();
                        if (this._doc.prefs.autoFollow) {
                            this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 221:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.synth.goToNextBar();
                        if (this._doc.prefs.autoFollow) {
                            this._doc.selection.setChannelBar(this._doc.channel, Math.floor(this._doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 189:
                case 173:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.transpose(false, event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 187:
                case 61:
                case 171:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.transpose(true, event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 38:
                    if (event.ctrlKey || event.metaKey) {
                        this._doc.selection.swapChannels(-1);
                    }
                    else if (event.shiftKey) {
                        this._doc.selection.boxSelectionY1 = Math.max(0, this._doc.selection.boxSelectionY1 - 1);
                        this._doc.selection.scrollToEndOfSelection();
                        this._doc.selection.selectionUpdated();
                    }
                    else {
                        this._doc.selection.setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
                        this._doc.selection.resetBoxSelection();
                    }
                    event.preventDefault();
                    break;
                case 40:
                    if (event.ctrlKey || event.metaKey) {
                        this._doc.selection.swapChannels(1);
                    }
                    else if (event.shiftKey) {
                        this._doc.selection.boxSelectionY1 = Math.min(this._doc.song.getChannelCount() - 1, this._doc.selection.boxSelectionY1 + 1);
                        this._doc.selection.scrollToEndOfSelection();
                        this._doc.selection.selectionUpdated();
                    }
                    else {
                        this._doc.selection.setChannelBar((this._doc.channel + 1) % this._doc.song.getChannelCount(), this._doc.bar);
                        this._doc.selection.resetBoxSelection();
                    }
                    event.preventDefault();
                    break;
                case 37:
                    if (event.shiftKey) {
                        this._doc.selection.boxSelectionX1 = Math.max(0, this._doc.selection.boxSelectionX1 - 1);
                        this._doc.selection.scrollToEndOfSelection();
                        this._doc.selection.selectionUpdated();
                    }
                    else {
                        this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.barCount - 1) % this._doc.song.barCount);
                        this._doc.selection.resetBoxSelection();
                    }
                    event.preventDefault();
                    break;
                case 39:
                    if (event.shiftKey) {
                        this._doc.selection.boxSelectionX1 = Math.min(this._doc.song.barCount - 1, this._doc.selection.boxSelectionX1 + 1);
                        this._doc.selection.scrollToEndOfSelection();
                        this._doc.selection.selectionUpdated();
                    }
                    else {
                        this._doc.selection.setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.barCount);
                        this._doc.selection.resetBoxSelection();
                    }
                    event.preventDefault();
                    break;
                case 48:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("0", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 49:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("1", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 50:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("2", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 51:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("3", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 52:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("4", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 53:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("5", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 54:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("6", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 55:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("7", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 56:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("8", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 57:
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        this._doc.selection.nextDigit("9", event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                default:
                    this._doc.selection.digits = "";
                    this._doc.selection.instrumentDigits = "";
                    break;
            }
            if (canPlayNotes) {
                this._doc.selection.digits = "";
                this._doc.selection.instrumentDigits = "";
            }
        };
        this._whenKeyReleased = (event) => {
            this._ctrlHeld = event.ctrlKey;
            this._keyboardLayout.handleKeyEvent(event, false);
        };
        this._whenPrevBarPressed = () => {
            this._doc.synth.goToPrevBar();
        };
        this._whenNextBarPressed = () => {
            this._doc.synth.goToNextBar();
        };
        this._togglePlay = () => {
            if (this._doc.synth.playing) {
                this._doc.performance.pause();
            }
            else {
                this._doc.synth.snapToBar();
                this._doc.performance.play();
            }
        };
        this._toggleRecord = () => {
            if (this._doc.synth.playing) {
                this._doc.performance.pause();
            }
            else {
                this._doc.performance.record();
            }
        };
        this._setVolumeSlider = () => {
            this._doc.setVolume(Number(this._volumeSlider.value));
        };
        this._copyInstrument = () => {
            const channel = this._doc.song.channels[this._doc.channel];
            const instrument = channel.instruments[this._doc.getCurrentInstrument()];
            const instrumentCopy = instrument.toJsonObject();
            instrumentCopy["isDrum"] = this._doc.song.getChannelIsNoise(this._doc.channel);
            window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
            this._refocusStage();
        };
        this._pasteInstrument = () => {
            const channel = this._doc.song.channels[this._doc.channel];
            const instrument = channel.instruments[this._doc.getCurrentInstrument()];
            const instrumentCopy = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
            if (instrumentCopy != null && instrumentCopy["isDrum"] == this._doc.song.getChannelIsNoise(this._doc.channel)) {
                this._doc.record(new ChangePasteInstrument(this._doc, instrument, instrumentCopy));
            }
            this._refocusStage();
        };
        this._whenSetTempo = () => {
            this._doc.record(new ChangeTempo(this._doc, -1, parseInt(this._tempoStepper.value) | 0));
        };
        this._whenSetScale = () => {
            if (isNaN(this._scaleSelect.value)) {
                switch (this._scaleSelect.value) {
                    case "forceScale":
                        this._doc.selection.forceScale();
                        break;
                }
                this._doc.notifier.changed();
            }
            else {
                this._doc.record(new ChangeScale(this._doc, this._scaleSelect.selectedIndex));
            }
        };
        this._whenSetKey = () => {
            if (isNaN(this._keySelect.value)) {
                switch (this._keySelect.value) {
                    case "detectKey":
                        this._doc.record(new ChangeDetectKey(this._doc));
                        break;
                }
                this._doc.notifier.changed();
            }
            else {
                this._doc.record(new ChangeKey(this._doc, Config.keys.length - 1 - this._keySelect.selectedIndex));
            }
        };
        this._whenSetRhythm = () => {
            if (isNaN(this._rhythmSelect.value)) {
                switch (this._rhythmSelect.value) {
                    case "forceRhythm":
                        this._doc.selection.forceRhythm();
                        break;
                }
                this._doc.notifier.changed();
            }
            else {
                this._doc.record(new ChangeRhythm(this._doc, this._rhythmSelect.selectedIndex));
            }
        };
        this._whenSetPitchedPreset = () => {
            this._setPreset(this._pitchedPresetSelect.value);
        };
        this._whenSetDrumPreset = () => {
            this._setPreset(this._drumPresetSelect.value);
        };
        this._whenSetFeedbackType = () => {
            this._doc.record(new ChangeFeedbackType(this._doc, this._feedbackTypeSelect.selectedIndex));
        };
        this._whenSetAlgorithm = () => {
            this._doc.record(new ChangeAlgorithm(this._doc, this._algorithmSelect.selectedIndex));
        };
        this._whenSelectInstrument = (event) => {
            if (event.target == this._instrumentAddButton) {
                this._doc.record(new ChangeAddChannelInstrument(this._doc));
            }
            else if (event.target == this._instrumentRemoveButton) {
                this._doc.record(new ChangeRemoveChannelInstrument(this._doc));
            }
            else {
                const index = this._instrumentButtons.indexOf(event.target);
                if (index != -1) {
                    this._doc.selection.selectInstrument(index);
                }
            }
            this._refocusStage();
        };
        this._whenCustomizePressed = () => {
            this._doc.record(new ChangeCustomizeInstrument(this._doc));
        };
        this._whenSetChipWave = () => {
            this._doc.record(new ChangeChipWave(this._doc, this._chipWaveSelect.selectedIndex));
        };
        this._whenSetNoiseWave = () => {
            this._doc.record(new ChangeNoiseWave(this._doc, this._chipNoiseSelect.selectedIndex));
        };
        this._whenSetTransition = () => {
            this._doc.record(new ChangeTransition(this._doc, this._transitionSelect.selectedIndex));
        };
        this._whenSetEffects = () => {
            const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
            const oldValue = instrument.effects;
            const toggleFlag = Config.effectOrder[this._effectsSelect.selectedIndex - 1];
            this._doc.record(new ChangeToggleEffects(this._doc, toggleFlag));
            this._effectsSelect.selectedIndex = 0;
            if (instrument.effects > oldValue) {
                this._doc.addedEffect = true;
            }
        };
        this._whenSetVibrato = () => {
            this._doc.record(new ChangeVibrato(this._doc, this._vibratoSelect.selectedIndex));
        };
        this._whenSetUnison = () => {
            this._doc.record(new ChangeUnison(this._doc, this._unisonSelect.selectedIndex));
        };
        this._whenSetChord = () => {
            this._doc.record(new ChangeChord(this._doc, this._chordSelect.selectedIndex));
        };
        this._addNewEnvelope = () => {
            this._doc.record(new ChangeAddEnvelope(this._doc));
            this._refocusStage();
            this._doc.addedEnvelope = true;
        };
        this._zoomIn = () => {
            this._doc.prefs.visibleOctaves = Math.max(1, this._doc.prefs.visibleOctaves - 1);
            this._doc.prefs.save();
            this._doc.notifier.changed();
            this._refocusStage();
        };
        this._zoomOut = () => {
            this._doc.prefs.visibleOctaves = Math.min(Config.pitchOctaves, this._doc.prefs.visibleOctaves + 1);
            this._doc.prefs.save();
            this._doc.notifier.changed();
            this._refocusStage();
        };
        this._fileMenuHandler = (event) => {
            switch (this._fileMenu.value) {
                case "new":
                    this._doc.goBackToStart();
                    for (const channel of this._doc.song.channels)
                        channel.muted = false;
                    this._doc.record(new ChangeSong(this._doc, ""), false, true);
                    break;
                case "export":
                    this._openPrompt("export");
                    break;
                case "import":
                    this._openPrompt("import");
                    break;
                case "copyUrl":
                    this._copyTextToClipboard(new URL("#" + this._doc.song.toBase64String(), location.href).href);
                    break;
                case "shareUrl":
                    navigator.share({ url: new URL("#" + this._doc.song.toBase64String(), location.href).href });
                    break;
                case "shortenUrl":
                    window.open("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(new URL("#" + this._doc.song.toBase64String(), location.href).href));
                    break;
                case "viewPlayer":
                    location.href = "player/#song=" + this._doc.song.toBase64String();
                    break;
                case "copyEmbed":
                    this._copyTextToClipboard(`<iframe width="384" height="60" style="border: none;" src="${new URL("player/#song=" + this._doc.song.toBase64String(), location.href).href}"></iframe>`);
                    break;
                case "songRecovery":
                    this._openPrompt("songRecovery");
                    break;
            }
            this._fileMenu.selectedIndex = 0;
        };
        this._editMenuHandler = (event) => {
            switch (this._editMenu.value) {
                case "undo":
                    this._doc.undo();
                    break;
                case "redo":
                    this._doc.redo();
                    break;
                case "copy":
                    this._doc.selection.copy();
                    break;
                case "insertBars":
                    this._doc.selection.insertBars();
                    break;
                case "deleteBars":
                    this._doc.selection.deleteBars();
                    break;
                case "insertChannel":
                    this._doc.selection.insertChannel();
                    break;
                case "deleteChannel":
                    this._doc.selection.deleteChannel();
                    break;
                case "pasteNotes":
                    this._doc.selection.pasteNotes();
                    break;
                case "pasteNumbers":
                    this._doc.selection.pasteNumbers();
                    break;
                case "transposeUp":
                    this._doc.selection.transpose(true, false);
                    break;
                case "transposeDown":
                    this._doc.selection.transpose(false, false);
                    break;
                case "selectAll":
                    this._doc.selection.selectAll();
                    break;
                case "selectChannel":
                    this._doc.selection.selectChannel();
                    break;
                case "duplicatePatterns":
                    this._doc.selection.duplicatePatterns();
                    break;
                case "barCount":
                    this._openPrompt("barCount");
                    break;
                case "beatsPerBar":
                    this._openPrompt("beatsPerBar");
                    break;
                case "moveNotesSideways":
                    this._openPrompt("moveNotesSideways");
                    break;
                case "channelSettings":
                    this._openPrompt("channelSettings");
                    break;
            }
            this._editMenu.selectedIndex = 0;
        };
        this._optionsMenuHandler = (event) => {
            switch (this._optionsMenu.value) {
                case "autoPlay":
                    this._doc.prefs.autoPlay = !this._doc.prefs.autoPlay;
                    break;
                case "autoFollow":
                    this._doc.prefs.autoFollow = !this._doc.prefs.autoFollow;
                    break;
                case "enableNotePreview":
                    this._doc.prefs.enableNotePreview = !this._doc.prefs.enableNotePreview;
                    break;
                case "showLetters":
                    this._doc.prefs.showLetters = !this._doc.prefs.showLetters;
                    break;
                case "showFifth":
                    this._doc.prefs.showFifth = !this._doc.prefs.showFifth;
                    break;
                case "notesOutsideScale":
                    this._doc.prefs.notesOutsideScale = !this._doc.prefs.notesOutsideScale;
                    break;
                case "setDefaultScale":
                    this._doc.prefs.defaultScale = this._doc.song.scale;
                    break;
                case "showChannels":
                    this._doc.prefs.showChannels = !this._doc.prefs.showChannels;
                    break;
                case "showScrollBar":
                    this._doc.prefs.showScrollBar = !this._doc.prefs.showScrollBar;
                    break;
                case "alwaysShowSettings":
                    this._doc.prefs.alwaysShowSettings = !this._doc.prefs.alwaysShowSettings;
                    break;
                case "instrumentCopyPaste":
                    this._doc.prefs.instrumentCopyPaste = !this._doc.prefs.instrumentCopyPaste;
                    break;
                case "enableChannelMuting":
                    this._doc.prefs.enableChannelMuting = !this._doc.prefs.enableChannelMuting;
                    for (const channel of this._doc.song.channels)
                        channel.muted = false;
                    break;
                case "displayBrowserUrl":
                    this._doc.toggleDisplayBrowserUrl();
                    break;
                case "layout":
                    this._openPrompt("layout");
                    break;
                case "colorTheme":
                    this._doc.prefs.colorTheme = this._doc.prefs.colorTheme == "light classic" ? "dark classic" : "light classic";
                    ColorConfig.setTheme(this._doc.prefs.colorTheme);
                    break;
                case "recordingSetup":
                    this._openPrompt("recordingSetup");
                    break;
            }
            this._optionsMenu.selectedIndex = 0;
            this._doc.notifier.changed();
            this._doc.prefs.save();
        };
        this._doc.notifier.watch(this.whenUpdated);
        new MidiInputHandler(this._doc);
        window.addEventListener("resize", this.whenUpdated);
        window.requestAnimationFrame(this.updatePlayButton);
        if (!("share" in navigator)) {
            this._fileMenu.removeChild(this._fileMenu.querySelector("[value='shareUrl']"));
        }
        this._scaleSelect.appendChild(optgroup({ label: "Edit" }, option({ value: "forceScale" }, "Snap Notes To Scale")));
        this._keySelect.appendChild(optgroup({ label: "Edit" }, option({ value: "detectKey" }, "Detect Key")));
        this._rhythmSelect.appendChild(optgroup({ label: "Edit" }, option({ value: "forceRhythm" }, "Snap Notes To Rhythm")));
        this._phaseModGroup.appendChild(div({ class: "selectRow", style: `color: ${ColorConfig.secondaryText}; height: 1em; margin-top: 0.5em;` }, div({ style: "margin-right: .1em; visibility: hidden;" }, 1 + "."), div({ style: "width: 3em; margin-right: .3em;", class: "tip", onclick: () => this._openPrompt("operatorFrequency") }, "Freq:"), div({ class: "tip", onclick: () => this._openPrompt("operatorVolume") }, "Volume:")));
        for (let i = 0; i < Config.operatorCount; i++) {
            const operatorIndex = i;
            const operatorNumber = div({ style: `margin-right: .1em; color: ${ColorConfig.secondaryText};` }, i + 1 + ".");
            const frequencySelect = buildOptions(select({ style: "width: 100%;", title: "Frequency" }), Config.operatorFrequencies.map(freq => freq.name));
            const amplitudeSlider = new Slider(input({ type: "range", min: "0", max: Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume" }), this._doc, (oldValue, newValue) => new ChangeOperatorAmplitude(this._doc, operatorIndex, oldValue, newValue));
            const row = div({ class: "selectRow" }, operatorNumber, div({ class: "selectContainer", style: "width: 3em; margin-right: .3em;" }, frequencySelect), amplitudeSlider.input);
            this._phaseModGroup.appendChild(row);
            this._operatorRows[i] = row;
            this._operatorAmplitudeSliders[i] = amplitudeSlider;
            this._operatorFrequencySelects[i] = frequencySelect;
            frequencySelect.addEventListener("change", () => {
                this._doc.record(new ChangeOperatorFrequency(this._doc, operatorIndex, frequencySelect.selectedIndex));
            });
        }
        this._drumsetGroup.appendChild(div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("drumsetEnvelope") }, "Envelope:"), span({ class: "tip", onclick: () => this._openPrompt("drumsetSpectrum") }, "Spectrum:")));
        for (let i = Config.drumCount - 1; i >= 0; i--) {
            const drumIndex = i;
            const spectrumEditor = new SpectrumEditor(this._doc, drumIndex);
            spectrumEditor.container.addEventListener("mousedown", this._refocusStage);
            this._drumsetSpectrumEditors[i] = spectrumEditor;
            const envelopeSelect = buildOptions(select({ style: "width: 100%;", title: "Filter Envelope" }), Config.envelopes.map(envelope => envelope.name));
            this._drumsetEnvelopeSelects[i] = envelopeSelect;
            envelopeSelect.addEventListener("change", () => {
                this._doc.record(new ChangeDrumsetEnvelope(this._doc, drumIndex, envelopeSelect.selectedIndex));
            });
            const row = div({ class: "selectRow" }, div({ class: "selectContainer", style: "width: 5em; margin-right: .3em;" }, envelopeSelect), this._drumsetSpectrumEditors[i].container);
            this._drumsetGroup.appendChild(row);
        }
        this._fileMenu.addEventListener("change", this._fileMenuHandler);
        this._editMenu.addEventListener("change", this._editMenuHandler);
        this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
        this._tempoStepper.addEventListener("change", this._whenSetTempo);
        this._scaleSelect.addEventListener("change", this._whenSetScale);
        this._keySelect.addEventListener("change", this._whenSetKey);
        this._rhythmSelect.addEventListener("change", this._whenSetRhythm);
        this._pitchedPresetSelect.addEventListener("change", this._whenSetPitchedPreset);
        this._drumPresetSelect.addEventListener("change", this._whenSetDrumPreset);
        this._algorithmSelect.addEventListener("change", this._whenSetAlgorithm);
        this._instrumentsButtonBar.addEventListener("click", this._whenSelectInstrument);
        this._instrumentCopyButton.addEventListener("click", this._copyInstrument);
        this._instrumentPasteButton.addEventListener("click", this._pasteInstrument);
        this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
        this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
        this._chipWaveSelect.addEventListener("change", this._whenSetChipWave);
        this._chipNoiseSelect.addEventListener("change", this._whenSetNoiseWave);
        this._transitionSelect.addEventListener("change", this._whenSetTransition);
        this._effectsSelect.addEventListener("change", this._whenSetEffects);
        this._unisonSelect.addEventListener("change", this._whenSetUnison);
        this._chordSelect.addEventListener("change", this._whenSetChord);
        this._vibratoSelect.addEventListener("change", this._whenSetVibrato);
        this._playButton.addEventListener("click", this._togglePlay);
        this._pauseButton.addEventListener("click", this._togglePlay);
        this._recordButton.addEventListener("click", this._toggleRecord);
        this._stopButton.addEventListener("click", this._toggleRecord);
        this._recordButton.addEventListener("contextmenu", (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
                this._toggleRecord();
            }
        });
        this._stopButton.addEventListener("contextmenu", (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
                this._toggleRecord();
            }
        });
        this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
        this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
        this._volumeSlider.addEventListener("input", this._setVolumeSlider);
        this._zoomInButton.addEventListener("click", this._zoomIn);
        this._zoomOutButton.addEventListener("click", this._zoomOut);
        this._patternArea.addEventListener("mousedown", this._refocusStage);
        this._trackArea.addEventListener("mousedown", this._refocusStage);
        this._fadeInOutEditor.container.addEventListener("mousedown", this._refocusStage);
        this._spectrumEditor.container.addEventListener("mousedown", this._refocusStage);
        this._eqFilterEditor.container.addEventListener("mousedown", this._refocusStage);
        this._noteFilterEditor.container.addEventListener("mousedown", this._refocusStage);
        this._harmonicsEditor.container.addEventListener("mousedown", this._refocusStage);
        this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
        this._addEnvelopeButton.addEventListener("click", this._addNewEnvelope);
        this._patternArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this._trackArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
        this.mainLayer.addEventListener("keyup", this._whenKeyReleased);
        this.mainLayer.addEventListener("focusin", this._onFocusIn);
        this._promptContainer.addEventListener("click", (event) => {
            if (event.target == this._promptContainer) {
                this._doc.undo();
            }
        });
        this._trackAndMuteContainer.addEventListener("scroll", this._onTrackAreaScroll, { capture: false, passive: true });
        if (isMobile) {
            const autoPlayOption = this._optionsMenu.querySelector("[value=autoPlay]");
            autoPlayOption.disabled = true;
            autoPlayOption.setAttribute("hidden", "");
        }
        if (window.screen.availWidth < 710 || window.screen.availHeight < 710) {
            const layoutOption = this._optionsMenu.querySelector("[value=layout]");
            layoutOption.disabled = true;
            layoutOption.setAttribute("hidden", "");
        }
    }
    _openPrompt(promptName) {
        this._doc.openPrompt(promptName);
        this._setPrompt(promptName);
    }
    _setPrompt(promptName) {
        if (this._currentPromptName == promptName)
            return;
        this._currentPromptName = promptName;
        if (this.prompt) {
            if (this._wasPlaying && !(this.prompt instanceof TipPrompt || this.prompt instanceof SustainPrompt)) {
                this._doc.performance.play();
            }
            this._wasPlaying = false;
            this._promptContainer.style.display = "none";
            this._promptContainer.removeChild(this.prompt.container);
            this.prompt.cleanUp();
            this.prompt = null;
            this._refocusStage();
        }
        if (promptName) {
            switch (promptName) {
                case "export":
                    this.prompt = new ExportPrompt(this._doc);
                    break;
                case "import":
                    this.prompt = new ImportPrompt(this._doc);
                    break;
                case "songRecovery":
                    this.prompt = new SongRecoveryPrompt(this._doc);
                    break;
                case "barCount":
                    this.prompt = new SongDurationPrompt(this._doc);
                    break;
                case "beatsPerBar":
                    this.prompt = new BeatsPerBarPrompt(this._doc);
                    break;
                case "moveNotesSideways":
                    this.prompt = new MoveNotesSidewaysPrompt(this._doc);
                    break;
                case "channelSettings":
                    this.prompt = new ChannelSettingsPrompt(this._doc);
                    break;
                case "layout":
                    this.prompt = new LayoutPrompt(this._doc);
                    break;
                case "recordingSetup":
                    this.prompt = new RecordingSetupPrompt(this._doc);
                    break;
                case "stringSustain":
                    this.prompt = new SustainPrompt(this._doc);
                    break;
                default:
                    this.prompt = new TipPrompt(this._doc, promptName);
                    break;
            }
            if (this.prompt) {
                if (!(this.prompt instanceof TipPrompt || this.prompt instanceof SustainPrompt)) {
                    this._wasPlaying = this._doc.synth.playing;
                    this._doc.performance.pause();
                }
                this._promptContainer.style.display = "";
                this._promptContainer.appendChild(this.prompt.container);
            }
        }
    }
    _copyTextToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {
                window.prompt("Copy to clipboard:", text);
            });
            return;
        }
        const textField = document.createElement("textarea");
        textField.textContent = text;
        document.body.appendChild(textField);
        textField.select();
        const succeeded = document.execCommand("copy");
        textField.remove();
        this._refocusStage();
        if (!succeeded)
            window.prompt("Copy this:", text);
    }
    _randomPreset() {
        const isNoise = this._doc.song.getChannelIsNoise(this._doc.channel);
        this._doc.record(new ChangePreset(this._doc, pickRandomPresetValue(isNoise)));
    }
    _randomGenerated() {
        this._doc.record(new ChangeRandomGeneratedInstrument(this._doc));
    }
    _setPreset(preset) {
        if (isNaN(preset)) {
            switch (preset) {
                case "copyInstrument":
                    this._copyInstrument();
                    break;
                case "pasteInstrument":
                    this._pasteInstrument();
                    break;
                case "randomPreset":
                    this._randomPreset();
                    break;
                case "randomGenerated":
                    this._randomGenerated();
                    break;
            }
            this._doc.notifier.changed();
        }
        else {
            this._doc.record(new ChangePreset(this._doc, parseInt(preset)));
        }
    }
}
//# sourceMappingURL=SongEditor.js.map