import JSZip from "jszip";
import { ListeningItem, AudioAsset } from "../types";
import { registerRuntimeUrl } from "./db";

/**
 * Packs a ListeningItem along with its binary AudioAssets (.mp3) into a standard .zip format
 * with a customizable name and the .jlptlisten extension.
 */
export async function exportToJlptListen(item: ListeningItem): Promise<Blob> {
  const zip = new JSZip();

  // 1. Create mapping file paths for the audio assets
  const audioAssetMetadata = item.audioAssets.map((asset, index) => {
    const paddedIndex = String(index + 1).padStart(3, "0");
    const filePath = `audio/segment-${paddedIndex}.mp3`;
    return {
      id: asset.id,
      segmentId: asset.segmentId,
      provider: asset.provider,
      mimeType: asset.mimeType || "audio/mpeg",
      voiceId: asset.voiceId,
      speakerId: asset.speakerId,
      settings: asset.settings,
      createdAt: asset.createdAt,
      filePath
    };
  });

  const manifest = {
    schemaVersion: "1.0.0",
    id: item.id,
    title: item.title,
    sourceType: "imported",
    originalFileName: item.originalFileName || item.title,
    sourceText: item.sourceText || "",
    segments: item.segments,
    audioAssets: audioAssetMetadata,
    questions: item.questions,
    ttsProvider: item.ttsProvider,
    ttsSettings: item.ttsSettings,
    analysis: item.analysis,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  };

  // Add manifest to root of package
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 2. Add raw audio asset buffers under audio/
  for (let idx = 0; idx < item.audioAssets.length; idx++) {
    const asset = item.audioAssets[idx];
    const meta = audioAssetMetadata[idx];
    if (asset.blob) {
      zip.file(meta.filePath, asset.blob);
    }
  }

  // 3. Compress and build
  return await zip.generateAsync({ type: "blob" });
}

/**
 * Loads and reconstructs a complete ListeningItem and its binary AudioAssets from a .jlptlisten ZIP file.
 */
export async function importFromJlptListen(file: File): Promise<ListeningItem> {
  const zip = await JSZip.loadAsync(file);

  // 1. Parse manifest file
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error("Invalid project file: manifest.json is missing from current .jlptlisten file.");
  }

  const manifestContent = await manifestFile.async("string");
  const manifest = JSON.parse(manifestContent);

  // 2. Load audio files as Blobs & reconstruct object URLs at runtime
  const audioAssets: AudioAsset[] = [];
  for (const metaAsset of (manifest.audioAssets || [])) {
    if (metaAsset.filePath) {
      const audioFile = zip.file(metaAsset.filePath);
      if (audioFile) {
        const arrayBuffer = await audioFile.async("arraybuffer");
        const blob = new Blob([arrayBuffer], { type: metaAsset.mimeType || "audio/mpeg" });
        const objectUrl = URL.createObjectURL(blob);
        registerRuntimeUrl(objectUrl);

        audioAssets.push({
          id: metaAsset.id,
          segmentId: metaAsset.segmentId,
          provider: metaAsset.provider,
          mimeType: metaAsset.mimeType || "audio/mpeg",
          blob,
          objectUrl,
          voiceId: metaAsset.voiceId,
          speakerId: metaAsset.speakerId,
          settings: metaAsset.settings,
          createdAt: metaAsset.createdAt
        });
      }
    }
  }

  const restoredItem: ListeningItem = {
    id: manifest.id || `listening-item-${Date.now()}`,
    title: manifest.title || file.name.replace(/\.jlptlisten$/i, ""),
    sourceType: "imported",
    originalFileName: manifest.originalFileName || file.name,
    sourceText: manifest.sourceText,
    segments: manifest.segments || [],
    audioAssets,
    questions: manifest.questions,
    ttsProvider: manifest.ttsProvider || "google",
    ttsSettings: manifest.ttsSettings,
    analysis: manifest.analysis,
    fileSize: file.size,
    createdAt: manifest.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return restoredItem;
}
