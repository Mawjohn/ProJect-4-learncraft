'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function LearnCraftLogo({ size = 'md' }) {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: 'h-10',
    md: 'h-14',
    lg: 'h-20',
  };

  return (
    <Link href="/" className="inline-block select-none group">
      {!imgError ? (
        <img
          src="/logo.png"
          alt="LEARN CRAFT"
          onError={() => setImgError(true)}
          className={`${sizeMap[size] || 'h-14'} w-auto object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform`}
        />
      ) : (
        /* โลโก้ SVG สไตล์ 3D โค้งสีชมพู-กรมท่า ตามแบบดีไซน์ (แสดงอัตโนมัติถ้ายังไม่มีไฟล์ logo.png) */
        <div className="flex flex-col items-center leading-none transform -rotate-2 group-hover:scale-105 transition-transform">
          <span
            className="font-black text-2xl sm:text-3xl tracking-wider uppercase text-pink-500"
            style={{
              WebkitTextStroke: '1.5px #ffffff',
              textShadow: '0px 4px 0px #1e3a8a, 0px 6px 0px #172554, 0px 8px 12px rgba(0,0,0,0.9)',
            }}
          >
            LEARN
          </span>
          <span
            className="font-black text-2xl sm:text-3xl tracking-wider uppercase text-pink-500 -mt-1.5"
            style={{
              WebkitTextStroke: '1.5px #ffffff',
              textShadow: '0px 4px 0px #1e3a8a, 0px 6px 0px #172554, 0px 8px 12px rgba(0,0,0,0.9)',
            }}
          >
            CRAFT
          </span>
        </div>
      )}
    </Link>
  );
}