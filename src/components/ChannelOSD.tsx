import React, { useEffect, useState } from "react";

interface ChannelOSDProps {
  channelNumber: number;
  channelName: string;
  volume: number;
  isMuted: boolean;
  signalQuality: number;
  osdText: string | null;
  osdSubtext?: string | null;
}

export function ChannelOSD({
  channelNumber,
  channelName,
  volume,
  isMuted,
  signalQuality,
  osdText,
  osdSubtext,
}: ChannelOSDProps) {
  const [visible, setVisible] = useState(true);

  // 每次触发 OSD 更新时保持显示并在 3.2 秒后淡出
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3200);
    return () => clearTimeout(timer);
  }, [channelNumber, channelName, volume, isMuted, osdText, signalQuality]);

  if (!visible) return null;

  // 生成音量条格 ▮▮▮▮▮▯▯▯▯▯
  const totalBlocks = 12;
  const activeBlocks = Math.round((volume / 100) * totalBlocks);
  const volumeBar = "▮".repeat(activeBlocks) + "▯".repeat(totalBlocks - activeBlocks);

  return (
    <div className="pointer-events-none absolute top-12 right-12 z-20 font-mono select-none drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]">
      <div className="bg-black/60 backdrop-blur-sm border border-emerald-500/40 px-4 py-2.5 rounded text-emerald-400 space-y-1">
        <div className="flex items-center gap-3 text-lg font-bold tracking-wider">
          <span>CH {channelNumber.toString().padStart(2, "0")}</span>
          <span className="text-sm font-normal text-emerald-300">{channelName}</span>
        </div>

        {isMuted ? (
          <div className="text-xs font-bold text-red-400 tracking-widest animate-pulse">
            [ MUTE 静音 ]
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-500">VOL</span>
            <span className="tracking-tighter text-emerald-400 font-bold">{volumeBar}</span>
            <span className="text-[10px] text-emerald-500">{volume}%</span>
          </div>
        )}

        {signalQuality < 80 && (
          <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5">
            <span>RF 信号: {signalQuality}%</span>
            {signalQuality < 50 && <span className="text-[10px] text-red-400 animate-pulse">(需调天线)</span>}
          </div>
        )}

        {osdText && (
          <div className="text-xs text-emerald-200 border-t border-emerald-500/30 pt-1 mt-1">
            {osdText}
          </div>
        )}
        {osdSubtext && (
          <div className="text-[10px] text-emerald-400/80">
            {osdSubtext}
          </div>
        )}
      </div>
    </div>
  );
}
