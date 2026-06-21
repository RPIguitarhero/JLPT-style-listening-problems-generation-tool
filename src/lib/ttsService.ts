import { DialoguePart } from "../types";

// TTS settings definitions
export interface VoicevoxSettings {
  baseUrl: string;
  speakerMap: {
    Narrator: number;
    Man: number;
    Woman: number;
  };
  speedScale: number;
  pitchScale: number;
  intonationScale: number;
  volumeScale: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
}

export type TTSProvider = "google" | "voicevox";

// Standard popular fallback speakers from VOICEVOX for pre-loading or offline pickability
export interface VoicevoxStyleDescription {
  styleName: string;
  styleId: number;
  speakerName: string;
}

export const FALLBACK_VOICEVOX_STYLES: VoicevoxStyleDescription[] = [
  { speakerName: "四国めたん (Shikoku Metan)", styleName: "Normal (ノーマル)", styleId: 2 },
  { speakerName: "四国めたん (Shikoku Metan)", styleName: "Sweet (あまあま)", styleId: 0 },
  { speakerName: "四国めたん (Shikoku Metan)", styleName: "Tsundere (ツンツン)", styleId: 4 },
  { speakerName: "四国めたん (Shikoku Metan)", styleName: "Sexy (セクシー)", styleId: 6 },
  { speakerName: "ずんだもん (Zundamon)", styleName: "Normal (ノーマル)", styleId: 3 },
  { speakerName: "ずんだもん (Zundamon)", styleName: "Sweet (あまあま)", styleId: 1 },
  { speakerName: "ずんだもん (Zundamon)", styleName: "Tsundere (ツンツン)", styleId: 5 },
  { speakerName: "ずんだもん (Zundamon)", styleName: "Sassy (ささやき)", styleId: 22 },
  { speakerName: "春日部つむぎ (Kasukabe Tsumugi)", styleName: "Normal (ノーマル)", styleId: 8 },
  { speakerName: "雨晴はう (Amehare Hau)", styleName: "Normal (ノーマル)", styleId: 10 },
  { speakerName: "波音リツ (Namine Ritsu)", styleName: "Normal (ノーマル)", styleId: 9 },
  { speakerName: "玄野武宏 (Kurono Takehiro)", styleName: "Normal (ノーマル)", styleId: 11 },
  { speakerName: "青山龍星 (Aoyama Ryusei)", styleName: "Normal (ノーマル)", styleId: 13 },
  { speakerName: "白上虎太郎 (Shirakami Kotaro)", styleName: "Normal (ノーマル)", styleId: 12 },
  { speakerName: "冥鳴ひまり (Meimei Himari)", styleName: "Normal (ノーマル)", styleId: 14 },
  { speakerName: "九州そら (Kyushu Sora)", styleName: "Normal (ノーマル)", styleId: 16 }
];

const DEFAULT_SETTINGS: VoicevoxSettings = {
  baseUrl: "http://127.0.0.1:50021",
  speakerMap: {
    Narrator: 2, // Shikoku Metan Normal
    Man: 11,     // Kurono Takehiro Normal
    Woman: 8,    // Kasukabe Tsumugi Normal
  },
  speedScale: 0.95,
  pitchScale: 0.0,
  intonationScale: 1.0,
  volumeScale: 1.0,
};

import { saveToTtsCache, getFromTtsCache } from "./db";

const memoryCache = new Map<string, Blob>();

export async function saveToCache(key: string, blob: Blob): Promise<void> {
  memoryCache.set(key, blob);
  await saveToTtsCache(key, blob);
}

export async function getFromCache(key: string): Promise<Blob | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) || null;
  }
  return await getFromTtsCache(key);
}

