import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createRequire } from "module";
const requireModule = createRequire(import.meta.url);

const modulesToGlobal = [
  "ATH",
  "BitStream",
  "CBRNewIterationLoop",
  "CalcNoiseData",
  "CalcNoiseResult",
  "Encoder",
  "FFT",
  "GainAnalysis",
  "GrInfo",
  "ID3TagSpec",
  "IIISideInfo",
  "III_psy_ratio",
  "III_psy_xmin",
  "L3Side",
  "Lame",
  "LameGlobalFlags",
  "LameInternalFlags",
  "MPEGMode",
  "MeanBits",
  "NewMDCT",
  "NsPsy",
  "Presets",
  "PsyModel",
  "Quantize",
  "QuantizePVT",
  "ReplayGain",
  "Reservoir",
  "ScaleFac",
  "Tables",
  "Takehiro",
  "VBRQuantize",
  "VBRSeekInfo",
  "VBRTag",
  "Version",
  "common"
];

for (const mod of modulesToGlobal) {
  try {
    const exports = requireModule(`lamejs/src/js/${mod}.js`);
    (global as any)[mod] = exports;
  } catch (e) {
    // some modules might print minor warnings during load, but we assign whatever is exported
  }
}

// @ts-ignore
import lamejs from "lamejs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper function to lazy-initialize the GoogleGenAI client
let aiInstance: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured. Add GEMINI_API_KEY to your local .env file, or switch to Local VOICEVOX mode.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// PCM Mono 24000Hz 16-bit little-endian to MP3 conversion using lamejs
function pcmToMp3(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  // Safe extraction of Mp3Encoder to accommodate different module bundling layouts
  let Mp3Encoder = lamejs.Mp3Encoder;
  if (!Mp3Encoder && (lamejs as any).default) {
    Mp3Encoder = (lamejs as any).default.Mp3Encoder;
  }
  if (!Mp3Encoder) {
    throw new Error("Failed to load Mp3Encoder from lamejs library.");
  }

  const encoder = new Mp3Encoder(1, sampleRate, 128); // 1 channel (mono), 24000 sample rate, 128 kbps
  const mp3Data: Buffer[] = [];

  // Since PCM is 16-bit (2 bytes per sample), convert Buffer to Int16Array
  const length16 = Math.floor(pcmBuffer.length / 2);
  const int16Array = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, length16);

  const sampleBlockSize = 1152;
  let i = 0;
  while (i < int16Array.length) {
    const chunk = int16Array.subarray(i, i + sampleBlockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(Buffer.from(mp3buf));
    }
    i += sampleBlockSize;
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(Buffer.from(endBuf));
  }

  return Buffer.concat(mp3Data);
}

