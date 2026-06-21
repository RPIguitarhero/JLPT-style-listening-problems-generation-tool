export interface DialoguePart {
  speaker: "Narrator" | "Man" | "Woman";
  labelJa: string;
  labelEn: string;
  textJa: string;
  textEn: string;
  tone?: string;
  pause?: number;
}

export interface VocabularyItem {
  word: string;
  furigana: string;
  meaning: string;
}

export interface JLPTQuestion {
  title: string;
  jlptLevel: string; // N5, N4, N3, N2, N1
  situationJa: string;
  situationEn: string;
  questionJa: string;
  questionEn: string;
  dialogue: DialoguePart[];
  options: string[]; // exactly 4 options
  optionsEn: string[]; // exactly 4 options in English
  correctAnswer: number; // 1-indexed (1, 2, 3, or 4)
  explanation: string;
  vocabulary: VocabularyItem[];
}

export interface AudioAsset {
  id: string;
  segmentId: string;
  provider: "google" | "voicevox" | "imported";
  mimeType: string;
  blob?: Blob;
  objectUrl?: string;
  voiceId?: string;
  speakerId?: string;
  settings?: any;
  createdAt: string;
}

export interface ListeningSegment {
  id: string;
  title: string;
  text: string;
  speakerLabel?: string;
  audioAssetId?: string;
  orderIndex: number;
  dialogue?: DialoguePart[];
  jlptLevel?: string;
}

export interface ListeningItem {
  id: string;
  title: string;
  sourceType: "generated" | "local_script" | "imported" | "saved";
  originalFileName?: string;
  sourceText?: string;
  segments: ListeningSegment[];
  audioAssets: AudioAsset[];
  questions?: any;
  ttsProvider: string;
  ttsSettings?: any;
  analysis?: AnalysisData | null;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisData {
  estimatedLevel: string;
  summary: string;
  vocabulary: {
    word: string;
    furigana: string;
    meaning: string;
  }[];
}

