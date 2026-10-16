'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LearnCraftLogo from '@/components/LearnCraftLogo';

// 🛠️ ฟังก์ชันจัดระเบียบข้อมูลเกมจาก Backend ให้เข้ากับฟอร์มแก้ไขได้ทุกรูปแบบ
const normalizeGameData = (rawGame) => {
  if (!rawGame) return null;

  let parsedData = rawGame.data;
  if (typeof parsedData === 'string') {
    try {
      parsedData = JSON.parse(parsedData);
    } catch (e) {
      console.error('JSON parse error on game.data:', e);
      parsedData = {};
    }
  }

  // รองรับกรณีที่คำถามอยู่ข้างนอก data หรืออยู่ข้างใน data
  const questions = parsedData?.questions || rawGame.questions || null;
  const pairs = parsedData?.pairs || rawGame.pairs || null;
  const cards = parsedData?.cards || rawGame.cards || null;

  return {
    ...rawGame,
    title: rawGame.title || rawGame.name || parsedData?.title || '',
    game_type:
      rawGame.game_type ||
      rawGame.gameType ||
      rawGame.type ||
      (pairs ? 'matching' : cards ? 'flashcard' : 'quiz'),
    data: {
      ...(typeof parsedData === 'object' && parsedData !== null ? parsedData : {}),
      ...(questions
        ? {
            questions: questions.map((q) => ({
              ...q,
              question: q.question || q.text || q.prompt || '',
              options: Array.isArray(q.options)
                ? q.options
                : Array.isArray(q.choices)
                ? q.choices
                : ['', '', '', ''],
              answer: typeof q.answer === 'number' ? q.answer : Number(q.correct_answer ?? 0),
              explanation: q.explanation || '',
            })),
          }
        : {}),
      ...(pairs
        ? {
            pairs: pairs.map((p, idx) => ({
              ...p,
              id: p.id ?? idx + 1,
              term: p.term || p.left || p.question || '',
              definition: p.definition || p.right || p.answer || '',
            })),
          }
        : {}),
      ...(cards
        ? {
            cards: cards.map((c) => ({
              ...c,
              front: c.front || c.question || c.term || '',
              back: c.back || c.answer || c.definition || '',
            })),
          }
        : {}),
    },
  };
};