// 1. API: Generate an interactive Japanese JLPT listening scenario/quiz
app.post("/api/generate-listening", async (req, res) => {
  try {
    const { level, topic } = req.body;
    const jlptLevel = level || "N3";
    const selectedTopic = topic || "general situations";

    const ai = getAIClient();

    const systemInstruction = `You are an expert Japanese Language Proficiency Test (JLPT) author. 
Create highly realistic and high-quality Japanese listening practice materials (Choukai) tailored specifically for the ${jlptLevel} level. 
The theme/scene of the dialogue should cover: ${selectedTopic}.

Follow these guidelines for JLPT levels:
- N5: Extremely simple grammar, slow pacing, simple everyday topics (e.g., shopping at a convenience store, asking for directions), clear vocabulary.
- N4: Basic grammar (te-form, conditional, basic potential), everyday transactions (at the station, restaurant, school).
- N3: Pre-intermediate grammar, natural conversational speed, slightly indirect phrasing, polite or casual styles depending on relationship.
- N2: Business Japanese, polite speech (Keigo), academic topics, complex schedules, news bulletins, or work situations.
- N1: Advanced, native-level discussions, abstract concepts, fast rate, news reports, company lectures, highly formal or colloquial.

Your dialogue must strictly follow these structural parts:
1. 'Narrator': Begins by stating the situation and the question (e.g. "第1問。男の人と女の人が話しています。男の人はこれから何をしますか。").
2. 'Man' and 'Woman': Engaging, authentic conversation.
3. 'Narrator': Repeats the question at the end (e.g. "男の人はこれから何をしますか。").

Ensure the speaker names in the 'dialogue' output block are strictly labeled as either "Narrator", "Man", or "Woman" as they correspond to TTS speaker voices, but use the labels fields ('labelJa', 'labelEn') for detailed descriptions (e.g., "Narrator", "駅員 (男)", "学生 (女)").

Create a single complete multiple choice question with EXACTLY 4 options, including a correct option and 3 plausible distractors. 
Provide a thorough Japanese/English explanation detailing the correct choice's context clues, grammar patterns, and key words to listen for.`;

    const prompt = `Create one JLPT ${jlptLevel} Listening Test question about "${selectedTopic}". Ensure to output the response using the requested JSON Schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A short, engaging title in Japanese for this practice session."
            },
            jlptLevel: {
              type: Type.STRING,
              description: "The JLPT Level of this task, from N5 to N1."
            },
            situationJa: {
              type: Type.STRING,
              description: "Brief background setting or context in Japanese."
            },
            situationEn: {
              type: Type.STRING,
              description: "Brief background setting or context translated in English."
            },
            questionJa: {
              type: Type.STRING,
              description: "The primary JLPT question in Japanese."
            },
            questionEn: {
              type: Type.STRING,
              description: "The primary JLPT question in English."
            },
            dialogue: {
              type: Type.ARRAY,
              description: "The list of dialogue parts in chronological speaking order.",
              items: {
                type: Type.OBJECT,
                properties: {
                  speaker: {
                    type: Type.STRING,
                    description: "Determine who is speaking: must be strictly 'Narrator', 'Man', or 'Woman'."
                  },
                  labelJa: {
                    type: Type.STRING,
                    description: "Human-friendly speaker label in Japanese (e.g., 駅員(男), 先生(女))."
                  },
                  labelEn: {
                    type: Type.STRING,
                    description: "Human-friendly speaker label in English (e.g., Station Staff (M), Teacher (F))."
                  },
                  textJa: {
                    type: Type.STRING,
                    description: "Dialogue line spoken in natural Japanese suited for this JLPT level."
                  },
                  textEn: {
                    type: Type.STRING,
                    description: "Line translated in English."
                  }
                },
                required: ["speaker", "labelJa", "labelEn", "textJa", "textEn"]
              }
            },
            options: {
              type: Type.ARRAY,
              description: "Exactly 4 options in Japanese.",
              items: {
                type: Type.STRING
              }
            },
            optionsEn: {
              type: Type.ARRAY,
              description: "Exactly 4 option meanings in English.",
              items: {
                type: Type.STRING
              }
            },
            correctAnswer: {
              type: Type.INTEGER,
              description: "The index of the correct option (integer from 1 to 4)."
            },
            explanation: {
              type: Type.STRING,
              description: "A comprehensive description of why the correct option is right and how to identify it, detailing grammar, vocabulary, or tricky parts."
            },
            vocabulary: {
              type: Type.ARRAY,
              description: "A list of 4 to 8 essential vocabulary words used in the conversation.",
              items: {
                type: Type.OBJECT,
                properties: {
                  word: {
                    type: Type.STRING,
                    description: "The vocabulary word or phrase (e.g., 急行, 忘れ物)."
                  },
                  furigana: {
                    type: Type.STRING,
                    description: "The furigana/ruby reading in Hiragana/Katakana."
                  },
                  meaning: {
                    type: Type.STRING,
                    description: "The definition or meaning in English."
                  }
                },
                required: ["word", "furigana", "meaning"]
              }
            }
          },
          required: [
            "title",
            "jlptLevel",
            "situationJa",
            "situationEn",
            "questionJa",
            "questionEn",
            "dialogue",
            "options",
            "optionsEn",
            "correctAnswer",
            "explanation",
            "vocabulary"
          ]
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response output from Gemini model.");
    }

    const quizData = JSON.parse(textResponse.trim());
    res.json({ success: true, data: quizData });
  } catch (error: any) {
    console.error("Error generating listening materials:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate JLPT material" });
  }
});

// 1.5 API: Analyze text to estimate JLPT level, write a summary and extract vocabulary words
app.post("/api/analyze-text", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ success: false, error: "Empty or invalid source text content." });
    }

    const ai = getAIClient();
    const systemInstruction = `You are an expert Japanese Language Proficiency Test (JLPT) coordinator.
Analyze the provided Japanese text. Determine:
1. The estimated JLPT level (must be exactly 'N5', 'N4', 'N3', 'N2', 'N1', or 'Unknown / Mixed'). If the text has multiple levels or is highly ambiguous, choose 'Unknown / Mixed'.
2. A short English overview or summary.
3. Essential vocabulary items (up to 6 words) with their kanji/word, Hiragana/Katakana furigana reading, and English definition.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze this text and estimated its JLPT level and vocabulary:\n\n${text}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedLevel: {
              type: Type.STRING,
              description: "Must be 'N5', 'N4', 'N3', 'N2', 'N1', or 'Unknown / Mixed'."
            },
            summary: {
              type: Type.STRING,
              description: "A 1-2 sentence overview in English of the text's contents."
            },
            vocabulary: {
              type: Type.ARRAY,
              description: "A list of 4 to 6 key vocabulary words from the text.",
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  furigana: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ["word", "furigana", "meaning"]
              }
            }
          },
          required: ["estimatedLevel", "summary", "vocabulary"]
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response output from Gemini model for text analysis.");
    }

    const analysisData = JSON.parse(textResponse.trim());
    res.json({ success: true, data: analysisData });
  } catch (error: any) {
    console.error("Error analyzing text:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to analyze text" });
  }
});

