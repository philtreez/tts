const patchExportURL = "https://tts-philtreezs-projects.vercel.app/export/patch.export.json";
const phonemeMap = {
  "AA": 1, "AE": 2, "AH": 3, "AO": 4, "EH": 5, "ER": 6, "IH": 7, "IY": 8,
  "UH": 9, "UW": 10, "B": 11, "D": 12, "F": 13, "G": 14, "K": 15, "L": 16,
  "M": 17, "N": 18, "P": 19, "R": 20, "S": 21, "T": 22, "V": 23, "Z": 24,
  "AW": 25, "AY": 26, "CH": 27, "SH": 28, "TH": 29, "OW": 30
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

    const speechValues = await textToSpeechParams(text);
    console.log("📡 Sende Speech-Werte an RNBO:", speechValues);

    speechValues.forEach((value, index) => {
        if (isNaN(value)) {
            console.error(`❌ Ungültiger Speech-Wert: ${value}`);
            return;
        }
        setTimeout(() => {
            console.log(`🎛 Setze RNBO-Parameter: speech = ${value}`);
            speechParam.value = value;
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