// Generate an unambiguous cache key to avoid cache overlaps
export function getCacheKey(
  dialogue: DialoguePart[],
  provider: TTSProvider,
  settings: VoicevoxSettings
): string {
  const textSerialized = dialogue
    .map((line) => `${line.speaker}:${line.textJa}`)
    .join("||");

  if (provider === "google") {
    // Google API synthesis relies solely on the dialogue text content
    return `google:${textSerialized}`;
  }

  // Voicevox relies on style maps, speed, pitch, intonation and volume
  const voiceStr = `${settings.speakerMap.Narrator}_${settings.speakerMap.Man}_${settings.speakerMap.Woman}`;
  const numbersStr = `${settings.speedScale}_${settings.pitchScale}_${settings.intonationScale}_${settings.volumeScale}`;
  const durationStr = `${settings.prePhonemeLength ?? "0"}_${settings.postPhonemeLength ?? "0"}`;
  
  return `voicevox:[V:${voiceStr}][N:${numbersStr}][D:${durationStr}]:${textSerialized}`;
}

// Local Storage configurations
export function getStoredTTSProvider(): TTSProvider {
  try {
    const value = localStorage.getItem("jlpt-tts-provider");
    if (value === "voicevox") return "voicevox";
  } catch (_) {}
  return "google";
}

export function setStoredTTSProvider(provider: TTSProvider): void {
  try {
    localStorage.setItem("jlpt-tts-provider", provider);
  } catch (_) {}
}

