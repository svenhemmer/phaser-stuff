import { Config } from "../synth/SynthConfig";
import { isMobile, EditorConfig } from "./EditorConfig";
import { ColorConfig } from "./ColorConfig";
import "./style";
import { SongEditor } from "./SongEditor";
import { Note, Pattern, Instrument, Channel, Song, Synth } from "../synth/synth";
import { SongDocument } from "./SongDocument";
import { ExportPrompt } from "./ExportPrompt";
import { ChangePreset } from "./changes";
const doc = new SongDocument();
const editor = new SongEditor(doc);
const beepboxEditorContainer = document.getElementById("beepboxEditorContainer");
beepboxEditorContainer.appendChild(editor.mainLayer);
editor.whenUpdated();
editor.mainLayer.focus();
if (!isMobile && doc.prefs.autoPlay) {
    function autoplay() {
        if (!document.hidden) {
            doc.synth.play();
            editor.updatePlayButton();
            window.removeEventListener("visibilitychange", autoplay);
        }
    }
    if (document.hidden) {
        window.addEventListener("visibilitychange", autoplay);
    }
    else {
        autoplay();
    }
}
if ("scrollRestoration" in history)
    history.scrollRestoration = "manual";
editor.updatePlayButton();
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service_worker.js", { updateViaCache: "all", scope: "/" }).catch(() => { });
}
export { Config, Note, Pattern, Instrument, Channel, Song, Synth, ColorConfig, EditorConfig, SongDocument, SongEditor, ExportPrompt, ChangePreset };
//# sourceMappingURL=main.js.map