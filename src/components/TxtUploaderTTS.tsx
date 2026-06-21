import React, { useState, useRef, useEffect } from "react";
import { Upload, FileText, Download, Music, Play, Pause, Clock, Volume2, VolumeX, Eye, EyeOff, Sparkles, Loader2, AlertTriangle, CheckCircle, ListMusic, SkipBack, SkipForward, FolderOpen, Save, Trash2, FileOutput } from "lucide-react";
import JSZip from "jszip";
import { useTranslation } from "../lib/translations";
import {
  synthesizeSpeech,
  getStoredTTSProvider,
  getStoredVoicevoxSettings
} from "../lib/ttsService";
import { saveListeningItem, loadListeningItems, deleteListeningItem, revokeSingleRuntimeUrl } from "../lib/db";
import { exportToJlptListen, importFromJlptListen } from "../lib/projectZip";

interface DialogueLine {
  speaker: "Man" | "Woman" | "Narrator";
  labelJa: string;
  labelEn: string;
  textJa: string;
  textEn: string;
  tone?: string;
  emotion?: string;
  character?: string;
  pause?: number;
}

interface ParsedSegment {
  title: string;
  textJa: string;
  dialogue: DialogueLine[];
  jlptLevel?: string;
}

import { ListeningItem, ListeningSegment, AudioAsset, DialoguePart, AnalysisData } from "../types";

interface TxtUploaderTTSProps {
  activeListeningItem: ListeningItem | null;
  setActiveListeningItem: React.Dispatch<React.SetStateAction<ListeningItem | null>>;
  activeSegmentIndex: number;
  setActiveSegmentIndex: (idx: number) => void;
  ttsProvider: string;
}