export function getStoredVoicevoxSettings(): VoicevoxSettings {
  try {
    const value = localStorage.getItem("jlpt-voicevox-settings");
    if (value) {
      const parsed = JSON.parse(value);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (_) {}
  return DEFAULT_SETTINGS;
}

export function setStoredVoicevoxSettings(settings: VoicevoxSettings): void {
  try {
    localStorage.setItem("jlpt-voicevox-settings", JSON.stringify(settings));
  } catch (_) {}
}

// VOICEVOX active host detection
export async function testVoicevoxConnection(baseUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

  try {
    const versionUrl = `${baseUrl.replace(/\/$/, "")}/version`;
    const response = await fetch(versionUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const text = await response.text();
      return text.trim().replace(/^"|"$/g, "") || "Connected";
    }
    throw new Error(`Invalid status: ${response.status}`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw new Error(
      "VOICEVOX Engine is not reachable. Start Docker Desktop and run the VOICEVOX container at " + baseUrl
    );
  }
}

// Fetch live speakers from VOICEVOX
export interface VoicevoxSpeakerStyle {
  name: string;
  id: number;
}
export interface VoicevoxRawSpeaker {
  name: string;
  speaker_uuid: string;
  styles: VoicevoxSpeakerStyle[];
}

export async function fetchVoicevoxSpeakers(baseUrl: string): Promise<VoicevoxStyleDescription[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/speakers`;
    const response = await fetch(url);
    if (!response.ok) throw new Error();
    const data: VoicevoxRawSpeaker[] = await response.json();
    
    const results: VoicevoxStyleDescription[] = [];
    data.forEach((sp) => {
      sp.styles.forEach((style) => {
        results.push({
          speakerName: sp.name,
          styleName: style.name,
          styleId: style.id,
        });
      });
    });
    return results;
  } catch (err) {
    console.warn("Could not retrieve dynamically active VOICEVOX speakers, utilizando fallbacks.");
    return FALLBACK_VOICEVOX_STYLES;
  }
}

// Splicing utility to join multiple uncompressed LINEAR16 WAVE buffers together on client-side
export function concatenateWavBlobs(wavBlobs: Blob[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const readers = wavBlobs.map((blob) => {
      return new Promise<ArrayBuffer>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as ArrayBuffer);
        reader.onerror = () => rej(reader.error);
        reader.readAsArrayBuffer(blob);
      });
    });

    Promise.all(readers)
      .then((buffers) => {
        if (buffers.length === 0) {
          resolve(new Blob([], { type: "audio/wav" }));
          return;
        }
        if (buffers.length === 1) {
          resolve(new Blob([buffers[0]], { type: "audio/wav" }));
          return;
        }

        // Validate wave header signature
        const firstHeader = new DataView(buffers[0]);
        if (firstHeader.getUint32(0, false) !== 0x52494646) { // "RIFF"
          // If not RIFF format, raw concatenate (rare)
          resolve(new Blob(wavBlobs, { type: "audio/wav" }));
          return;
        }

        // Read channel, samplerate and bit parameters
        const numChannels = firstHeader.getUint16(22, true);
        const sampleRate = firstHeader.getUint32(24, true);
        const bitsPerSample = firstHeader.getUint16(34, true);

        let totalDataSize = 0;
        const dataChunks: ArrayBuffer[] = [];

        buffers.forEach((buf) => {
          const view = new DataView(buf);
          let pos = 12; // skip RIFF + WAVE signatures
          let dataPos = -1;
          let dataSize = 0;

          // Search chunks until we hit "data" subchunk
          while (pos < buf.byteLength - 8) {
            const chunkId = view.getUint32(pos, false);
            const chunkSize = view.getUint32(pos + 4, true);
            if (chunkId === 0x64617461) { // chunk signature "data" in ASCII
              dataPos = pos + 8;
              dataSize = chunkSize;
              break;
            }
            pos += 8 + chunkSize;
          }

          if (dataPos !== -1) {
            const chunk = buf.slice(dataPos, Math.min(dataPos + dataSize, buf.byteLength));
            dataChunks.push(chunk);
            totalDataSize += chunk.byteLength;
          } else {
            // fallback if distinct
            const chunk = buf.slice(44);
            dataChunks.push(chunk);
            totalDataSize += chunk.byteLength;
          }
        });

        // Pack combined PCM data into a master WAV container
        const headerBuffer = new ArrayBuffer(44);
        const view = new DataView(headerBuffer);

        // RIFF descriptor
        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + totalDataSize, true);
        writeString(view, 8, "WAVE");

        // Format sub-chunk
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // Linear PCM format
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        view.setUint32(28, byteRate, true);
        const blockAlign = (numChannels * bitsPerSample) / 8;
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);

        // Data sub-chunk header
        writeString(view, 36, "data");
        view.setUint32(40, totalDataSize, true);

        const mergedParts = [headerBuffer, ...dataChunks];
        resolve(new Blob(mergedParts, { type: "audio/wav" }));
      })
      .catch(reject);
  });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Single segment voicevox line synthesizer
export async function synthesizeSingleVoicevoxWord(
  text: string,
  styleId: number,
  settings: VoicevoxSettings
): Promise<Blob> {
  const baseUrl = settings.baseUrl.replace(/\/$/, "");
  
  // 1. POST /audio_query?text=<text>&speaker=<speakerId>
  const queryUrl = `${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${styleId}`;
  const queryResponse = await fetch(queryUrl, { method: "POST" });
  if (!queryResponse.ok) {
    throw new Error(`VOICEVOX /audio_query error: status ${queryResponse.status}`);
  }
  
  const queryJson = await queryResponse.json();

  // 2. Adjust with configured tuning ratios
  queryJson.speedScale = settings.speedScale;
  queryJson.pitchScale = settings.pitchScale;
  queryJson.intonationScale = settings.intonationScale;
  queryJson.volumeScale = settings.volumeScale;
  
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

  return await synthResponse.blob();
}

// High-level multi-speaker composite synthesizer dispatcher implementing caching
export async function synthesizeSpeech(
  dialogue: DialoguePart[],
  provider: TTSProvider,
  settings: VoicevoxSettings
): Promise<Blob> {
  const cacheKey = getCacheKey(dialogue, provider, settings);
  const cached = await getFromCache(cacheKey);
  if (cached) {
    console.log("⚡ Reusing cached dialogue speech audio for key:", cacheKey);
    return cached;
  }

  let finalBlob: Blob;

  if (provider === "google") {
    // Rely on existing Google integration
    const response = await fetch("/api/synthesize-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dialogue }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Google TTS response status code: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.mp3Base64) {
      throw new Error("Server processed Google speech but returned an empty binary MP3 payload.");
    }

    const binaryString = atob(result.mp3Base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    finalBlob = new Blob([bytes], { type: "audio/mpeg" });
  } else {
    // Rely on VOICEVOX endpoint returning MP3
    const response = await fetch("/api/synthesize-voicevox-mp3", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dialogue, settings }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `VOICEVOX Server response status code: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.mp3Base64) {
      throw new Error("Server processed VOICEVOX speech but returned an empty binary MP3 payload.");
    }

    const binaryString = atob(result.mp3Base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    finalBlob = new Blob([bytes], { type: "audio/mpeg" });
  }

  // Save successful result into storage cache
  await saveToCache(cacheKey, finalBlob);
  return finalBlob;
}
