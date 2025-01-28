const patchExportURL = "https://tts-philtreezs-projects.vercel.app/export/patch.export.json";
const dictionaryURL = "https://tts-philtreezs-projects.vercel.app/dictionary.json";

// Lade das Wörterbuch von der JSON-Datei
async function loadDictionary() {
    try {
        const response = await fetch(dictionaryURL);
        const dictionary = await response.json();
        console.log("📖 Wörterbuch erfolgreich geladen:", dictionary);
        return dictionary;
    } catch (err) {
        console.error("❌ Fehler beim Laden des Wörterbuchs:", err);
        return {};
    }
}

// Entferne Stress-Index von Phonemen (z. B. "AH0" → "AH")
function cleanPhoneme(phoneme) {
    return phoneme.replace(/[0-9]/g, ""); // Entfernt alle Ziffern aus dem Phonem
}

const phonemeMap = {
    0: "",      // Kein Sound
    1: "AA",  2: "AE",  3: "AH",  4: "AO",  5: "AW",  6: "AX",  7: "AXR",  8: "AY",
    9: "EH",  10: "ER", 11: "EY", 12: "IH", 13: "IX", 14: "IY", 15: "OW", 16: "OY",
    17: "UH", 18: "UW", 19: "UX", 
    20: "B", 21: "CH", 22: "D", 23: "DH", 24: "F", 25: "G", 26: "K", 27: "L",
    28: "M", 29: "N", 30: "P", 31: "R", 32: "S", 33: "SH", 34: "T", 35: "TH",
    36: "V", 37: "Z", 38: "ZH", 
    39: "-", 40: "!", 41: "+", 42: "/", 43: "#", 
    44: "Q", 45: "WH", 46: "NX", 47: "NG", 48: "HH", 49: "DX", 50: "EL", 51: "EM", 52: "EN", 53: "H", 54: "W", 55: "Y"
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
        handleStep16Change(device);
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

// Text zu Phoneme umwandeln mit lokalem Wörterbuch
async function textToSpeechParams(text) {
    try {
        const dictionary = await loadDictionary();
        if (!dictionary) {
            console.error("❌ Wörterbuch ist leer!");
            return [];
        }

        const words = text.toLowerCase().split(/\s+/);
        let speechParams = [];

        words.forEach(word => {
            if (dictionary[word]) { // Wörterbuch nutzen
                let phonemes = dictionary[word].split(" ");
                console.log(`🗣 Wort "${word}" → Phoneme (vor Cleanup):`, phonemes);

                phonemes.forEach(ph => {
                    let cleanedPhoneme = cleanPhoneme(ph); // Entferne den Stress-Index
                    let speechValue = Object.keys(phonemeMap).find(key => phonemeMap[key] === cleanedPhoneme);
                    if (speechValue !== undefined) {
                        speechParams.push(parseInt(speechValue));
                    } else {
                        console.warn(`⚠️ Unbekanntes Phonem: ${cleanedPhoneme}`);
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
        console.error("❌ Fehler bei der Umwandlung von Text zu Phonemen:", err);
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

    const phonemes = await textToSpeechParams(text); // Lade Phoneme basierend auf dem Wörterbuch
    console.log(`Wort "${text}" → Phoneme:`, phonemes);

    phonemes.forEach((speechValue, index) => {
        setTimeout(() => {
            console.log(`🎛 Setze RNBO-Parameter: speech = ${speechValue}`);
            speechParam.value = speechValue;
        }, index * 100); // ⏳ 300ms Verzögerung pro Phonem
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

// Funktion zum Aktualisieren der Sichtbarkeit der Divs basierend auf dem "step16"-Wert von RNBO
function updateStep16Visualization(stepValue) {
    // Alle Divs mit der Klasse "step16-box" holen
    const stepDivs = document.querySelectorAll(".step16-box");

    stepDivs.forEach(div => {
        // Aktuelles Div prüfen: Hat es das passende data-step-Attribut?
        if (div.getAttribute("data-step") === String(stepValue)) {
            div.classList.add("visible"); // Sichtbar machen
        } else {
            div.classList.remove("visible"); // Unsichtbar machen
        }
    });
}

// Funktion zum Empfangen des "step16"-Werts aus RNBO
function handleStep16Change(device) {
    const step16Param = device.parametersById.get("step16");

    if (!step16Param) {
        console.error("❌ RNBO-Parameter 'step16' nicht gefunden!");
        return;
    }

    // Falls sich der Parameter ändert, die Visualisierung aktualisieren
    step16Param.onValueChange = (newValue) => {
        console.log(`🎛 RNBO step16 geändert: ${newValue}`);
        updateStep16Visualization(newValue);
    };
}