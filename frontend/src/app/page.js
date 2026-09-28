'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';

export default function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  // State สำหรับเปิดดู QR Code
  const [qrModalData, setQrModalData] = useState(null);

  const fetchGames = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/games');
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

  const handleOpenQR = (game) => {
    const playUrl = `${window.location.origin}/play?id=${game.id}`;
    setQrModalData({
      title: game.title,
      url: playUrl,
      id: game.id,
    });
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `LearnCraft_QR_${qrModalData?.id || 'game'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleDeleteGame = async (gameId, gameTitle) => {
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเกม "${gameTitle}" นี้ออกถาวร?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/games/${gameId}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.status === 'success') {
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500 selection:text-white relative">
      <nav className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
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
            {status === 'loading' ? (
              <div className="text-xs text-neutral-400">กำลังโหลด...</div>
            ) : session ? (
              <div className="flex items-center gap-3">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-8 h-8 rounded-full border border-neutral-700 object-cover"
                  />
                )}
                <span className="text-xs text-neutral-200 hidden sm:inline">
                  {session.user?.name}
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn('google')}
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>เข้าสู่ระบบด้วย Google</span>
              </button>
            )}

            {session && (
              <Link
                href="/create"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <span>+ สร้างมินิเกมใหม่</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

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
          แพลตฟอร์มช่วยครูผู้สอนและนักเรียนสกัดเนื้อหาจากเอกสาร สร้างเกม Quiz, แฟลชการ์ด 3D, เกมจับคู่ พร้อมแชร์ผ่าน QR Code และระบบวิเคราะห์ผลการเรียนรู้
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {session && (
            <Link
              href="/create"
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>🚀 เริ่มต้นสร้างสื่อการสอน</span>
            </Link>
          )}
          <a
            href="#library"
            className="w-full sm:w-auto px-6 py-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-semibold text-sm rounded-2xl transition-all"
          >
            📚 คลังมินิเกมที่สร้างไว้
          </a>
        </div>
      </section>

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

                <div className="pt-3 border-t border-neutral-800/80 flex items-center gap-1.5 sm:gap-2">
                  <Link
                    href={`/play?id=${g.id}`}
                    target="_blank"
                    className="flex-1 py-2 px-2.5 bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl text-center transition-all shadow-md whitespace-nowrap flex items-center justify-center gap-1"
                  >
                    <span>เข้าเล่น</span>
                    <span>🎮</span>
                  </Link>

                  <button
                    onClick={() => handleOpenQR(g)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 hover:text-indigo-400 text-neutral-300 rounded-xl transition-all shrink-0"
                    title="เปิด QR Code สำหรับฉายหน้าห้อง"
                  >
                    📱
                  </button>

                  {session && (
                    <>
                      <Link
                        href={`/create?edit=${g.id}`}
                        className="p-2 bg-neutral-800 hover:bg-indigo-950 hover:border-indigo-700 border border-neutral-800 hover:text-indigo-300 text-neutral-300 rounded-xl transition-all shrink-0"
                        title="แก้ไขเนื้อหาและคำถาม"
                      >
                        ✏️
                      </Link>

                      <Link
                        href={`/analytics?id=${g.id}`}
                        target="_blank"
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-all shrink-0"
                        title="ดูสถิติ Analytics"
                      >
                        📊
                      </Link>

                      <button
                        onClick={() => handleDeleteGame(g.id, g.title)}
                        className="p-2 bg-neutral-800 hover:bg-rose-950 hover:border-rose-700 border border-neutral-800 hover:text-rose-400 text-neutral-400 rounded-xl transition-all shrink-0"
                        title="ลบเกมนี้"
                      >
                        🗑️
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleCopyLink(g.id)}
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-all shrink-0"
                    title="คัดลอกลิงก์สำหรับแชร์"
                  >
                    🔗
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-neutral-900/40 border border-dashed border-neutral-800 rounded-3xl p-12 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <div className="text-neutral-300 font-bold text-sm">ยังไม่มีมินิเกมในคลังของคุณ</div>
          </div>
        )}
      </section>

      {/* QR Code Presentation Modal */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl space-y-5 text-center relative">
            <button
              onClick={() => setQrModalData(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-sm p-2 rounded-xl bg-neutral-800/60"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800">
                Scan to Play
              </span>
              <h3 className="text-lg font-bold text-white line-clamp-1 pt-1">{qrModalData.title}</h3>
              <p className="text-xs text-neutral-400">สแกน QR Code ด้วยกล้องมือถือเพื่อเข้าสู่เกม</p>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <QRCodeCanvas
                id="qr-code-canvas"
                value={qrModalData.url}
                size={220}
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={handleDownloadQR}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                <span>💾 ดาวน์โหลดรูปภาพ QR Code (.PNG)</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrModalData.url);
                  alert('คัดลอกลิงก์สำเร็จ!');
                }}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl transition-all"
              >
                🔗 คัดลอกลิงก์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}