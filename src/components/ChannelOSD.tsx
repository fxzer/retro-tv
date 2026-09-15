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

  // 生成音量条格 12 阶
  const totalBlocks = 12;
  const activeBlocks = Math.round((volume / 100) * totalBlocks);

  return (
    <div
      className={`pointer-events-none fixed top-[76px] right-6 z-20 select-none transition-all duration-300 w-80 sm:w-[380px] max-w-[calc(100vw-3rem)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1.5 pointer-events-none"
      }`}
    >
      <div className="bg-[#0b0d11]/94 backdrop-blur-md border border-emerald-500/25 shadow-[0_6px_20px_rgba(0,0,0,0.75)] px-4 py-3 rounded-xl text-neutral-200 space-y-2">
        {/* 频道编号与名称 */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-xs tracking-wider border border-emerald-500/30 shrink-0">
            CH {channelNumber.toString().padStart(2, "0")}
          </span>
          <span className="text-sm font-semibold text-white tracking-wide truncate">
            {channelName}
          </span>
        </div>

        {/* 音量条或静音提示 */}
        {isMuted ? (
          <div className="text-xs font-bold text-red-400 font-mono tracking-wider bg-red-950/40 border border-red-500/30 px-2.5 py-1 rounded-md inline-block animate-pulse">
            [ MUTE 静音 ]
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[11px] font-bold text-emerald-400/90 shrink-0">VOL</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: totalBlocks }).map((_, idx) => (
                <span
                  key={idx}
                  className={`w-2 h-3 rounded-[1px] transition-colors ${
                    idx < activeBlocks
                      ? "bg-emerald-400 shadow-[0_0_2px_rgba(52,211,153,0.5)]"
                      : "bg-neutral-800"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-neutral-300 font-medium ml-1">
              {volume}%
            </span>
          </div>
        )}

        {/* 弱信号提示 */}
        {signalQuality < 80 && (
          <div className="text-[11px] text-amber-300/95 flex items-center gap-1.5 pt-0.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>RF 信号: {signalQuality}%</span>
            {signalQuality < 50 && (
              <span className="text-[10px] text-red-400 font-bold">(需调天线)</span>
            )}
          </div>
        )}

        {/* 状态与描述说明 */}
        {(osdText || osdSubtext) && (
          <div className="border-t border-neutral-800/80 pt-2 space-y-1">
            {osdText && (
              <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{osdText}</span>
              </div>
            )}
            {osdSubtext && (
              <div className="text-[11px] text-neutral-300/90 leading-relaxed">
                {osdSubtext}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
