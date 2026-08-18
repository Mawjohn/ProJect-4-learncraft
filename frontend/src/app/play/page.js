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

// 🔀 ฟังก์ชันเตรียมชุด Quiz พร้อมสลับคำถามและตัวเลือก (และคำนวณ Answer Index ใหม่)
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
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [answersSummary, setAnswersSummary] = useState([]);

  // 🎴 Flashcard State
  const [activeCards, setActiveCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
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

  // 📝 Score Submission State
  const [playerName, setPlayerName] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const isGameDone = quizFinished || flashcardFinished || (activePairs.length > 0 && matchedPairsCount === activePairs.length);

  useEffect(() => {
    let interval = null;
    if (timerActive && !loading && !error && !isGameDone) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, loading, error, isGameDone]);

  useEffect(() => {
    if (!gameId) {
      setError('ไม่พบรหัสเกม กรุณาตรวจสอบลิงก์อีกครั้ง');
      setLoading(false);
      return;
    }

    const fetchGame = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/games/${gameId}`);
        const result = await res.json();

        if (result.status === 'success' && result.data) {
          const fetchedGame = result.data;
          setGame(fetchedGame);

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
    if (isAnswered) return;
    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const currentQuestion = activeQuestions[currentQuizIndex];
    const isCorrect = optionIndex === currentQuestion.answer;

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
        userAnswer: optionIndex,
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
      setIsAnswered(false);
      playSound('click');
    } else {
      setQuizFinished(true);
      setTimerActive(false);
      setTimeout(() => triggerConfetti(), 300);
    }
  };

  // 🔀 ฟังก์ชันรีเซ็ตและสุ่มคำถาม + ตัวเลือกใหม่ทั้งหมด
  const resetQuizGame = () => {
    if (game?.data?.questions) {
      setActiveQuestions(prepareShuffledQuiz(game.data.questions));
    }
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizScore(0);
    setQuizFinished(false);
    setAnswersSummary([]);
    setScoreSubmitted(false);
    setSecondsElapsed(0);
    setTimerActive(true);
  };

  // ==========================================
  // 🎴 FLASHCARD DECK LOGIC
  // ==========================================
  const handleCardRating = (isKnown) => {
    playSound(isKnown ? 'correct' : 'click');
    const currentCard = activeCards[currentCardIndex];

    if (isKnown) {
      setKnownCards((prev) => [...prev, currentCard]);
    } else {
      setUnknownCards((prev) => [...prev, currentCard]);
    }

    setIsCardFlipped(false);

    if (currentCardIndex + 1 < activeCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setFlashcardFinished(true);
      setTimerActive(false);
      setTimeout(() => triggerConfetti(), 300);
    }
  };

  // 🔀 ฟังก์ชันรีเซ็ตและสลับ Flashcard Deck ใหม่
  const resetFlashcardGame = () => {
    if (game?.data?.cards) {
      setActiveCards(shuffleArray(game.data.cards));
    }
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
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
      const newMatches = { ...userMatches, [selectedTerm]: defId };
      setUserMatches(newMatches);
      const newCount = matchedPairsCount + 1;
      setMatchedPairsCount(newCount);
      setSelectedTerm(null);
      setComboStreak((prev) => prev + 1);

      if (activePairs.length > 0 && newCount === activePairs.length) {
        setTimerActive(false);
        setTimeout(() => triggerConfetti(), 300);
      }
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

  // 🔀 ฟังก์ชันรีเซ็ตและสลับกระดานจับคู่ใหม่ทั้งสองฝั่ง
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
      const res = await fetch('http://localhost:8000/api/games/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_name: playerName,
          score: finalScore,
          total_questions: totalQuestions,
          time_taken: formatTime(secondsElapsed),
        }),
      });

      const result = await res.json();
      if (result.status === 'success') {
        setScoreSubmitted(true);
        playSound('win');
        alert('บันทึกคะแนนเข้าสู่ระบบสำเร็จ!');
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8 flex flex-col items-center justify-center">
      
      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>

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
              🎯 1. QUIZ GAME (SHUFFLED)
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

                  if (isAnswered) {
                    if (isCorrect) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500';
                    else if (isSelected && !isCorrect) btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/40';
                    else btnStyle = 'bg-neutral-950/40 border-neutral-800/40 text-neutral-600 opacity-60';
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isAnswered}
                      onClick={() => handleSelectQuizOption(optIdx)}
                      className={`p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between group ${btnStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isAnswered && isCorrect ? 'bg-emerald-500 text-neutral-950' :
                          isAnswered && isSelected && !isCorrect ? 'bg-rose-500 text-white' :
                          'bg-neutral-900 text-neutral-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="font-medium">{optionText}</span>
                      </div>
                      {isAnswered && isCorrect && <span className="text-emerald-400 text-base font-bold">✓</span>}
                      {isAnswered && isSelected && !isCorrect && <span className="text-rose-400 text-base font-bold">✗</span>}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
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
              🎴 2. FLASHCARD STUDIO (SHUFFLED)
              ========================================== */}
          {activeCards.length > 0 && !flashcardFinished && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-neutral-400">
                  การ์ดใบที่ <span className="text-white font-bold text-sm">{currentCardIndex + 1}</span> จาก {activeCards.length}
                </span>
                <div className="flex gap-2">
                  <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-md font-bold text-[10px]">
                    ✓ จำได้: {knownCards.length}
                  </span>
                  <span className="bg-rose-950/80 border border-rose-800 text-rose-400 px-2 py-0.5 rounded-md font-bold text-[10px]">
                    ✗ ต้องทบทวน: {unknownCards.length}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.round(((currentCardIndex + 1) / activeCards.length) * 100)}%` }}
                />
              </div>

              <div
                onClick={() => {
                  playSound('flip');
                  setIsCardFlipped(!isCardFlipped);
                }}
                className="perspective-1000 w-full h-64 md:h-72 cursor-pointer select-none"
              >
                <div
                  className={`w-full h-full relative transition-transform duration-500 transform-style-preserve-3d ${
                    isCardFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-neutral-900 to-neutral-950 border-2 border-neutral-800 hover:border-indigo-500/50 rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-xl backface-hidden">
                    <div className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-neutral-500">
                      <span className="bg-neutral-800 px-2.5 py-1 rounded-md text-neutral-300">QUESTION / คำถาม</span>
                      <span>🔄 คลิกเพื่อพลิกดูคำตอบ</span>
                    </div>
                    <div className="text-xl md:text-2xl font-extrabold text-white px-4">
                      {activeCards[currentCardIndex].front}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-medium">แตะการ์ดเพื่อดูคำตอบเฉลย</div>
                  </div>

                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-950/70 to-neutral-950 border-2 border-indigo-500/60 rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-xl backface-hidden rotate-y-180">
                    <div className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-indigo-400">
                      <span className="bg-indigo-900/80 border border-indigo-700 px-2.5 py-1 rounded-md text-indigo-200">
                        ANSWER / คำอธิบาย
                      </span>
                      <span>🔄 คลิกเพื่อพลิกกลับ</span>
                    </div>
                    <div className="text-base md:text-lg font-semibold text-neutral-100 px-4 leading-relaxed overflow-y-auto max-h-36">
                      {activeCards[currentCardIndex].back}
                    </div>
                    <div className="text-[11px] text-indigo-300 font-medium">กดปุ่มด้านล่างเพื่อประเมินความจำ</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleCardRating(false)}
                  className="py-3.5 bg-neutral-950 hover:bg-rose-950/40 border border-rose-900/60 hover:border-rose-500 text-rose-300 font-bold text-xs md:text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>❌ ยังจำไม่ได้</span>
                </button>
                <button
                  onClick={() => handleCardRating(true)}
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <span>✅ จำได้แม่นยำ</span>
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              🧩 3. MATCHING ARENA (SHUFFLED)
              ========================================== */}
          {activePairs.length > 0 && matchedPairsCount < activePairs.length && (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Terms Column (Left - Shuffled) */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                    📌 คำศัพท์ (Terms)
                  </div>
                  {activePairs.map((p) => {
                    const isMatched = !!userMatches[p.id];
                    const isSelected = selectedTerm === p.id;
                    const isWrong = wrongTermId === p.id;
                    const pairIndex = activePairs.findIndex((item) => item.id === p.id) + 1;

                    let cardClass = 'bg-neutral-950 border-neutral-800 text-neutral-200 hover:border-indigo-500 hover:bg-neutral-900';

                    if (isMatched) {
                      cardClass = 'bg-emerald-950/30 border-emerald-500/80 text-emerald-200 opacity-80 cursor-default';
                    } else if (isWrong) {
                      cardClass = 'bg-rose-950 border-rose-500 text-rose-200 animate-shake';
                    } else if (isSelected) {
                      cardClass = 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400 scale-[1.02]';
                    }

                    return (
                      <button
                        key={p.id}
                        disabled={isMatched}
                        onClick={() => handleSelectTerm(p.id)}
                        className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between group ${cardClass}`}
                      >
                        <span className="truncate pr-2">{p.term}</span>
                        {isMatched && (
                          <span className="bg-emerald-500 text-neutral-950 font-black text-[10px] px-2.5 py-1 rounded-full shrink-0 shadow">
                            คู่ที่ #{pairIndex} ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Definitions Column (Right - Shuffled) */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                    🎯 ความหมาย (Definitions)
                  </div>
                  {shuffledDefinitions.map((d) => {
                    const matchedTermId = Object.keys(userMatches).find((key) => userMatches[key] === d.id);
                    const isMatched = !!matchedTermId;
                    const pairIndex = isMatched ? activePairs.findIndex((item) => item.id === Number(matchedTermId)) + 1 : null;

                    let cardClass = 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-emerald-500 hover:bg-neutral-900';

                    if (isMatched) {
                      cardClass = 'bg-emerald-950/30 border-emerald-500/80 text-emerald-200 opacity-80 cursor-default';
                    } else if (selectedTerm) {
                      cardClass = 'bg-neutral-950 border-neutral-700 text-neutral-200 hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400 cursor-pointer';
                    }

                    return (
                      <button
                        key={d.id}
                        disabled={isMatched}
                        onClick={() => handleSelectDefinition(d.id)}
                        className={`w-full p-4 rounded-2xl border text-left text-xs md:text-sm transition-all flex items-center justify-between gap-3 ${cardClass}`}
                      >
                        <span className="leading-relaxed flex-1">{d.text}</span>
                        {isMatched && (
                          <span className="bg-emerald-500 text-neutral-950 font-black text-[10px] px-2.5 py-1 rounded-full shrink-0 shadow">
                            คู่ที่ #{pairIndex} ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              🏁 SUMMARY & LEADERBOARD SUBMISSION SCREEN
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
                      <div className="text-[11px] text-neutral-400">จำได้แม่นยำ</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-rose-400">{unknownCards.length}</div>
                      <div className="text-[11px] text-neutral-400">ต้องทบทวนเพิ่ม</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-indigo-400">
                        {Math.round((knownCards.length / activeCards.length) * 100)}%
                      </div>
                      <div className="text-[11px] text-neutral-400">Mastery Rate</div>
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
                  <span className="text-xs font-semibold text-indigo-300">📝 ส่งผลการเรียนรู้ของคุณเข้าสู่ระบบ Analytics:</span>
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
                <div className="bg-emerald-950/40 border border-emerald-500/50 p-3.5 rounded-2xl text-center text-xs text-emerald-300 font-semibold">
                  ✓ บันทึกผลคะแนนและสถิติเข้าสู่ระบบเรียบร้อยแล้ว!
                </div>
              )}

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

              {/* Reset Game Button (Shuffles on Click) */}
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