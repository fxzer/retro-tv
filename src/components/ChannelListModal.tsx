import React, { useState, useEffect } from "react";
import { X, Tv, Play, Plus, Radio, Film, Clapperboard, Sparkles } from "lucide-react";
import { Channel } from "../types/tv";

interface ChannelListModalProps {
  channels: Channel[];
  currentChannel: Channel;
  isOpen: boolean;
  onClose: () => void;
  onSelectChannel: (channel: Channel) => void;
  onAddCustomChannel: (name: string, url: string) => void;
}

export function ChannelListModal({
  channels,
  currentChannel,
  isOpen,
  onClose,
  onSelectChannel,
  onAddCustomChannel,
}: ChannelListModalProps) {
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [autoCloseOnSelect, setAutoCloseOnSelect] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    const name = customName.trim() || `自定义频道 ${channels.length + 1}`;
    onAddCustomChannel(name, customUrl.trim());
    setCustomName("");
    setCustomUrl("");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "live":
        return <Tv className="w-4 h-4 text-emerald-400" />;
      case "retro":
        return <Film className="w-4 h-4 text-amber-400" />;
      case "classic":
        return <Clapperboard className="w-4 h-4 text-blue-400" />;
      case "test":
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
      default:
        return <Radio className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 select-none font-mono transition-all duration-300 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* 遮罩背景：轻量暗场，绝不模糊或遮挡电视机画面，点击电视机区域随时收起抽屉 */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/35 backdrop-blur-[1px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* 右侧抽屉主体 (Right-side Hardware EPG Drawer) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-0 bottom-0 right-0 w-84 sm:w-96 md:w-[410px] max-w-[88vw] h-full bg-[#121418]/95 backdrop-blur-2xl border-l border-neutral-700/60 shadow-[-20px_0_50px_rgba(0,0,0,0.85)] flex flex-col transform transition-transform duration-300 ease-out z-10 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 顶部标题栏 (拟物收音/调谐器铭牌风格) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-gradient-to-r from-[#181b21] via-[#16181d] to-[#121418] relative">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100 tracking-wider flex items-center gap-1.5">
                <span>节目指南</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  EPG
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                共 {channels.length} 个广播频道 · 侧边快速切台
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs transition-colors border border-neutral-700/60 active:scale-95"
              title="关闭节目单 (Esc)"
            >
              <span className="text-[10px] text-neutral-400 font-bold">Esc</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 切换偏好设置条 */}
        <div className="px-5 py-2 border-b border-neutral-800/80 bg-[#14161a] flex items-center justify-between text-[11px] text-neutral-400">
          <span>点击频道实时在电视起播</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-200 transition-colors">
            <input
              type="checkbox"
              checked={autoCloseOnSelect}
              onChange={(e) => setAutoCloseOnSelect(e.target.checked)}
              className="rounded bg-neutral-900 border-neutral-700 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
            />
            <span>选台后收起抽屉</span>
          </label>
        </div>

        {/* 频道列表 */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {channels.map((ch) => {
            const isActive = ch.id === currentChannel.id;
            return (
              <div
                key={ch.id}
                onClick={() => {
                  onSelectChannel(ch);
                  if (autoCloseOnSelect) {
                    onClose();
                  }
                }}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive
                    ? "bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20"
                    : "bg-neutral-900/60 hover:bg-neutral-800/70 border-neutral-800/80 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
                      isActive
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-neutral-800/80 border-neutral-700/60 text-neutral-400 group-hover:text-neutral-200"
                    }`}
                  >
                    {ch.number.toString().padStart(2, "0")}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-200">
                      {getCategoryIcon(ch.category)}
                      <span className="truncate">{ch.name}</span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-normal shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>正在播放</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {ch.description}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-neutral-500 group-hover:text-emerald-400 group-hover:bg-neutral-800"
                    }`}
                  >
                    <Play
                      className={`w-3.5 h-3.5 ${isActive ? "fill-emerald-400 text-emerald-400" : ""}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 自定义直播流输入栏 */}
        <form onSubmit={handleAdd} className="p-3.5 border-t border-neutral-800 bg-[#101215] space-y-2">
          <div className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>接入自定义直播流 (支持 HLS .m3u8 或 .mp4)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="频道名称 (选填)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-1/3 bg-neutral-900/90 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="url"
              placeholder="https://.../stream.m3u8"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              required
              className="flex-1 min-w-0 bg-neutral-900/90 border border-neutral-700/80 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors active:scale-95 whitespace-nowrap shrink-0"
            >
              接入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