export default function TxtUploaderTTS({
  activeListeningItem,
  setActiveListeningItem,
  activeSegmentIndex,
  setActiveSegmentIndex,
  ttsProvider
}: TxtUploaderTTSProps) {
  const { t, lang } = useTranslation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Library State & Initial Sync
  const [savedLibrary, setSavedLibrary] = useState<ListeningItem[]>([]);
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);

  const refreshLibrary = async () => {
    try {
      const items = await loadListeningItems();
      setSavedLibrary(items);
    } catch (e: any) {
      console.error("Failed to load IndexedDB items:", e);
    }
  };

  useEffect(() => {
    refreshLibrary();
  }, []);

  const handleSaveCurrentToLibrary = async () => {
    if (!activeListeningItem) return;
    setIsSavingLibrary(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const itemToSave: ListeningItem = {
        ...activeListeningItem,
        updatedAt: new Date().toISOString()
      };
      await saveListeningItem(itemToSave);
      setSuccessMsg("Successfully saved this lesson and its generated voice tracks to your offline study library!");
      refreshLibrary();
    } catch (err: any) {
      setErrorMsg("Failed to save to study library: " + err.message);
    } finally {
      setIsSavingLibrary(false);
    }
  };

  const handleExportJlptListenProject = async () => {
    if (!activeListeningItem) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const blob = await exportToJlptListen(activeListeningItem);
      const dlLink = document.createElement("a");
      dlLink.href = URL.createObjectURL(blob);
      const baseName = fileName ? fileName.substring(0, fileName.lastIndexOf(".")) : "lesson";
      dlLink.download = `${baseName}.jlptlisten`;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      setSuccessMsg("Export package generated successfully! You can share or move this .jlptlisten file to other browsers.");
    } catch (err: any) {
      setErrorMsg("Failed to export project: " + err.message);
    }
  };

  const handleImportJlptListenProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (file.name.endsWith(".jlptlisten")) {
        const item = await importFromJlptListen(file);
        setActiveListeningItem(item);
        setActiveSegmentIndex(0);
        setSuccessMsg(`Successfully imported project "${item.title}"! All speech audio clips preloaded!`);
        // Save to offline library automatically
        await saveListeningItem(item);
        refreshLibrary();
      } else {
        setErrorMsg("Please select a valid .jlptlisten file format.");
      }
    } catch (err: any) {
      setErrorMsg("Failed to import .jlptlisten project: " + err.message);
    }
    e.target.value = "";
  };

  const handleDeleteLibraryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this save from your local study library?")) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await deleteListeningItem(id);
      setSuccessMsg("Selected item deleted from your offline library.");
      if (activeListeningItem?.id === id) {
        handleReset();
      }
      refreshLibrary();
    } catch (err: any) {
      setErrorMsg("Failed to delete item: " + err.message);
    }
  };

  const handleLoadLibraryItem = (item: ListeningItem) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    // Unload active first if any
    if (activeListeningItem) {
      activeListeningItem.audioAssets.forEach(asset => {
        if (asset.objectUrl) {
          revokeSingleRuntimeUrl(asset.objectUrl);
        }
      });
    }
    setActiveListeningItem(item);
    setActiveSegmentIndex(0);
    setSuccessMsg(`Loaded "${item.title}" into active workspace.`);
  };

  // Derive values from activeListeningItem
  const fileName = activeListeningItem?.originalFileName || activeListeningItem?.title || "";
  const sourceText = activeListeningItem?.sourceText || "";
  const segments = activeListeningItem?.segments || [];
  const analysis = activeListeningItem?.analysis || null;
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Compute generatedAudios map based on audioAssets
  const generatedAudios: Record<number, string> = React.useMemo(() => {
    const map: Record<number, string> = {};
    if (activeListeningItem) {
      activeListeningItem.segments.forEach((seg, idx) => {
        const asset = activeListeningItem.audioAssets.find(a => a.segmentId === seg.id);
        if (asset?.objectUrl) {
          map[idx] = asset.objectUrl;
        }
      });
    }
    return map;
  }, [activeListeningItem]);

  const [generatingIndexes, setGeneratingIndexes] = useState<Record<number, boolean>>({});
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Script visibility toggle
  const [showScript, setShowScript] = useState(false);

  const handlePrev = () => {
    if (segments.length <= 1) return;
    const newIdx = (activeSegmentIndex - 1 + segments.length) % segments.length;
    setActiveSegmentIndex(newIdx);
  };

  const handleNext = () => {
    if (segments.length <= 1) return;
    const newIdx = (activeSegmentIndex + 1) % segments.length;
    setActiveSegmentIndex(newIdx);
  };

  // Reset audio player when active segment or audio change
  const activeAudioUrl = generatedAudios[activeSegmentIndex] || null;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [activeSegmentIndex, activeAudioUrl]);

  // Set playback speed when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeAudioUrl]);

  // Set volume/mute status
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Core File Process or Loader
  const processFile = (selectedFile: File) => {
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    const allowedExtensions = [".txt", ".json", ".xml"];

    if (!allowedExtensions.includes(extension)) {
      setErrorMsg(`Unsupported file type "${extension}". Please upload a .txt, .json, or .xml document.`);
      return;
    }

    if (selectedFile.size === 0) {
      setErrorMsg("The uploaded file is completely empty. Please choose a valid file.");
      return;
    }

    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const textStr = event.target?.result as string;
        parseAndLoadSegments(selectedFile.name, extension, textStr, selectedFile.size);
      } catch (err: any) {
        console.error("FileReader Parsing error:", err);
        setErrorMsg(`Failed to read the file contents: ${err.message || "Unreadable or corrupted file format"}`);
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file because of system filesystem access rules.");
      setIsParsing(false);
    };
    reader.readAsText(selectedFile);
  };

  // Parser dispatcher
  const parseAndLoadSegments = (filename: string, extension: string, content: string, size?: number) => {
    try {
      let loadedSegments: ParsedSegment[] = [];

      if (extension === ".txt") {
        loadedSegments = parseTextFile(content);
      } else if (extension === ".json") {
        loadedSegments = parseJsonFile(content);
      } else if (extension === ".xml") {
        loadedSegments = parseXmlFile(content);
      }

      if (loadedSegments.length === 0) {
        throw new Error("No readable or structured segments could be detected inside this text document.");
      }

      const segmentsList: ListeningSegment[] = loadedSegments.map((s, idx) => ({
        id: `local-seg-${idx}-${Date.now()}`,
        title: s.title,
        text: s.textJa,
        speakerLabel: s.dialogue?.[0]?.labelJa || "Narrator",
        orderIndex: idx,
        dialogue: s.dialogue as DialoguePart[],
        jlptLevel: s.jlptLevel
      }));

      const newItem: ListeningItem = {
        id: `listening-item-${Date.now()}`,
        title: filename,
        sourceType: "local_script",
        originalFileName: filename,
        sourceText: content,
        segments: segmentsList,
        audioAssets: [],
        ttsProvider: ttsProvider,
        analysis: null,
        fileSize: size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setActiveListeningItem(newItem);
      setActiveSegmentIndex(0);
      setSuccessMsg(`Successfully parsed "${filename}"! Extracted ${loadedSegments.length} text segment(s).`);

    } catch (err: any) {
      console.error("Segment loading error:", err);
      setErrorMsg(`Parsing failed: ${err.message || "File formatting did not match expectations."}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Smart Plain Text Parser
  const parseTextFile = (content: string): ParsedSegment[] => {
    const lines = content.split("\n");
    const parsed: ParsedSegment[] = [];
    let current: ParsedSegment | null = null;
    let segCount = 1;

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Match headers: e.g. "### Dialogue Title" or "[Dialogue Title]" or "Section 1 Dialog"
      const headerMatch = line.match(/^(?:###|##|#)\s*(.+)$/) || line.match(/^\[(.+)\]$/) || line.match(/^(?:Section|Chapter|Part)\s+\d+[:\s]*(.*)$/i);
      if (headerMatch) {
        if (current && current.textJa) {
          parsed.push(current);
        }
        current = {
          title: headerMatch[1].trim() || `Segment ${segCount}`,
          textJa: "",
          dialogue: []
        };
        segCount++;
        continue;
      }

      if (!current) {
        current = {
          title: `Paragraph ${segCount}`,
          textJa: "",
          dialogue: []
        };
        segCount++;
      }

      if (current.textJa) {
        current.textJa += "\n" + line;
      } else {
        current.textJa = line;
      }
    }

    if (current && current.textJa) {
      parsed.push(current);
    }

    if (parsed.length === 0 && content.trim()) {
      parsed.push({
        title: "Plain Text Segment",
        textJa: content.trim(),
        dialogue: []
      });
    }

    // Secondary parsing for dynamic speakers within segments: Look for "Man: ...", "男の人: ..."
    return parsed.map(seg => {
      const linesArr = seg.textJa.split("\n");
      const dialogArr: DialogueLine[] = [];

      for (let ln of linesArr) {
        const itemLine = ln.trim();
        if (!itemLine) continue;

        const speakerRegex = /^([\p{L}\p{N}\s（）()・ー\-]{1,40})\s*[:：]\s*(.+)$/u;
        const match = itemLine.match(speakerRegex);
        if (match) {
          const labelJa = match[1].trim();
          const rawName = labelJa.toLowerCase();
          let speakerKey: "Man" | "Woman" | "Narrator" = "Woman";

          if (rawName.includes("男") || rawName.includes("man") || rawName.includes("fenrir")) {
            speakerKey = "Man";
          } else if (rawName.includes("女") || rawName.includes("woman") || rawName.includes("kore")) {
            speakerKey = "Woman";
          } else if (
            rawName.includes("ナレーター") ||
            rawName.includes("アナウンス") ||
            rawName.includes("放送") ||
            rawName.includes("案内") ||
            rawName.includes("narrator") ||
            rawName.includes("解説") ||
            rawName.includes("朗読")
          ) {
            speakerKey = "Narrator";
          } else {
            // Safe default role for other speaker nouns (like 先生, 学生, 店員)
            speakerKey = "Woman";
          }

          dialogArr.push({
            speaker: speakerKey,
            labelJa,
            labelEn: match[1],
            textJa: match[2],
            textEn: ""
          });
        } else {
          // Carry down active or default to Woman narrator
          const prev = dialogArr[dialogArr.length - 1];
          dialogArr.push({
            speaker: prev ? prev.speaker : "Woman",
            labelJa: prev ? prev.labelJa : "ナレーター",
            labelEn: prev ? prev.labelEn : "Narrator",
            textJa: itemLine,
            textEn: ""
          });
        }
      }

      return {
        ...seg,
        dialogue: dialogArr.length > 0 ? dialogArr : [
          {
            speaker: "Woman" as const,
            labelJa: "ナレーター",
            labelEn: "Narrator",
            textJa: seg.textJa,
            textEn: ""
          }
        ]
      };
    });
  };

  // Recurse JSON elements
  const parseJsonFile = (content: string): ParsedSegment[] => {
    const data = JSON.parse(content);
    let topLevelJlpt: string | undefined = data.jlptLevel || data.level || data.jlpt || undefined;
    let extracted: ParsedSegment[] = [];

    const normalizeLine = (item: any): DialogueLine => {
      const textJa = item.textJa || item.text || item.line || item.script || item.dialogue || item.content || "";
      const textEn = item.textEn || item.translation || "";
      let speaker = item.speaker || item.character || item.voice || "Woman";
      let labelJa = item.labelJa || item.label || item.charName || item.speaker || "ナレーター";
      let labelEn = item.labelEn || item.speaker || "Narrator";

      // Speaker logic
      let normalizedSpeaker: "Man" | "Woman" | "Narrator" = "Woman";
      const spL = String(speaker).toLowerCase();
      if (spL.includes("man") || spL.includes("男")) {
        normalizedSpeaker = "Man";
      } else if (spL.includes("woman") || spL.includes("女")) {
        normalizedSpeaker = "Woman";
      } else if (spL.includes("narrator") || spL.includes("解説") || spL.includes("朗読")) {
        normalizedSpeaker = "Narrator";
      }

      return {
        textJa: String(textJa).trim(),
        textEn: String(textEn).trim(),
        speaker: normalizedSpeaker,
        labelJa: String(labelJa).trim(),
        labelEn: String(labelEn).trim(),
        tone: item.tone || item.emotion || item.style || undefined,
        emotion: item.emotion || undefined,
        character: item.character || undefined,
        pause: item.pause || item.delay || undefined
      };
    };

    if (Array.isArray(data)) {
      // Determine if it represents sub-sections or dialogue elements
      const hasTitles = data.some(item => item.title || item.segment || item.scene || item.chapter);
      if (hasTitles) {
        extracted = data.map((item, idx) => {
          const title = item.title || item.segment || item.scene || item.chapter || `Segment ${idx + 1}`;
          const fields = normalizeLine(item);
          return {
            title,
            textJa: fields.textJa,
            dialogue: [fields],
            jlptLevel: item.jlptLevel || item.level || item.jlpt || topLevelJlpt
          };
        });
      } else {
        const dialogue = data.map(item => normalizeLine(item));
        extracted = [{
          title: "Parsed Dialogue List",
          textJa: dialogue.map(l => l.textJa).join("\n"),
          dialogue,
          jlptLevel: topLevelJlpt
        }];
      }
    } else if (typeof data === "object" && data !== null) {
      // Try to find list properties
      const listKey = ["dialogue", "dialogues", "lines", "segments", "scenes", "chapters", "items", "script"].find(k => Array.isArray(data[k]));
      if (listKey) {
        const list = data[listKey];
        if (["segments", "scenes", "chapters", "dialogues"].includes(listKey)) {
          extracted = list.map((item: any, idx: number) => {
            const title = item.title || item.segment || item.scene || item.chapter || `Segment ${idx + 1}`;
            // If segment contains its own lines array
            const innerLinesKey = ["dialogue", "lines", "script", "dialogues"].find(k => Array.isArray(item[k]));
            if (innerLinesKey) {
              const innerLines = item[innerLinesKey].map((l: any) => normalizeLine(l));
              return {
                title,
                textJa: innerLines.map((l: any) => l.textJa).join("\n"),
                dialogue: innerLines,
                jlptLevel: item.jlptLevel || item.level || item.jlpt || topLevelJlpt
              };
            }
            const fields = normalizeLine(item);
            return {
              title,
              textJa: fields.textJa,
              dialogue: [fields],
              jlptLevel: item.jlptLevel || item.level || item.jlpt || topLevelJlpt
            };
          });
        } else {
          const dialogue = list.map((item: any) => normalizeLine(item));
          extracted = [{
            title: data.title || "Dialogue Script",
            textJa: dialogue.map(l => l.textJa).join("\n"),
            dialogue,
            jlptLevel: topLevelJlpt
          }];
        }
      } else {
        // Flat object
        const fields = normalizeLine(data);
        extracted = [{
          title: data.title || "Parsed Content Item",
          textJa: fields.textJa,
          dialogue: [fields],
          jlptLevel: topLevelJlpt
        }];
      }
    }

    return extracted.map(s => ({
      ...s,
      jlptLevel: s.jlptLevel || topLevelJlpt
    }));
  };

  // Browser standard DOMParser for XML files
  const parseXmlFile = (content: string): ParsedSegment[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/xml");

    const parseError = doc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
      throw new Error("Invalid XML layout syntax: " + parseError[0].textContent);
    }

    let globalLevel = doc.querySelector("jlptLevel, level, jlpt")?.textContent?.trim() || undefined;
    const extracted: ParsedSegment[] = [];

    const getElementVal = (el: Element, tags: string[]): string => {
      for (const t of tags) {
        const found = el.querySelector(t);
        if (found) return found.textContent || "";
      }
      return "";
    };

    const normalizeNode = (el: Element): DialogueLine => {
      const textJa = getElementVal(el, ["textJa", "text", "line", "script", "dialogue", "content"]);
      const textEn = getElementVal(el, ["textEn", "translation"]);
      const speaker = getElementVal(el, ["speaker", "character", "voice"]) || "Woman";
      const labelJa = getElementVal(el, ["labelJa", "label", "charName"]) || speaker || "ナレーター";
      const labelEn = getElementVal(el, ["labelEn"]) || speaker || "Narrator";
      const tone = el.querySelector("tone, emotion, style")?.textContent?.trim() || undefined;
      const pauseVal = el.querySelector("pause, delay")?.textContent;
      const pause = pauseVal ? parseFloat(pauseVal) : undefined;

      let normalizedSpeaker: "Man" | "Woman" | "Narrator" = "Woman";
      const spL = speaker.toLowerCase();
      if (spL.includes("man") || spL.includes("男")) {
        normalizedSpeaker = "Man";
      } else if (spL.includes("woman") || spL.includes("女")) {
        normalizedSpeaker = "Woman";
      } else if (spL.includes("narrator") || spL.includes("解説") || spL.includes("朗読")) {
        normalizedSpeaker = "Narrator";
      }

      return {
        textJa: textJa.trim(),
        textEn: textEn.trim(),
        speaker: normalizedSpeaker,
        labelJa: labelJa.trim(),
        labelEn: labelEn.trim(),
        tone,
        pause
      };
    };

    const segmentsNodes = doc.querySelectorAll("segment, scene, chapter, dialogue_group");
    const lineNodes = doc.querySelectorAll("line, item, dialogue_line, entry");

    if (segmentsNodes.length > 0) {
      segmentsNodes.forEach((node, idx) => {
        const title = node.querySelector("title, name")?.textContent?.trim() || `Segment ${idx + 1}`;
        const innerLines = node.querySelectorAll("line, item, entry");
        if (innerLines.length > 0) {
          const dialogue: DialogueLine[] = [];
          innerLines.forEach(ln => dialogue.push(normalizeNode(ln)));
          extracted.push({
            title,
            textJa: dialogue.map(l => l.textJa).join("\n"),
            dialogue,
            jlptLevel: node.querySelector("jlptLevel, level, jlpt")?.textContent?.trim() || globalLevel
          });
        } else {
          const fields = normalizeNode(node);
          extracted.push({
            title,
            textJa: fields.textJa,
            dialogue: [fields],
            jlptLevel: node.querySelector("jlptLevel, level, jlpt")?.textContent?.trim() || globalLevel
          });
        }
      });
    } else if (lineNodes.length > 0) {
      const dialogue: DialogueLine[] = [];
      lineNodes.forEach(node => {
        dialogue.push(normalizeNode(node));
      });
      extracted.push({
        title: doc.querySelector("title")?.textContent?.trim() || "XML Dialog Section",
        textJa: dialogue.map(l => l.textJa).join("\n"),
        dialogue,
        jlptLevel: globalLevel
      });
    } else {
      const rootText = doc.documentElement.textContent || "";
      extracted.push({
        title: "Parsed XML Document",
        textJa: rootText.trim(),
        dialogue: [{
          speaker: "Woman",
          labelJa: "ナレーター",
          labelEn: "Narrator",
          textJa: rootText.trim(),
          textEn: ""
        }],
        jlptLevel: globalLevel
      });
    }

    return extracted.filter(s => s.textJa.trim() !== "");
  };

  // Call server to estimate JLPT level and summarize
  const analyzeJapaneseContent = async (text: string, xmlJsonLevel?: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed. Status: " + response.status);
      }

      const resBody = await response.json();
      if (resBody.success) {
        const analyzed: AnalysisData = resBody.data;
        // If the file explicitly contains a legal level description, we honor it, otherwise we take the estimated one
        if (xmlJsonLevel && ["N1", "N2", "N3", "N4", "N5"].includes(xmlJsonLevel.toUpperCase())) {
          analyzed.estimatedLevel = xmlJsonLevel.toUpperCase();
        }
        setActiveListeningItem(prev => {
          if (!prev) return null;
          return {
            ...prev,
            analysis: analyzed,
            updatedAt: new Date().toISOString()
          };
        });
      }
    } catch (err: any) {
      console.warn("Could not retrieve AI text categorization analysis:", err);
      // Construct fallback analysis if API call errors out
      const fallback: AnalysisData = {
        estimatedLevel: xmlJsonLevel || "Unknown / Mixed",
        summary: "The Japanese text was parsed and preloaded. Quick AI summary is currently unavailable.",
        vocabulary: []
      };
      setActiveListeningItem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          analysis: fallback,
          updatedAt: new Date().toISOString()
        };
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Request single segment speech synthesis
  const generateSegmentAudio = async (index: number) => {
    if (generatingIndexes[index]) return;
    setGeneratingIndexes(prev => ({ ...prev, [index]: true }));
    setErrorMsg(null);

    try {
      const segment = segments[index];
      const currentProvider = getStoredTTSProvider();
      const currentSettings = getStoredVoicevoxSettings();

      const blob = await synthesizeSpeech(segment.dialogue as any, currentProvider, currentSettings);
      const url = URL.createObjectURL(blob);

      const newAsset: AudioAsset = {
        id: `local-asset-${segment.id}-${Date.now()}`,
        segmentId: segment.id,
        provider: currentProvider === "voicevox" ? "voicevox" : "google",
        mimeType: blob.type || "audio/mpeg",
        blob: blob,
        objectUrl: url,
        createdAt: new Date().toISOString()
      };

      setActiveListeningItem(prev => {
        if (!prev) return null;
        const cleanAssets = prev.audioAssets.filter(asset => asset.segmentId !== segment.id);
        return {
          ...prev,
          audioAssets: [...cleanAssets, newAsset],
          updatedAt: new Date().toISOString()
        };
      });
    } catch (err: any) {
      console.error(`TTS Generation fail for segment ${index}:`, err);
      setErrorMsg(`TTS generation failed: ${err.message || "Unknown error during audio voice translation."}`);
    } finally {
      setGeneratingIndexes(prev => ({ ...prev, [index]: false }));
    }
  };

  // Bulk generate all segments consecutively
  const handleBulkGenerate = async () => {
    if (segments.length === 0 || isBulkGenerating) return;
    setIsBulkGenerating(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < segments.length; i++) {
        // Skip already loaded audios to conserve limits
        if (generatedAudios[i]) continue;
        await generateSegmentAudio(i);
      }
      setSuccessMsg("All segments synthesized successfully. Ready to listen or download ZIP.");
    } catch (err: any) {
      setErrorMsg("Failed to complete full synthesis queue: " + err.message);
    } finally {
      setIsBulkGenerating(false);
    }
  };

  // Generate ZIP of all ready mp3 files
  const downloadAllAsZip = async () => {
    const urlsCount = Object.keys(generatedAudios).length;
    if (urlsCount === 0) {
      setErrorMsg("Please generate speech audio files first before trying to download a ZIP archive.");
      return;
    }

    const zip = new JSZip();
    const baseName = fileName ? fileName.substring(0, fileName.lastIndexOf(".")) : "tts_audio";

    for (let i = 0; i < segments.length; i++) {
      const audioUrl = generatedAudios[i];
      if (!audioUrl) continue;

      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        
        // Structure safe file names: e.g. "lesson1_01_Greeting.mp3"
        const cleanSegTitle = segments[i].title
          .replace(/[^\w\s\u4e00-\u9fa5]/gi, "")
          .trim()
          .replace(/\s+/g, "_");
        const paddedIndex = String(i + 1).padStart(2, "0");
        const filename = `${baseName}_${paddedIndex}_${cleanSegTitle || "segment"}.mp3`;

        zip.file(filename, blob);
      } catch (err) {
        console.error(`Could not append index ${i} to zip:`, err);
      }
    }

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const dlLink = document.createElement("a");
      dlLink.href = URL.createObjectURL(zipBlob);
      dlLink.download = `${baseName}_synthesized.zip`;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      setSuccessMsg("ZIP file successfully archived and starting download.");
    } catch (err: any) {
      setErrorMsg("Failed to bundle ZIP package: " + err.message);
    }
  };

  // Audio Player action methods
  const handlePlayPause = () => {
    if (!audioRef.current || !activeAudioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Playback error:", e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const singleDownload = (idx: number) => {
    const audioUrl = generatedAudios[idx];
    if (!audioUrl) return;

    const baseName = fileName ? fileName.substring(0, fileName.lastIndexOf(".")) : "tts_audio";
    const cleanSegTitle = segments[idx].title
      .replace(/[^\w\s\u4e00-\u9fa5]/gi, "")
      .trim()
      .replace(/\s+/g, "_");
    const paddedIndex = String(idx + 1).padStart(2, "0");

    const dlLink = document.createElement("a");
    dlLink.href = audioUrl;
    dlLink.download = `${baseName}_${paddedIndex}_${cleanSegTitle || "segment"}.mp3`;
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Quick reset to allow picking a different file
  const handleReset = () => {
    const hasAudio = activeListeningItem?.audioAssets && activeListeningItem.audioAssets.length > 0;
    const hasSegments = activeListeningItem?.segments && activeListeningItem.segments.length > 0;
    
    if (hasAudio || hasSegments) {
      if (!window.confirm("Clear the current uploaded script and generated audio?")) {
        return;
      }
    }
    
    // Revoke object URLs to free up memory
    if (activeListeningItem) {
      activeListeningItem.audioAssets.forEach(asset => {
        if (asset.objectUrl) {
          URL.revokeObjectURL(asset.objectUrl);
        }
      });
    }

    setActiveListeningItem(null);
    setActiveSegmentIndex(0);
    setGeneratingIndexes({});
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="flex flex-col gap-6" id="txt-uploader-tts-root">
      
      {/* Alert panels */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-2.5 text-sm" id="upload-error-msg">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error Occurred</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700 font-bold text-xs cursor-pointer select-none">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-2.5 text-sm" id="upload-success-msg">
          <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">
            <p className="font-bold">Completed</p>
            <p className="text-xs mt-0.5">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-700 font-bold text-xs cursor-pointer select-none">✕</button>
        </div>
      )}

      {/* Upload Landing Section */}
      {segments.length === 0 ? (
        <div className="flex flex-col gap-6">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="bg-white border-2 border-dashed border-slate-200 hover:border-indigo-400 p-10 rounded-3xl text-center transition-all shadow-xs flex flex-col items-center justify-center gap-4 group"
            id="upload-dropzone"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors">
              {isParsing ? (
                <Loader2 className="animate-spin" size={32} />
              ) : (
                <Upload size={32} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{t("drag_drop_title")}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {t("supported_files_desc")}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <label className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs p-3 px-5 rounded-2xl cursor-pointer shadow-xs whitespace-nowrap transition-colors flex items-center gap-1.5 select-none hover:shadow-md active:scale-95 transform duration-150">
                <Upload size={14} />
                <span>{t("browse_files_btn")}</span>
                <input
                  type="file"
                  accept=".txt,.json,.xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <label className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-3 px-5 rounded-2xl cursor-pointer shadow-xs whitespace-nowrap transition-colors flex items-center gap-1.5 select-none hover:shadow-md active:scale-95 transform duration-150">
                <FolderOpen size={14} />
                <span>Import Project (.jlptlisten)</span>
                <input
                  type="file"
                  accept=".jlptlisten"
                  onChange={handleImportJlptListenProject}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Saved Library Cards Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Save size={16} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Your Saved Study Library</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 p-1 px-2.5 rounded-lg border border-slate-100">
                {savedLibrary.length} saved lessons
              </span>
            </div>

            {savedLibrary.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500">Your study library is currently empty</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Upload a Japanese local script, generate speech voice tracks, and click "Save to Library" to keep files archived on this device for offline review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedLibrary.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadLibraryItem(item)}
                    className="border border-slate-200 hover:border-indigo-200 p-4 rounded-2xl flex flex-col justify-between gap-3 bg-white hover:bg-slate-50/40 transition-all cursor-pointer group hover:shadow-2xs"
                  >
                    <div className="flex items-start gap-3 justify-between">
                      <div className="overflow-hidden flex-1">
                        <h5 className="font-bold text-xs text-slate-800 truncate group-hover:text-indigo-600">
                          {item.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {item.segments?.length || 0} Segment(s) • {(item.audioAssets || []).length} Voiced
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLibraryItem(item.id, e)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Delete from Library"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/60 pt-3">
                      <span className="text-[10px] text-slate-400">
                        Saved: {new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const blob = await exportToJlptListen(item);
                              const dlLink = document.createElement("a");
                              dlLink.href = URL.createObjectURL(blob);
                              dlLink.download = `${item.title.replace(/\.[^/.]+$/, "") || "lesson"}.jlptlisten`;
                              document.body.appendChild(dlLink);
                              dlLink.click();
                              document.body.removeChild(dlLink);
                              setSuccessMsg(`Successfully exported "${item.title}"!`);
                            } catch (err: any) {
                              setErrorMsg("Failed to export: " + err.message);
                            }
                          }}
                          className="p-1 px-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Export .jlptlisten project"
                        >
                          <FileOutput size={10} />
                          <span>Export</span>
                        </button>
                        <button
                          type="button"
                          className="p-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold transition cursor-pointer"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Workspace Screen */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Active Player, Script, Analysis (Cols 1 - 7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Custom Interactive Player */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 shadow-sm">
              
              {/* Native audio listener element connected via URL */}
              {activeAudioUrl && (
                <audio
                  ref={audioRef}
                  src={activeAudioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleAudioEnded}
                />
              )}

              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span
                      className={`text-xs font-bold tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
                        analysis?.estimatedLevel === "N1"
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : analysis?.estimatedLevel === "N2"
                          ? "bg-teal-50 text-teal-600 border border-teal-200"
                          : analysis?.estimatedLevel === "N3"
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : analysis?.estimatedLevel === "N4"
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                          : analysis?.estimatedLevel === "N5"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isAnalyzing ? (
                        <span className="flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> {t("estimating_lvl")}
                        </span>
                      ) : (
                        `${t("level_label")}: ${analysis?.estimatedLevel || "Unknown / Mixed"}`
                      )}
                    </span>
                    <h2 className="text-sm font-bold text-slate-800 font-display truncate pr-2">
                      {segments[activeSegmentIndex]?.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeAudioUrl ? (
                      <button
                        onClick={() => singleDownload(activeSegmentIndex)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer select-none"
                      >
                        <Download size={14} />
                        <span>{t("download_mp3_txt")}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => generateSegmentAudio(activeSegmentIndex)}
                        disabled={generatingIndexes[activeSegmentIndex]}
                        className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer select-none"
                      >
                        {generatingIndexes[activeSegmentIndex] ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>{t("synthesizing_txt")}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            <span>{t("generate_speech_txt")}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Wave Player block */}
                <div className="h-16 bg-slate-100 rounded-2xl flex items-center justify-between px-6 gap-2.5 border border-slate-200/50 overflow-hidden relative font-sans">
                  {!activeAudioUrl ? (
                    <div className="w-full flex items-center justify-between gap-4 py-4">
                      {/* Prev Button */}
                      <button
                        onClick={handlePrev}
                        disabled={segments.length <= 1}
                        className="p-1 px-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 border border-slate-200/65 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed select-none"
                        title="Previous Segment"
                      >
                        ← Prev
                      </button>

                      <div className="text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0.5">
                        <span className="font-medium text-slate-600">{t("no_audio_found")}</span>
                        <button
                          onClick={() => generateSegmentAudio(activeSegmentIndex)}
                          disabled={generatingIndexes[activeSegmentIndex]}
                          className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer disabled:text-slate-400"
                        >
                          {t("click_gen_speech_hint")}
                        </button>
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={handleNext}
                        disabled={segments.length <= 1}
                        className="p-1 px-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 border border-slate-200/65 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed select-none"
                        title="Next Segment"
                      >
                        Next →
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-3">
                      {/* Playback Controls with Prev/Next buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={handlePrev}
                          disabled={segments.length <= 1}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-full transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                          title="Previous Segment"
                        >
                          <SkipBack size={14} fill="currentColor" />
                        </button>

                        <button
                          onClick={handlePlayPause}
                          className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                        </button>

                        <button
                          onClick={handleNext}
                          disabled={segments.length <= 1}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-full transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                          title="Next Segment"
                        >
                          <SkipForward size={14} fill="currentColor" />
                        </button>
                      </div>

                      {/* Progress Slider */}
                      <div className="flex-1 px-4 flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 select-none">
                          {formatTime(currentTime)}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          step="0.1"
                          value={currentTime}
                          onChange={handleSliderChange}
                          className="flex-1 accent-indigo-600 h-1 cursor-pointer bg-slate-200 rounded-lg appearance-auto"
                        />
                        <span className="text-xs font-mono text-slate-500 select-none">
                          {formatTime(duration)}
                        </span>
                      </div>

                      {/* Animation bars */}
                      <div className="flex items-center gap-0.5 h-6">
                        {[1, 2, 3, 4, 3, 2, 5, 4, 2, 3].map((val, idx) => (
                          <div
                            key={idx}
                            className={`w-[3px] bg-indigo-500/80 rounded-full transition-all duration-300 ${
                              isPlaying ? "animate-bounce" : ""
                            }`}
                            style={{
                              height: isPlaying ? `${val * 3}px` : "4px",
                              animationDelay: `${idx * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Speed & Volume control deck */}
                {activeAudioUrl && (
                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 text-xs font-sans">
                    
                    {/* Speed selection */}
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span className="text-slate-500 font-medium select-none mr-0.5">{t("speed_txt")}:</span>
                      <div className="flex items-center gap-1">
                        {[0.8, 1.0, 1.2, 1.5].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`px-2 py-1 rounded-md font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                              playbackSpeed === speed
                                ? "bg-slate-800 text-white shadow-xs"
                                : "bg-slate-200/60 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {speed.toFixed(1)}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volume selection */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-slate-500 hover:text-slate-700 transition"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-16 accent-slate-600 h-1 cursor-pointer bg-slate-200 rounded-lg appearance-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Script Visibility and Highlights Controller */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-4 shadow-xs font-sans">
              <div className="flex items-center justify-between select-none border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  {t("script_details_txt")} ({segments[activeSegmentIndex]?.dialogue?.length || 0} {t("lines_suffix_txt")})
                </span>
                <button
                  onClick={() => setShowScript(!showScript)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer select-none"
                >
                  {showScript ? (
                    <>
                      <EyeOff size={14} />
                      <span>{t("hide_script_txt")}</span>
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      <span>{t("show_script_txt")}</span>
                    </>
                  )}
                </button>
              </div>

              {showScript ? (
                <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto scrollbar-thin">
                  {segments[activeSegmentIndex]?.dialogue.map((line, idx) => {
                    let speakerBadgeStyle = "bg-slate-200 text-slate-700";
                    let cardBorderClass = "border-slate-100 bg-slate-50/20";
                    
                    if (line.speaker === "Man") {
                      speakerBadgeStyle = "bg-blue-100 text-blue-700";
                      cardBorderClass = "border-blue-100 bg-blue-50/10";
                    } else if (line.speaker === "Woman") {
                      speakerBadgeStyle = "bg-pink-100 text-pink-700";
                      cardBorderClass = "border-pink-100 bg-pink-50/10";
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 ${cardBorderClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${speakerBadgeStyle}`}>
                              {line.labelJa || line.speaker} ({line.speaker})
                            </span>
                            {line.tone && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-md">
                                Tone: {line.tone}
                              </span>
                            )}
                            {line.pause && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                Wait: {line.pause}s
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">Line {idx + 1}</span>
                        </div>
                        <p className="text-sm font-sans font-medium text-slate-800 leading-relaxed">
                          {line.textJa}
                        </p>
                        {line.textEn && (
                          <p className="text-xs text-slate-400/90 leading-normal italic font-sans">
                            {line.textEn}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 border border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center gap-1 text-slate-500">
                  <EyeOff size={24} className="text-slate-300 mb-1.5" />
                  <p className="text-xs font-semibold">Script Text Hidden</p>
                  <p className="text-[10px] text-slate-400">
                    Listen to the generated voices first before showing the text to test your comprehension!
                  </p>
                  <button
                    onClick={() => setShowScript(true)}
                    className="mt-3 text-xs bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Click to Show Script
                  </button>
                </div>
              )}
            </div>

            {/* AI Text Analysis, Overview, Summary and Vocabulary */}
            {analysis ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-3 block select-none">
                  AI Reading Comprehension Insight
                </span>

                <div className="flex flex-col gap-4">
                  {/* Estimated summary info */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400">Summary & Topic Overview</h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{analysis.summary}</p>
                  </div>

                  {/* Vocabulary breakdown */}
                  {analysis.vocabulary && analysis.vocabulary.length > 0 && (
                    <div className="border-t border-slate-800 pt-4">
                      <h4 className="text-xs font-bold text-slate-400 mb-2.5">Key Vocabulary Words</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {analysis.vocabulary.map((vocab, vIdx) => (
                          <div key={vIdx} className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-xl flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className="text-xs font-bold font-sans text-indigo-300">{vocab.word}</span>
                              <span className="text-[10px] text-slate-500 font-mono italic">{vocab.furigana}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 truncate">{vocab.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-700 flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800">AI Reading Insight</h4>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-50 p-1 px-2.5 rounded-lg border border-slate-100">
                    Not analyzed
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  You can optionally run a comprehensive AI reading analysis of this script to estimate its JLPT level, write a summary overview, and extract key vocabulary words.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const combinedText = segments.map(s => s.text).join("\n").substring(0, 3000);
                    analyzeJapaneseContent(combinedText, segments[0]?.jlptLevel);
                  }}
                  disabled={isAnalyzing || segments.length === 0}
                  className="w-full mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 disabled:opacity-50 text-xs font-bold p-3 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-indigo-100"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Analyzing text...</span>
                    </>
                  ) : (
                    <span>Analyze with Gemini</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: segments List, Actions (Cols 8 - 12) */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* File Details card */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 block select-none bg-slate-50 p-1 px-2.5 rounded-md w-max">
                {t("uploaded_document_txt") || "Uploaded Document"}
              </span>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate" title={fileName}>
                    {fileName}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {activeListeningItem?.fileSize
                      ? `${(activeListeningItem.fileSize / 1024).toFixed(1)} KB`
                      : activeListeningItem?.sourceText
                      ? `${(activeListeningItem.sourceText.length * 2 / 1024).toFixed(1)} KB`
                      : "0 KB"}{" "}
                    • {segments.length} segment(s)
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100/50 p-1.5 px-3 rounded-xl cursor-pointer shadow-xs border border-red-200"
                >
                  {t("unload_btn") || "Unload"}
                </button>
              </div>

              {/* Extra details list */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-slate-400 font-medium">TTS Provider</span>
                  <span className="text-slate-700 font-bold mt-0.5 capitalize bg-slate-50 p-1 px-2 rounded-lg w-max">
                    {activeListeningItem?.ttsProvider || ttsProvider}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 font-medium">Voices Generated</span>
                  <span className="text-slate-700 font-bold mt-0.5 bg-slate-50 p-1 px-2 rounded-lg w-max">
                    {Object.keys(generatedAudios).length} / {segments.length} Ready
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveCurrentToLibrary}
                  disabled={isSavingLibrary}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs p-2.5 rounded-2xl cursor-pointer shadow-xs transition flex items-center justify-center gap-1.5 hover:shadow-sm"
                >
                  <Save size={13} />
                  <span>{isSavingLibrary ? "Saving..." : "Save to Library"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJlptListenProject}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs p-2.5 rounded-2xl cursor-pointer transition flex items-center justify-center gap-1.5"
                >
                  <FileOutput size={13} />
                  <span>Export Project</span>
                </button>
              </div>
            </div>

            {/* Segments list dashboard */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ListMusic size={16} className="text-slate-400" />
                  <span>{t("playback_segments_title")}</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  {Object.keys(generatedAudios).length} / {segments.length} {t("audio_ready_txt")}
                </span>
              </div>

              {/* Bulk operations button */}
              <div className="flex gap-2">
                <button
                  onClick={handleBulkGenerate}
                  disabled={isBulkGenerating || segments.length === Object.keys(generatedAudios).length}
                  className="flex-1 font-bold text-xs p-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isBulkGenerating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>{t("synthesizing_txt")}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>{t("synthesize_all_btn")} ({segments.length})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={downloadAllAsZip}
                  disabled={Object.keys(generatedAudios).length === 0}
                  className="font-bold text-xs p-2.5 px-4 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 transition-all cursor-pointer flex items-center justify-center gap-1"
                  title="Download all speech files compressed as ZIP"
                >
                  <Download size={13} />
                  <span>{t("zip_btn")}</span>
                </button>
              </div>

              {/* Segments mapping rows */}
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
                {segments.map((seg, idx) => {
                  const isActive = idx === activeSegmentIndex;
                  const isReady = !!generatedAudios[idx];
                  const isSynthesizing = generatingIndexes[idx];

                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveSegmentIndex(idx)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400/10 text-indigo-900"
                          : "bg-white hover:bg-slate-50 border-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="overflow-hidden flex-1 flex items-center gap-2.5">
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold leading-tight truncate">
                            {seg.title}
                          </h4>
                        </div>
                      </div>

                      {/* Status indicators */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {isSynthesizing ? (
                          <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1">
                            <Loader2 size={11} className="animate-spin" /> {lang === "zh" ? "合成中" : "Wait"}
                          </span>
                        ) : isReady ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 p-0.5 px-1.5 rounded-md">
                              {lang === "zh" ? "音频" : "Audio"}
                            </span>
                            <button
                              onClick={() => singleDownload(idx)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer"
                              title="Download Segment MP3"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => generateSegmentAudio(idx)}
                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[10px] font-bold p-1 px-2 rounded-md transition cursor-pointer"
                          >
                            {lang === "zh" ? "合成" : "Voice"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
