import React, { useState, useEffect } from "react";
import { Check, X, Award, Eye, EyeOff, BookOpen, Info } from "lucide-react";
import { JLPTQuestion } from "../types";

interface QuizSectionProps {
  lesson: JLPTQuestion;
}

export default function QuizSection({ lesson }: QuizSectionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showEnglishTranslation, setShowEnglishTranslation] = useState(false);

  // Reset quiz states when the loaded lesson changes
  useEffect(() => {
    setSelectedAnswer(null);
    setRevealed(false);
  }, [lesson]);

  const handleOptionClick = (optionIndex: number) => {
    if (revealed) return; // Answer locked after clicking
    setSelectedAnswer(optionIndex);
    setRevealed(true);
  };

  return (
    <div id="quiz-deck-wrapper" className="flex flex-col gap-5">
      {/* 1. Situation Card */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-indigo-500 tracking-wider uppercase flex items-center gap-1">
            <Info size={12} />
            Situation Context
          </span>
          <button
            onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 border border-slate-200 px-2 py-1 rounded transition select-none cursor-pointer"
          >
            {showEnglishTranslation ? (
              <>
                <EyeOff size={11} />
                <span>Hide English</span>
              </>
            ) : (
              <>
                <Eye size={11} />
                <span>Show English</span>
              </>
            )}
          </button>
        </div>
        <p className="text-base text-slate-800 font-medium leading-relaxed font-sans">
          {lesson.situationJa}
        </p>
        {showEnglishTranslation && (
          <p className="text-xs text-slate-500 leading-relaxed italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
            {lesson.situationEn}
          </p>
        )}
      </div>

      {/* 2. Primary Question Card & Options */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-indigo-600/20 text-indigo-400 font-bold text-[10px] tracking-wide px-2 py-0.5 rounded border border-indigo-500/20">
            Choukai Topic
          </span>
          <h2 className="text-xs font-mono text-slate-400 font-bold">
            {lesson.jlptLevel} LISTENING PRACTICE
          </h2>
        </div>

        <h1 className="text-base sm:text-lg font-bold text-white mb-2 leading-snug font-display">
          {lesson.questionJa}
        </h1>
        {showEnglishTranslation && (
          <p className="text-xs text-slate-300 leading-normal mb-5 italic text-slate-300">
            {lesson.questionEn}
          </p>
        )}

        {/* 4 Interactive Multiple-Choice options */}
        <div className="flex flex-col gap-3 mt-4" id="options-container">
          {lesson.options.map((option, idx) => {
            const optionNum = idx + 1; // 1-indexed
            const isSelected = selectedAnswer === optionNum;
            const isCorrect = optionNum === lesson.correctAnswer;
            
            // Layout button coloration based on state
            let btnStyle = "bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-white";
            let indicator = null;

            if (revealed) {
              if (isCorrect) {
                // Correct choice always highlights green
                btnStyle = "bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/30";
                indicator = (
                  <span className="w-5 h-5 flex items-center justify-center bg-emerald-500 text-white rounded-full text-[10px] animate-bounce">
                    <Check size={12} strokeWidth={3} />
                  </span>
                );
              } else if (isSelected) {
                // Wrong clicked choice highlights red
                btnStyle = "bg-rose-950/60 border-rose-500 text-rose-100 ring-2 ring-rose-500/30";
                indicator = (
                  <span className="w-5 h-5 flex items-center justify-center bg-rose-500 text-white rounded-full text-[10px]">
                    <X size={12} strokeWidth={3} />
                  </span>
                );
              } else {
                // Other options fade out slightly
                btnStyle = "bg-slate-800/30 border-slate-800 text-slate-400 cursor-not-allowed";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(optionNum)}
                disabled={revealed}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between gap-3 font-sans font-medium cursor-pointer ${btnStyle}`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      Option {optionNum}
                    </span>
                    <span className="text-sm sm:text-base font-semibold">{option}</span>
                  </div>
                  {showEnglishTranslation && (
                    <span className="text-xs text-slate-400 font-normal italic pl-11">
                      {lesson.optionsEn[idx]}
                    </span>
                  )}
                </div>
                {indicator || (
                  <span className="w-5 h-5 flex items-center justify-center bg-slate-700 text-slate-300 rounded-full text-[10.5px] font-bold font-mono group-hover:bg-indigo-600 group-hover:text-white pb-0.5">
                    {optionNum}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback message overlay */}
        {revealed && (
          <div className="mt-5 p-4 rounded-xl flex items-center gap-3 animate-fade-in bg-slate-800 border border-slate-700">
            {selectedAnswer === lesson.correctAnswer ? (
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Award size={20} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400">正解！ Correct Answer!</h4>
                  <p className="text-xs text-slate-300">You successfully pinpointed the correct option!</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
                  <X size={20} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-rose-400">不正解 / Wrong Answer</h4>
                  <p className="text-xs text-slate-300">
                    The correct answer was Option {lesson.correctAnswer}. Let's read the breakdown below!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Explanation & Vocabulary Cards */}
      {revealed && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Detailed Grammar Analysis */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
              <span className="p-1 bg-amber-50 rounded text-amber-600">💡</span>
              Answer Explanation & Listening Cues
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed font-sans whitespace-pre-wrap">
              {lesson.explanation}
            </p>
          </div>

          {/* Vocabulary Deck */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <span className="p-1 bg-violet-50 text-violet-600 rounded">
                <BookOpen size={16} />
              </span>
              Key Vocabulary Glossary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lesson.vocabulary.map((vocab, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5 shadow-2xs"
                >
                  <span className="text-[10px] font-bold text-indigo-500 font-mono mt-0.5 select-none">
                    #0{i + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-800 font-sans">{vocab.word}</span>
                      {vocab.furigana && vocab.furigana !== vocab.word && (
                        <span className="text-[10.5px] font-medium text-slate-400 bg-slate-200/50 px-1 rounded">
                          {vocab.furigana}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium leading-normal">{vocab.meaning}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
