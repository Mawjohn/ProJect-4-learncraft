'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';

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

  // ⏱️ Timer State
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  // 🎯 Quiz State
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
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
  const [userMatches, setUserMatches] = useState({});
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [wrongTermId, setWrongTermId] = useState(null);
  const [matchingFinished, setMatchingFinished] = useState(false);

  // ✨ State สำหรับ Popup โชว์คู่ที่จับคู่สำเร็จ
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
      const res = await fetch(`http://127.0.0.1:8000/api/games/${gameId}`);
      const result = await res.json();
      if (result.status === 'success' && result.data && result.data.scores) {
        const rawScores = result.data.scores || [];
        // เรียงลำดับ: คะแนนมากที่สุดก่อน -> ถ้าคะแนนเท่ากัน ให้ดูเวลาที่ใช้น้อยที่สุด (เร็วกว่า)
        const sorted = [...rawScores].sort((a, b) => {
          const scoreA = a.score ?? 0;
          const scoreB = b.score ?? 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          const timeA = a.time_taken_seconds ?? a.time_taken ?? a.timeTaken ?? 999999;
          const timeB = b.time_taken_seconds ?? b.time_taken ?? b.timeTaken ?? 999999;
          return timeA - timeB;
        });
        setLeaderboard(sorted.slice(0, 5)); // เอาแค่ Top 5
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
        const res = await fetch(`http://127.0.0.1:8000/api/games/${gameId}`);
        const result = await res.json();

        if (result.status === 'success' && result.data) {
          const fetchedGame = result.data;
          setGame(fetchedGame);

          // โหลด Leaderboard เดิมไว้ล่วงหน้า
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

          // 🔀 สลับ Quiz ตอนโหลดครั้งแรก
          if (fetchedGame.data?.questions) {
            setActiveQuestions(prepareShuffledQuiz(fetchedGame.data.questions));
          }

          // 🔀 สลับ Flashcards ตอนโหลดครั้งแรก
          if (fetchedGame.data?.cards) {
            setActiveCards(shuffleArray(fetchedGame.data.cards));
          }

          // 🔀 สลับ Pairs และความหมาย Matching ตอนโหลดครั้งแรก
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

  // ดึง Leaderboard ล่าสุดทันทีเมื่อเล่นจบ
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

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m > 0 ? `${m}m ` : ''}${s}s`;
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
  // 🧩 MATCHING GAME LOGIC (2s Popup + Smooth Fade)
  // ==========================================
  const handleSelectTerm = (termId) => {
    if (userMatches[termId]) return;
    playSound('click');
    setSelectedTerm(termId);
    setWrongTermId(null);
  };

  const handleSelectDefinition = (defId) => {
    if (!selectedTerm) return;

    if (selectedTerm === defId) {
      playSound('match');

      const matchedItem = activePairs.find((p) => p.id === selectedTerm);
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

        // ⏱️ โชว์ 2 วินาที (2000ms) แล้วเริ่มจาง
        setTimeout(() => {
          setPopupVisible(false);
        }, 2000);

        // ⏱️ จางจบใน 600ms รวมเป็น 2600ms แล้วแสดงหน้าสรุปผล
        setTimeout(() => {
          setMatchedPopup(null);
          if (isFinalPair) {
            setMatchingFinished(true);
            triggerConfetti();
          }
        }, 2600);
      }

      const newMatches = { ...userMatches, [selectedTerm]: defId };
      setUserMatches(newMatches);
      setMatchedPairsCount((prev) => prev + 1);
      setSelectedTerm(null);
      setComboStreak((prev) => prev + 1);
    } else {
      playSound('wrong');
      setWrongTermId(selectedTerm);
      setComboStreak(0);
      setTimeout(() => {
        setWrongTermId(null);
        setSelectedTerm(null);
      }, 600);
    }
  };

  const resetMatchingGame = () => {
    if (game?.data?.pairs) {
      setActivePairs(shuffleArray(game.data.pairs));
      const defs = game.data.pairs.map((p) => ({ id: p.id, text: p.definition }));
      setShuffledDefinitions(shuffleArray(defs));
    }
    setSelectedTerm(null);
    setUserMatches({});
    setMatchedPairsCount(0);
    setComboStreak(0);
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
      const res = await fetch('http://127.0.0.1:8000/api/games/score', {
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
        // รีเฟรชตาราง Leaderboard ทันทีเพื่อให้แสดงอันดับล่าสุด
        fetchLeaderboard();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกคะแนน');
      }
    } catch (err) {
      console.error('Submit score error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกคะแนนได้');
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">กำลังโหลดเกม...</div>;
  if (error || !game) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">{error}</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>

      {/* 🌟 MATCHING POPUP TOAST (2s โชว์ + 600ms เฟดจางออก) */}
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

      <div className="w-full max-w-3xl space-y-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-800">
                {game.game_type === 'matching' ? 'Matching Arena 🧩' : game.game_type === 'flashcard' ? 'Flashcard Studio 🎴' : 'Quiz Challenge 🎯'}
              </span>
              <h1 className="text-xl md:text-2xl font-extrabold text-white mt-2">{game.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              {game.game_type === 'matching' && comboStreak > 1 && (
                <div className="bg-amber-950/80 border border-amber-500 text-amber-300 font-extrabold text-xs px-3 py-1.5 rounded-xl animate-bounce">
                  🔥 {comboStreak} Combo!
                </div>
              )}
              <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                <span className="animate-pulse">⏱️</span>
                <span className="font-mono font-bold text-sm text-indigo-300">{formatTime(secondsElapsed)}</span>
              </div>
            </div>
          </div>

          {/* ==========================================
              🎯 1. QUIZ GAME
              ========================================== */}
          {activeQuestions.length > 0 && !quizFinished && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neutral-400">
                    คำถามข้อที่ <span className="text-white text-sm font-bold">{currentQuizIndex + 1}</span> จาก {activeQuestions.length}
                  </span>
                  <span className="text-indigo-400 font-mono font-bold">
                    {Math.round(((currentQuizIndex + 1) / activeQuestions.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.round(((currentQuizIndex + 1) / activeQuestions.length) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800/80 p-5 rounded-2xl min-h-[90px] flex items-center">
                <h2 className="text-base md:text-lg font-bold text-white leading-snug">
                  {activeQuestions[currentQuizIndex].question}
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {activeQuestions[currentQuizIndex].options?.map((optionText, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isCorrect = activeQuestions[currentQuizIndex].answer === optIdx;

                  let btnStyle = 'bg-neutral-950 border-neutral-800 text-neutral-200 hover:border-indigo-500/60 hover:bg-neutral-900';

                  if (!isConfirmed) {
                    if (isSelected) {
                      btnStyle = 'bg-indigo-950/80 border-indigo-500 text-indigo-200 font-bold ring-2 ring-indigo-500 shadow-lg shadow-indigo-950/50 scale-[1.01]';
                    }
                  } else {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/40';
                    } else {
                      btnStyle = 'bg-neutral-950/40 border-neutral-800/40 text-neutral-600 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isConfirmed}
                      onClick={() => handleSelectQuizOption(optIdx)}
                      className={`p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between group ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          !isConfirmed && isSelected ? 'bg-indigo-600 text-white' :
                          isConfirmed && isCorrect ? 'bg-emerald-500 text-neutral-950' :
                          isConfirmed && isSelected && !isCorrect ? 'bg-rose-500 text-white' :
                          'bg-neutral-900 text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="font-medium">{optionText}</span>
                      </div>
                      {!isConfirmed && isSelected && <span className="text-indigo-400 text-xs font-bold bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700">เลือกแล้ว</span>}
                      {isConfirmed && isCorrect && <span className="text-emerald-400 text-base font-bold">✓</span>}
                      {isConfirmed && isSelected && !isCorrect && <span className="text-rose-400 text-base font-bold">✗</span>}
                    </button>
                  );
                })}
              </div>

              {!isConfirmed && (
                <button
                  onClick={handleConfirmAnswer}
                  disabled={selectedOption === null}
                  className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    selectedOption !== null
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-800'
                  }`}
                >
                  <span>{selectedOption !== null ? 'ยืนยันคำตอบ 🔒' : 'กรุณาเลือกคำตอบด้านบน'}</span>
                </button>
              )}

              {isConfirmed && (
                <div className="space-y-4">
                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs space-y-1 text-neutral-300">
                    <span className="font-bold text-indigo-400">💡 คำอธิบายเฉลย:</span>
                    <p className="text-neutral-400 leading-relaxed">{activeQuestions[currentQuizIndex].explanation}</p>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{currentQuizIndex + 1 === activeQuestions.length ? 'ดูผลการทดสอบรวม 🏁' : 'ข้อถัดไป ➔'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              🎴 2. FLASHCARD CARD
              ========================================== */}
          {activeCards.length > 0 && !flashcardFinished && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-400">
                  ข้อที่ <span className="text-white font-bold text-sm">{currentCardIndex + 1}</span> จาก {activeCards.length}
                </span>
                <div className="flex gap-2">
                  <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                    ✓ ตอบถูก (+1): {knownCards.length}
                  </span>
                  <span className="bg-rose-950/80 border border-rose-800 text-rose-400 px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                    ✗ ตอบผิด (+0): {unknownCards.length}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.round(((currentCardIndex + 1) / activeCards.length) * 100)}%` }}
                />
              </div>

              <div className="text-center">
                <span className="text-xs font-extrabold px-3 py-1 rounded-full border bg-neutral-950 text-neutral-300 border-neutral-800">
                  {showFlashAnswer ? '📖 ด้านหลัง (คำตอบ / เฉลย)' : '📝 ด้านหน้า (คำถาม)'}
                </span>
              </div>

              <div className="w-full min-h-[260px] md:min-h-[300px] bg-neutral-950 border-2 border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex items-stretch">
                <button
                  onClick={() => handleCardRating(false)}
                  className="w-20 md:w-28 bg-rose-950/20 hover:bg-rose-600 border-r-2 border-neutral-800 hover:border-rose-500 text-rose-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-2 p-2 group shrink-0"
                  title="ตอบผิด (+0 คะแนน และไปข้อถัดไป)"
                >
                  <span className="text-2xl md:text-3xl group-hover:scale-125 transition-transform">❌</span>
                  <span className="text-xs font-black uppercase tracking-wider">ตอบผิด</span>
                  <span className="text-[10px] opacity-75 font-mono">+0</span>
                </button>

                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between items-center text-center">
                  <div className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-neutral-500 border-b border-neutral-800/80 pb-2">
                    <span className="text-amber-400 font-mono">การ์ดข้อ #{currentCardIndex + 1}</span>
                    <span>{showFlashAnswer ? 'คำตอบเฉลย' : 'แตะปุ่มเพื่อดูคำตอบ'}</span>
                  </div>

                  <div className="my-auto py-4 px-2 w-full">
                    {!showFlashAnswer ? (
                      <div className="text-lg md:text-2xl font-extrabold text-white leading-relaxed">
                        {activeCards[currentCardIndex].front}
                      </div>
                    ) : (
                      <div className="text-base md:text-xl font-bold text-emerald-300 leading-relaxed bg-emerald-950/20 p-4 rounded-2xl border border-emerald-900/60">
                        {activeCards[currentCardIndex].back}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      playSound('flip');
                      setShowFlashAnswer(!showFlashAnswer);
                    }}
                    className="px-5 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700 hover:border-indigo-500"
                  >
                    <span>{showFlashAnswer ? '🔄 พลิกกลับไปดูคำถาม (ด้านหน้า)' : '👁️ กดดูคำตอบ / เฉลย (ด้านหลัง)'}</span>
                  </button>
                </div>

                <button
                  onClick={() => handleCardRating(true)}
                  className="w-20 md:w-28 bg-emerald-950/20 hover:bg-emerald-600 border-l-2 border-neutral-800 hover:border-emerald-500 text-emerald-400 hover:text-white transition-all duration-200 flex flex-col items-center justify-center gap-2 p-2 group shrink-0"
                  title="ตอบถูก (+1 คะแนน และไปข้อถัดไป)"
                >
                  <span className="text-2xl md:text-3xl group-hover:scale-125 transition-transform">✅</span>
                  <span className="text-xs font-black uppercase tracking-wider">ตอบถูก</span>
                  <span className="text-[10px] opacity-75 font-mono">+1</span>
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              🧩 3. MATCHING ARENA
              ========================================== */}
          {activePairs.length > 0 && !matchingFinished && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-400">
                  จับคู่สำเร็จแล้ว: <span className="text-emerald-400 font-bold text-sm">{matchedPairsCount}</span> / {activePairs.length} คู่
                </span>
                <span className="text-indigo-400 font-mono font-bold">
                  {Math.round((matchedPairsCount / activePairs.length) * 100)}%
                </span>
              </div>

              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.round((matchedPairsCount / activePairs.length) * 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Terms Column (Left) */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
                    <span>📌</span> คำศัพท์ (Terms)
                  </div>
                  {activePairs
                    .filter((p) => !userMatches[p.id])
                    .map((p) => {
                      const isSelected = selectedTerm === p.id;
                      const isWrong = wrongTermId === p.id;

                      let cardClass = 'bg-neutral-950 border-neutral-800 text-neutral-200 hover:border-indigo-500/70 hover:bg-neutral-900 hover:shadow-md';

                      if (isWrong) {
                        cardClass = 'bg-rose-950/80 border-rose-500 text-rose-200 animate-shake shadow-lg shadow-rose-950/50';
                      } else if (isSelected) {
                        cardClass = 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/40 ring-2 ring-indigo-400 scale-[1.02]';
                      }

                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectTerm(p.id)}
                          className={`w-full min-h-[82px] p-4 rounded-2xl border text-center text-xs md:text-sm font-semibold transition-all duration-200 flex items-center justify-center ${cardClass}`}
                        >
                          <span className="line-clamp-3 leading-snug">{p.term}</span>
                        </button>
                      );
                    })}
                </div>

                {/* Definitions Column (Right) */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
                    <span>🎯</span> ความหมาย (Definitions)
                  </div>
                  {shuffledDefinitions
                    .filter((d) => !Object.values(userMatches).includes(d.id))
                    .map((d) => {
                      let cardClass = 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-emerald-500/60 hover:bg-neutral-900';

                      if (selectedTerm) {
                        cardClass = 'bg-neutral-950 border-neutral-700 text-neutral-100 hover:border-emerald-400 hover:bg-neutral-900 hover:ring-2 hover:ring-emerald-400/50 cursor-pointer shadow-md';
                      }

                      return (
                        <button
                          key={d.id}
                          onClick={() => handleSelectDefinition(d.id)}
                          className={`w-full min-h-[82px] p-4 rounded-2xl border text-center text-xs md:text-sm transition-all duration-200 flex items-center justify-center ${cardClass}`}
                        >
                          <span className="line-clamp-3 leading-relaxed font-medium">{d.text}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              🏁 SUMMARY SCREEN (พร้อม 🏆 LEADERBOARD TOP 5)
              ========================================== */}
          {isGameDone && (
            <div className="space-y-6 text-center">
              <div className="py-6 bg-neutral-950 border border-neutral-800 rounded-3xl space-y-3">
                <div className="text-5xl">🏆</div>
                <h2 className="text-2xl font-black text-white">ยอดเยี่ยมมาก! ภารกิจสำเร็จ</h2>
                <div className="text-neutral-400 text-xs">
                  เวลาที่ใช้ทั้งหมด: <span className="font-mono text-indigo-400 font-bold">{formatTime(secondsElapsed)}</span>
                </div>

                {activeQuestions.length > 0 && (
                  <div className="pt-2">
                    <div className="text-4xl font-black text-emerald-400">
                      {quizScore} <span className="text-lg text-neutral-500 font-normal">/ {activeQuestions.length} คะแนน</span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      (คิดเป็น {Math.round((quizScore / activeQuestions.length) * 100)}%)
                    </div>
                  </div>
                )}

                {activeCards.length > 0 && (
                  <div className="pt-2 flex justify-center gap-6">
                    <div>
                      <div className="text-2xl font-black text-emerald-400">{knownCards.length}</div>
                      <div className="text-[11px] text-neutral-400">ตอบถูกต้อง (+1)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-rose-400">{unknownCards.length}</div>
                      <div className="text-[11px] text-neutral-400">ตอบผิด (+0)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-indigo-400">
                        {Math.round((knownCards.length / activeCards.length) * 100)}%
                      </div>
                      <div className="text-[11px] text-neutral-400">ความถูกต้อง</div>
                    </div>
                  </div>
                )}

                {activePairs.length > 0 && (
                  <div className="pt-2">
                    <div className="text-3xl font-black text-emerald-400">จับคู่ครบ {activePairs.length} คู่ 💯</div>
                    <div className="text-xs text-neutral-400 mt-1">ความแม่นยำ 100% สมบูรณ์แบบ</div>
                  </div>
                )}
              </div>

              {/* Submit Score Box */}
              {!scoreSubmitted ? (
                <div className="bg-indigo-950/40 border border-indigo-500/50 p-4 rounded-2xl space-y-3 text-left">
                  <span className="text-xs font-semibold text-indigo-300">📝 ส่งผลการเรียนรู้ของคุณเข้าสู่ระบบ Leaderboard:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="กรอกชื่อ-นามสกุล หรือชื่อเล่น..."
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 p-3 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        const finalScore = activeQuestions.length > 0 ? quizScore : activeCards.length > 0 ? knownCards.length : activePairs.length;
                        const total = activeQuestions.length > 0 ? activeQuestions.length : activeCards.length > 0 ? activeCards.length : activePairs.length;
                        handleSubmitScore(finalScore, total);
                      }}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shrink-0 shadow-lg shadow-indigo-600/30 transition-all"
                    >
                      ส่งผลคะแนน 🚀
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-500/50 p-3.5 rounded-2xl text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
                  <span>✓ บันทึกคะแนนและอัปเดต Leaderboard สำเร็จแล้ว!</span>
                </div>
              )}

              {/* 🏆 LEADERBOARD TOP 5 COMPONENT */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-3xl p-5 md:p-6 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏅</span>
                    <h3 className="font-extrabold text-sm text-white">ตารางอันดับผู้นำ (Top 5 Hall of Fame)</h3>
                  </div>
                  <button
                    onClick={fetchLeaderboard}
                    className="text-[11px] text-neutral-400 hover:text-indigo-300 transition-colors"
                  >
                    🔄 รีเฟรชอันดับ
                  </button>
                </div>

                {loadingLeaderboard ? (
                  <div className="text-center py-6 text-neutral-500 text-xs">กำลังโหลดอันดับ...</div>
                ) : leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((item, index) => {
                      const name = item.student_name || item.playerName || item.player_name || 'ผู้เรียน';
                      const isMe = scoreSubmitted && name.trim().toLowerCase() === playerName.trim().toLowerCase();
                      const scoreVal = item.score ?? 0;
                      const totalVal = item.total_questions ?? item.total_score ?? '-';
                      const timeVal = item.time_taken_seconds ?? item.time_taken ?? item.timeTaken ?? 0;

                      // เหรียญและสีตกแต่งตามอันดับ
                      let medal = `#${index + 1}`;
                      let rankBadge = 'bg-neutral-900 text-neutral-400 border-neutral-800';
                      let rowHighlight = 'bg-neutral-900/40 border-neutral-800/80';

                      if (index === 0) {
                        medal = '🥇';
                        rankBadge = 'bg-amber-950/80 text-amber-300 border-amber-500/60 font-black';
                        rowHighlight = 'bg-gradient-to-r from-amber-950/30 to-neutral-900/60 border-amber-500/40';
                      } else if (index === 1) {
                        medal = '🥈';
                        rankBadge = 'bg-slate-900 text-slate-200 border-slate-400/60 font-black';
                        rowHighlight = 'bg-neutral-900/60 border-slate-700/60';
                      } else if (index === 2) {
                        medal = '🥉';
                        rankBadge = 'bg-amber-950/40 text-amber-500 border-amber-700/60 font-black';
                        rowHighlight = 'bg-neutral-900/60 border-neutral-800';
                      }

                      if (isMe) {
                        rowHighlight = 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/50';
                      }

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${rowHighlight}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs ${rankBadge}`}>
                              {medal}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{name}</span>
                                {isMe && (
                                  <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                                    (คุณ)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono">
                                ⏱️ {formatTime(timeVal)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-black text-sm text-emerald-400">
                              {scoreVal} <span className="text-[10px] text-neutral-500 font-normal">/ {totalVal}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-500 text-xs">
                    ยังไม่มีข้อมูลอันดับในเกมนี้ เป็นคนแรกที่พิชิต Leaderboard เลย!
                  </div>
                )}
              </div>

              {/* Review Section */}
              {activeQuestions.length > 0 && (
                <div className="text-left space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">ทบทวนคำตอบของคุณ:</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {answersSummary.map((ans, idx) => (
                      <div key={idx} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">ข้อ {idx + 1}. {ans.question}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ans.isCorrect ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                            {ans.isCorrect ? 'ถูกต้อง ✓' : 'ตอบผิด ✗'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400">เฉลย: {ans.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Game Button */}
              <button
                onClick={() => {
                  if (activeQuestions.length > 0) resetQuizGame();
                  else if (activeCards.length > 0) resetFlashcardGame();
                  else resetMatchingGame();
                }}
                className="w-full py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-2xl font-semibold text-sm transition-all"
              >
                เล่นหรือทบทวนใหม่อีกครั้ง (สุ่มข้อใหม่ 🔀)
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">กำลังโหลด...</div>}>
      <PlayGameContent />
    </Suspense>
  );
}