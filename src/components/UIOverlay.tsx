import React from "react";
import { Tv, Volume2, VolumeX, Sparkles, List, Radio, HelpCircle } from "lucide-react";
import { Channel, TVPowerState } from "../types/tv";

interface UIOverlayProps {
  powerState: TVPowerState;
  currentChannel: Channel;
  isMuted: boolean;
  onPowerToggle: () => void;
  onMuteToggle: () => void;
  onOpenGuide: () => void;
  onSelectTestCard: () => void;
}

export function UIOverlay({
  powerState,
  currentChannel,
  isMuted,
  onPowerToggle,
  onMuteToggle,
  onOpenGuide,
  onSelectTestCard,
}: UIOverlayProps) {
  const isPowerOn = powerState === "on" || powerState === "turning_on";

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

        {/* 顶部快捷操作按钮组 */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onSelectTestCard}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-amber-300 border border-amber-500/30 rounded-xl shadow-lg backdrop-blur-md transition-all active:scale-95 text-xs font-bold"
            title="每周二下午电视台检修测试卡"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>CH 99 测试卡</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 rounded-xl shadow-lg backdrop-blur-md transition-all active:scale-95 text-xs font-bold"
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
            title={isMuted ? "取消静音" : "静音"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onPowerToggle}
            className={`px-3.5 py-2 rounded-xl border shadow-lg backdrop-blur-md font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 ${
              isPowerOn
                ? "bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400/50 shadow-emerald-900/40"
                : "bg-red-800/80 hover:bg-red-700 text-white border-red-500/40 shadow-red-900/40"
            }`}
          >
            <span>{isPowerOn ? "TV: 开机" : "TV: 待机"}</span>
          </button>
        </div>
      </div>

      {/* 底部左侧快捷操作说明 */}
      <div className="flex items-end justify-between">
        <div className="pointer-events-auto bg-neutral-900/75 backdrop-blur-md border border-neutral-800/80 px-4 py-2.5 rounded-xl text-neutral-400 text-xs flex items-center gap-3">
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