// 2. API: Synthesize Dialogue Script to Speech (MP3)
app.post("/api/synthesize-speech", async (req, res) => {
  try {
    const { dialogue } = req.body;
    if (!dialogue || !Array.isArray(dialogue) || dialogue.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid dialogue script input" });
    }

    const ai = getAIClient();

    // Map script lines to exactly two speaker prompts (Man and Woman)
    const promptLines = dialogue
      .map((line: any) => {
        // Map Narrator voice to Woman speaker to abide by the maximum 2 speaker voice constraint
        const speakerKey = line.speaker === "Narrator" ? "Woman" : line.speaker;
        
        // Enrich context with tone/pause/emotion if it is provided
        const attributes: string[] = [];
        if (line.tone) attributes.push(`tone: ${line.tone}`);
        if (line.emotion) attributes.push(`emotion: ${line.emotion}`);
        if (line.character) attributes.push(`character: ${line.character}`);
        if (line.pause) attributes.push(`pause: ${line.pause}s`);
        
        const meta = attributes.length > 0 ? ` [instructions: ${attributes.join(", ")}]` : "";
        
        return `${speakerKey}${meta}: ${line.textJa}`;
      })
      .join("\n");

    const prompt = `Convert the following Japanese JLPT listening dialogue script to speech exactly. Keep natural spacing and clear Japanese pronunciation.
Speakers involved:
- Man speaks in a natural standard Japanese male voice.
- Woman speaks in a natural standard Japanese female/narrator voice.

Script:
${promptLines}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: "Man",
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Fenrir" } // Male / warm
                }
              },
              {
                speaker: "Woman",
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" } // Female / soft & clean
                }
              }
            ]
          }
        }
      }
    });

    // Check if we received the audio data
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("TTS generation returned no audio payload. Check your prompt or model configuration.");
    }

    const rawBuffer = Buffer.from(base64Audio, "base64");
    
    // Convert 24kHz raw PCM little-endian buffer into MP3
    const mp3Buffer = pcmToMp3(rawBuffer, 24000);
    const mp3Base64 = mp3Buffer.toString("base64");

    res.json({
      success: true,
      mp3Base64: mp3Base64,
    });
  } catch (error: any) {
    console.error("Error synthesizing speech:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to synthesize speech" });
  }
});

// Helper to extract PCM data from VOICEVOX WAV
function extractPcmFromWav(wavBuffer: Buffer): { pcm: Buffer; sampleRate: number } {
  if (wavBuffer.length < 44) {
    return { pcm: wavBuffer, sampleRate: 24000 };
  }
  try {
    let pos = 12; // skip RIFF and WAVE
    const length = wavBuffer.length;
    while (pos < length - 8) {
      const chunkId = wavBuffer.toString("ascii", pos, pos + 4);
      const chunkSize = wavBuffer.readUInt32LE(pos + 4);
      if (chunkId === "data") {
        const dataPos = pos + 8;
        const pcm = wavBuffer.subarray(dataPos, Math.min(dataPos + chunkSize, length));
        const sampleRate = wavBuffer.readUInt32LE(24);
        return { pcm, sampleRate };
      }
      pos += 8 + chunkSize;
    }
  } catch (e) {
    console.warn("WAV parsing error, falling back:", e);
  }
  return { pcm: wavBuffer.subarray(44), sampleRate: 24000 };
}

// 2.5 API: Synthesize VOICEVOX Dialogue Script to Speech (MP3)
app.post("/api/synthesize-voicevox-mp3", async (req, res) => {
  try {
    const { dialogue, settings } = req.body;
    if (!dialogue || !Array.isArray(dialogue) || dialogue.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid dialogue script input" });
    }
    if (!settings || !settings.baseUrl || !settings.speakerMap) {
      return res.status(400).json({ success: false, error: "Invalid VOICEVOX settings input" });
    }

    const baseUrl = settings.baseUrl.replace(/\/$/, "");
    const pcmBuffers: Buffer[] = [];
    let detectedSampleRate = 24000;

    for (const row of dialogue) {
      const speakerRole = row.speaker || "Narrator";
      const styleId = settings.speakerMap[speakerRole] !== undefined 
        ? settings.speakerMap[speakerRole] 
        : (settings.speakerMap.Narrator !== undefined ? settings.speakerMap.Narrator : 2);

      // 1. POST /audio_query?text=<text>&speaker=<speakerId>
      const queryUrl = `${baseUrl}/audio_query?text=${encodeURIComponent(row.textJa)}&speaker=${styleId}`;
      const queryResponse = await fetch(queryUrl, { method: "POST" });
      if (!queryResponse.ok) {
        throw new Error(`VOICEVOX /audio_query error: status ${queryResponse.status}`);
      }
      
      const queryJson: any = await queryResponse.json();

      // 2. Adjust with configured tuning ratios
      queryJson.speedScale = settings.speedScale !== undefined ? settings.speedScale : 0.95;
      queryJson.pitchScale = settings.pitchScale !== undefined ? settings.pitchScale : 0.0;
      queryJson.intonationScale = settings.intonationScale !== undefined ? settings.intonationScale : 1.0;
      queryJson.volumeScale = settings.volumeScale !== undefined ? settings.volumeScale : 1.0;
      
      if (settings.prePhonemeLength !== undefined) {
        queryJson.prePhonemeLength = settings.prePhonemeLength;
      }
      if (settings.postPhonemeLength !== undefined) {
        queryJson.postPhonemeLength = settings.postPhonemeLength;
      }

      // 3. POST /synthesis?speaker=<speakerId>
      const synthesisUrl = `${baseUrl}/synthesis?speaker=${styleId}`;
      const synthResponse = await fetch(synthesisUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryJson)
      });

      if (!synthResponse.ok) {
        throw new Error(`VOICEVOX /synthesis error: status ${synthResponse.status}`);
      }

      const wavArrayBuffer = await synthResponse.arrayBuffer();
      const wavBuffer = Buffer.from(wavArrayBuffer);
      const { pcm, sampleRate } = extractPcmFromWav(wavBuffer);
      pcmBuffers.push(pcm);
      detectedSampleRate = sampleRate;
    }

    if (pcmBuffers.length === 0) {
      throw new Error("No voice synthesized");
    }

    const finalPcm = Buffer.concat(pcmBuffers);
    const mp3Buffer = pcmToMp3(finalPcm, detectedSampleRate);
    const mp3Base64 = mp3Buffer.toString("base64");

    res.json({
      success: true,
      mp3Base64: mp3Base64
    });

  } catch (error: any) {
    console.error("Error synthesizing VOICEVOX speech to MP3:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to synthesize VOICEVOX speech to MP3" });
  }
});

// Configure Vite integration for serving client files and dev server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite components inside dev mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production modes, serve compiled files from dist/ folder
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched and listening on http://localhost:${PORT}`);
  });
}

startServer();
