import React, { useState } from "react";
import { Plus, Trash2, Music, Sparkles, RefreshCw, AlertCircle, HelpCircle } from "lucide-react";
import { DialoguePart } from "../types";
import {
  synthesizeSpeech,
  getStoredTTSProvider,
  getStoredVoicevoxSettings
} from "../lib/ttsService";

interface ScriptCreatorProps {
  onCustomAudioGenerated: (
    audioUrl: string,
    dialogue: DialoguePart[],
    title: string,
    level: string
  ) => void;
}

const DEFAULT_ROWS: DialoguePart[] = [
  {
    speaker: "Narrator",
    labelJa: "ナレーター",
    labelEn: "Narrator",
    textJa: "皆さん、こんにちは。日本語能力試験のリスニング練習を始めます。",
    textEn: "Hello everyone. Let's begin the JLPT Japanese listening practice."
  },
  {
    speaker: "Man",
    labelJa: "学生(男)",
    labelEn: "Male Student",
    textJa: "あの、すみません、この漢字の読み方を教えていただけませんか。",
    textEn: "Um, excuse me, could you teach me how to read this Kanji?"
  },
  {
    speaker: "Woman",
    labelJa: "先生(女)",
    labelEn: "Female Teacher",
    textJa: "いいですよ。これは「到着」と読んで、「到着する」という意味です。",
    textEn: "Sure. This is read as 'Tochaku', and it means 'to arrive'."
  },
  {
    speaker: "Man",
    labelJa: "学生(男)",
    labelEn: "Male Student",
    textJa: "なるほど、到着ですね！ありがとうございました！",
    textEn: "I see, 'Tochaku'! Thank you very much!"
  }
];

export default function ScriptCreator({ onCustomAudioGenerated }: ScriptCreatorProps) {
  const [rows, setRows] = useState<DialoguePart[]>(DEFAULT_ROWS);
  const [customTitle, setCustomTitle] = useState("私のオリジナル練習");
  const [customLevel, setCustomLevel] = useState("N3");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    // Alternate speakers logically based on the previous lines
    let nextSpeaker: "Narrator" | "Man" | "Woman" = "Man";
    if (lastRow) {
      if (lastRow.speaker === "Man") nextSpeaker = "Woman";
      else if (lastRow.speaker === "Woman") nextSpeaker = "Man";
      else nextSpeaker = "Man";
    }

    setRows([
      ...rows,
      {
        speaker: nextSpeaker,
        labelJa: nextSpeaker === "Man" ? "男の人" : nextSpeaker === "Woman" ? "女の人" : "ナレーター",
        labelEn: nextSpeaker,
        textJa: "",
        textEn: ""
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      setErrorMessage("At least one line is required in the TTS dialogue screenplay!");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const newRows = rows.filter((_, idx) => idx !== index);
    setRows(newRows);
  };

  const handleRowChange = (index: number, field: keyof DialoguePart, value: any) => {
    const updatedRows = rows.map((row, idx) => {
      if (idx === index) {
        const newRow = { ...row, [field]: value };
        // Sync labels automatically if the speaker role is swapped
        if (field === "speaker") {
          newRow.labelJa = value === "Man" ? "男の人" : value === "Woman" ? "女の人" : "ナレーター";
          newRow.labelEn = value;
        }
        return newRow;
      }
      return row;
    });
    setRows(updatedRows);
  };

  const handleSynthesize = async () => {
    // Validate empty inputs
    const hasEmptyFields = rows.some((row) => !row.textJa.trim());
    if (hasEmptyFields) {
      setErrorMessage("Please make sure all dialogues contain Japanese text before synthesizing.");
      return;
    }

    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      const currentProvider = getStoredTTSProvider();
      const currentSettings = getStoredVoicevoxSettings();

      const blob = await synthesizeSpeech(rows, currentProvider, currentSettings);
      const objectUrl = URL.createObjectURL(blob);

      onCustomAudioGenerated(objectUrl, rows, customTitle || "Custom Dialogue", customLevel);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Synthesis failed. Please verify server connection.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const resetToDefault = () => {
    setRows(DEFAULT_ROWS);
    setCustomTitle("私のオリジナル練習");
    setCustomLevel("N3");
    setErrorMessage(null);
  };

  return (
    <div id="tts-script-studio" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
      {/* Script Header titles */}
      <div className="flex flex-col gap-1 boder-b border-slate-100 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 font-display">
            <span className="p-1 px-1.5 bg-indigo-50 text-indigo-600 rounded">🎙️</span>
            Multi-Speaker TTS Studio
          </h2>
          <button
            onClick={resetToDefault}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>Reset Demo</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 leading-normal">
          Compose your custom conversation screenplay! Assign roles to native voice channels (Narrator, Man, Woman) and compile into high-quality continuous MP3.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2 text-xs">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Custom parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase select-none">
            Original Lesson Title
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. Shopping practice, clinic conversation"
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500 tracking-wide uppercase select-none">
            Target JLPT level
          </label>
          <select
            value={customLevel}
            onChange={(e) => setCustomLevel(e.target.value)}
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition cursor-pointer"
          >
            {["N5", "N4", "N3", "N2", "N1"].map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl} Level
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dialogue block screenplays */}
      <div className="flex flex-col gap-4 border-t border-slate-100 pt-3 max-h-[380px] overflow-y-auto pr-1">
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
          Dialogue Rows Screenplay
        </span>

        <div className="flex flex-col gap-3">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="p-3.5 border border-slate-200/80 rounded-2xl flex flex-col gap-2.5 relative hover:border-slate-300 transition-all shadow-2xs"
            >
              {/* Row Header controls */}
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-100 pb-1.5">
                <span className="text-[10.5px] font-bold text-slate-400 font-mono select-none">
                  Row #{idx + 1}
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={row.speaker}
                    onChange={(e) => handleRowChange(idx, "speaker", e.target.value)}
                    className="text-[10.5px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded cursor-pointer outline-none focus:border-indigo-400"
                  >
                    <option value="Narrator">Narrator Voice</option>
                    <option value="Man">Man Voice</option>
                    <option value="Woman">Woman Voice</option>
                  </select>

                  <button
                    onClick={() => handleRemoveRow(idx)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded transition cursor-pointer"
                    title="Delete row"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Japanese dialogue text */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 tracking-wide">
                    Japanese Line text (Kanji / Kana)
                  </label>
                  <span className="text-[9.5px] font-semibold text-indigo-500 bg-indigo-50 px-1 rounded select-none">
                    Native Voice speaking
                  </span>
                </div>
                <textarea
                  value={row.textJa}
                  onChange={(e) => handleRowChange(idx, "textJa", e.target.value)}
                  placeholder="例：すみません、この電車は渋谷に行きますか？"
                  rows={2}
                  className="w-full text-xs bg-slate-50/50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-400 focus:bg-white resize-none transition"
                />
              </div>

              {/* English line description */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9.5px] font-bold text-slate-400">
                  English meaning (optional overlay)
                </label>
                <input
                  type="text"
                  value={row.textEn}
                  onChange={(e) => handleRowChange(idx, "textEn", e.target.value)}
                  placeholder="e.g. Excuse me, does this train go to Shibuya?"
                  className="w-full text-xs text-slate-500 bg-slate-50/50 border border-slate-200 rounded-lg p-1.5 px-2 outline-none focus:border-indigo-400 focus:bg-white transition"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive compilation buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2 border-t border-slate-100 pt-4">
        <button
          onClick={handleAddRow}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Line Row</span>
        </button>

        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
        >
          {isSynthesizing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Compiling Multi-Speaker Voices...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
              <span>Harmonize dialogues & Compile MP3</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
