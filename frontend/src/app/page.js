'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import LearnCraftLogo from '@/components/LearnCraftLogo';

export default function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();

  const [qrModalData, setQrModalData] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

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
    const handleGlobalClick = () => setActiveDropdownId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
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
    <div className="min-h-screen space-theme-bg text-neutral-100 relative pb-20">
      {/* Navbar ตามดีไซน์ */}
      <nav className="w-full px-6 md:px-12 py-5 flex items-center justify-between sticky top-0 z-40 bg-black/40 backdrop-blur-sm">
        <LearnCraftLogo size="md" />

        <div className="flex items-center gap-3">
          {status === 'loading' ? (
            <div className="text-xs text-neutral-400">กำลังโหลด...</div>
          ) : session ? (
            <div className="flex items-center gap-3">
              <Link
                href="/create"
                className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs sm:text-sm font-bold rounded-full border border-black shadow-md transition-all"
              >
                สร้างมินิเกม
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="px-5 py-2.5 bg-[#4f46e5] hover:bg-rose-600 text-white text-xs sm:text-sm font-bold rounded-full border border-black shadow-md transition-all cursor-pointer"
              >
                ออกจากระบบ
              </button>
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'Profile'}
                  className="w-10 h-10 rounded-full border-2 border-indigo-400 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center">
                  Profile
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn('google')}
              className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs sm:text-sm font-bold rounded-full border border-black shadow-lg transition-all cursor-pointer"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </nav>

      {/* Hero Banner ตามแบบ PDF หน้า 1 */}
      <section className="max-w-4xl mx-auto px-6 pt-8 pb-10">
        <div className="bg-[#38363a]/90 border border-neutral-600/50 rounded-3xl py-12 px-6 text-center shadow-2xl">
          <h1 className="text-2xl sm:text-4xl font-bold text-white leading-relaxed tracking-wide">
            เปลี่ยนเนื้อหาบทเรียนให้เป็น <br />
            มินิเกมและใบงานอัจฉริยะ
          </h1>
        </div>
      </section>

      {/* ส่วนคลังมินิเกม */}
      <section id="library" className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="px-6 py-2 bg-[#38363a] rounded-full text-white font-bold text-sm sm:text-base shadow">
            คลังมินิเกม
          </div>
          <button
            onClick={fetchGames}
            className="text-xs text-neutral-300 hover:text-white bg-[#38363a] px-4 py-2 rounded-full transition-colors"
          >
            🔄 รีเฟรชรายการ
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-neutral-400 text-sm">กำลังโหลดคลังเกม...</div>
        ) : games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((g) => (
              <div
                key={g.id}
                className="bg-[#38363a]/95 border border-neutral-600/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[190px] transition-transform hover:scale-[1.01]"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-neutral-300">
                    <span className="font-bold text-indigo-300">
                      {g.game_type === 'matching' ? 'เกมจับคู่' : g.game_type === 'flashcard' ? 'เกมการ์ด' : 'ตอบคำถาม'}
                    </span>
                    <span className="font-mono text-[11px] opacity-75">
                      📝 {g.total_items} ข้อ • 👥 {g.total_players} คน
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg line-clamp-2 pt-1">
                    {g.title}
                  </h3>
                </div>

                {/* แถบปุ่มด้านล่างของการ์ด ตามดีไซน์ */}
                <div className="pt-5 flex items-center gap-2.5">
                  <Link
                    href={`/play?id=${g.id}`}
                    className="flex-1 py-2.5 px-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm rounded-2xl border border-black flex items-center justify-center transition-colors shadow"
                  >
                    เข้าเล่น
                  </Link>

                  <button
                    onClick={() => handleOpenQR(g)}
                    className="w-11 h-11 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl border border-black flex items-center justify-center transition-colors shadow shrink-0"
                    title="แสดง QR Code"
                  >
                    📱
                  </button>

                  <button
                    onClick={() => handleCopyLink(g.id)}
                    className="w-11 h-11 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl border border-black flex items-center justify-center transition-colors shadow shrink-0"
                    title="คัดลอกลิงก์"
                  >
                    🔗
                  </button>

                  {session && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === g.id ? null : g.id);
                        }}
                        className="w-11 h-11 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl border border-black flex items-center justify-center transition-colors shadow shrink-0 font-bold"
                        title="จัดการเกม"
                      >
                        ⋮
                      </button>

                      {activeDropdownId === g.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex flex-col absolute right-0 bottom-full mb-2 w-36 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl py-1.5 z-30 text-xs"
                        >
                          <Link
                            href={`/analytics?id=${g.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-neutral-200 hover:bg-neutral-800"
                          >
                            <span>📊</span>
                            <span>ดูสถิติผู้เล่น</span>
                          </Link>
                          <Link
                            href={`/create?edit=${g.id}`}
                            onClick={() => setActiveDropdownId(null)}
                            className="flex items-center gap-2 px-3 py-2 text-neutral-200 hover:bg-neutral-800"
                          >
                            <span>✏️</span>
                            <span>แก้ไขเนื้อหา</span>
                          </Link>
                          <div className="border-t border-neutral-800 my-1"></div>
                          <button
                            onClick={() => {
                              setActiveDropdownId(null);
                              handleDeleteGame(g.id, g.title);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 text-left w-full"
                          >
                            <span>🗑️</span>
                            <span>ลบเกมนี้</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#38363a]/60 border border-dashed border-neutral-600 rounded-3xl p-12 text-center space-y-3">
            <div className="text-4xl">📦</div>
            <div className="text-neutral-200 font-bold text-sm">ยังไม่มีมินิเกมในคลังของคุณ</div>
          </div>
        )}
      </section>

      {/* QR Code Modal */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#38363a] border border-neutral-600 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl space-y-5 text-center relative">
            <button
              onClick={() => setQrModalData(null)}
              className="absolute top-4 right-4 text-neutral-300 hover:text-white text-sm p-2 rounded-xl bg-black/40"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white line-clamp-1 pt-2">{qrModalData.title}</h3>
            <div className="bg-white p-4 rounded-2xl inline-block">
              <QRCodeCanvas id="qr-code-canvas" value={qrModalData.url} size={220} />
            </div>
            <div className="space-y-2">
              <button
                onClick={handleDownloadQR}
                className="w-full py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs rounded-xl border border-black"
              >
                💾 ดาวน์โหลด QR Code (.PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}