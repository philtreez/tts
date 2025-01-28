const patchExportURL = "https://tts-philtreezs-projects.vercel.app/export/patch.export.json";

import dictionary from 'https://cdn.jsdelivr.net/npm/cmu-pronouncing-dictionary@latest/+esm';

// Nutze das geladene Wörterbuch
console.log("📖 Wörterbuch erfolgreich geladen:", dictionary);

// Beispiel für einen Wörterbuch-Lookup
console.log("Phoneme für 'hello':", dictionary["hello"]);

const phonemeMap = {
    0: "",      // Kein Sound
    1: "AA",  2: "AE",  3: "AH",  4: "AO",  5: "AW",  6: "AX",  7: "AXR",  8: "AY",
    9: "EH",  10: "ER", 11: "EY", 12: "IH", 13: "IX", 14: "IY", 15: "OW", 16: "OY",
    17: "UH", 18: "UW", 19: "UX", 
    20: "B", 21: "CH", 22: "D", 23: "DH", 24: "F", 25: "G", 26: "K", 27: "L",
    28: "M", 29: "N", 30: "P", 31: "R", 32: "S", 33: "SH", 34: "T", 35: "TH",
    36: "V", 37: "Z", 38: "ZH", 
    39: "-", 40: "!", 41: "+", 42: "/", 43: "#", 
    44: "Q", 45: "WH", 46: "NX", 47: "NG", 48: "HH", 49: "DX", 50: "EL", 51: "EM", 52: "EN"
};

const phonemeDictionary = {
    "hello": ["HH", "AH", "L", "OW"],
    "rise": ["R", "AY", "Z"],
    "super": ["S", "UW", "P", "ER"],
    "my": ["M", "AY"],
    "test": ["T", "EH", "S", "T"],
    "world": ["W", "ER", "L", "D"],
    "good": ["G", "UH", "D"],
    "morning": ["M", "AO", "R", "N", "IH", "NG"],
    "computer": ["K", "AH", "M", "P", "Y", "UW", "T", "ER"],
    "phoneme": ["F", "OW", "N", "IY", "M"],
    "speech": ["S", "P", "IY", "CH"],
    // Weitere Wörter nach Bedarf hinzufügen
};

async function setup() {
    console.log("🚀 app.js läuft!");

    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    // 🛠 Fix: AudioContext erst nach User-Interaktion starten
    document.addEventListener("click", async function resumeAudioContext() {
        if (context.state !== "running") {
            await context.resume();
            console.log("🔊 AudioContext wurde gestartet!");
        }
        document.removeEventListener("click", resumeAudioContext);
    });

    let response, patcher;
    try {
        response = await fetch(patchExportURL);
        patcher = await response.json();
        console.log("📦 RNBO Patch erfolgreich geladen:", patcher);

        if (!window.RNBO) {
            console.log("📥 Lade RNBO...");
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }

    } catch (err) {
        console.error("❌ Fehler beim Laden des RNBO-Patchers:", err);
        return;
    }

    try {
        const device = await RNBO.createDevice({ context, patcher });
        device.node.connect(outputNode);
        console.log("✅ RNBO WebAudio erfolgreich geladen!");

        // 🛠 Debug: Zeige ALLE verfügbaren Parameter
        console.log("📡 Verfügbare RNBO-Parameter:", device.parametersById);

        setupWebflowForm(device);
    } catch (err) {
        console.error("❌ Fehler beim Erstellen des RNBO-Geräts:", err);
        return;
    }
}

// Lade RNBO-Skript dynamisch
function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
            throw new Error("RNBO Debug-Version erkannt! Bitte eine stabile Version exportieren.");
        }
        const el = document.createElement("script");
        el.src = `https://c74-public.nyc3.digitaloceanspaces.com/rnbo/${encodeURIComponent(version)}/rnbo.min.js`;
        el.onload = () => {
            console.log("✅ RNBO.js erfolgreich geladen.");
            resolve();
        };
        el.onerror = err => {
            console.error("❌ Fehler beim Laden von rnbo.js:", err);
            reject(new Error(`Fehler beim Laden von rnbo.js v${version}`));
        };
        document.body.append(el);
    });
}

