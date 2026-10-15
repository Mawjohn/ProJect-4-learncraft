export default function LearnCraftLogo({ size = "md" }) {
  const sizeClasses = {
    sm: "text-base gap-1.5",
    md: "text-xl gap-2",
    lg: "text-3xl gap-3",
  };

  return (
    <div className={`flex items-center font-black tracking-wider select-none ${sizeClasses[size]}`}>
      {/* กล่องไอคอนเกม */}
      <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
        <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-mono">🎮</span>
      </div>
      
      {/* ตัวหนังสือแบรนด์ LearnCraft */}
      <div className="flex flex-col leading-none">
        <span className="font-extrabold uppercase text-white tracking-widest drop-shadow-[0_2px_8px_rgba(99,102,241,0.5)]">
          LEARN<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">CRAFT</span>
        </span>
        <span className="text-[9px] text-indigo-300 font-mono tracking-widest uppercase">Interactive Play</span>
      </div>
    </div>
  );
}