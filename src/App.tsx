import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Channel, TVPowerState } from "./types/tv";
import { DEFAULT_CHANNELS } from "./services/channelManager";
import { PM5544TestCardEngine } from "./services/testCardGenerator";
import { RetroBroadcastEngine } from "./services/retroBroadcastGenerators";
import { tvSoundEngine } from "./audio/tvSoundEngine";
import { TVScene } from "./components/TVScene";
import { ChannelOSD } from "./components/ChannelOSD";
import { RemoteControl } from "./components/RemoteControl";
import { ChannelListModal } from "./components/ChannelListModal";
import { UIOverlay } from "./components/UIOverlay";

export default function App() {
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [currentChannelIndex, setCurrentChannelIndex] = useState<number>(0);
  const [powerState, setPowerState] = useState<TVPowerState>("on");
  const [volume, setVolume] = useState<number>(65);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [signalQuality, setSignalQuality] = useState<number>(96);
  const [isSwitchingChannel, setIsSwitchingChannel] = useState<boolean>(false);
  const [antennaAngleL, setAntennaAngleL] = useState<number>(-0.45);
  const [antennaAngleR, setAntennaAngleR] = useState<number>(0.45);
  const [antennaLength, setAntennaLength] = useState<number>(0.95);

  const [osdText, setOsdText] = useState<string | null>(null);
  const [osdSubtext, setOsdSubtext] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // 初始化 PM5544 测试卡生成引擎与复古广播仿真引擎
  const testCardEngine = useMemo(() => new PM5544TestCardEngine(), []);
  const broadcastEngine = useMemo(() => new RetroBroadcastEngine(), []);

  const currentChannel = channels[currentChannelIndex] || channels[0];
  const isPowerOn = powerState === "on" || powerState === "turning_on";

  // 电源开关切换
  const handlePowerToggle = useCallback(() => {
    if (powerState === "on") {
      setPowerState("turning_off");
      tvSoundEngine.playPowerOff();
      setTimeout(() => {
        setPowerState("off");
      }, 260);
    } else if (powerState === "off") {
      setPowerState("turning_on");
      tvSoundEngine.playPowerOn();
      // 如果当前是测试卡，恢复测试音
      if (currentChannel.isTestCard) {
        tvSoundEngine.playTestTone(true);
      }
      setTimeout(() => {
        setPowerState("on");
      }, 200);
    }
  }, [powerState, currentChannel]);

  // 频道切换
  const switchChannelByIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0) nextIndex = channels.length - 1;
      if (nextIndex >= channels.length) nextIndex = 0;

      const targetChannel = channels[nextIndex];
      setCurrentChannelIndex(nextIndex);
      setIsSwitchingChannel(true);

      tvSoundEngine.playButtonClick("channel");
      tvSoundEngine.playChannelSwitchStatic(0.3);

      // 处理彩蛋频道 99 的 1kHz 测试音
      if (targetChannel.isTestCard && (powerState === "on" || powerState === "turning_on")) {
        tvSoundEngine.playTestTone(true);
      } else {
        tvSoundEngine.playTestTone(false);
      }

      setOsdText(targetChannel.category === "test" ? "停播检修标定" : "实时电视广播");
      setOsdSubtext(targetChannel.description);

      setTimeout(() => {
        setIsSwitchingChannel(false);
      }, 400);
    },
    [channels, powerState]
  );

  const handleChannelNext = useCallback(() => {
    switchChannelByIndex(currentChannelIndex + 1);
  }, [currentChannelIndex, switchChannelByIndex]);

  const handleChannelPrev = useCallback(() => {
    switchChannelByIndex(currentChannelIndex - 1);
  }, [currentChannelIndex, switchChannelByIndex]);

  const handleChannelSelectByNumber = useCallback(
    (num: number) => {
      const idx = channels.findIndex((c) => c.number === num);
      if (idx !== -1) {
        switchChannelByIndex(idx);
      } else {
        // 如果输入未匹配，提示无效频道
        setOsdText(`CH ${num} 无信号`);
        tvSoundEngine.playChannelSwitchStatic(0.35);
      }
    },
    [channels, switchChannelByIndex]
  );

  // 音量调整
  const handleVolumeUp = useCallback(() => {
    setVolume((prev) => {
      const next = Math.min(100, prev + 5);
      tvSoundEngine.playButtonClick("volume");
      tvSoundEngine.setVolume(next);
      return next;
    });
    if (isMuted) {
      setIsMuted(false);
      tvSoundEngine.setMuted(false);
    }
  }, [isMuted]);

  const handleVolumeDown = useCallback(() => {
    setVolume((prev) => {
      const next = Math.max(0, prev - 5);
      tvSoundEngine.playButtonClick("volume");
      tvSoundEngine.setVolume(next);
      return next;
    });
    if (isMuted) {
      setIsMuted(false);
      tvSoundEngine.setMuted(false);
    }
  }, [isMuted]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      tvSoundEngine.playButtonClick("remote");
      tvSoundEngine.setMuted(next);
      return next;
    });
  }, []);

  // 拨动天线交互
  const handleAntennaTouch = useCallback(() => {
    tvSoundEngine.playButtonClick("channel");
    tvSoundEngine.playChannelSwitchStatic(0.2);

    // 随机微调左右天线角度与长度
    const deltaL = (Math.random() - 0.5) * 0.4;
    const deltaR = (Math.random() - 0.5) * 0.4;
    setAntennaAngleL(-0.35 + deltaL);
    setAntennaAngleR(0.35 + deltaR);
    setAntennaLength(0.75 + Math.random() * 0.25);

    // 改变接收信号质量并产生雪花反馈
    const randQuality = Math.floor(65 + Math.random() * 35);
    setSignalQuality(randQuality);
    tvSoundEngine.updateSignalHiss(randQuality);
    setOsdText(`天线接收已校准: ${randQuality}%`);
  }, []);

  // 信号微调滑块
  const handleSignalChange = useCallback((quality: number) => {
    setSignalQuality(quality);
    tvSoundEngine.updateSignalHiss(quality);
  }, []);

  // 添加自定义频道
  const handleAddCustomChannel = useCallback((name: string, url: string) => {
    setChannels((prev) => {
      const newNum = prev.length + 1;
      const newChan: Channel = {
        id: `custom-${Date.now()}`,
        number: newNum,
        name,
        category: "live",
        streamUrl: url,
        description: "用户自定义直播流",
      };
      return [...prev, newChan];
    });
    setOsdText(`已接入自定义流`);
  }, []);

  // 键盘快捷键交互
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handleChannelNext();
          break;
        case "ArrowDown":
          e.preventDefault();
          handleChannelPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleVolumeUp();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleVolumeDown();
          break;
        case "m":
        case "M":
          handleMuteToggle();
          break;
        case "p":
        case "P":
          handlePowerToggle();
          break;
        case "t":
        case "T":
          handleAntennaTouch();
          break;
        case "g":
        case "G":
          setIsGuideOpen((prev) => !prev);
          break;
        default:
          if (e.key >= "1" && e.key <= "9") {
            handleChannelSelectByNumber(Number(e.key));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleChannelNext,
    handleChannelPrev,
    handleVolumeUp,
    handleVolumeDown,
    handleMuteToggle,
    handlePowerToggle,
    handleAntennaTouch,
    handleChannelSelectByNumber,
  ]);

  return (
    <div className="relative w-full h-full bg-[#0a0b0e] overflow-hidden select-none">
      {/* 3D 渲染主视口 */}
      <div className="absolute inset-0 z-0">
        <TVScene
          powerState={powerState}
          channel={currentChannel}
          volume={volume}
          isMuted={isMuted}
          signalQuality={signalQuality}
          isSwitchingChannel={isSwitchingChannel}
          antennaAngleL={antennaAngleL}
          antennaAngleR={antennaAngleR}
          antennaLength={antennaLength}
          testCardEngine={testCardEngine}
          broadcastEngine={broadcastEngine}
          onPowerToggle={handlePowerToggle}
          onChannelNext={handleChannelNext}
          onChannelPrev={handleChannelPrev}
          onVolumeUp={handleVolumeUp}
          onVolumeDown={handleVolumeDown}
          onAntennaTouch={handleAntennaTouch}
        />
      </div>

      {/* 复古荧光 OSD 屏显 */}
      {isPowerOn && !isGuideOpen && (
        <ChannelOSD
          channelNumber={currentChannel.number}
          channelName={currentChannel.name}
          volume={volume}
          isMuted={isMuted}
          signalQuality={signalQuality}
          osdText={osdText}
          osdSubtext={osdSubtext}
        />
      )}

      {/* 顶部与全局 UI 覆盖层 */}
      <UIOverlay
        currentChannel={currentChannel}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* 复古红外实体遥控器 */}
      <RemoteControl
        isPowerOn={isPowerOn}
        volume={volume}
        isMuted={isMuted}
        signalQuality={signalQuality}
        onPowerToggle={handlePowerToggle}
        onChannelNext={handleChannelNext}
        onChannelPrev={handleChannelPrev}
        onChannelSelect={handleChannelSelectByNumber}
        onVolumeUp={handleVolumeUp}
        onVolumeDown={handleVolumeDown}
        onMuteToggle={handleMuteToggle}
        onOpenGuide={() => setIsGuideOpen(true)}
        onAntennaTune={handleAntennaTouch}
        onSignalChange={handleSignalChange}
      />

      {/* 节目单与自定义流弹窗 */}
      <ChannelListModal
        channels={channels}
        currentChannel={currentChannel}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectChannel={(ch) => {
          const idx = channels.findIndex((c) => c.id === ch.id);
          if (idx !== -1) switchChannelByIndex(idx);
        }}
        onAddCustomChannel={handleAddCustomChannel}
      />
    </div>
  );
}
