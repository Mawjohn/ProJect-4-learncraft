'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function CreateLessonPage() {
  const [topic, setTopic] = useState('');
  const [learningObjective, setLearningObjective] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [gameType, setGameType] = useState('quiz');
  const [itemCount, setItemCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ['pdf', 'txt', 'md'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      alert('รองรับเฉพาะไฟล์ .pdf, .txt, .md เท่านั้น');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        setRawContent(data.extracted_text);
        setUploadedFile({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          type: fileExtension.toUpperCase(),
        });
        if (!topic && data.filename) {
          const cleanName = data.filename.replace(/\.[^/.]+$/, '');
          setTopic(cleanName);
        }
      } else {
        alert(data.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่ออัปโหลดไฟล์ได้');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setRawContent('');
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('กรุณากรอกหัวข้อบทเรียนที่ต้องการสร้าง');
      return;
    }

    setLoading(true);
    setError('');
    setGameData(null);
    setShareLink('');

    try {
      const res = await fetch('http://localhost:8000/api/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          learning_objective: learningObjective,
          raw_content: rawContent,
          game_type: gameType,
          item_count: Number(itemCount),
        }),
      });

      const result = await res.json();
      if (result.status === 'success') {
        setGameData(result.data);
      } else {
        setError(result.message || 'เกิดข้อผิดพลาดในการสร้างเนื้อหา');
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGame = async () => {
    if (!gameData) return;
    setSaving(true);
    try {
      const res = await fetch('http://localhost:8000/api/games/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: gameData.title || topic,
          game_type: gameType,
          data: gameData,
        }),
      });

      const result = await res.json();
      if (result.status === 'success') {
        const fullUrl = `${window.location.origin}/play?id=${result.game_id}`;
        setShareLink(fullUrl);
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกเกม');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกเกมได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* CSS สำหรับหน้า Print ใบงาน A4 */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* 🌟 Navigation Bar */}
      <nav className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50 no-print">
        <div className="w-full px-6 md:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              L
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              Learn<span className="text-indigo-400">Craft</span>
            </span>
          </Link>

          <Link
            href="/"
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </nav>

      {/* 🌟 Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2 no-print">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-400 text-xs font-bold">
            <span>✨ AI Lesson & Game Creator</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            สร้างมินิเกมจากบทเรียน ✨
          </h1>
          <p className="text-xs md:text-sm text-neutral-400">
            เลือกรูปแบบมินิเกม วางเนื้อหาหรืออัปโหลดไฟล์ แล้วปล่อยให้ AI ออกแบบการเรียนรู้ให้ทันที
          </p>
        </div>

        {/* 🌟 Generator Form Card */}
        <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm space-y-6 no-print">
          
          {/* Game Type Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
              1. เลือกรูปแบบมินิเกมที่ต้องการสร้าง
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'quiz', label: 'แบบทดสอบปรนัย', icon: '🎯', desc: '4 ตัวเลือกทีละข้อ' },
                { id: 'flashcard', label: 'การ์ดคำศัพท์', icon: '🎴', desc: 'การ์ดหมุน 3D Flip' },
                { id: 'matching', label: 'เกมจับคู่', icon: '🧩', desc: 'คำศัพท์และความหมาย' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setGameType(t.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    gameType === t.id
                      ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-950/50'
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{t.icon}</span>
                    {gameType === t.id && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="font-bold text-xs text-neutral-200">{t.label}</div>
                    <div className="text-[10px] text-neutral-500">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Topic & Learning Objective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                2. หัวข้อบทเรียน (Topic) *
              </label>
              <input
                type="text"
                placeholder="เช่น การสังเคราะห์ด้วยแสง, ประวัติศาสตร์สุโขทัย"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-neutral-100 placeholder-neutral-600 font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                3. จำนวนข้อ / จำนวนคู่
              </label>
              <input
                type="number"
                min={3}
                max={15}
                value={itemCount}
                onChange={(e) => setItemCount(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 text-neutral-100 font-medium"
              />
            </div>
          </div>

          {/* Raw Content & File Upload */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                4. เนื้อหาบทเรียนดิบ (Raw Content)
              </label>
              <span className="text-[11px] text-neutral-500">พิมพ์เนื้อหา หรือแนบไฟล์เอกสาร</span>
            </div>

            {/* Uploaded Badge or Dropzone */}
            {!uploadedFile ? (
              <div className="border border-dashed border-neutral-800 hover:border-indigo-500/50 bg-neutral-950/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-lg border border-neutral-800">
                    📁
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-200">อัปโหลดไฟล์เอกสาร</div>
                    <div className="text-[10px] text-neutral-500">รองรับไฟล์ PDF, TXT, Markdown (.md)</div>
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    id="file-upload-input"
                  />
                  <label
                    htmlFor="file-upload-input"
                    className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      uploading
                        ? 'bg-neutral-800 text-neutral-500 border-neutral-800 cursor-not-allowed'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700 hover:border-indigo-500'
                    }`}
                  >
                    {uploading ? 'กำลังสกัดข้อความ...' : 'เลือกไฟล์ 📄'}
                  </label>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-900/60 border border-emerald-600 flex items-center justify-center text-base text-emerald-300">
                    📄
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-300 truncate max-w-[200px] sm:max-w-xs">{uploadedFile.name}</span>
                      <span className="text-[10px] font-bold bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-700">
                        {uploadedFile.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-400/80">ขนาด: {uploadedFile.size} • ดึงข้อความเข้าสู่ระบบแล้ว ✓</div>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-rose-950 hover:border-rose-700 border border-neutral-800 text-neutral-400 hover:text-rose-300 text-xs font-semibold transition-all"
                >
                  ✕ ยกเลิก
                </button>
              </div>
            )}

            <textarea
              rows={4}
              placeholder="พิมพ์หรือวางเนื้อหาบทเรียนตรงนี้ หรือให้อัปโหลดไฟล์ด้านบน..."
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs focus:outline-none focus:border-indigo-500 text-neutral-100 placeholder-neutral-600 font-mono leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800 rounded-2xl text-rose-300 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
              loading
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            <span>{loading ? 'กำลังให้ AI ออกแบบสื่อการเรียนรู้...' : 'เนรมิตมินิเกม 🚀'}</span>
          </button>
        </div>

        {/* 🌟 Generated Result Section & Printable Sheet */}
        {gameData && (
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 print-sheet">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-neutral-800 no-print">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800">
                  {gameType === 'matching' ? 'Matching Game 🧩' : gameType === 'flashcard' ? 'Flashcard 🎴' : 'Quiz Game 🎯'}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">{gameData.title || topic}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                >
                  📄 พิมพ์ใบงาน / PDF
                </button>
                <button
                  onClick={handleSaveGame}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  {saving ? 'กำลังบันทึก...' : '💾 บันทึก & แชร์เกม'}
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-black">{gameData.title || topic}</h1>
                <p className="text-xs text-neutral-600">แบบฝึกหัดเสริมสร้างทักษะการเรียนรู้</p>
              </div>
              <div className="flex justify-between items-center mt-6 text-sm text-black">
                <div>ชื่อ-นามสกุล: ................................................................</div>
                <div>ชั้น/ห้อง: ............. เลขที่: .............</div>
                <div>วันที่: ...... / ...... / ..........</div>
              </div>
            </div>

            {/* Share Link Banner */}
            {shareLink && (
              <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-2xl flex flex-col gap-2.5 no-print">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400">🔗 ลิงก์สำหรับแชร์ให้ผู้เรียน:</span>
                  <a
                    href={`/analytics?id=${shareLink.split('id=')[1]}`}
                    target="_blank"
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold flex items-center gap-1"
                  >
                    📊 เปิดดู Analytics สรุปผลคะแนน
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 p-2.5 rounded-xl font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      alert('คัดลอกลิงก์สำเร็จ!');
                    }}
                    className="px-4 py-1 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 shrink-0"
                  >
                    คัดลอก
                  </button>
                </div>
              </div>
            )}

            {/* 1. Quiz Display */}
            {gameData.questions && (
              <div className="space-y-5">
                {gameData.questions.map((q, idx) => (
                  <div key={q.id || idx} className="space-y-3 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80 print:bg-white print:border print:border-neutral-300 print:text-black">
                    <h3 className="font-bold text-neutral-200 text-sm print:text-black">
                      {idx + 1}. {q.question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 print:grid-cols-2">
                      {q.options?.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/50 text-xs text-neutral-300 print:border-neutral-300 print:bg-white print:text-black flex items-start gap-2"
                        >
                          <span className="font-bold text-neutral-500 print:text-black">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="mt-8 pt-6 border-t border-neutral-800 print:border-black print:page-break">
                  <h3 className="text-sm font-bold text-indigo-400 print:text-black mb-3">
                    💡 เฉลยและคำอธิบาย (Answer Key):
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {gameData.questions.map((q, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 print:bg-white print:border-neutral-300 print:text-black">
                        <span className="font-bold text-emerald-400 print:text-black">ข้อ {idx + 1}: ตอบ {String.fromCharCode(65 + q.answer)}</span>
                        <p className="text-neutral-400 print:text-neutral-700 mt-1">{q.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Flashcard Display */}
            {gameData.cards && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                {gameData.cards.map((card, idx) => (
                  <div key={card.id || idx} className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950 print:bg-white print:border-neutral-300 print:text-black space-y-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Card #{idx + 1}</span>
                    <div className="text-sm font-bold text-amber-400 print:text-black">คำถาม: {card.front}</div>
                    <div className="text-xs text-neutral-300 print:text-neutral-800 pt-2 border-t border-neutral-800/80 print:border-neutral-200">
                      คำตอบ: {card.back}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Matching Display */}
            {gameData.pairs && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-indigo-400 print:text-black">คำศัพท์ (Column A)</h4>
                    {gameData.pairs.map((p, idx) => (
                      <div key={idx} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs print:bg-white print:border-neutral-300 print:text-black flex justify-between">
                        <span>{idx + 1}. {p.term}</span>
                        <span className="print:inline hidden font-mono">______</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-emerald-400 print:text-black">ความหมาย (Column B)</h4>
                    {gameData.pairs.map((p, idx) => (
                      <div key={idx} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs print:bg-white print:border-neutral-300 print:text-black">
                        <span>{String.fromCharCode(65 + idx)}. {p.definition}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-800 print:border-black">
                  <h4 className="text-xs font-bold text-indigo-400 print:text-black mb-2">💡 เฉลยคู่ที่ถูกต้อง:</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {gameData.pairs.map((p, idx) => (
                      <span key={idx} className="px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg print:border-neutral-300 print:text-black">
                        #{idx + 1} {p.term} ↔ {p.definition}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}