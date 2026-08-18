'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gameId) {
      setError('ไม่พบรหัสเกม กรุณาตรวจสอบลิงก์อีกครั้ง');
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/games/analytics/${gameId}`);
        const result = await res.json();
        if (result.status === 'success') {
          setData(result);
        } else {
          setError('ไม่พบข้อมูลสถิติของเกมนี้');
        }
      } catch (err) {
        console.error(err);
        setError('ไม่สามารถดึงข้อมูลสถิติจากเซิร์ฟเวอร์ได้');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [gameId]);

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">กำลังโหลดสถิติ...</div>;
  if (error) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">{error}</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Header */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl flex justify-between items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Learning Analytics 📊</span>
            <h1 className="text-2xl font-extrabold text-white mt-1">{data?.title}</h1>
          </div>
          <a
            href={`/play?id=${gameId}`}
            target="_blank"
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg transition-all"
          >
            เปิดหน้าเล่นเกม 🎮
          </a>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-neutral-400 text-xs font-semibold">จำนวนผู้เข้าเรียนทั้งหมด</div>
            <div className="text-3xl font-black text-indigo-400 mt-2">{data?.total_players} <span className="text-sm font-normal text-neutral-500">คน</span></div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-neutral-400 text-xs font-semibold">คะแนนเฉลี่ย</div>
            <div className="text-3xl font-black text-emerald-400 mt-2">{data?.avg_score} <span className="text-sm font-normal text-neutral-500">คะแนน</span></div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div className="text-neutral-400 text-xs font-semibold">เปอร์เซ็นต์ความเข้าใจเฉลี่ย</div>
            <div className="text-3xl font-black text-purple-400 mt-2">{data?.avg_percentage}%</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white">ตารางสรุปผลคะแนนรายบุคคล</h2>
          {data?.scores && data.scores.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">ลำดับ</th>
                    <th className="p-3">ชื่อผู้เรียน</th>
                    <th className="p-3">คะแนนที่ได้</th>
                    <th className="p-3">เวลาที่ใช้</th>
                    <th className="p-3 text-right">เปอร์เซ็นต์ความเข้าใจ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
                  {data.scores.map((s, idx) => (
                    <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="p-3 font-bold text-neutral-500">#{idx + 1}</td>
                      <td className="p-3 font-semibold text-white">{s.player_name}</td>
                      <td className="p-3 text-indigo-300 font-bold">{s.score} / {s.total_questions}</td>
                      <td className="p-3 text-neutral-400 font-mono">{s.time_taken || '-'}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          s.percentage >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          s.percentage >= 50 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {s.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-neutral-500 text-xs">
              ยังไม่มีผู้เรียนเข้ามาทำแบบทดสอบสำหรับชุดการเรียนรู้นี้
            </div>
          )}
        </div>

      </div>
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