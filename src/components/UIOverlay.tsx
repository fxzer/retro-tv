import React from "react";
import { Tv, Volume2, VolumeX, List, HelpCircle } from "lucide-react";
import { Channel } from "../types/tv";

interface UIOverlayProps {
  currentChannel: Channel;
  isMuted: boolean;
  onMuteToggle: () => void;
  onOpenGuide: () => void;
}

export function UIOverlay({
  isMuted,
  onMuteToggle,
  onOpenGuide,
}: UIOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-6 font-mono select-none">
      {/* 顶部信息栏 */}
      <div className="flex items-start justify-between">
        <div className="pointer-events-auto bg-neutral-900/80 backdrop-blur-md border border-neutral-800 px-5 py-3 rounded-2xl shadow-xl space-y-1">
          <div className="flex items-center gap-2.5">
            <Tv className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-white tracking-wider">
              RETRO CRT TV 2000
            </h1>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              3D 拟物
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            00年代索尼特丽珑 · 在线直播电视与原生 Web Audio 音效
          </p>
        </div>

        {/* 顶部快捷操作按钮组：保留节目单与静音快捷键，电视机开关与换台保留实体拟物按键 */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 rounded-xl shadow-lg backdrop-blur-md transition-all active:scale-95 text-xs font-bold"
            title="查看所有电视频道 (快捷键 G)"
          >
            <List className="w-3.5 h-3.5 text-blue-400" />
            <span>节目单</span>
          </button>

          <button
            onClick={onMuteToggle}
            className={`p-2 rounded-xl border shadow-lg backdrop-blur-md transition-all active:scale-95 ${
              isMuted
                ? "bg-red-950/60 border-red-500/40 text-red-400"
                : "bg-neutral-900/80 hover:bg-neutral-800 border-neutral-700/80 text-neutral-200"
            }`}
            title={isMuted ? "取消静音 (快捷键 M)" : "静音 (快捷键 M)"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 底部快捷操作说明：置于右下角避免遮挡左下角实体遥控器 */}
      <div className="flex items-end justify-end">
        <div className="pointer-events-auto bg-neutral-900/75 backdrop-blur-md border border-neutral-800/80 px-4 py-2.5 rounded-xl text-neutral-400 text-xs flex items-center gap-3 shadow-lg">
          <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex gap-4 text-[11px]">
            <span>🖱️ <b>左键拖拽</b> 环绕 3D 电视机</span>
            <span>🔘 <b>滚轮</b> 推进/拉远视角</span>
            <span>📡 <b>拨动天线/滑块</b> 模拟模拟信号雪花与重影</span>
          </div>
        </div>
      </div>
    </div>
  );
}
