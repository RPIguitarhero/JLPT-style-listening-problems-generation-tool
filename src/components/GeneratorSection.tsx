import React, { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, Bookmark } from "lucide-react";
import { JLPTQuestion } from "../types";

interface GeneratorSectionProps {
  onQuestionGenerated: (question: JLPTQuestion) => void;
}

const PRESET_TOPICS = [
  { label: "🏪 Conbini Shopping", theme: "convenience store purchase" },
  { label: "🏥 Dental Checkup", theme: "dentist clinic appointment" },
  { label: "💼 Office Meeting", theme: "rearranging next week's meeting schedule" },
  { label: "🚉 Lost Passport", theme: "losing passport at the bullet train ticket gate" },
  { label: "🌦️ Travel Typhoon", theme: "checking weather advisories before booking a flight" }
];

export default function GeneratorSection({ onQuestionGenerated }: GeneratorSectionProps) {
  const [level, setLevel] = useState("N3");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (targetTopic: string = topic) => {
    setIsGenerating(true);
    setErrorMessage(null);

    const themeQuery = targetTopic.trim() || "general dialogue";

    try {
      const response = await fetch("/api/generate-listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, topic: themeQuery }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to generate listening practice material.");
      }

      onQuestionGenerated(result.data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || "Request timed out or API key is not configured. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="ai-scenario-builder" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4.5">
      {/* Section info */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 font-display">
          <span className="p-1 px-1.5 bg-indigo-50 text-indigo-600 rounded">✨</span>
          AI Practice Generator
        </h2>
        <p className="text-xs text-slate-500 leading-normal">
          Let Gemini write an entire custom JLPT test item! Pick your level and context theme, and watch the AI craft questions, options, scripts, and vocabulary.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2 text-xs">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Parameters Selection */}
      <div className="flex flex-col gap-3.5">
        {/* Row 1: Level picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold text-slate-500 tracking-wide uppercase select-none">
            Target JLPT Standard
          </label>
          <div className="grid grid-cols-5 gap-1.5" id="level-badge-grid">
            {["N5", "N4", "N3", "N2", "N1"].map((lvl) => {
              const active = level === lvl;
              // Colorful branding elements for different levels
              let colorClass = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/60";
              if (active) {
                if (lvl === "N5") colorClass = "bg-emerald-600 text-white border-emerald-600 shadow-sm";
                else if (lvl === "N4") colorClass = "bg-indigo-600 text-white border-indigo-600 shadow-sm";
                else if (lvl === "N3") colorClass = "bg-amber-600 text-white border-amber-600 shadow-sm";
                else if (lvl === "N2") colorClass = "bg-teal-600 text-white border-teal-600 shadow-sm";
                else if (lvl === "N1") colorClass = "bg-red-600 text-white border-red-600 shadow-sm";
              }

              return (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  disabled={isGenerating}
                  className={`py-2 border rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${colorClass}`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Custom input topic */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold text-slate-500 tracking-wide uppercase select-none">
            Scenario Topic or Context
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. Asking about a lost luggage, renting an apartment"
            className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl p-3 outline-none transition"
          />
        </div>

        {/* Dynamic Topic tags list */}
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] font-bold text-slate-400 tracking-wide uppercase select-none flex items-center gap-1">
            <Bookmark size={10} />
            Instant Scene Templates
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TOPICS.map((pt, i) => (
              <button
                key={i}
                type="button"
                disabled={isGenerating}
                onClick={() => {
                  setTopic(pt.theme);
                  handleGenerate(pt.theme);
                }}
                className="text-[11px] font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg p-1.5 px-2.5 transition cursor-pointer select-none"
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate triggers */}
        <button
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed p-3 rounded-xl transition-all shadow-md cursor-pointer"
          id="btn-ai-generate-preset"
        >
          {isGenerating ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>AI is drafting lesson & scripts...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-yellow-300 fill-yellow-300 animate-pulse" />
              <span>Generate New Lesson & scripts</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
