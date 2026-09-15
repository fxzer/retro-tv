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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none font-mono"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#181a1e] border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#1e2126]">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-neutral-100 tracking-wider">
              电视节目单 · 频道总览
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 频道列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {channels.map((ch) => {
            const isActive = ch.id === currentChannel.id;
            return (
              <div
                key={ch.id}
                onClick={() => {
                  onSelectChannel(ch);
                  onClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                  isActive
                    ? "bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "bg-neutral-900/60 hover:bg-neutral-800/80 border-neutral-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 text-center font-bold text-lg text-emerald-400">
                    {ch.number.toString().padStart(2, "0")}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 font-bold text-neutral-200">
                      {getCategoryIcon(ch.category)}
                      <span>{ch.name}</span>
                      {isActive && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-normal">
                          正在播放
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">{ch.description}</div>
                  </div>
                </div>

                <div className="text-neutral-500 hover:text-emerald-400 transition-colors pl-2">
                  <Play className={`w-4 h-4 ${isActive ? "text-emerald-400 fill-emerald-400" : ""}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 自定义直播流输入栏 */}
        <form onSubmit={handleAdd} className="p-4 border-t border-neutral-800 bg-[#141619] space-y-2">
          <div className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>输入自定义流媒体 (支持 HLS .m3u8 或 .mp4)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="频道名称 (选填)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-1/3 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="url"
              placeholder="https://.../stream.m3u8"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              required
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors active:scale-95 whitespace-nowrap"
            >
              接入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
