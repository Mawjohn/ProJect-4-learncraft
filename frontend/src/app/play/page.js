'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import LearnCraftLogo from '@/components/LearnCraftLogo';

// 🔀 ฟังก์ชันสุ่มสลับตำแหน่งอาร์เรย์ (Fisher-Yates Shuffle)
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// 🔀 ฟังก์ชันเตรียมชุด Quiz พร้อมสลับคำถามและตัวเลือก
const prepareShuffledQuiz = (questions = []) => {
  const shuffledQuestions = shuffleArray(questions);
  return shuffledQuestions.map((q) => {
    const originalAnswerText = q.options[q.answer];
    const shuffledOptions = shuffleArray(q.options);
    const newAnswerIndex = shuffledOptions.indexOf(originalAnswerText);
    return {
      ...q,
      options: shuffledOptions,
      answer: newAnswerIndex,
    };
  });
};

// 🎵 ฟังก์ชันสร้าง Sound Effects ด้วย Web Audio API
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'flip') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'match' || type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.2, now + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
        o.start(now + idx * 0.1);
        o.stop(now + idx * 0.1 + 0.25);
      });
    }
  } catch (e) {
    console.error('Audio context error:', e);
  }
};

function PlayGameContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [game, setGame] = useState(null);

  // 1. เพิ่มตัวแปรสำหรับรับค่า API_URL 
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // ⏱️ Timer State
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  // 🎯 Quiz State
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizWrong, setQuizWrong] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [answersSummary, setAnswersSummary] = useState([]);

  // 🎴 Flashcard State
  const [activeCards, setActiveCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showFlashAnswer, setShowFlashAnswer] = useState(false);
  const [knownCards, setKnownCards] = useState([]);
  const [unknownCards, setUnknownCards] = useState([]);
  const [flashcardFinished, setFlashcardFinished] = useState(false);

  // 🧩 Matching Game State
  const [activePairs, setActivePairs] = useState([]);
  const [shuffledDefinitions, setShuffledDefinitions] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedDef, setSelectedDef] = useState(null);
  const [userMatches, setUserMatches] = useState({});
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  const [matchingWrongCount, setMatchingWrongCount] = useState(0);
  const [wrongTermId, setWrongTermId] = useState(null);
  const [wrongDefId, setWrongDefId] = useState(null);
  const [matchingFinished, setMatchingFinished] = useState(false);

  // ✨ State สำหรับ Popup โชว์คู่ที่จับคู่สำเร็จ (2s โชว์ + 600ms เฟดจางออก)
  const [matchedPopup, setMatchedPopup] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // 📝 Score Submission & 🏆 Leaderboard State
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const isGameDone = quizFinished || flashcardFinished || matchingFinished;

  useEffect(() => {
    let interval = null;
    if (timerActive && !loading && !error && !isGameDone) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, loading, error, isGameDone]);

  // 🏆 ฟังก์ชันดึงและจัดอันดับ Leaderboard
  const fetchLeaderboard = async () => {
    if (!gameId) return;
    setLoadingLeaderboard(true);
    try {
      // 2. ใช้ API_URL แทน 127.0.0.1:8000
      const res = await fetch(`${API_URL}/api/games/${gameId}`);
      const result = await res.json();
      if (result.status === 'success' && result.data && result.data.scores) {
        const rawScores = result.data.scores || [];
        const sorted = [...rawScores].sort((a, b) => {
          const scoreA = a.score ?? 0;
          const scoreB = b.score ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          const timeA = a.time_taken_seconds ?? a.time_taken ?? a.timeTaken ?? 999999;
          const timeB = b.time_taken_seconds ?? b.time_taken ?? b.timeTaken ?? 999999;
          return timeA - timeB;
        });
        setLeaderboard(sorted.slice(0, 5));
      }
    } catch (err) {
      console.error('Fetch leaderboard error:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (!gameId) {
      setError('ไม่พบรหัสเกม กรุณาตรวจสอบลิงก์อีกครั้ง');
      setLoading(false);
      return;
    }

    const fetchGame = async () => {
      try {
        // 3. ใช้ API_URL แทน 127.0.0.1:8000
        const res = await fetch(`${API_URL}/api/games/${gameId}`);
        const result = await res.json();

        if (result.status === 'success' && result.data) {
          const fetchedGame = result.data;
          setGame(fetchedGame);

          if (fetchedGame.scores) {
            const sorted = [...fetchedGame.scores].sort((a, b) => {
              const scoreA = a.score ?? 0;
              const scoreB = b.score ?? 0;
              if (scoreB !== scoreA) return scoreB - scoreA;
              const timeA = a.time_taken_seconds ?? a.time_taken ?? a.timeTaken ?? 999999;
              const timeB = b.time_taken_seconds ?? b.time_taken ?? b.timeTaken ?? 999999;
              return timeA - timeB;
            });
            setLeaderboard(sorted.slice(0, 5));
          }

          if (fetchedGame.data?.questions) {
            setActiveQuestions(prepareShuffledQuiz(fetchedGame.data.questions));
          }

          if (fetchedGame.data?.cards) {
            setActiveCards(shuffleArray(fetchedGame.data.cards));
          }

          if (fetchedGame.data?.pairs) {
            const randomizedTerms = shuffleArray(fetchedGame.data.pairs);
            setActivePairs(randomizedTerms);
            const defs = fetchedGame.data.pairs.map((p) => ({ id: p.id, text: p.definition }));
            setShuffledDefinitions(shuffleArray(defs));
          }
        } else {
          setError('ไม่พบข้อมูลเกมนี้');
        }
      } catch (err) {
        console.error('Fetch game error:', err);
        setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  useEffect(() => {
    if (isGameDone) {
      fetchLeaderboard();
    }
  }, [isGameDone]);

  const triggerConfetti = () => {
    playSound('win');
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const formatClock = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // ==========================================
  // 🎯 QUIZ LOGIC
  // ==========================================
  const handleSelectQuizOption = (optionIndex) => {
    if (isConfirmed) return;
    playSound('click');
    setSelectedOption(optionIndex);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null || isConfirmed) return;
    setIsConfirmed(true);

    const currentQuestion = activeQuestions[currentQuizIndex];
    const isCorrect = selectedOption === currentQuestion.answer;

    if (isCorrect) {
      playSound('correct');
      setQuizScore((prev) => prev + 1);
    } else {
      playSound('wrong');
      setQuizWrong((prev) => prev + 1);
    }

    setAnswersSummary((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        userAnswer: selectedOption,
        correctAnswer: currentQuestion.answer,
        isCorrect,
        explanation: currentQuestion.explanation,
      },
    ]);
  };

  const handleNextQuestion = () => {
    const total = activeQuestions.length;
    if (currentQuizIndex + 1 < total) {
      setCurrentQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsConfirmed(false);
      playSound('click');
    } else {
      setQuizFinished(true);
      setTimerActive(false);
      setTimeout(() => triggerConfetti(), 300);
    }
  };

  const resetQuizGame = () => {
    if (game?.data?.questions) {
      setActiveQuestions(prepareShuffledQuiz(game.data.questions));
    }
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setIsConfirmed(false);
    setQuizScore(0);
    setQuizWrong(0);
    setQuizFinished(false);
    setAnswersSummary([]);
    setScoreSubmitted(false);
    setSecondsElapsed(0);
    setTimerActive(true);
  };

  // ==========================================
  // 🎴 FLASHCARD LOGIC
  // ==========================================
  const handleCardRating = (isCorrectAnswer) => {
    playSound(isCorrectAnswer ? 'correct' : 'wrong');
    const currentCard = activeCards[currentCardIndex];

    if (isCorrectAnswer) {
      setKnownCards((prev) => [...prev, currentCard]);
    } else {
      setUnknownCards((prev) => [...prev, currentCard]);
    }

    setShowFlashAnswer(false);

    if (currentCardIndex + 1 < activeCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setFlashcardFinished(true);
      setTimerActive(false);
      setTimeout(() => triggerConfetti(), 300);
    }
  };

  const resetFlashcardGame = () => {
    if (game?.data?.cards) {
      setActiveCards(shuffleArray(game.data.cards));
    }
    setCurrentCardIndex(0);
    setShowFlashAnswer(false);
    setKnownCards([]);
    setUnknownCards([]);
    setFlashcardFinished(false);
    setScoreSubmitted(false);
    setSecondsElapsed(0);
    setTimerActive(true);
  };

  // ==========================================
  // 🧩 MATCHING GAME LOGIC
  // ==========================================
  const evaluateMatchPair = (termId, defId) => {
    if (termId === defId) {
      playSound('match');

      const matchedItem = activePairs.find((p) => p.id === termId);
      const isFinalPair = matchedPairsCount + 1 === activePairs.length;

      if (isFinalPair) {
        setTimerActive(false);
      }

      if (matchedItem) {
        setMatchedPopup({
          term: matchedItem.term,
          definition: matchedItem.definition,
        });

        setTimeout(() => {
          setPopupVisible(true);
        }, 20);

        setTimeout(() => {
          setPopupVisible(false);
        }, 2000);

        setTimeout(() => {
          setMatchedPopup(null);
          if (isFinalPair) {
            setMatchingFinished(true);
            triggerConfetti();
          }
        }, 2600);
      }

      const newMatches = { ...userMatches, [termId]: defId };
      setUserMatches(newMatches);
      setMatchedPairsCount((prev) => prev + 1);
      setSelectedTerm(null);
      setSelectedDef(null);
    } else {
      playSound('wrong');
      setMatchingWrongCount((prev) => prev + 1);
      setWrongTermId(termId);
      setWrongDefId(defId);

      setTimeout(() => {
        setWrongTermId(null);
        setWrongDefId(null);
        setSelectedTerm(null);
        setSelectedDef(null);
      }, 600);
    }
  };

  const handleSelectTerm = (termId) => {
    if (userMatches[termId] || wrongTermId || wrongDefId) return;
    playSound('click');

    if (selectedTerm === termId) {
      setSelectedTerm(null);
      return;
    }

    if (selectedDef !== null) {
      setSelectedTerm(termId);
      evaluateMatchPair(termId, selectedDef);
    } else {
      setSelectedTerm(termId);
    }
  };

  const handleSelectDefinition = (defId) => {
    if (Object.values(userMatches).includes(defId) || wrongTermId || wrongDefId) return;
    playSound('click');

    if (selectedDef === defId) {
      setSelectedDef(null);
      return;
    }

    if (selectedTerm !== null) {
      setSelectedDef(defId);
      evaluateMatchPair(selectedTerm, defId);
    } else {
      setSelectedDef(defId);
    }
  };

  const resetMatchingGame = () => {
    if (game?.data?.pairs) {
      setActivePairs(shuffleArray(game.data.pairs));
      const defs = game.data.pairs.map((p) => ({ id: p.id, text: p.definition }));
      setShuffledDefinitions(shuffleArray(defs));
    }
    setSelectedTerm(null);
    setSelectedDef(null);
    setWrongTermId(null);
    setWrongDefId(null);
    setUserMatches({});
    setMatchedPairsCount(0);
    setMatchingWrongCount(0);
    setMatchingFinished(false);
    setMatchedPopup(null);
    setPopupVisible(false);
    setScoreSubmitted(false);
    setSecondsElapsed(0);
    setTimerActive(true);
  };

  // ==========================================
  // 📊 SCORE SUBMISSION
  // ==========================================
  const handleSubmitScore = async (finalScore, totalQuestions) => {
    if (!playerName.trim()) {
      alert('กรุณากรอกชื่อผู้เรียนก่อนส่งคะแนน');
      return;
    }

    try {
      // 4. ใช้ API_URL แทน 127.0.0.1:8000
      const res = await fetch(`${API_URL}/api/games/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          student_name: playerName.trim(),
          playerName: playerName.trim(),
          player_name: playerName.trim(),
          score: finalScore,
          total_score: totalQuestions,
          total_questions: totalQuestions,
          time_taken_seconds: secondsElapsed || 0,
          time_taken: secondsElapsed || 0,
          timeTaken: secondsElapsed || 0,
        }),
      });

      const result = await res.json();
      if (result.status === 'success') {
        setScoreSubmitted(true);
        playSound('win');
        fetchLeaderboard();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกคะแนน');
      }
    } catch (err) {
      console.error('Submit score error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกคะแนนได้');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">
        กำลังโหลดเกม...
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">
        {error}
      </div>
    );
  }

  const totalCount =
    activeQuestions.length > 0
      ? activeQuestions.length
      : activeCards.length > 0
      ? activeCards.length
      : activePairs.length;

  const currentStep =
    activeQuestions.length > 0
      ? Math.min(currentQuizIndex + 1, totalCount)
      : activeCards.length > 0
      ? Math.min(currentCardIndex + 1, totalCount)
      : Math.min(matchedPairsCount + 1, totalCount);

  const gameModeTitle =
    game.game_type === 'matching'
      ? 'เกมจับคู่'
      : game.game_type === 'flashcard'
      ? 'เกมการ์ด'
      : 'ตอบคำถาม';

  const finalCorrect =
    activeQuestions.length > 0
      ? quizScore
      : activeCards.length > 0
      ? knownCards.length
      : matchedPairsCount;

  const finalWrong =
    activeQuestions.length > 0
      ? quizWrong
      : activeCards.length > 0
      ? unknownCards.length
      : matchingWrongCount;

  const finalAccuracy = totalCount > 0 ? Math.round((finalCorrect / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen space-theme-bg text-white py-6 px-4 md:px-10 flex flex-col items-center justify-center relative overflow-hidden">
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>

      {/* 🌟 MATCHING POPUP TOAST กลางจอ */}
      {matchedPopup && (
        <div
          className={`fixed top-1/2 left-1/2 z-50 pointer-events-none transform -translate-x-1/2 transition-all duration-600 ease-out ${
            popupVisible
              ? '-translate-y-1/2 opacity-100 scale-100'
              : '-translate-y-[62%] opacity-0 scale-95'
          }`}
        >
          <div className="bg-neutral-900/95 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 shadow-2xl shadow-emerald-950/80 backdrop-blur-md max-w-md w-[90vw] text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <span>✨ จับคู่ถูกต้อง! Perfect Match</span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-base md:text-xl font-black text-indigo-300">
                {matchedPopup.term}
              </div>
              <div className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                ⮁ เชื่อมโยงกับ ⮁
              </div>
              <div className="text-xs md:text-sm font-medium text-emerald-200 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/60 leading-relaxed">
                {matchedPopup.definition}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* โลโก้มุมซ้ายบน */}
      <div className="fixed top-5 left-6 z-30 hidden xl:block">
        <LearnCraftLogo size="md" />
      </div>

      <div className="w-full max-w-4xl bg-[#2b2a2e]/90 border border-neutral-600/40 rounded-3xl p-6 md:p-10 min-h-[85vh] flex flex-col justify-between shadow-2xl relative">
        <div className="xl:hidden flex justify-center pb-3">
          <LearnCraftLogo size="sm" />
        </div>

        {/* แถบสถานะ 3 กล่องด้านบน */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
          <div className="px-6 py-2.5 bg-[#636682] rounded-2xl text-sm md:text-base font-bold text-white shadow-md">
            {currentStep} จาก {totalCount} ข้อ
          </div>

          <div className="px-10 py-2.5 bg-[#636682] rounded-2xl text-base md:text-lg font-bold text-white shadow-md">
            {gameModeTitle}
          </div>

          <div className="px-7 py-2.5 bg-[#636682] rounded-2xl text-sm md:text-base font-mono font-bold text-white shadow-md">
            {formatClock(secondsElapsed)}
          </div>
        </div>

        {/* ==========================================
            🎯 1. QUIZ GAME
            ========================================== */}
        {activeQuestions.length > 0 && !quizFinished && (
          <div className="my-auto space-y-6 py-4">
            <div className="w-full py-5 px-6 bg-[#636682] rounded-2xl text-center text-base md:text-xl font-bold text-white shadow-lg">
              {currentQuizIndex + 1}.{activeQuestions[currentQuizIndex].question}
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {activeQuestions[currentQuizIndex].options?.map((optionText, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = activeQuestions[currentQuizIndex].answer === optIdx;

                let btnStyle = 'bg-[#7477e6] hover:bg-[#6366f1] text-black border-2 border-black';

                if (!isConfirmed) {
                  if (isSelected) {
                    btnStyle = 'bg-[#7477e6] text-black border-4 border-[#48bb3a] ring-4 ring-[#48bb3a]/50 scale-[1.02] shadow-[0_0_20px_rgba(72,187,58,0.6)]';
                  }
                } else {
                  if (isCorrect) {
                    btnStyle = 'bg-[#48bb3a] text-black border-2 border-black';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-[#c92a2a] text-white border-2 border-black';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isConfirmed}
                    onClick={() => handleSelectQuizOption(optIdx)}
                    className={`min-h-[130px] md:min-h-[150px] p-6 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center text-center shadow-xl transition-all cursor-pointer ${btnStyle}`}
                  >
                    <span>{optionText}</span>
                  </button>
                );
              })}

              <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-black items-center justify-center pointer-events-none shadow-2xl">
                {isConfirmed && (
                  <div className="w-16 h-16 rounded-full bg-[#3b2fd4] transition-all duration-200 scale-100" />
                )}
              </div>
            </div>

            {!isConfirmed && (
              <div className="pt-2">
                <button
                  onClick={handleConfirmAnswer}
                  disabled={selectedOption === null}
                  className={`w-full py-3.5 font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 border-2 border-black ${
                    selectedOption !== null
                      ? 'bg-[#4f46e5] hover:bg-[#4338ca] text-white cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-[#38363a] text-neutral-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <span>{selectedOption !== null ? 'ยืนยันคำตอบ 🔒' : 'กรุณาคลิกเลือกคำตอบด้านบนก่อน'}</span>
                </button>
              </div>
            )}

            {isConfirmed && (
              <div className="space-y-4 pt-2">
                {activeQuestions[currentQuizIndex].explanation && (
                  <div className="bg-[#38363a] p-4 rounded-2xl border border-neutral-600 text-xs space-y-1 text-neutral-200">
                    <span className="font-bold text-indigo-300">💡 คำอธิบายเฉลย:</span>
                    <p className="text-neutral-300 leading-relaxed">{activeQuestions[currentQuizIndex].explanation}</p>
                  </div>
                )}

                <button
                  onClick={handleNextQuestion}
                  className="w-full py-3.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm rounded-2xl border-2 border-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{currentQuizIndex + 1 === activeQuestions.length ? 'ดูผลการทดสอบรวม 🏁' : 'ข้อถัดไป ➔'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            🎴 2. FLASHCARD GAME
            ========================================== */}
        {activeCards.length > 0 && !flashcardFinished && (
          <div className="my-auto space-y-6 py-4">
            <div className="max-w-xs mx-auto py-2.5 px-6 bg-[#636682] rounded-2xl flex items-center justify-between text-xs md:text-sm font-bold text-white shadow">
              <span>ตอบถูก +1</span>
              <span>ตอบผิด - 1</span>
            </div>

            <div className="flex items-center justify-between gap-4 md:gap-8 py-4">
              <button
                onClick={() => handleCardRating(false)}
                className="w-24 md:w-36 h-44 md:h-56 bg-[#b91c1c] hover:bg-red-700 text-white font-bold text-lg md:text-xl rounded-2xl border-2 border-black shadow-xl transition-transform active:scale-95 cursor-pointer shrink-0"
              >
                ผิด
              </button>

              <div
                onClick={() => {
                  playSound('flip');
                  setShowFlashAnswer(!showFlashAnswer);
                }}
                className="flex-1 h-72 md:h-96 max-w-sm mx-auto bg-[#7477e6] hover:bg-[#686be0] text-black rounded-3xl border-2 border-black shadow-2xl p-6 flex flex-col justify-between items-center cursor-pointer select-none transition-all"
              >
                <div />
                <div className="text-lg md:text-2xl font-bold text-center px-3 leading-relaxed">
                  {showFlashAnswer
                    ? activeCards[currentCardIndex].back
                    : activeCards[currentCardIndex].front}
                </div>
                <div className="text-xs md:text-sm font-bold opacity-80">
                  {showFlashAnswer ? 'คำตอบ (คลิกเพื่อกลับไปดูคำถาม)' : 'คลิกเพื่อดูคำตอบ'}
                </div>
              </div>

              <button
                onClick={() => handleCardRating(true)}
                className="w-24 md:w-36 h-44 md:h-56 bg-[#15803d] hover:bg-green-700 text-white font-bold text-lg md:text-xl rounded-2xl border-2 border-black shadow-xl transition-transform active:scale-95 cursor-pointer shrink-0"
              >
                ถูก
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            🧩 3. MATCHING GAME
            ========================================== */}
        {activePairs.length > 0 && !matchingFinished && (
          <div className="my-auto space-y-6 py-2 relative">
            <div className="w-full py-4 bg-[#636682] rounded-2xl text-center text-base md:text-lg font-bold text-white shadow-md">
              จงจับคู่ให้ถูกต้อง
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3.5">
                {activePairs
                  .filter((p) => !userMatches[p.id])
                  .map((p) => {
                    const isSelected = selectedTerm === p.id;
                    const isWrong = wrongTermId === p.id;

                    let cardClass = 'bg-[#7477e6] hover:bg-[#686be0] text-black border-2 border-transparent';

                    if (isWrong) {
                      cardClass = 'bg-[#c92a2a] text-white border-4 border-rose-300 animate-shake shadow-lg';
                    } else if (isSelected) {
                      cardClass = 'bg-[#7477e6] text-black border-4 border-[#48bb3a] ring-4 ring-[#48bb3a]/50 scale-[1.02] shadow-[0_0_20px_rgba(72,187,58,0.6)]';
                    }

                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectTerm(p.id)}
                        className={`w-full h-[92px] px-5 rounded-2xl font-bold text-xs md:text-sm text-center transition-all duration-200 flex items-center justify-center shadow-md cursor-pointer ${cardClass}`}
                      >
                        <span className="line-clamp-3 leading-snug">{p.term}</span>
                      </button>
                    );
                  })}
              </div>

              <div className="space-y-3.5">
                {shuffledDefinitions
                  .filter((d) => !Object.values(userMatches).includes(d.id))
                  .map((d) => {
                    const isSelected = selectedDef === d.id;
                    const isWrong = wrongDefId === d.id;

                    let cardClass = 'bg-[#7477e6] hover:bg-[#686be0] text-black border-2 border-transparent';

                    if (isWrong) {
                      cardClass = 'bg-[#c92a2a] text-white border-4 border-rose-300 animate-shake shadow-lg';
                    } else if (isSelected) {
                      cardClass = 'bg-[#7477e6] text-black border-4 border-[#48bb3a] ring-4 ring-[#48bb3a]/50 scale-[1.02] shadow-[0_0_20px_rgba(72,187,58,0.6)]';
                    }

                    return (
                      <button
                        key={d.id}
                        onClick={() => handleSelectDefinition(d.id)}
                        className={`w-full h-[92px] px-5 rounded-2xl font-bold text-xs md:text-sm text-center transition-all duration-200 flex items-center justify-center shadow-md cursor-pointer ${cardClass}`}
                      >
                        <span className="line-clamp-3 leading-snug">{d.text}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            🏁 4. SUMMARY & LEADERBOARD
            ========================================== */}
        {isGameDone && (
          <div className="my-auto space-y-6 py-4">
            <div className="bg-[#38363a] rounded-3xl p-6 text-center space-y-2 max-w-lg mx-auto shadow-lg">
              <h2 className="text-xl md:text-2xl font-bold text-white">ยอดเยี่ยมมาก! ภารกิจสำเร็จ</h2>
              <p className="text-sm text-neutral-300">ใช้เวลาทั้งหมด: {formatClock(secondsElapsed)}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-[#48bb3a] border-2 border-black rounded-2xl p-5 text-center shadow-lg">
                <div className="text-3xl font-black text-white">{finalCorrect}</div>
                <div className="text-sm font-bold text-white mt-1">ตอบถูก</div>
              </div>
              <div className="bg-[#c92a2a] border-2 border-black rounded-2xl p-5 text-center shadow-lg">
                <div className="text-3xl font-black text-white">{finalWrong}</div>
                <div className="text-sm font-bold text-white mt-1">ตอบผิด</div>
              </div>
              <div className="bg-[#6b5aed] border-2 border-black rounded-2xl p-5 text-center shadow-lg">
                <div className="text-3xl font-black text-white">{finalAccuracy}%</div>
                <div className="text-sm font-bold text-white mt-1">ความถูกต้อง</div>
              </div>
            </div>

            {!scoreSubmitted && (
              <div className="max-w-lg mx-auto bg-[#38363a] p-4 rounded-2xl flex gap-2 shadow">
                <input
                  type="text"
                  placeholder="ใส่ชื่อของคุณเพื่อบันทึกอันดับ..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="flex-1 bg-black/60 border border-neutral-600 text-xs text-white px-4 py-2.5 rounded-xl focus:outline-none"
                />
                <button
                  onClick={() => handleSubmitScore(finalCorrect, totalCount)}
                  className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs rounded-xl border border-black shrink-0 cursor-pointer"
                >
                  บันทึกชื่อ
                </button>
              </div>
            )}

            <div className="max-w-lg mx-auto space-y-3 pt-2">
              <div className="bg-[#38363a] px-6 py-2 rounded-2xl text-center font-bold text-sm w-44 mx-auto shadow">
                ตารางอันดับ
              </div>

              {loadingLeaderboard ? (
                <div className="text-center text-xs text-neutral-400 py-4">กำลังโหลดอันดับ...</div>
              ) : leaderboard.length > 0 ? (
                <div className="space-y-2.5">
                  {leaderboard.map((item, index) => {
                    const name = item.student_name || item.playerName || item.player_name || 'Name';
                    const scoreVal = item.score ?? 0;
                    const totalVal = item.total_questions ?? item.total_score ?? totalCount;
                    const timeVal = item.time_taken_seconds ?? item.time_taken ?? item.timeTaken ?? 0;

                    return (
                      <div
                        key={index}
                        className="bg-[#38363a] px-6 py-3 rounded-2xl grid grid-cols-3 items-center text-sm font-bold text-white shadow"
                      >
                        <span className="truncate text-left">{name}</span>
                        <span className="text-center">
                          {scoreVal}/{totalVal}
                        </span>
                        <span className="text-right font-mono">{formatClock(timeVal)} s</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-xs text-neutral-400 py-4">
                  ยังไม่มีรายชื่อในตารางอันดับ
                </div>
              )}
            </div>

            <div className="max-w-lg mx-auto pt-2 text-center">
              <button
                onClick={() => {
                  if (activeQuestions.length > 0) resetQuizGame();
                  else if (activeCards.length > 0) resetFlashcardGame();
                  else resetMatchingGame();
                }}
                className="px-8 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-2xl font-bold text-xs border border-black shadow-lg cursor-pointer"
              >
                เล่นใหม่อีกครั้ง
              </button>
            </div>
          </div>
        )}

        <div />
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">
          กำลังโหลด...
        </div>
      }
    >
      <PlayGameContent />
    </Suspense>
  );
}