function CreateGameContent() {
  const searchParams = useSearchParams();
  // รองรับทั้ง ?id=..., ?edit=..., และ ?game_id=...
  const gameId =
    searchParams.get('id') ||
    searchParams.get('edit') ||
    searchParams.get('game_id') ||
    searchParams.get('gameId');

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchGame = async () => {
    if (!gameId) {
      setGame({
        title: '',
        game_type: 'quiz',
        data: {
          questions: [
            {
              question: '',
              options: ['', '', '', ''],
              answer: 0,
              explanation: '',
            },
          ],
        },
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/games/${gameId}`, {
        cache: 'no-store',
      });
      const result = await res.json();

      // รองรับทั้งกรณีที่ Backend ส่งกลับมาใน result.data, result.game หรือตัว result เอง
      const rawGame = result.data || result.game || (result.id || result.title ? result : null);

      if (rawGame) {
        const normalized = normalizeGameData(rawGame);
        setGame(normalized);
      } else {
        setError('ไม่พบข้อมูลเกมนี้ในระบบ');
      }
    } catch (err) {
      console.error('Fetch game error:', err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  const handleTitleChange = (e) => {
    setGame({ ...game, title: e.target.value });
  };

  // ==========================================
  // 🎯 ฟังก์ชันจัดการแก้ไขโหมด QUIZ
  // ==========================================
  const handleQuestionChange = (index, value) => {
    const updated = [...(game.data?.questions || [])];
    updated[index] = { ...updated[index], question: value };
    setGame({ ...game, data: { ...game.data, questions: updated } });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...(game.data?.questions || [])];
    const updatedOptions = [...(updated[qIndex].options || [])];
    updatedOptions[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: updatedOptions };
    setGame({ ...game, data: { ...game.data, questions: updated } });
  };

  const handleCorrectAnswerChange = (qIndex, optIndex) => {
    const updated = [...(game.data?.questions || [])];
    updated[qIndex] = { ...updated[qIndex], answer: optIndex };
    setGame({ ...game, data: { ...game.data, questions: updated } });
  };

  const handleAddQuizQuestion = () => {
    const updated = [
      ...(game.data?.questions || []),
      {
        question: '',
        options: ['', '', '', ''],
        answer: 0,
        explanation: '',
      },
    ];
    setGame({ ...game, data: { ...game.data, questions: updated } });
  };

  const handleDeleteQuizQuestion = (qIndex) => {
    if ((game.data?.questions?.length || 0) <= 1) return;
    const updated = game.data.questions.filter((_, idx) => idx !== qIndex);
    setGame({ ...game, data: { ...game.data, questions: updated } });
  };

  // ==========================================
  // 🧩 ฟังก์ชันจัดการแก้ไขโหมด MATCHING
  // ==========================================
  const handlePairChange = (index, field, value) => {
    const updated = [...(game.data?.pairs || [])];
    updated[index] = { ...updated[index], [field]: value };
    setGame({ ...game, data: { ...game.data, pairs: updated } });
  };

  const handleAddPair = () => {
    const currentPairs = game.data?.pairs || [];
    const nextId =
      currentPairs.length > 0
        ? Math.max(...currentPairs.map((p) => Number(p.id) || 0)) + 1
        : 1;
    const updated = [...currentPairs, { id: nextId, term: '', definition: '' }];
    setGame({ ...game, data: { ...game.data, pairs: updated } });
  };

  const handleDeletePair = (index) => {
    if ((game.data?.pairs?.length || 0) <= 1) return;
    const updated = game.data.pairs.filter((_, idx) => idx !== index);
    setGame({ ...game, data: { ...game.data, pairs: updated } });
  };

  // ==========================================
  // 🎴 ฟังก์ชันจัดการแก้ไขโหมด FLASHCARD
  // ==========================================
  const handleCardChange = (index, field, value) => {
    const updated = [...(game.data?.cards || [])];
    updated[index] = { ...updated[index], [field]: value };
    setGame({ ...game, data: { ...game.data, cards: updated } });
  };

  const handleAddCard = () => {
    const updated = [...(game.data?.cards || []), { front: '', back: '' }];
    setGame({ ...game, data: { ...game.data, cards: updated } });
  };

  const handleDeleteCard = (index) => {
    if ((game.data?.cards?.length || 0) <= 1) return;
    const updated = game.data.cards.filter((_, idx) => idx !== index);
    setGame({ ...game, data: { ...game.data, cards: updated } });
  };

  // ==========================================
  // 💾 บันทึกข้อมูลการแก้ไข
  // ==========================================
  const handleSaveGame = async () => {
    setSaving(true);
    try {
      const url = gameId
        ? `http://127.0.0.1:8000/api/games/${gameId}`
        : `http://127.0.0.1:8000/api/games`;
      const method = gameId ? 'PUT' : 'POST';

      // ส่งครบทั้งรูปแบบซ้อนใน data และรูปแบบระดับบนสุดเพื่อให้ Backend ทุกรูปแบบรับค่าได้ครบ
      const payload = {
        ...game,
        title: game.title,
        game_type: game.game_type,
        data: game.data,
        questions: game.data?.questions,
        pairs: game.data?.pairs,
        cards: game.data?.cards,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.status === 'success' || res.ok) {
        alert('บันทึกการแก้ไขเรียบร้อยแล้ว!');
        if (!gameId && (result.data?.id || result.id)) {
          const newId = result.data?.id || result.id;
          window.location.href = `/create?id=${newId}`;
        }
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">
        กำลังดึงข้อมูลชุดเกมเดิม...
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

  const playUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/play?id=${gameId}`
      : `http://localhost:3000/play?id=${gameId}`;

  const optionLabels = ['A', 'B', 'C', 'D'];

  const gameBadgeLabel =
    game.game_type === 'matching'
      ? 'MATCHING GAME 🧩'
      : game.game_type === 'flashcard'
      ? 'FLASHCARD GAME 🎴'
      : 'QUIZ GAME 🎯';

  return (
    <div className="min-h-screen space-theme-bg text-neutral-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* แถบด้านบนสุด (Navbar) */}
      <nav className="border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="w-full px-6 md:px-10 h-16 flex items-center justify-between">
          
          {/* เปลี่ยนจาก <Link> เป็น <div> เพื่อแก้บั๊ก Link ซ้อน Link */}
          <div className="flex items-center transform scale-90 md:scale-100 origin-left transition-all mt-1">
            <LearnCraftLogo size="md" />
          </div>

          <Link
            href="/"
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 text-xs font-semibold rounded-xl transition-all"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-8 space-y-6">
        {/* หัวข้อกลางหน้ากระดาษ */}
        <div className="text-center space-y-1.5 print:hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[11px] font-bold mb-1">
            <span>✏️ Activity Editor Mode</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            แก้ไขมินิเกมและสื่อการสอน ✏️
          </h1>
          <p className="text-xs md:text-sm text-neutral-400">
            กำลังแก้ไขชุดเกมรหัส:{' '}
            <span className="font-mono text-neutral-300">{gameId || 'สร้างใหม่'}</span>{' '}
            สามารถปรับเปลี่ยนคำถามและตัวเลือกได้ทันที
          </p>
        </div>

        {/* กรอบกระดานหลักโปร่งแสงบนพื้นหลังอวกาศ */}
        <div className="bg-[#141417]/90 border border-neutral-800/90 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 backdrop-blur-md">
          {/* แถวบน: ป้ายประเภทเกม + ชื่อเกม และ ปุ่มพิมพ์ใบงาน + ปุ่มยืนยันการแก้ไข */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 flex-1 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-700/80 text-indigo-300 text-[11px] font-extrabold uppercase tracking-wider">
                <span>{gameBadgeLabel}</span>
              </div>
              <input
                type="text"
                value={game.title || ''}
                onChange={handleTitleChange}
                placeholder="ตั้งชื่อชุดเกม..."
                className="w-full bg-neutral-950/90 border border-neutral-800 focus:border-indigo-500 text-base md:text-lg font-extrabold text-white px-4 py-2.5 rounded-2xl focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2.5 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow"
              >
                <span>📄 พิมพ์ใบงาน / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleSaveGame}
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{saving ? 'กำลังบันทึก...' : '💾 ยืนยันการแก้ไข'}</span>
              </button>
            </div>
          </div>

          {/* กล่องสีเขียว: ลิงก์และ QR Code สำหรับแชร์ให้ผู้เรียน + ปุ่มเปิดดู Analytics */}
          {gameId && (
            <div className="bg-[#071f18]/90 border border-emerald-700/60 rounded-2xl p-4 md:p-5 space-y-3 print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  🔗 ลิงก์และ QR Code สำหรับแชร์ให้ผู้เรียน:
                </span>
                <Link
                  href={`/analytics?id=${gameId}`}
                  className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4 flex items-center gap-1 transition-colors"
                >
                  📊 เปิดดู Analytics สรุปผลคะแนน
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  readOnly
                  value={playUrl}
                  className="flex-1 bg-neutral-950/95 border border-neutral-800 text-xs font-mono text-neutral-200 px-4 py-2.5 rounded-xl select-all focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(playUrl)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow"
                  >
                    {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQR(!showQR)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow flex items-center gap-1.5"
                  >
                    <span>📱 {showQR ? 'ซ่อน QR Code' : 'แสดง QR Code'}</span>
                  </button>
                </div>
              </div>

              {showQR && (
                <div className="pt-3 mt-3 border-t border-emerald-800/50 flex flex-col items-center justify-center space-y-2">
                  <div className="bg-white p-3 rounded-2xl shadow-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(playUrl)}`}
                      alt="Game QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                  <p className="text-xs text-emerald-300 font-semibold text-center">
                    สแกน QR Code เพื่อเข้าเล่นเกมได้ทันทีโดยไม่ต้องล็อกอิน (กรอกชื่อส่งคะแนนเมื่อเล่นจบ)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* แถบคำแนะนำและปุ่มเพิ่มจำนวนข้อ */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden">
            <p className="text-xs text-neutral-400">
              💡 คำแนะนำ: คุณสามารถคลิกพิมพ์แก้ไขคำถาม ตัวเลือก หรือเปลี่ยนข้อที่ถูกต้องได้โดยตรง
            </p>

            {game.data?.questions && (
              <button
                type="button"
                onClick={handleAddQuizQuestion}
                className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                + เพิ่มข้อคำถาม
              </button>
            )}
            {game.data?.pairs && (
              <button
                type="button"
                onClick={handleAddPair}
                className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                + เพิ่มคู่คำศัพท์
              </button>
            )}
            {game.data?.cards && (
              <button
                type="button"
                onClick={handleAddCard}
                className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                + เพิ่มการ์ดคำถาม
              </button>
            )}
          </div>

          {/* ==========================================
              🎯 1. รายการแก้ไขคำถามโหมด QUIZ
              ========================================== */}
          {game.data?.questions && (
            <div className="space-y-6">
              {game.data.questions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className="bg-neutral-900/75 border border-neutral-800/90 rounded-3xl p-5 md:p-6 space-y-4 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-400">
                      คำถามข้อที่ {qIndex + 1}
                    </span>
                    {game.data.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuizQuestion(qIndex)}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer print:hidden"
                      >
                        🗑️ ลบข้อนี้
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.question ?? ''}
                    onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                    placeholder={`พิมพ์คำถามข้อที่ ${qIndex + 1}...`}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-sm font-bold text-white px-4 py-3 rounded-2xl focus:outline-none transition-colors"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {q.options?.map((opt, optIndex) => {
                      const isCorrect = Number(q.answer) === optIndex;
                      return (
                        <div
                          key={optIndex}
                          className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                            isCorrect
                              ? 'bg-[#07291e]/80 border-emerald-500/80 shadow-md shadow-emerald-950/50'
                              : 'bg-neutral-950/60 border-neutral-800/90'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-300">
                              ตัวเลือก {optionLabels[optIndex] || optIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCorrectAnswerChange(qIndex, optIndex)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer print:hidden ${
                                isCorrect
                                  ? 'bg-emerald-500 text-neutral-950 font-extrabold shadow'
                                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                              }`}
                            >
                              {isCorrect ? '✓ คำตอบที่ถูกต้อง' : 'ตั้งเป็นคำตอบถูก'}
                            </button>
                          </div>

                          <input
                            type="text"
                            value={opt ?? ''}
                            onChange={(e) =>
                              handleOptionChange(qIndex, optIndex, e.target.value)
                            }
                            placeholder={`พิมพ์ตัวเลือก ${optionLabels[optIndex] || optIndex + 1}...`}
                            className="w-full bg-neutral-950 border border-neutral-800/90 focus:border-indigo-500 text-xs font-medium text-white px-3.5 py-2.5 rounded-xl focus:outline-none transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==========================================
              🧩 2. รายการแก้ไขโหมดเกมจับคู่ (MATCHING)
              ========================================== */}
          {game.data?.pairs && (
            <div className="space-y-4">
              {game.data.pairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900/75 border border-neutral-800/90 rounded-2xl p-5 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">
                      คู่ที่ {idx + 1}
                    </span>
                    {game.data.pairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePair(idx)}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        🗑️ ลบคู่นี้
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 font-bold">
                        คำศัพท์ / หัวข้อ (ฝั่งซ้าย)
                      </label>
                      <input
                        type="text"
                        value={pair.term ?? ''}
                        onChange={(e) => handlePairChange(idx, 'term', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs font-bold text-white px-3.5 py-2.5 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 font-bold">
                        คำจำกัดความ / คู่คำตอบ (ฝั่งขวา)
                      </label>
                      <input
                        type="text"
                        value={pair.definition ?? ''}
                        onChange={(e) =>
                          handlePairChange(idx, 'definition', e.target.value)
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs text-white px-3.5 py-2.5 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==========================================
              🎴 3. รายการแก้ไขโหมดเกมการ์ด (FLASHCARD)
              ========================================== */}
          {game.data?.cards && (
            <div className="space-y-4">
              {game.data.cards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900/75 border border-neutral-800/90 rounded-2xl p-5 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400">
                      การ์ดใบที่ {idx + 1}
                    </span>
                    {game.data.cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(idx)}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        🗑️ ลบการ์ดนี้
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 font-bold">
                        ด้านหน้าการ์ด (คำถาม)
                      </label>
                      <input
                        type="text"
                        value={card.front ?? ''}
                        onChange={(e) => handleCardChange(idx, 'front', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs font-bold text-white px-3.5 py-2.5 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 font-bold">
                        ด้านหลังการ์ด (เฉลย)
                      </label>
                      <input
                        type="text"
                        value={card.back ?? ''}
                        onChange={(e) => handleCardChange(idx, 'back', e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-xs text-white px-3.5 py-2.5 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ปุ่มเพิ่มข้อและบันทึกด้านล่างสุด */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-800/80 print:hidden">
            <div>
              {game.data?.questions && (
                <button
                  type="button"
                  onClick={handleAddQuizQuestion}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  + เพิ่มข้อคำถามใหม่
                </button>
              )}
              {game.data?.pairs && (
                <button
                  type="button"
                  onClick={handleAddPair}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  + เพิ่มคู่คำศัพท์ใหม่
                </button>
              )}
              {game.data?.cards && (
                <button
                  type="button"
                  onClick={handleAddCard}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  + เพิ่มการ์ดใบใหม่
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveGame}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : '💾 ยืนยันการแก้ไข'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreateGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">
          กำลังโหลด...
        </div>
      }
    >
      <CreateGameContent />
    </Suspense>
  );
}