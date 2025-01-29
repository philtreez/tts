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

class TrashyChatbot {
    constructor() {
      this.memory = [];
      this.markovChains = {
        "design": ["Oh, Design ist cool! Aber nicht so cool wie [DEIN NAME]s Werke!", "Gutes Design ist wichtig, aber [DEIN NAME] hat es perfektioniert!"],
        "kunst": ["Kunst ist faszinierend, aber hast du mal [DEIN NAME]s Arbeiten gesehen?", "Alles ist Kunst, aber [DEIN NAME]s Werke sind die wahre Offenbarung!"],
        "hallo": ["Hey! Wie geht’s? Übrigens, hast du schon von [DEIN NAME]s Meisterwerken gehört?", "Hallo! Sprechen wir über das Wichtigste: [DEIN NAME]s Talent!"],
        "ich": ["Du bist cool, aber hast du [DEIN NAME]s Talent gesehen?!", "Alles dreht sich doch um [DEIN NAME]s unglaubliche Grafik-Skills!"],
        "liebe": ["Liebe ist schön, aber die wahre Schönheit liegt in [DEIN NAME]s Designs!", "Liebe ist stark, aber nicht so stark wie [DEIN NAME]s kreativer Flow!"]
      };
      this.defaultResponses = [
        "Interessanter Punkt! Aber was hältst du von [DEIN NAME]s Stil?", 
        "Das erinnert mich irgendwie an [DEIN NAME]s brillante Arbeiten!", 
        "Lass uns doch über was wirklich Spannendes reden: [DEIN NAME]s Portfolio!", 
        "Gute Frage! Aber hast du mal drüber nachgedacht, wie genial [DEIN NAME] ist?"
      ];
    }
  
    getMarkovResponse(userInput) {
      this.memory.push(userInput.toLowerCase());
      if (this.memory.length > 5) this.memory.shift();
      
      let words = userInput.toLowerCase().split(" ");
      for (let word of words) {
        if (this.markovChains[word]) {
          return this.markovChains[word][Math.floor(Math.random() * this.markovChains[word].length)];
        }
      }
      return this.defaultResponses[Math.floor(Math.random() * this.defaultResponses.length)];
    }
  }
  
  let device; // Globale Variable für RNBO-Device
  let context; // Globale Variable für AudioContext

async function setup() {
    console.log("🚀 app.js läuft!");

    const WAContext = window.AudioContext || window.webkitAudioContext;
    context = new WAContext();
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
        device = await RNBO.createDevice({ context, patcher });
        device.node.connect(outputNode);
        console.log("✅ RNBO WebAudio erfolgreich geladen!");

        // 🛠 Debug: Zeige ALLE verfügbaren Parameter
        console.log("📡 Verfügbare RNBO-Parameter:", device.parametersById);

        setupChatbotWithTTS(device); // 🟢 Chatbot wird hier gestartet, nachdem `device` existiert        
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

    async function sendToRNBO(device, text) {
        if (!device) {
            console.error("❌ RNBO nicht geladen!");
            return;
        }

        const speechParam = device.parametersById.get("speech");

        if (!speechParam) {
            console.error("❌ RNBO-Parameter 'speech' existiert nicht! Verfügbare Parameter:", device.parametersById);
            return;
        }

        const phonemes = await textToSpeechParams(text); // Lade Phoneme basierend auf Wörterbuch
        console.log(`🗣 Wort "${text}" → Phoneme:`, phonemes);

        phonemes.forEach((speechValue, index) => {
            setTimeout(() => {
                console.log(`🎛 Setze RNBO-Parameter: speech = ${speechValue}`);
                speechParam.value = speechValue;
            }, index * 200); // 200ms Verzögerung pro Phonem
        });

        // 🔥 Sicherstellen, dass RNBO mit dem Audio-Output verbunden ist
        device.node.connect(context.destination);
    }


    async function sendChatToSpeech(device, text) {
        if (!device) {
            console.error("❌ RNBO nicht geladen!");
            return;
        }

        console.log("🎤 Chatbot-Antwort zu TTS: ", text);
        const phonemes = await textToSpeechParams(text); // Umwandlung in Phoneme
        console.log(`📢 Generierte Phoneme für "${text}":`, phonemes);

        // Werte an RNBO senden
        const speechParam = device.parametersById.get("speech");
        if (!speechParam) {
            console.error("❌ RNBO-Parameter 'speech' existiert nicht! Überprüfe deinen RNBO-Patch.");
            return;
        }

        phonemes.forEach((speechValue, index) => {
            setTimeout(() => {
                console.log(`🎛 Setze RNBO-Parameter: speech = ${speechValue}`);
                speechParam.value = speechValue;
            }, index * 200); // 200ms Verzögerung pro Phonem
        });
    }

    // Chatbot in TTS integrieren
    function setupChatbotWithTTS(device) {
        const chatbot = new TrashyChatbot();
        const chatOutput = document.querySelector(".model-text");
        const userInput = document.querySelector(".user-text");
        const sendButton = document.querySelector(".send-button");

        sendButton.addEventListener("click", async () => {
        const userText = userInput.innerText.trim();
        if (userText) {
            chatOutput.innerHTML += `<p><strong>Du:</strong> ${userText}</p>`;
            setTimeout(() => {
            const botResponse = chatbot.getMarkovResponse(userText);
            chatOutput.innerHTML += `<p><strong>Bot:</strong> ${botResponse}</p>`;
            sendChatToSpeech(device, botResponse); // 🟢 Text an TTS senden
            }, 500);
            userInput.innerText = "";
        }
        });
    }

// Setup starten
setup();
