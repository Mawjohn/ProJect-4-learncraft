export default function ScoreSummaryScreen({ correctCount = 0, totalCount = 5, totalTime = "00:00", leaderboard = [] }) {
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* การ์ดยินดีด้วย */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
        <span className="text-4xl">🎉</span>
        <h2 className="text-2xl font-black text-white">ยอดเยี่ยมมาก! ภารกิจสำเร็จ</h2>
        <p className="text-xs text-neutral-400 font-mono">ใช้เวลาทั้งหมด: {totalTime}</p>

        {/* สถิติตัวเลข 3 กล่อง */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-4">
            <span className="text-xs text-neutral-400 block mb-1">ตอบถูก</span>
            <span className="text-2xl font-black text-emerald-400">{correctCount}</span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-4">
            <span className="text-xs text-neutral-400 block mb-1">ตอบผิด</span>
            <span className="text-2xl font-black text-rose-400">{totalCount - correctCount}</span>
          </div>
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-4">
            <span className="text-xs text-neutral-400 block mb-1">ความถูกต้อง</span>
            <span className="text-2xl font-black text-indigo-400">{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* ตารางจัดอันดับ (Leaderboard) */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🏆</span> ตารางอันดับผู้เล่น (Leaderboard)
          </h3>
          <span className="text-xs text-neutral-400">Top Rank</span>
        </div>

        <div className="space-y-2">
          {leaderboard.length > 0 ? (
            leaderboard.map((player, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-4 py-3 bg-neutral-950/60 border border-neutral-850 rounded-xl text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center font-black ${
                    idx === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                    idx === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                    idx === 2 ? "bg-amber-700/20 text-amber-600 border border-amber-700/30" :
                    "text-neutral-500"
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-neutral-200">{player.name}</span>
                </div>
                <div className="flex items-center gap-4 font-mono">
                  <span className="text-indigo-400 font-bold">{player.score} คะแนน</span>
                  <span className="text-neutral-400">{player.time}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-xs text-neutral-500">ยังไม่มีข้อมูลการเล่น</div>
          )}
        </div>
      </div>
    </div>
  );
}