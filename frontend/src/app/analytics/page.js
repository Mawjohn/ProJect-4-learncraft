'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LearnCraftLogo from '@/components/LearnCraftLogo';

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
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

  if (loading) return <div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">กำลังโหลดสถิติ Analytics...</div>;
  if (error || !analytics) return <div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">{error}</div>;

  const scores = analytics.scores || [];

  return (
    <div className="min-h-screen space-theme-bg text-white py-6 px-4 md:px-10 flex flex-col items-center justify-center relative overflow-hidden">
      {/* โลโก้มุมซ้ายบน */}
      <div className="fixed top-5 left-6 z-30 hidden xl:block">
        <LearnCraftLogo size="md" />
      </div>

      {/* กรอบกระดานหลักตรงกลางสีเทาเข้มโปร่งแสง สอดคล้องกับหน้าเล่นเกม */}
      <div className="w-full max-w-5xl bg-[#2b2a2e]/90 border border-neutral-600/40 rounded-3xl p-6 md:p-10 min-h-[85vh] flex flex-col justify-between shadow-2xl relative">
        {/* แถบโลโก้บนมือถือ/จอเล็ก */}
        <div className="xl:hidden flex justify-center pb-3">
          <LearnCraftLogo size="sm" />
        </div>

        {/* ส่วนหัวหน้า Analytics */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-700/60 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Performance Analytics</span>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1">{analytics.title}</h1>
              <p className="text-xs text-neutral-400 mt-1 font-mono">รหัสกิจกรรม: {gameId}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-[#15803d] hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-lg border border-black flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>📊 ดาวน์โหลดคะแนน (Excel / CSV)</span>
              </button>
              <Link
                href={`/play?id=${gameId}`}
                target="_blank"
                className="px-4 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold rounded-xl shadow-lg border border-black transition-all cursor-pointer"
              >
                🎮 เปิดหน้าเกม
              </Link>
            </div>
          </div>

          {/* การ์ดสถิติ 3 ช่อง */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#38363a] border border-neutral-600/60 p-5 rounded-2xl space-y-1 shadow-md">
              <div className="text-xs text-neutral-400 font-bold uppercase">ผู้เข้าสอบทั้งหมด</div>
              <div className="text-3xl font-black text-white">{analytics.total_players} <span className="text-sm font-normal text-neutral-400">คน</span></div>
            </div>
            <div className="bg-[#38363a] border border-neutral-600/60 p-5 rounded-2xl space-y-1 shadow-md">
              <div className="text-xs text-neutral-400 font-bold uppercase">คะแนนเฉลี่ย</div>
              <div className="text-3xl font-black text-indigo-400">{analytics.average_score} <span className="text-sm font-normal text-neutral-400">คะแนน</span></div>
            </div>
            <div className="bg-[#38363a] border border-neutral-600/60 p-5 rounded-2xl space-y-1 shadow-md">
              <div className="text-xs text-neutral-400 font-bold uppercase">ความแม่นยำเฉลี่ย</div>
              <div className="text-3xl font-black text-[#48bb3a]">{analytics.average_percentage}%</div>
            </div>
          </div>

          {/* ตารางแสดงรายชื่อและคะแนน */}
          <div className="bg-[#38363a] border border-neutral-600/60 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white">รายชื่อและผลคะแนนรายบุคคล</h2>
            {scores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-200">
                  <thead className="bg-[#2b2a2e] text-neutral-300 uppercase border-b border-neutral-700">
                    <tr>
                      <th className="p-3">ลำดับ</th>
                      <th className="p-3">ชื่อผู้เรียน</th>
                      <th className="p-3">คะแนน</th>
                      <th className="p-3">ร้อยละ</th>
                      <th className="p-3">เวลาที่ใช้</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700/50">
                    {scores.map((s, idx) => (
                      <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="p-3 font-mono text-neutral-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-white">{s.student_name}</td>
                        <td className="p-3 font-mono text-[#48bb3a] font-bold">{s.score} / {s.total_score}</td>
                        <td className="p-3 font-mono text-indigo-300">{s.percentage}%</td>
                        <td className="p-3 font-mono text-neutral-300">{s.time_taken_seconds} วินาที</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-400 text-xs">ยังไม่มีผู้เรียนส่งคะแนนในกิจกรรมนี้</div>
            )}
          </div>
        </div>

        {/* ปุ่มกลับหน้าหลักด้านล่าง */}
        <div className="pt-8 text-center">
          <Link href="/" className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 text-xs font-bold rounded-xl transition-all shadow-md inline-block">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen space-theme-bg text-white flex items-center justify-center font-bold">กำลังโหลด...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}