// Text zu Phoneme umwandeln
async function textToSpeechParams(text) {
    try {
        const pr = await import('https://cdn.jsdelivr.net/npm/cmu-pronouncing-dictionary@latest/+esm');
        console.log("📖 Wörterbuch erfolgreich geladen:", pr);

        // Neue Debug-Logs
        console.log("🔍 Wörterbuch Struktur:", pr);
        console.log("🔍 Enthält das Wörterbuch eine dictionary-Eigenschaft?", pr.dictionary);

        if (!pr.dictionary) {
            console.error("❌ Wörterbuch enthält keine `dictionary`-Daten!");
            return [];
        }

        const words = text.toLowerCase().split(/\s+/);
        let speechParams = [];

        words.forEach(word => {
            if (pr.dictionary[word]) { // Hier nutzen wir `dictionary`
                let phonemes = pr.dictionary[word][0].split(" ");
                console.log(`🗣 Wort "${word}" → Phoneme:`, phonemes);

                phonemes.forEach(ph => {
                    if (phonemeMap.hasOwnProperty(ph)) {
                        speechParams.push(phonemeMap[ph]);
                    } else {
                        console.warn(`⚠️ Unbekanntes Phonem: ${ph}`);
                        speechParams.push(0);
                    }
                });
            } else {
                console.warn(`⚠️ Unbekanntes Wort: ${word} → Wörterbuch enthält es nicht!`);
                speechParams.push(0);
            }
        });

        console.log("🔡 Generierte Speech-Werte:", speechParams);
        return speechParams;

    } catch (err) {
        console.error("❌ Fehler beim Laden von cmu-pronouncing-dictionary:", err);
        return [];
    }
}

function textToPhonemes(text) {
    text = text.toLowerCase();
    if (phonemeDictionary[text]) {
        return phonemeDictionary[text];
    } else {
        console.warn(`⚠️ Unbekanntes Wort: ${text} → Wörterbuch enthält es nicht!`);
        return [];
    }
}

// Werte an RNBO senden (Jetzt mit `device`)
async function sendToRNBO(device, text) {
    if (!device) {
        console.error("❌ RNBO nicht geladen!");
        return;
    }

    console.log("📡 Verfügbare RNBO-Parameter:", device.parametersById);
    const speechParam = device.parametersById.get("speech");

    if (!speechParam) {
        console.error("❌ RNBO-Parameter 'speech' existiert nicht! Überprüfe deinen RNBO-Patch.");
        return;
    }

    const phonemes = textToPhonemes(text); // Wandelt Text in ARPABET-Phoneme um
    console.log(`Wort "${text}" → Phoneme:`, phonemes);

    phonemes.forEach((phoneme, index) => {
        let speechValue = phonemeMap[phoneme] || 0; // Falls unbekannt, setze 0 (Stille)
        setTimeout(() => {
            console.log(`🎛 Setze RNBO-Parameter: speech = ${speechValue}`);
            speechParam.value = speechValue;
        }, index * 300); // ⏳ 300ms Verzögerung pro Phonem
    });
}

// Webflow-Formular automatisch erkennen & steuern
function setupWebflowForm(device) {
    const form = document.querySelector("#wf-form-TEXTFORM, [data-name='TEXTFORM']");
    if (!form) {
        console.error("❌ Webflow-Formular nicht gefunden! Stelle sicher, dass die ID 'wf-form-TEXTFORM' existiert.");
        return;
    }

    const textInput = form.querySelector("input[type='text']");
    const submitButton = form.querySelector("input[type='submit'], button");

    if (!textInput || !submitButton) {
        console.error("❌ Textfeld oder Submit-Button nicht gefunden!");
        return;
    }

    submitButton.addEventListener("click", function(event) {
        event.preventDefault();
        const text = textInput.value.trim();
        if (!text) {
            console.warn("⚠️ Kein Text eingegeben!");
            return;
        }

        console.log("▶️ Text aus Webflow-Formular:", text);
        sendToRNBO(device, text);
    });

    console.log("✅ Webflow-Formular erfolgreich mit RNBO verbunden!");
}

// Setup starten
setup();
