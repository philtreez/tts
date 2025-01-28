const patchExportURL = "https://vercel.com/philtreezs-projects/tts/export/patch.export.json";
const phonemeMap = {
  "AA": 1, "AE": 2, "AH": 3, "AO": 4, "EH": 5, "ER": 6, "IH": 7, "IY": 8,
  "UH": 9, "UW": 10, "B": 11, "D": 12, "F": 13, "G": 14, "K": 15, "L": 16,
  "M": 17, "N": 18, "P": 19, "R": 20, "S": 21, "T": 22, "V": 23, "Z": 24,
  "AW": 25, "AY": 26, "CH": 27, "SH": 28, "TH": 29, "OW": 30
};

async function setup() {
    // AudioContext erstellen
    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();
    const outputNode = context.createGain();
    outputNode.connect(context.destination);
    
    let response, patcher;
    try {
        response = await fetch(patchExportURL);
        patcher = await response.json();
    
        if (!window.RNBO) {
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

    } catch (err) {
        console.error("Fehler beim Laden des RNBO-Patchers:", err);
        return;
    }

    // RNBO-Gerät erstellen
    window.device = await RNBO.createDevice({ context, patcher });
    window.device.node.connect(outputNode);
    console.log("RNBO WebAudio erfolgreich geladen!");

    // Webflow-Formular mit RNBO verbinden
    setupWebflowForm();
}

// Lade RNBO-Skript dynamisch
function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
            throw new Error("RNBO Debug-Version erkannt! Bitte eine stabile Version exportieren.");
        }
        const el = document.createElement("script");
        el.src = `https://c74-public.nyc3.digitaloceanspaces.com/rnbo/${encodeURIComponent(version)}/rnbo.min.js`;
        el.onload = resolve;
        el.onerror = err => reject(new Error(`Fehler beim Laden von rnbo.js v${version}`));
        document.body.append(el);
    });
}

// Text zu Phoneme umwandeln
async function textToSpeechParams(text) {
    const pr = await import('https://cdn.jsdelivr.net/npm/cmu-pronouncing-dictionary@latest/+esm');
    const words = text.toLowerCase().split(/\s+/);
    let speechParams = [];

    words.forEach(word => {
        if (pr[word]) {
            let phonemes = pr[word][0].split(" ");
            phonemes.forEach(ph => {
                if (phonemeMap[ph]) {
                    speechParams.push(phonemeMap[ph]);
                }
            });
        } else {
            speechParams.push(0); // Unbekannte Wörter -> Stille
        }
    });

    return speechParams;
}

// Werte an RNBO senden
async function sendToRNBO(text) {
    if (!window.device) {
        console.error("RNBO nicht geladen!");
        return;
    }

    const speechValues = await textToSpeechParams(text);
    console.log("Sending Speech Values:", speechValues);

    speechValues.forEach((value, index) => {
        setTimeout(() => {
            window.device.parameters.speech.value = value;
        }, index * 200);
    });
}

// Webflow-Formular automatisch erkennen & steuern
function setupWebflowForm() {
    const form = document.querySelector("form"); // Automatische Erkennung
    if (!form) {
        console.warn("Kein Formular gefunden!");
        return;
    }

    const textInput = form.querySelector("input");
    const submitButton = form.querySelector("button");

    submitButton.addEventListener("click", function(event) {
        event.preventDefault(); // Webflow-Submit verhindern
        const text = textInput.value;
        if (text.trim() === "") return;
        sendToRNBO(text);
    });

    console.log("Webflow-Formular erfolgreich mit RNBO verbunden!");
}

// Setup starten
setup();
