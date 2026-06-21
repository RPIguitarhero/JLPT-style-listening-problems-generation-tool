import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Download, Volume2, VolumeX, Clock, Sparkles, SkipBack, SkipForward } from "lucide-react";
import { DialoguePart } from "../types";

interface AudioPlayerSectionProps {
  audioUrl: string | null;
  isSynthesizing: boolean;
  onSynthesize: () => void;
  dialogue: DialoguePart[];
  title: string;
  jlptLevel: string;
  playlistLength?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function AudioPlayerSection({
  audioUrl,
  isSynthesizing,
  onSynthesize,
  dialogue,
  title,
  jlptLevel,
  playlistLength = 0,
  onPrev,
  onNext,
}: AudioPlayerSectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [activeDialogueIndex, setActiveDialogueIndex] = useState<number>(-1);

  const handlePrev = () => {
    if (playlistLength <= 1) return;
    if (onPrev) onPrev();
  };

  const handleNext = () => {
    if (playlistLength <= 1) return;
    if (onNext) onNext();
  };

  // Re-initialize state when audio URL changes or is reset
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveDialogueIndex(-1);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [audioUrl]);

  // Set playback speed when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, audioUrl]);

  // Set volume/mute status
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Map the current time to the speak index for highlighting!
  // Since we don't have exact word timestamps from the single continuous audio stream,
  // we can distribute the dialogue lines evenly based on duration,
  // or use a smart pacing algorithm that considers the length of characters in textJa.
  useEffect(() => {
    if (duration > 0 && dialogue.length > 0) {
      // Let's compute weights based on the Japanese character length of each dialog line.
      // This is dramatically more realistic than a simple flat split because longer lines take longer to recite.
      const lineLengths = dialogue.map((line) => line.textJa.length || 1);
      const totalLength = lineLengths.reduce((acc, len) => acc + len, 0);

      let accumulatedTime = 0;
      const lineTimeBoundaries = dialogue.map((line, idx) => {
        const linePercent = lineLengths[idx] / totalLength;
        const lineDuration = linePercent * duration;
        const start = accumulatedTime;
        const end = accumulatedTime + lineDuration;
        accumulatedTime = end;
        return { start, end };
      });

      const currentIdx = lineTimeBoundaries.findIndex(
        (bounds) => currentTime >= bounds.start && currentTime <= bounds.end
      );

      setActiveDialogueIndex(currentIdx);
    } else {
      setActiveDialogueIndex(-1);
    }
  }, [currentTime, duration, dialogue]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Audio playback error:", error);
        });
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
    setActiveDialogueIndex(-1);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const triggerDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    // Clean spaces and special characters for a safe filename
    const safeTitle = title.replace(/[^\w\s\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/gi, "").trim() || "practice";
    link.download = `JLPT_${jlptLevel}_${safeTitle}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div id="audio-player-deck" className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm">
      {/* Hidden native audio controller */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Header summary info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-bold tracking-wider px-2.5 py-1 rounded-full ${
                jlptLevel === "N1"
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : jlptLevel === "N2"
                  ? "bg-teal-50 text-teal-600 border border-teal-200"
                  : jlptLevel === "N3"
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : jlptLevel === "N4"
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
              }`}
            >
              {jlptLevel} Level
            </span>
            <h3 className="text-sm font-semibold text-slate-800 font-display truncate max-w-[180px]">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {audioUrl ? (
              <button
                onClick={triggerDownload}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
                title="Download Dialogue as MP3 File"
                id="btn-download-mp3"
              >
                <Download size={14} />
                <span>Download MP3</span>
              </button>
            ) : (
              <button
                onClick={onSynthesize}
                disabled={isSynthesizing}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
                id="btn-synthesize-mp3"
              >
                <Sparkles size={14} className={isSynthesizing ? "animate-spin" : ""} />
                <span>{isSynthesizing ? "Synthesizing..." : "Generate MP3"}</span>
              </button>
            )}
          </div>
        </div>

        {/* The Audio Visual / Wave Display */}
        <div className="h-16 bg-slate-100 rounded-xl flex items-center justify-between px-6 gap-2.5 border border-slate-200/50 overflow-hidden relative">
          {!audioUrl ? (
            <div className="w-full flex items-center justify-between gap-4">
              {/* Prev Button */}
              <button
                onClick={handlePrev}
                disabled={playlistLength <= 1}
                className="p-1 px-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 border border-slate-200/65 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed select-none"
                title="Previous Preset"
              >
                ← Prev
              </button>

              <div className="text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-0.5">
                <span className="font-medium text-slate-600">No Audio Generated Yet</span>
                <button
                  onClick={onSynthesize}
                  disabled={isSynthesizing}
                  className="text-[10px] text-indigo-600 hover:underline font-semibold disabled:opacity-50"
                >
                  Click to synthesize audio with Japanese Voices
                </button>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                disabled={playlistLength <= 1}
                className="p-1 px-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-indigo-600 border border-slate-200/65 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed select-none"
                title="Next Preset"
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
                  disabled={playlistLength <= 1}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-full transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  title="Previous Preset"
                >
                  <SkipBack size={14} fill="currentColor" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95 cursor-pointer"
                  id="btn-toggle-play-pause"
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>

                <button
                  onClick={handleNext}
                  disabled={playlistLength <= 1}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-full transition-all cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  title="Next Preset"
                >
                  <SkipForward size={14} fill="currentColor" />
                </button>
              </div>

              {/* Progress Slider block */}
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

              {/* Voice Pacing animation bar */}
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

        {/* Lower Control Bar: Speed, Mute Volume */}
        {audioUrl && (
          <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 text-xs">
            {/* Playback speed selector */}
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span className="text-slate-500 font-medium mr-1 select-none">Speed:</span>
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

            {/* Volume controls */}
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

        {/* Script Karaoke View (Synchronized speakers listing) */}
        <div className="flex flex-col gap-2.5 mt-2">
          <div className="flex items-center justify-between select-none">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              Dialogue Flow Script
            </span>
            {activeDialogueIndex !== -1 && (
              <span className="text-[11px] text-indigo-600 font-semibold animate-pulse">
                Speaking: {dialogue[activeDialogueIndex]?.labelJa}
              </span>
            )}
          </div>

          <div className="max-h-[220px] overflow-y-auto border border-slate-200/50 rounded-xl p-3 bg-white flex flex-col gap-2.5 scrollbar-thin">
            {dialogue.map((line, idx) => {
              const active = idx === activeDialogueIndex;
              // Choose colors based on the speaker role
              let themeClass = "bg-slate-50 border-slate-100 text-slate-700";
              let speakerBadgeStyle = "bg-slate-200 text-slate-700";
              if (line.speaker === "Man") {
                themeClass = active
                  ? "bg-blue-50/70 border-blue-400 text-blue-900 ring-1 ring-blue-400/30"
                  : "bg-blue-50/20 border-slate-100 text-slate-700 hover:bg-blue-50/10";
                speakerBadgeStyle = "bg-blue-100 text-blue-700";
              } else if (line.speaker === "Woman") {
                themeClass = active
                  ? "bg-pink-50/70 border-pink-400 text-pink-900 ring-1 ring-pink-400/30"
                  : "bg-pink-50/20 border-slate-100 text-slate-700 hover:bg-pink-50/10";
                speakerBadgeStyle = "bg-pink-100 text-pink-700";
              } else {
                themeClass = active
                  ? "bg-slate-100 border-slate-400 text-slate-900 ring-1 ring-slate-400/30"
                  : "bg-slate-50 border-slate-100 text-slate-700";
                speakerBadgeStyle = "bg-slate-200 text-slate-600";
              }

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border transition-all duration-300 flex flex-col gap-1 ${themeClass}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${speakerBadgeStyle}`}>
                      {line.labelJa} ({line.speaker})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Line {idx + 1}</span>
                  </div>
                  <p className="text-sm font-sans font-medium mt-0.5">{line.textJa}</p>
                  <p className="text-xs text-slate-400/90 leading-normal italic font-sans">{line.textEn}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
