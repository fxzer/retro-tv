import React, { useState } from "react";
import {
  Power,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Tv,
  List,
  Sliders,
  RotateCcw,
  Sparkles,
  Radio,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { tvSoundEngine } from "../audio/tvSoundEngine";

interface RemoteControlProps {
  isPowerOn: boolean;
  volume: number;
  isMuted: boolean;
  signalQuality: number;
  onPowerToggle: () => void;
  onChannelNext: () => void;
  onChannelPrev: () => void;
  onChannelSelect: (num: number) => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onMuteToggle: () => void;
  onOpenGuide: () => void;
  onAntennaTune: () => void;
  onSignalChange: (val: number) => void;
}

export function RemoteControl({
  isPowerOn,
  volume,
  isMuted,
  signalQuality,
  onPowerToggle,
  onChannelNext,
  onChannelPrev,
  onChannelSelect,
  onVolumeUp,
  onVolumeDown,
  onMuteToggle,
  onOpenGuide,
  onAntennaTune,
  onSignalChange,
}: RemoteControlProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isIrLedActive, setIsIrLedActive] = useState(false);

  // 触发红外发射灯闪烁与按键音
  const triggerButton = (callback: () => void) => {
    tvSoundEngine.playButtonClick("remote");
    setIsIrLedActive(true);
    setTimeout(() => setIsIrLedActive(false), 120);
    callback();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-30 select-none">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-xl shadow-2xl backdrop-blur-md transition-all active:scale-95 group font-mono text-xs"
        >
          <Radio className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
          <span>复古遥控器</span>
          <Maximize2 className="w-3.5 h-3.5 text-neutral-400 ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-30 select-none font-mono">
      {/* 遥控器外壳 */}
      <div className="w-64 bg-gradient-to-b from-[#22252a] via-[#1a1c20] to-[#121316] text-neutral-200 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-neutral-700/60 backdrop-blur-md relative">
        {/* 顶部红外发射灯 (IR Blaster) */}
        <div className="flex justify-between items-center mb-3 px-1 border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full border border-neutral-600 transition-colors ${
                isIrLedActive
                  ? "bg-red-500 shadow-[0_0_12px_#ff0000]"
                  : "bg-red-950/60"
              }`}
            />
            <span className="text-[10px] tracking-widest text-neutral-400 font-bold uppercase">
              SONY RM-905
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
            title="最小化遥控器"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 顶部主键区：POWER 与 MUTE */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => triggerButton(onPowerToggle)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md ${
              isPowerOn
                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/40"
                : "bg-red-800/80 hover:bg-red-700 text-red-100"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>POWER</span>
          </button>

          <button
            onClick={() => triggerButton(onMuteToggle)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md ${
              isMuted
                ? "bg-amber-600 text-white shadow-amber-900/40"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isMuted ? "MUTED" : "MUTE"}</span>
          </button>
        </div>

        {/* 经典九宫格数字按键 */}
        <div className="grid grid-cols-3 gap-2 mb-4 bg-neutral-900/60 p-2.5 rounded-2xl border border-neutral-800/80">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
            <button
              key={num}
              onClick={() => triggerButton(() => onChannelSelect(num))}
              className="py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm border border-neutral-700/40"
            >
              {num}
            </button>
          ))}
          {/* 8, 9 占位 */}
          <button
            onClick={() => triggerButton(() => onChannelSelect(1))}
            className="py-2 bg-neutral-800/40 text-neutral-500 rounded-lg text-sm font-bold border border-neutral-800/40"
          >
            8
          </button>
          <button
            onClick={() => triggerButton(() => onChannelSelect(1))}
            className="py-2 bg-neutral-800/40 text-neutral-500 rounded-lg text-sm font-bold border border-neutral-800/40"
          >
            9
          </button>
          {/* 0 */}
          <button
            onClick={() => triggerButton(() => onChannelSelect(1))}
            className="py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 rounded-lg text-sm font-bold transition-all active:scale-95 border border-neutral-700/40"
          >
            0
          </button>
          {/* 彩蛋频道 99 */}
          <button
            onClick={() => triggerButton(() => onChannelSelect(99))}
            className="col-span-2 py-2 bg-gradient-to-r from-amber-600/80 to-yellow-600/80 hover:from-amber-500 hover:to-yellow-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-md flex items-center justify-center gap-1 border border-yellow-500/40"
            title="彩蛋：周二下午检修测试卡"
          >
            <Sparkles className="w-3 h-3 text-yellow-200" />
            <span>CH 99 周二检修</span>
          </button>
        </div>

        {/* 频道与音量摇杆区 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* 频道切换 */}
          <div className="bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800 flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-neutral-400 font-bold">CHANNEL</span>
            <button
              onClick={() => triggerButton(onChannelNext)}
              className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 rounded-lg flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => triggerButton(onChannelPrev)}
              className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 rounded-lg flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* 音量控制 */}
          <div className="bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800 flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-neutral-400 font-bold">VOLUME</span>
            <button
              onClick={() => triggerButton(onVolumeUp)}
              className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 rounded-lg flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => triggerButton(onVolumeDown)}
              className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 rounded-lg flex items-center justify-center transition-all active:scale-95"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 底部功能栏：节目单、天线微调与无线信号滑块 */}
        <div className="space-y-2 pt-1 border-t border-neutral-800">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => triggerButton(onOpenGuide)}
              className="flex items-center justify-center gap-1.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[11px] font-bold transition-all active:scale-95 border border-neutral-700/40"
            >
              <List className="w-3.5 h-3.5 text-blue-400" />
              <span>节目列表</span>
            </button>
            <button
              onClick={() => triggerButton(onAntennaTune)}
              className="flex items-center justify-center gap-1.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[11px] font-bold transition-all active:scale-95 border border-neutral-700/40"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>拨动天线</span>
            </button>
          </div>

          {/* 无线天线信号微调滑块 (RF Fine Tune Slider) */}
          <div className="bg-neutral-900/90 px-3 py-2 rounded-xl border border-neutral-800 text-[10px]">
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>天线信号微调</span>
              <span className={signalQuality < 60 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                {signalQuality}%
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="100"
              value={signalQuality}
              onChange={(e) => onSignalChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
