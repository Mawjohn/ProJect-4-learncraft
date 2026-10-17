'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import LearnCraftLogo from '@/components/LearnCraftLogo';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const libraryRef = useRef(null);

  // กำหนดตัวแปร API URL ไว้ด้านบนสุด เพื่อให้ทุกฟังก์ชันในหน้านี้เรียกใช้ได้
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  // คลังมินิเกม State
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [qrModalGame, setQrModalGame] = useState(null);

  // Modal สร้างมินิเกม & เกี่ยวกับ State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState('quiz');
  const [topic, setTopic] = useState('');
  const [contentText, setContentText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [numItems, setNumItems] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // 1️⃣ ดึงรายการเกมทั้งหมดจาก Backend 
  const fetchGames = async () => {
    setLoadingGames(true);
    try {
      const userEmail = session?.user?.email || '';
      const res = await fetch(`${API_URL}/api/games?user=${userEmail}`, {
        cache: 'no-store',
    });
      const result = await res.json();
      
      if (result.status === 'success' && Array.isArray(result.games)) {
        const normalizedGames = result.games.map(game => ({
          id: game.id,
          title: game.title,
          game_type: game.game_type,
          itemCount: game.total_items,
          playerCount: game.total_players
        }));
        setGames(normalizedGames.reverse()); // นำเกมใหม่ล่าสุดขึ้นก่อน
      }
    } catch (err) {
      console.error('Fetch games error:', err);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // เปิดหน้าต่างสร้างเกมเมื่อกดปุ่ม Start จากการ์ดแต่ละโหมด
  const handleStartMode = (mode) => {
    setSelectedGameType(mode);
    setShowCreateModal(true);
  };

  // 2️⃣ ฟังก์ชันสั่งสร้างเกมด้วย AI 
  const handleGenerateGame = async (e) => {
    e.preventDefault();
    if (!topic.trim() && !contentText.trim() && !pdfFile) {
      alert('กรุณาระบุหัวข้อ เนื้อหาบทเรียน หรืออัปโหลดไฟล์ PDF');
      return;
    }

    setGenerating(true);
    try {
      let finalRawContent = contentText;

      // STEP 1: ถ้ามีไฟล์ PDF ต้องดึงข้อความออกมาก่อนผ่าน /api/extract-text
      if (pdfFile) {
        const formData = new FormData();
        formData.append('file', pdfFile);
        // แก้ให้ใช้ API_URL แทน
        const extractRes = await fetch(`${API_URL}/api/extract-text`, {
          method: 'POST',
          body: formData,
        });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.detail || 'ดึงข้อความจาก PDF ไม่สำเร็จ');
        finalRawContent = extractData.extracted_text;
      }

      // STEP 2: ส่งข้อความให้ AI สร้างรูปแบบเกมผ่าน /api/generate-game
      // แก้ให้ใช้ API_URL แทน
      const genRes = await fetch(`${API_URL}/api/generate-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || (pdfFile ? pdfFile.name.replace('.pdf', '') : 'บทเรียนใหม่'),
          raw_content: finalRawContent,
          game_type: selectedGameType,
          item_count: Number(numItems)
        }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.detail || 'สร้างข้อสอบไม่สำเร็จ');

      // STEP 3: บันทึกเกมลงฐานข้อมูลผ่าน /api/games/save
      const generatedTitle = genData.data?.title || topic || 'บทเรียนใหม่';
      // แก้ให้ใช้ API_URL แทน
      const saveRes = await fetch(`${API_URL}/api/games/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedTitle,
          game_type: selectedGameType,
          data: genData.data
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.detail || 'บันทึกข้อมูลไม่สำเร็จ');

      // ทำงานสำเร็จ ล้างค่าหน้าต่าง และพาไปหน้าจัดการเกม
      setShowCreateModal(false);
      setTopic('');
      setContentText('');
      setPdfFile(null);
      await fetchGames();
      router.push(`/create?id=${saveData.game_id}`);

    } catch (err) {
      console.error('Generate game error:', err);
      alert(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ Backend');
    } finally {
      setGenerating(false);
    }
  };

  // 3️⃣ ลบเกมออกจากคลัง
  const handleDeleteGame = async (gameId) => {
    if (!confirm('คุณต้องการลบมินิเกมนี้ใช่หรือไม่?')) return;
    try {
      // แก้ให้ใช้ API_URL แทน
      const res = await fetch(`${API_URL}/api/games/${gameId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setGames((prev) => prev.filter((g) => g.id !== gameId));
        setOpenMenuId(null);
      }
    } catch (err) {
      console.error('Delete game error:', err);
    }
  };

  const handleCopyPlayLink = (gameId) => {
    const url = `${window.location.origin}/play?id=${gameId}`;
    navigator.clipboard.writeText(url);
    alert('คัดลอกลิงก์เข้าเล่นเรียบร้อยแล้ว!');
  };

  const scrollToLibrary = () => {
    libraryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen space-theme-bg text-white relative overflow-x-hidden selection:bg-fuchsia-500 selection:text-white">
      {/* ==========================================
          🌌 องค์ประกอบตกแต่งอวกาศ (ดาวเคราะห์ & จรวด)
          ========================================== */}
      <div className="pointer-events-none fixed top-28 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-gradient-to-r from-purple-700/30 via-fuchsia-600/25 to-indigo-700/30 blur-[110px] rounded-full z-0" />

      <div className="pointer-events-none fixed top-36 left-6 md:left-16 z-0 opacity-85 hidden sm:block animate-pulse">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-fuchsia-600 to-indigo-800 shadow-[0_0_35px_rgba(217,70,239,0.4)] relative overflow-hidden">
          <div className="w-full h-3 bg-purple-900/50 rotate-[-20deg] translate-y-6" />
          <div className="w-full h-2 bg-amber-300/30 rotate-[-20deg] translate-y-9" />
        </div>
      </div>

      <div className="pointer-events-none fixed top-20 right-8 md:right-28 z-0 opacity-90 hidden sm:block">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-b from-cyan-300 via-blue-500 to-indigo-900 shadow-[0_0_30px_rgba(56,189,248,0.5)]" />
          <div className="absolute w-28 h-7 border-4 border-amber-300/70 rounded-full rotate-[-22deg]" />
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-8 right-8 z-0 hidden lg:block">
        <svg width="84" height="84" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_0_15px_rgba(244,114,182,0.5)] -rotate-12">
          <path d="M38 10C46 10 54 18 54 26C54 36 42 48 30 50L14 34C16 22 28 10 38 10Z" fill="#E2E8F0" />
          <path d="M44 10C50 12 52 14 54 20L42 32L32 22L44 10Z" fill="#EC4899" />
          <circle cx="36" cy="28" r="6" fill="#38BDF8" stroke="#1E293B" strokeWidth="2.5" />
          <path d="M18 38L8 44L14 50L24 44L18 38Z" fill="#A855F7" />
          <path d="M12 46C6 50 4 56 4 60C8 60 14 58 18 52L12 46Z" fill="#F59E0B" />
        </svg>
      </div>

      {/* ==========================================
          🧭 แถบเมนูด้านบน
          ========================================== */}
      {/* ==========================================
          🧭 แถบเมนูด้านบน
          ========================================== */}
      {/* ==========================================
          🧭 แถบเมนูด้านบน
          ========================================== */}
      <header className="relative z-30 w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 xl:px-20 pt-6 pb-4 flex items-center justify-between">
        {/* ปรับให้ชิดซ้ายสุดขอบจอ และขยายขนาดโลโก้ด้วย CSS Transform */}
        <div className="shrink-0 cursor-pointer transform scale-[1.25] md:scale-[1.40] origin-top-left transition-all" onClick={() => router.push('/')}>
          <LearnCraftLogo size="md" />
        </div>

        <div className="flex items-center gap-6 md:gap-10">
          <nav className="hidden md:flex items-center gap-8 text-base lg:text-lg font-extrabold tracking-wide">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="text-white hover:text-fuchsia-400 transition-colors cursor-pointer"
            >
              สร้างมินิเกม
            </button>
            <button
              type="button"
              onClick={scrollToLibrary}
              className="text-white hover:text-fuchsia-400 transition-colors cursor-pointer"
            >
              คลังมินิเกม
            </button>
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="text-white hover:text-fuchsia-400 transition-colors cursor-pointer"
            >
              เกี่ยวกับ
            </button>
          </nav>

          {session ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => signOut()}
                className="px-3.5 py-1.5 rounded-full bg-indigo-950/80 hover:bg-rose-950/80 border border-indigo-500/50 hover:border-rose-500/60 text-xs font-bold text-neutral-200 transition-all cursor-pointer"
              >
                ออกจากระบบ
              </button>
              <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.6)]">
                <img
                  src={session.user?.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=LearnCraft'}
                  alt="User Avatar"
                  className="w-full h-full rounded-full object-cover bg-neutral-900"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn('google')}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs md:text-sm font-bold shadow-lg shadow-fuchsia-600/30 cursor-pointer"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      {/* ==========================================
          ✨ HERO SECTION & การ์ดเกม 3 โหมด
          ========================================== */}
      <main className="relative z-20 max-w-6xl mx-auto px-6 pt-8 pb-20 space-y-14">
        <section className="text-center space-y-3 py-4 relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-[0_0_25px_rgba(217,70,239,0.75)]">
            เปลี่ยนเนื้อหาบทเรียนให้เป็น
            <br />
            <span className="bg-gradient-to-r from-white via-fuchsia-100 to-purple-200 bg-clip-text text-transparent">
              มินิเกมและใบงานอัจฉริยะ
            </span>
          </h1>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-7 max-w-5xl mx-auto">
          {/* 1. การ์ดเกมจับคู่ */}
          <div className="group relative bg-[#161229]/85 backdrop-blur-xl border-2 border-purple-500/60 hover:border-fuchsia-400 rounded-[32px] p-7 flex flex-col items-center justify-between min-h-[370px] shadow-[0_0_30px_rgba(147,51,234,0.28)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] transition-all duration-300 hover:-translate-y-1.5">
            <h2 className="text-2xl font-extrabold text-white tracking-wide">
              เกมจับคู่
            </h2>

            <div className="my-4 w-full flex flex-col items-center justify-center gap-3 py-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/30">
                  A
                </div>
                <div className="w-6 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/30">
                  B
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/30 relative">
                  1
                  <span className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-[11px] flex items-center justify-center text-black font-black">
                    ✓
                  </span>
                </div>
                <div className="text-2xl">🧑‍🚀🔎</div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/30 relative">
                  2
                  <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-[11px] flex items-center justify-center text-black font-black">
                    ✓
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartMode('matching')}
              className="w-44 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 hover:from-fuchsia-400 hover:to-cyan-300 text-white font-extrabold text-lg tracking-wide shadow-[0_0_20px_rgba(217,70,239,0.55)] border border-white/40 transition-all cursor-pointer active:scale-95"
            >
              Start
            </button>
          </div>

          {/* 2. การ์ดตอบคำถาม */}
          <div className="group relative bg-[#161229]/85 backdrop-blur-xl border-2 border-purple-500/60 hover:border-fuchsia-400 rounded-[32px] p-7 flex flex-col items-center justify-between min-h-[370px] shadow-[0_0_30px_rgba(147,51,234,0.28)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] transition-all duration-300 hover:-translate-y-1.5">
            <h2 className="text-2xl font-extrabold text-white tracking-wide">
              ตอบคำถาม
            </h2>

            <div className="my-4 w-full max-w-[210px] bg-gradient-to-b from-purple-900/80 to-indigo-950/90 border-2 border-purple-400/50 rounded-2xl p-4 shadow-inner relative">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-lg font-black text-amber-300 tracking-wider drop-shadow">
                  QUIZ!
                </span>
                <span className="w-7 h-7 rounded-full bg-pink-500 text-white font-black text-sm flex items-center justify-center shadow">
                  ?
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded-full bg-rose-500/90" />
                <div className="h-3 w-5/6 rounded-full bg-amber-400/90" />
                <div className="h-3 w-full rounded-full bg-sky-400/90" />
                <div className="h-3 w-4/5 rounded-full bg-emerald-400/90 flex items-center justify-end pr-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 border border-white text-[9px] flex items-center justify-center text-black font-black">
                    ✓
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartMode('quiz')}
              className="w-44 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 hover:from-fuchsia-400 hover:to-cyan-300 text-white font-extrabold text-lg tracking-wide shadow-[0_0_20px_rgba(217,70,239,0.55)] border border-white/40 transition-all cursor-pointer active:scale-95"
            >
              Start
            </button>
          </div>

          {/* 3. การ์ดเกมการ์ด */}
          <div className="group relative bg-[#161229]/85 backdrop-blur-xl border-2 border-purple-500/60 hover:border-fuchsia-400 rounded-[32px] p-7 flex flex-col items-center justify-between min-h-[370px] shadow-[0_0_30px_rgba(147,51,234,0.28)] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] transition-all duration-300 hover:-translate-y-1.5">
            <h2 className="text-2xl font-extrabold text-white tracking-wide">
              เกมการ์ด
            </h2>

            <div className="my-4 relative w-full h-36 flex items-center justify-center">
              <div className="w-20 h-28 rounded-2xl bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-white/60 shadow-xl -rotate-12 -translate-x-3 flex flex-col items-center justify-center text-neutral-900 font-black">
                <span className="text-2xl">⭐</span>
                <span className="text-lg">?</span>
              </div>
              <div className="w-20 h-28 rounded-2xl bg-gradient-to-b from-fuchsia-500 to-purple-700 border-2 border-white/60 shadow-xl rotate-12 translate-x-3 flex flex-col items-center justify-center text-white">
                <span className="text-3xl">🧠</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartMode('flashcard')}
              className="w-44 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 hover:from-fuchsia-400 hover:to-cyan-300 text-white font-extrabold text-lg tracking-wide shadow-[0_0_20px_rgba(217,70,239,0.55)] border border-white/40 transition-all cursor-pointer active:scale-95"
            >
              Start
            </button>
          </div>
        </section>

        {/* ==========================================
            📚 ส่วนคลังมินิเกม
            ========================================== */}
        <section ref={libraryRef} className="pt-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="px-6 py-2.5 bg-[#2b2a2e]/90 border border-purple-500/40 rounded-full text-sm md:text-base font-extrabold text-white shadow-lg">
              คลังมินิเกม
            </div>

            <button
              type="button"
              onClick={fetchGames}
              className="px-4 py-2 bg-[#2b2a2e]/90 hover:bg-neutral-800 border border-neutral-600/50 rounded-full text-xs font-bold text-neutral-200 flex items-center gap-1.5 transition-all cursor-pointer shadow"
            >
              <span>🔄 รีเฟรชรายการ</span>
            </button>
          </div>

          {loadingGames ? (
            <div className="text-center py-12 text-neutral-400 text-sm font-bold">
              กำลังโหลดคลังมินิเกม...
            </div>
          ) : games.length === 0 ? (
            <div className="bg-[#161229]/75 border border-purple-500/30 rounded-3xl p-12 text-center space-y-3">
              <p className="text-neutral-300 font-bold">ยังไม่มีมินิเกมในคลังของคุณ</p>
              <p className="text-xs text-neutral-400">
                คลิกปุ่ม Start บนการ์ดด้านบนเพื่อสร้างมินิเกมแรกของคุณได้เลย!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((g) => {
                const modeLabel =
                  g.game_type === 'matching' ? 'เกมจับคู่'
                  : g.game_type === 'flashcard' ? 'เกมการ์ด'
                  : 'ตอบคำถาม';

                return (
                  <div
                    key={g.id}
                    className="bg-[#24222b]/90 backdrop-blur-md border border-purple-500/35 hover:border-purple-400/70 rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-xl transition-all relative"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-400">{modeLabel}</span>
                        <span className="text-neutral-400 font-medium">
                          📄 {g.itemCount} ข้อ • 👥 {g.playerCount} คน
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-white line-clamp-1">
                        {g.title || 'Untitled Game'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/play?id=${g.id}`}
                        className="flex-1 py-2.5 bg-[#5850ec] hover:bg-[#4f46e5] text-white font-bold text-xs md:text-sm rounded-2xl text-center border border-black shadow-md transition-all"
                      >
                        เข้าเล่น
                      </Link>

                      <button
                        type="button"
                        onClick={() => setQrModalGame(g)}
                        title="แสดง QR Code"
                        className="w-10 h-10 bg-[#5850ec] hover:bg-[#4f46e5] text-white rounded-xl border border-black flex items-center justify-center shadow-md cursor-pointer transition-all"
                      >
                        📱
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyPlayLink(g.id)}
                        title="คัดลอกลิงก์"
                        className="w-10 h-10 bg-[#5850ec] hover:bg-[#4f46e5] text-white rounded-xl border border-black flex items-center justify-center shadow-md cursor-pointer transition-all"
                      >
                        🔗
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === g.id ? null : g.id)}
                          className="w-10 h-10 bg-[#5850ec] hover:bg-[#4f46e5] text-white rounded-xl border border-black flex items-center justify-center font-black shadow-md cursor-pointer transition-all"
                        >
                          ⋮
                        </button>

                        {openMenuId === g.id && (
                          <div className="absolute right-0 bottom-12 w-48 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl py-2 z-40 text-xs font-bold overflow-hidden">
                            <Link
                              href={`/create?id=${g.id}`}
                              className="block px-4 py-2.5 text-neutral-200 hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                              ✏️ แก้ไขมินิเกม
                            </Link>
                            <Link
                              href={`/analytics?id=${g.id}`}
                              className="block px-4 py-2.5 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                            >
                              📊 ดูผลคะแนน (Analytics)
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeleteGame(g.id)}
                              className="w-full text-left px-4 py-2.5 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                            >
                              🗑️ ลบกิจกรรม
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ==========================================
          🔐 MODAL 1: SIGN IN WITH GOOGLE
          ========================================== */}
      {status === 'unauthenticated' && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b1f]/95 border border-neutral-600/60 rounded-[32px] p-10 max-w-md w-full flex flex-col items-center justify-center shadow-2xl space-y-6">
            <LearnCraftLogo size="md" />
            <p className="text-xs md:text-sm text-neutral-300 text-center">
              เข้าสู่ระบบเพื่อสร้างมินิเกมและจัดการคลังสื่อการสอนอัจฉริยะของคุณ
            </p>
            <button
              type="button"
              onClick={() => signIn('google')}
              className="px-7 py-3.5 bg-black hover:bg-neutral-900 border border-neutral-700 rounded-full flex items-center gap-3.5 shadow-xl transition-all cursor-pointer hover:scale-105"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.98-2.18-6.96-5.12H1.04v3.14C3.05 21.16 7.2 24 12 24z" />
                <path fill="#FBBC05" d="M5.04 14.03c-.25-.72-.39-1.5-.39-2.3s.14-1.58.39-2.3V6.29H1.04C.38 7.61 0 9.12 0 11.73s.38 4.12 1.04 5.44l4-3.14z" />
                <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.2 0 3.05 2.84 1.04 6.83l4 3.14c.98-2.94 3.72-5.22 6.96-5.22z" />
              </svg>
              <span className="text-white font-bold text-base tracking-wide">Sign in with Google</span>
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          🛠️ MODAL 2: หน้าต่างสร้างมินิเกม
          ========================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b182e] border-2 border-purple-500/60 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
              <h3 className="text-lg md:text-xl font-black text-white">
                ✨ สร้างมินิเกมและใบงานอัจฉริยะ
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold cursor-pointer"
              >✕</button>
            </div>

            <form onSubmit={handleGenerateGame} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-300">รูปแบบมินิเกม</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'matching', label: '🧩 เกมจับคู่' },
                    { id: 'quiz', label: '🎯 ตอบคำถาม' },
                    { id: 'flashcard', label: '🎴 เกมการ์ด' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSelectedGameType(mode.id)}
                      className={`py-2.5 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                        selectedGameType === mode.id
                          ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 border-white text-white shadow-lg'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-neutral-300">ชื่อเรื่อง / หัวข้อบทเรียน</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="เช่น โครงสร้างประโยคภาษาอังกฤษ, ระบบสุริยะ..."
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-fuchsia-500 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-neutral-300">เนื้อหาบทเรียน (วางข้อความ หรืออัปโหลด PDF ด้านล่าง)</label>
                <textarea
                  rows={4}
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  placeholder="วางเนื้อหาสรุปบทเรียนเพื่อให้ AI นำไปสร้างโจทย์..."
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-fuchsia-500 rounded-xl p-3.5 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-300">อัปโหลดเอกสาร PDF (ถ้ามี)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-neutral-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-neutral-300">จำนวนข้อ</label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={numItems}
                    onChange={(e) => setNumItems(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-bold text-neutral-300 cursor-pointer"
                >ยกเลิก</button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 text-white font-extrabold rounded-xl shadow-lg cursor-pointer"
                >
                  {generating ? 'กำลังสร้างด้วย AI...' : '🚀 เริ่มสร้างมินิเกม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          📱 MODAL 3: แสดง QR Code สำหรับสแกนเข้าเล่น
          ========================================== */}
      {qrModalGame && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b182e] border-2 border-purple-500/60 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white">📱 สแกน QR Code เพื่อเข้าเล่น</h3>
            <p className="text-xs text-fuchsia-300 font-bold">{qrModalGame.title}</p>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  `${window.location.origin}/play?id=${qrModalGame.id}`
                )}`}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-[11px] text-neutral-300">
              ผู้เรียนสามารถสแกนเข้าเล่นและส่งคะแนนได้ทันทีโดยไม่ต้องล็อกอิน
            </p>
            <button
              type="button"
              onClick={() => setQrModalGame(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
            >ปิดหน้าต่าง</button>
          </div>
        </div>
      )}

      {/* ==========================================
          ℹ️ MODAL 4: เกี่ยวกับ LearnCraft
          ========================================== */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b182e] border-2 border-purple-500/60 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-4 shadow-2xl text-center">
            <LearnCraftLogo size="md" />
            <h3 className="text-lg font-extrabold text-white pt-2">แพลตฟอร์มสร้างมินิเกมและสื่อการสอนอัจฉริยะ</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              LearnCraft ช่วยเปลี่ยนเนื้อหาบทเรียนหรือเอกสาร PDF ให้กลายเป็นมินิเกมการศึกษา (เกมจับคู่, ตอบคำถาม, และเกมการ์ด) ด้วย AI พร้อมระบบแก้ไขโจทย์อิสระ แชร์ผ่าน QR Code โดยไม่ต้องล็อกอิน และรายงานผลคะแนนแบบเรียลไทม์
            </p>
            <button
              type="button"
              onClick={() => setShowAboutModal(false)}
              className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white font-bold text-xs rounded-full cursor-pointer"
            >ตกลง</button>
          </div>
        </div>
      )}
    </div>
  );
}