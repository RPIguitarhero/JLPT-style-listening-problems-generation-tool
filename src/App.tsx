import React, { useState, useEffect } from "react";
import { PRESETS } from "./presets";
import { JLPTQuestion, DialoguePart, ListeningItem } from "./types";
import AudioPlayerSection from "./components/AudioPlayerSection";
import QuizSection from "./components/QuizSection";
import ScriptCreator from "./components/ScriptCreator";
import GeneratorSection from "./components/GeneratorSection";
import TxtUploaderTTS from "./components/TxtUploaderTTS";
import TTSSettingsPanel from "./components/TTSSettingsPanel";
import {
  synthesizeSpeech,
  getStoredTTSProvider,
  getStoredVoicevoxSettings,
  TTSProvider,
  VoicevoxSettings
} from "./lib/ttsService";
import { useTranslation, setLanguage, Language } from "./lib/translations";
import { Award, BookOpen, Music, Sparkles, HelpCircle } from "lucide-react";

export default function App() {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<"practice" | "studio" | "upload">("practice");
  
  // Unified state for Uploaded scripts & TTS Workspace persistent across tabs
  const [activeListeningItem, setActiveListeningItem] = useState<ListeningItem | null>(null);
  const [uploaderSegmentIndex, setUploaderSegmentIndex] = useState<number>(0);
  
  // Theme state: default to dark (the warm espresso theme) unless user explicitly sets light
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("app-theme");
      return stored !== "light";
    } catch (_) {
      return true;
    }
  });

  // Sync theme selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("app-theme", isDarkMode ? "dark" : "light");
    } catch (_) {}
  }, [isDarkMode]);

  // App starts with N5 Pre-loaded scenario
  const [activeLesson, setActiveLesson] = useState<JLPTQuestion>(PRESETS[0]);
  const [lessonsPlaylist, setLessonsPlaylist] = useState<JLPTQuestion[]>(() => PRESETS);
  
  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Global active TTS state synced via panel
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>(getStoredTTSProvider());
  const [voicevoxSettings, setVoicevoxSettings] = useState<VoicevoxSettings>(getStoredVoicevoxSettings());

  // Clear audio URL when a different lesson is loaded to force re-synthesis
  useEffect(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setErrorText(null);
  }, [activeLesson]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Synthesize audio for the active lesson's dialogue script
  const handleSynthesizeActiveLesson = async () => {
    if (isSynthesizing) return;
    setIsSynthesizing(true);
    setErrorText(null);

    try {
      const blob = await synthesizeSpeech(activeLesson.dialogue, ttsProvider, voicevoxSettings);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error: any) {
      console.error(error);
      setErrorText(error.message || "Synthesis failed. Please verify server connection.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Switch active lesson to custom generated lesson
  const handleLoadCustomGeneratedLesson = (newLesson: JLPTQuestion) => {
    setLessonsPlaylist((prev) => {
      if (prev.some((l) => l.title === newLesson.title)) return prev;
      return [...prev, newLesson];
    });
    setActiveLesson(newLesson);
    // Automatically trigger speech synthesis for AI generated lessons
    setIsSynthesizing(true);
    synthesizeSpeech(newLesson.dialogue, ttsProvider, voicevoxSettings)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      })
      .catch((err) => {
        console.error("Auto synthesis failed for AI generated lesson:", err);
        setErrorText("AI generated the dialogue script, but failed to synthesize audio automatically. Please click 'Generate audio'.");
      })
      .finally(() => {
        setIsSynthesizing(false);
      });
  };

  // Called when custom script builder completes synthesis
  const handleLoadCustomCreatedScript = (
    url: string,
    dialogue: DialoguePart[],
    title: string,
    level: string
  ) => {
    // Generate a pseudo-JLPT question with empty options so it doesn't render option cards but loads dialogue
    const mockLesson: JLPTQuestion = {
       title,
       jlptLevel: level,
       situationJa: "This is your custom composed multi-speaker dialogue.",
       situationEn: "Review vocabulary and flow using the timeline player above.",
       questionJa: "Custom script tracks do not contain a multiple choice quiz.",
       questionEn: "Feel free to practice reading lines with individual voices.",
       dialogue,
       options: [],
       optionsEn: [],
       correctAnswer: 0,
       explanation: "Composition script completed. Multi-speaker voice synthesis compiled successfully.",
       vocabulary: []
    };

    setLessonsPlaylist((prev) => {
      if (prev.some((l) => l.title === mockLesson.title)) return prev;
      return [...prev, mockLesson];
    });
    setActiveLesson(mockLesson);
    setAudioUrl(url);
    setActiveTab("practice"); // Jump back to player tab automatically
  };

  const handlePrevLesson = () => {
    if (lessonsPlaylist.length <= 1) return;
    const currIdx = lessonsPlaylist.findIndex((l) => l.title === activeLesson.title);
    const newIdx = (currIdx - 1 + lessonsPlaylist.length) % lessonsPlaylist.length;
    setActiveLesson(lessonsPlaylist[newIdx]);
  };

  const handleNextLesson = () => {
    if (lessonsPlaylist.length <= 1) return;
    const currIdx = lessonsPlaylist.findIndex((l) => l.title === activeLesson.title);
    const newIdx = (currIdx + 1) % lessonsPlaylist.length;
    setActiveLesson(lessonsPlaylist[newIdx]);
  };

  return (
    <div className={`app-container min-h-screen ${isDarkMode ? "dark-theme" : "light-theme"} font-sans antialiased pb-12`}>
      {/* Sleek Top nav banner */}
      <header className="bg-slate-900 text-white border-b border-slate-850 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4.5 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-display font-bold text-lg shadow-lg select-none text-white">
              語
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300 uppercase leading-tight">
                {t("app_title")}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                {t("app_subtitle")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            {/* Task 2: Language Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700/60 select-none">
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                {t("lang_select")}:
              </span>
              <select
                value={lang}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-slate-900 text-xs font-bold text-slate-100 rounded-lg px-2 py-1 border border-slate-705 focus:outline-none cursor-pointer"
                id="header-language-select"
              >
                <option value="en">English</option>
                <option value="zh">简体中文</option>
              </select>
            </div>

            {/* Task 3: Light Mode / Dark Mode Switcher */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 select-none">
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-slate-650"
                style={{ backgroundColor: isDarkMode ? "#cf623a" : "#4b5563" }}
                aria-label="Toggle Theme"
                id="header-theme-toggle"
              >
                <span
                  className="pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                  style={{ transform: isDarkMode ? "translateX(18px)" : "translateX(0px)" }}
                />
              </button>
              <span className="text-xs font-bold text-slate-300">
                {isDarkMode ? "🌙 " + t("dark_name") : "☀️ " + t("light_name")}
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700/60 flex items-center gap-0.5">
              <button
                onClick={() => setActiveTab("practice")}
                className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer ${
                  activeTab === "practice"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("listening_tab")}
              </button>
              <button
                onClick={() => setActiveTab("studio")}
                className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer ${
                  activeTab === "studio"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("custom_tab")}
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all select-none cursor-pointer ${
                  activeTab === "upload"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("upload_tab")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container screen */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
        {errorText && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-2.5 text-sm">
            <HelpCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">System Warning</p>
              <p className="text-xs mt-0.5">{errorText}</p>
            </div>
          </div>
        )}

        {activeTab === "practice" ? (
          /* Grid splitting columns */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* LEFT PANEL: Presets Selector, Player, Quiz (Cols 1 - 7) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Presets Selector bar */}
              <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-3 block select-none">
                  Core Practice Presets
                </span>
                <div className="flex flex-wrap gap-2.5">
                  {PRESETS.map((pst, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveLesson(pst)}
                      className={`flex items-center gap-2 p-2.5 px-4 rounded-2xl border transition-all cursor-pointer ${
                        activeLesson.title === pst.title
                          ? "bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400/20 text-indigo-900 pr-5"
                          : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          pst.jlptLevel === "N5"
                            ? "bg-emerald-100 text-emerald-700"
                            : pst.jlptLevel === "N4"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {pst.jlptLevel}
                      </span>
                      <span className="text-xs font-bold leading-none truncate max-w-[150px]">
                        {pst.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom High-Quality Audio media controller */}
              <AudioPlayerSection
                audioUrl={audioUrl}
                isSynthesizing={isSynthesizing}
                onSynthesize={handleSynthesizeActiveLesson}
                dialogue={activeLesson.dialogue}
                title={activeLesson.title}
                jlptLevel={activeLesson.jlptLevel}
                playlistLength={lessonsPlaylist.length}
                onPrev={handlePrevLesson}
                onNext={handleNextLesson}
              />

              {/* Quiz and Breakdown component */}
              {activeLesson.options.length > 0 ? (
                <QuizSection lesson={activeLesson} />
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-500">
                  <p className="text-sm font-semibold">Custom Dialogue Script Active</p>
                  <p className="text-xs mt-1">
                    Compose quizzes with full variables by utilizing the "AI Practice Generator" in the side panel.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT PANEL: AI Practice Generator & Help Cards (Cols 8 - 12) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Voicevox & Google TTS Provider settings */}
              <TTSSettingsPanel
                onProviderChanged={(p) => setTtsProvider(p)}
                onSettingsChanged={(s) => setVoicevoxSettings(s)}
              />

              {/* AI Scenario Creator */}
              <GeneratorSection onQuestionGenerated={handleLoadCustomGeneratedLesson} />

              {/* Quick guides block */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-md">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-800">
                  <span className="p-1 bg-indigo-600/20 text-indigo-400 rounded">💡</span>
                  JLPT Listening Strategy Guide
                </h3>

                <ul className="flex flex-col gap-3 text-xs leading-normal text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold font-mono">01.</span>
                    <span>
                      <strong>Filter Keywords:</strong> Prioritize listening to conditional ending structures, polite particles (Keigo), and particles like <em>~kedo</em> or <em>~ga</em> which indicating immediate topic reversals!
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold font-mono">02.</span>
                    <span>
                      <strong>Speed Variance:</strong> Real Japanese tests can be spoken extremely quickly. Practice speaking on standard 1.2x / 1.5x pacing overlays, then downscale to 1.0x on exams to feel completely confident.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold font-mono">03.</span>
                    <span>
                      <strong>Assign Voices:</strong> Recognize speaker differences. Distinct narrator, male student, or female boss dialogue shifts are easily voiced natively using the Gemini TTS engine.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : activeTab === "studio" ? (
          /* Multi-Speaker DIY TTS composition Studio */
          <div className="max-w-3xl mx-auto">
            <ScriptCreator onCustomAudioGenerated={handleLoadCustomCreatedScript} />
          </div>
        ) : (
          /* Upload Text for TTS workspace */
          <div className="max-w-6xl mx-auto">
            <TxtUploaderTTS
              activeListeningItem={activeListeningItem}
              setActiveListeningItem={setActiveListeningItem}
              activeSegmentIndex={uploaderSegmentIndex}
              setActiveSegmentIndex={setUploaderSegmentIndex}
              ttsProvider={ttsProvider}
            />
          </div>
        )}
      </main>
    </div>
  );
}
