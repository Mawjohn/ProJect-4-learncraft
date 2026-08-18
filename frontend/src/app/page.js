'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/games');
      const result = await res.json();
      if (result.status === 'success') {
        setGames(result.games || []);
      }
    } catch (err) {
      console.error('Fetch games error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleCopyLink = (gameId) => {
    const link = `${window.location.origin}/play?id=${gameId}`;
    navigator.clipboard.writeText(link);
    alert('คัดลอกลิงก์สำหรับผู้เรียนสำเร็จ!');
  };

  // 🗑️ ฟังก์ชันลบเกมพร้อมกล่องยืนยันป้องกันการกดพลาด
  const handleDeleteGame = async (gameId, gameTitle) => {
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเกม "${gameTitle}" นี้ออกถาวร?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:8000/api/games/${gameId}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.status === 'success') {
        // อัปเดตรายการในหน้าจอทันที
        setGames((prev) => prev.filter((g) => g.id !== gameId));
      } else {
        alert(result.message || 'ไม่สามารถลบเกมได้');
      }
    } catch (err) {
      console.error('Delete game error:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์เพื่อลบเกม');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500 selection:text-white">
      
      {/* 🌟 Navbar */}
      <nav className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/20">
              L
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Learn<span className="text-indigo-400">Craft</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/create"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <span>+ สร้างมินิเกมใหม่</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-400 text-xs font-bold tracking-wide">
          <span>✨ Gamified Learning & AI Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
          เปลี่ยนเนื้อหาบทเรียนให้เป็น <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
            มินิเกมและใบงานอัจฉริยะ
          </span>
        </h1>

        <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          แพลตฟอร์มช่วยครูผู้สอนและนักเรียนสกัดเนื้อหาจากเอกสาร PDF สร้างเกม Quiz แบบ Step-by-Step, แฟลชการ์ด 3D, เกมจับคู่ พร้อมระบบสรุปคะแนน Analytics ทันที
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/create"
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>🚀 เริ่มต้นสร้างสื่อการสอน</span>
          </Link>
          <a
            href="#library"
            className="w-full sm:w-auto px-6 py-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold text-sm rounded-2xl transition-all"
          >
            📚 คลังมินิเกมที่สร้างไว้
          </a>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-lg text-indigo-400">🎯</div>
            <h3 className="font-bold text-white text-base">Quiz Challenge</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">ตอบคำถามทีละข้อพร้อม Progress Bar, ตรวจเฉลยทันที และฉลองความสำเร็จด้วยเอฟเฟกต์พลุ Confetti</p>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-lg text-amber-400">🎴</div>
            <h3 className="font-bold text-white text-base">3D Flashcard Studio</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">การ์ดคำศัพท์หมุน 3D Flip พร้อมระบบประเมินความจำ (Mastery System) เพื่อแยกคำที่ต้องอ่านซ้ำ</p>
          </div>

          <div className="bg-neutral-900/60 border border-neutral-800/80 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-lg text-emerald-400">🧩</div>
            <h3 className="font-bold text-white text-base">Matching Arena</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">เกมจับคู่คำศัพท์และความหมาย พร้อมระบบสะสมคอมโบ (Combo Streak) และการ์ดสั่นเตือนเมื่อผิด</p>
          </div>
        </div>
      </section>

      {/* 📚 My Library Section */}
      <section id="library" className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">My Activity Library</span>
            <h2 className="text-2xl font-black text-white mt-1">คลังมินิเกมและสื่อการเรียนรู้</h2>
          </div>
          <button
            onClick={fetchGames}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1"
          >
            🔄 รีเฟรชรายการ
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-neutral-500 text-sm">กำลังโหลดคลังเกม...</div>
        ) : games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((g) => (
              <div
                key={g.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      g.game_type === 'matching' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      g.game_type === 'flashcard' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-indigo-950 text-indigo-400 border border-indigo-800'
                    }`}>
                      {g.game_type === 'matching' ? 'Matching 🧩' : g.game_type === 'flashcard' ? 'Flashcard 🎴' : 'Quiz 🎯'}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">ID: {g.id}</span>
                  </div>

                  <h3 className="font-bold text-white text-base line-clamp-2 pt-1 group-hover:text-indigo-300 transition-colors">
                    {g.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-neutral-400 pt-1">
                    <span>📝 {g.total_items} ข้อ/คู่</span>
                    <span>•</span>
                    <span>👥 เล่นแล้ว {g.total_players} คน</span>
                  </div>
                </div>

                {/* แถบปุ่มควบคุม พร้อมปุ่มลบ 🗑️ */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center gap-2">
                  <Link
                    href={`/play?id=${g.id}`}
                    target="_blank"
                    className="flex-1 py-2 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl text-center transition-all shadow-md"
                  >
                    เข้าเล่น 🎮
                  </Link>

                  <Link
                    href={`/analytics?id=${g.id}`}
                    target="_blank"
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-all"
                    title="ดูสถิติ Analytics"
                  >
                    📊
                  </Link>

                  <button
                    onClick={() => handleCopyLink(g.id)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-all"
                    title="คัดลอกลิงก์สำหรับแชร์"
                  >
                    🔗
                  </button>

                  <button
                    onClick={() => handleDeleteGame(g.id, g.title)}
                    className="p-2 bg-neutral-800 hover:bg-rose-950 hover:border-rose-700 border border-neutral-800 hover:text-rose-400 text-neutral-400 rounded-xl transition-all"
                    title="ลบเกมนี้"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-neutral-900/40 border border-dashed border-neutral-800 rounded-3xl p-12 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <div className="text-neutral-300 font-bold text-sm">ยังไม่มีมินิเกมในคลังของคุณ</div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">เริ่มต้นสร้างมินิเกมชุดแรกของคุณได้ง่ายๆ</p>
            <div className="pt-2">
              <Link
                href="/create"
                className="inline-flex px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                + สร้างเกมแรกของคุณ
              </Link>
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-neutral-900 py-8 text-center text-xs text-neutral-600">
        LearnCraft • AI-Powered Gamified Learning Platform
      </footer>

    </div>
  );
}