'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      // เรียกใช้ Endpoint Analytics โดยตรง
      const res = await fetch(`http://127.0.0.1:8000/api/games/${gameId}/analytics`);
      const result = await res.json();
      if (result.status === 'success') {
        setAnalytics(result);
      } else {
        setError('ไม่สามารถดึงข้อมูลสถิติได้');
      }
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameId) fetchAnalytics();
  }, [gameId]);

  // 📥 ฟังก์ชัน Export CSV สำหรับเปิดใน Excel สระภาษาไทยไม่เพี้ยน
  const handleExportCSV = () => {
    const scores = analytics?.scores || [];
    if (scores.length === 0) {
      alert('ยังไม่มีข้อมูลคะแนนสำหรับดาวน์โหลด');
      return;
    }

    const headers = ['ลำดับ', 'ชื่อผู้เรียน', 'คะแนนที่ได้', 'คะแนนเต็ม', 'ร้อยละ', 'เวลาที่ใช้'];
    const rows = scores.map((s, idx) => {
      const timeSec = s.time_taken_seconds || 0;
      const timeFormatted = `${Math.floor(timeSec / 60)} นาที ${timeSec % 60} วินาที`;
      
      return [
        idx + 1,
        `"${s.student_name || 'ผู้เรียน'}"`,
        s.score,
        s.total_score,
        `"${s.percentage}%"`,
        `"${timeFormatted}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LearnCraft_${analytics?.title || 'scores'}_Analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center text-sm">กำลังโหลดสถิติ Analytics...</div>;
  if (error || !analytics) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center text-sm">{error}</div>;

  const scores = analytics.scores || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <nav className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full px-6 md:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/20">
              L
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              Learn<span className="text-indigo-400">Craft</span>
            </span>
          </Link>
          <Link href="/" className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl transition-all">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Performance Analytics</span>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-1">{analytics.title}</h1>
            <p className="text-xs text-neutral-400 mt-1">รหัสกิจกรรม: {gameId}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <span>📊 ดาวน์โหลดคะแนน (Excel / CSV)</span>
            </button>
            <Link
              href={`/play?id=${gameId}`}
              target="_blank"
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-bold rounded-xl transition-all"
            >
              🎮 เปิดหน้าเกม
            </Link>
          </div>
        </div>

        {/* การ์ดสถิติ 3 ช่อง */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl space-y-1">
            <div className="text-xs text-neutral-400 font-bold uppercase">ผู้เข้าสอบทั้งหมด</div>
            <div className="text-3xl font-black text-white">{analytics.total_players} <span className="text-sm font-normal text-neutral-500">คน</span></div>
          </div>
          <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl space-y-1">
            <div className="text-xs text-neutral-400 font-bold uppercase">คะแนนเฉลี่ย</div>
            <div className="text-3xl font-black text-indigo-400">{analytics.average_score} <span className="text-sm font-normal text-neutral-500">คะแนน</span></div>
          </div>
          <div className="bg-neutral-900/80 border border-neutral-800 p-5 rounded-2xl space-y-1">
            <div className="text-xs text-neutral-400 font-bold uppercase">ความแม่นยำเฉลี่ย</div>
            <div className="text-3xl font-black text-emerald-400">{analytics.average_percentage}%</div>
          </div>
        </div>

        {/* ตารางแสดงรายชื่อและคะแนน */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h2 className="text-base font-bold text-white">รายชื่อและผลคะแนนรายบุคคล</h2>
          {scores.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase border-b border-neutral-800">
                  <tr>
                    <th className="p-3">ลำดับ</th>
                    <th className="p-3">ชื่อผู้เรียน</th>
                    <th className="p-3">คะแนน</th>
                    <th className="p-3">ร้อยละ</th>
                    <th className="p-3">เวลาที่ใช้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {scores.map((s, idx) => (
                    <tr key={idx} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="p-3 font-mono text-neutral-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-white">{s.student_name}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">{s.score} / {s.total_score}</td>
                      <td className="p-3 font-mono text-indigo-300">{s.percentage}%</td>
                      <td className="p-3 font-mono text-neutral-400">{s.time_taken_seconds} วินาที</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-500 text-xs">ยังไม่มีผู้เรียนส่งคะแนนในกิจกรรมนี้</div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">กำลังโหลด...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}