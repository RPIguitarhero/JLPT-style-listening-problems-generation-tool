import { ListeningItem, AudioAsset } from "../types";

const DB_NAME = "jlpt-fluentconnect-library-db";
const DB_VERSION = 2;

// Explicitly track runtime object URLs to revoke them when no longer needed
const runtimeObjectUrls = new Set<string>();

export function registerRuntimeUrl(url: string) {
  runtimeObjectUrls.add(url);
}

export function revokeAllRuntimeUrls() {
  runtimeObjectUrls.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Error revoking runtime URL:", e);
    }
  });
  runtimeObjectUrls.clear();
}

export function revokeSingleRuntimeUrl(url: string) {
  if (url) {
    try {
      URL.revokeObjectURL(url);
      runtimeObjectUrls.delete(url);
    } catch (e) {
      console.warn("Error revoking single runtime URL:", e);
    }
  }
}

// Open IndexedDB instance safely
export function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("listening-items")) {
          db.createObjectStore("listening-items", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("audio-assets")) {
          db.createObjectStore("audio-assets", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("tts-cache")) {
          db.createObjectStore("tts-cache");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

// TTS Cache helpers (Separated Concept 1: Isolated Technical cache)
export async function saveToTtsCache(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction("tts-cache", "readwrite");
    const store = transaction.objectStore("tts-cache");
    store.put(blob, key);
  } catch (e) {
    console.warn("Failed to write to TTS Cache IndexedDB Store:", e);
  }
}

export async function getFromTtsCache(key: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction("tts-cache", "readonly");
      const store = transaction.objectStore("tts-cache");
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.warn("Failed to read from TTS Cache IndexedDB Store:", e);
    return null;
  }
}

export async function clearTtsCache(): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction("tts-cache", "readwrite");
    const store = transaction.objectStore("tts-cache");
    store.clear();
  } catch (e) {
    console.warn("Failed to clear TTS Cache store:", e);
  }
}

// Saved Library (Separated Concept 2: Permanent User Study Library)
export async function saveListeningItem(item: ListeningItem): Promise<void> {
  const db = await getDB();

  // Strip object URLs from items before saving, we store the pure binary blob in audio-assets
  const itemToSave = {
    ...item,
    audioAssets: item.audioAssets.map(asset => ({
      id: asset.id,
      segmentId: asset.segmentId,
      provider: asset.provider,
      mimeType: asset.mimeType || "audio/mpeg",
      voiceId: asset.voiceId,
      speakerId: asset.speakerId,
      settings: asset.settings,
      createdAt: asset.createdAt
    }))
  };

  // 1. Transaction to save metadata
  const tx1 = db.transaction("listening-items", "readwrite");
  const store1 = tx1.objectStore("listening-items");
  await new Promise<void>((resolve, reject) => {
    const req = store1.put(itemToSave);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // 2. Transaction to save binary audio blobs
  const tx2 = db.transaction("audio-assets", "readwrite");
  const store2 = tx2.objectStore("audio-assets");
  for (const asset of item.audioAssets) {
    if (asset.blob) {
      await new Promise<void>((resolve, reject) => {
        const req = store2.put({
          id: asset.id,
          itemId: item.id,
          segmentId: asset.segmentId,
          blob: asset.blob,
          createdAt: asset.createdAt
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  }
}

export async function loadListeningItems(): Promise<ListeningItem[]> {
  const db = await getDB();

  // 1. Fetch metadata List
  const items: ListeningItem[] = await new Promise((resolve, reject) => {
    const tx = db.transaction("listening-items", "readonly");
    const store = tx.objectStore("listening-items");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  // 2. Fetch all raw audio records
  const rawBlobs: Array<{ id: string; itemId: string; segmentId: string; blob: Blob }> = await new Promise((resolve, reject) => {
    const tx = db.transaction("audio-assets", "readonly");
    const store = tx.objectStore("audio-assets");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  // 3. Glue items and reconstruct object URLs at runtime
  for (const item of items) {
    item.audioAssets = item.audioAssets.map(metaAsset => {
      const match = rawBlobs.find(b => b.id === metaAsset.id);
      if (match && match.blob) {
        // Recreate object URL on load
        const objectUrl = URL.createObjectURL(match.blob);
        registerRuntimeUrl(objectUrl);
        return {
          ...metaAsset,
          blob: match.blob,
          objectUrl
        };
      }
      return metaAsset;
    });
  }

  // Sort by updatedAt descending
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function deleteListeningItem(id: string): Promise<void> {
  const db = await getDB();

  // 1. Find the item to clear its active URL references first
  try {
    const tx = db.transaction("listening-items", "readonly");
    const store = tx.objectStore("listening-items");
    const item: ListeningItem | null = await new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (item && item.audioAssets) {
      item.audioAssets.forEach(asset => {
        if (asset.objectUrl) {
          revokeSingleRuntimeUrl(asset.objectUrl);
        }
      });
    }
  } catch (e) {
    console.warn("Non-critical cleanup warning:", e);
  }

  // 2. Remove metadata
  const tx1 = db.transaction("listening-items", "readwrite");
  const store1 = tx1.objectStore("listening-items");
  await new Promise<void>((resolve, reject) => {
    const req = store1.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // 3. Remove raw blobs
  const tx2 = db.transaction("audio-assets", "readwrite");
  const store2 = tx2.objectStore("audio-assets");
  const rawBlobs: Array<{ id: string; itemId: string }> = await new Promise((resolve) => {
    const req = store2.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  for (const b of rawBlobs) {
    if (b.itemId === id) {
      await new Promise<void>((resolve) => {
        const req = store2.delete(b.id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    }
  }
}
