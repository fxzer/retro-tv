import { useEffect, useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import Hls from "hls.js";
import { Channel, TVPowerState } from "../types/tv";
import { createCRTMaterial } from "../shaders/crtShader";
import { PM5544TestCardEngine } from "../services/testCardGenerator";
import { RetroBroadcastEngine } from "../services/retroBroadcastGenerators";

// ─── MP2 (MPEG-1/2 Audio Layer II) 伴音兼容性降级 ───
// 部分 IPTV 源的 TS 流使用 MP2 音频（stream_type 0x03/0x04）。hls.js 在 Chromium 上只能
// 将其封装为裸 audio/mpeg SourceBuffer；新版 Chrome 无法解码该通道的 Layer II 帧，
// 会导致媒体时钟死锁（seeking 永久为 true、readyState 停在 1、画面永不推进）。
// 解决：一旦检测到死锁，就在会话级让 hls.js 认为 audio/mpeg 不受支持，
// 其 tsdemuxer 会走原生降级路径直接丢弃 MP2 音频轨（视频照常播放）。
// 依据：MediaSource.isTypeSupported 在 hls.js 创建/重置解复用器时被实时调用。
// 会话级策略标记（跨页面刷新持久）：本浏览器已确认 MP2 音频会引发时钟死锁，后续直接走纯视频。
// 注意它与下方 mpegAudioPatchInstalled（页面实例级）是两个概念：刷新后策略仍在，
// 但新页面上的 MediaSource.isTypeSupported 需要重新打补丁。
let mpegAudioBlockedThisSession = false;
try {
  mpegAudioBlockedThisSession = sessionStorage.getItem("rtv_mpeg_audio_blocked") === "1";
} catch {
  /* sessionStorage 不可用时忽略 */
}

// 页面实例级标记：isTypeSupported 补丁只允许真正安装一次（幂等）
let mpegAudioPatchInstalled = false;

function installMpegAudioBlocker() {
  if (mpegAudioPatchInstalled) return;
  mpegAudioPatchInstalled = true;
  mpegAudioBlockedThisSession = true;
  try {
    sessionStorage.setItem("rtv_mpeg_audio_blocked", "1");
  } catch {
    /* ignore */
  }
  const mediaSources = [
    window.MediaSource,
    (window as unknown as { ManagedMediaSource?: typeof MediaSource }).ManagedMediaSource,
  ];
  for (const MS of mediaSources) {
    if (MS && typeof MS.isTypeSupported === "function") {
      const orig = MS.isTypeSupported.bind(MS);
      MS.isTypeSupported = (mime: string) => (/^audio\/mpeg/i.test(String(mime)) ? false : orig(mime));
    }
  }
}

interface CRTScreenProps {
  channel: Channel;
  powerState: TVPowerState;
  signalQuality: number;
  isSwitchingChannel: boolean;
  volume: number;
  isMuted: boolean;
  testCardEngine: PM5544TestCardEngine;
  broadcastEngine: RetroBroadcastEngine;
}

export function CRTScreen({
  channel,
  powerState,
  signalQuality,
  isSwitchingChannel,
  volume,
  isMuted,
  testCardEngine,
  broadcastEngine,
}: CRTScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const crtMaterial = useMemo(() => createCRTMaterial(), []);

  // 调谐状态机：tuning (正在搜台/缓冲), locked (已锁定稳定出帧), error (确认无信号)
  type TunerStatus = "tuning" | "locked" | "error";
  const tunerStatusRef = useRef<TunerStatus>("tuning");
  const tuneStartTimeRef = useRef<number>(performance.now());
  const tuningBlendRef = useRef<number>(1.0);
  const powerTransitionRef = useRef<number>(powerState === "on" ? 1.0 : 0.0);
  // 记录用户是否已在页面产生有效交互（手势/按键），以解禁浏览器原生音频 Autoplay 策略
  const userInteractedRef = useRef<boolean>(false);
  // 卡死自愈：记录上一帧 currentTime 与首次进入停滞的时间戳
  const lastCurrentTimeRef = useRef<number>(-1);
  const stallSinceRef = useRef<number>(-1);
  // MP2 时钟死锁检测：连续处于 seeking 且无帧的起始时间；死锁重启只尝试一次
  const seekDeadlockSinceRef = useRef<number>(-1);
  const deadlockRestartedRef = useRef<boolean>(false);
  const lastChannelKeyRef = useRef<string>("");
  // 频道流是否已成功取回数据（收到过切片）——有数据的流绝不因纯时间超时判死为蓝屏
  const hasDataRef = useRef<boolean>(false);
  // 供死锁检测器触发"无 MP2 降级重启"的信号量
  const [streamReloadTick, setStreamReloadTick] = useState(0);

  // 安全起播辅助函数：遇到浏览器 Autoplay 策略拦截时自动回退为静音保活，保证视频帧持续解码
  const safePlay = (videoEl: HTMLVideoElement | null) => {
    if (!videoEl || powerState !== "on") return;
    if (!userInteractedRef.current) {
      videoEl.muted = true;
    }
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 若因缺少用户交互被拦截，立刻转静音起播保活
        videoEl.muted = true;
        videoEl.play().catch(() => {});
      });
    }
  };

  // 监听首次全局手势事件：用户首次触碰屏幕或按键时解除静音限制，只执行一次，后续拖拽 3D 模型绝不反复打断视频
  useEffect(() => {
    const handleFirstGesture = () => {
      if (userInteractedRef.current) return;
      userInteractedRef.current = true;
      const video = videoRef.current;
      if (video && powerState === "on" && tunerStatusRef.current === "locked") {
        video.muted = isMuted;
        video.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
        video.play().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", handleFirstGesture, { passive: true, once: true });
    window.addEventListener("keydown", handleFirstGesture, { passive: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture);
      window.removeEventListener("keydown", handleFirstGesture);
    };
  }, [powerState, isMuted, volume]);

  // 初始化 DOM video 元素
  useEffect(() => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;
    // 初始以静音启动以绕过浏览器 Autoplay 阻断，实现真正的即开即看
    video.muted = true;
    video.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
    video.style.display = "none";
    video.addEventListener("canplay", () => {
      safePlay(video);
    });
    document.body.appendChild(video);
    videoRef.current = video;

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    videoTextureRef.current = texture;

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.src = "";
      video.remove();
      texture.dispose();
    };
  }, []);

  // 频道实际直播流加载与切换（与 powerState 完全解耦，实现后台预热与常驻保活）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 1. 换台时立即重置调谐态与起始时间戳
    tunerStatusRef.current = "tuning";
    tuningBlendRef.current = 1.0;
    tuneStartTimeRef.current = performance.now();
    video.muted = true;
    lastCurrentTimeRef.current = -1;
    stallSinceRef.current = -1;
    seekDeadlockSinceRef.current = -1;
    // 死锁重启只对同一频道尝试一次；换频道后重新允许检测
    if (lastChannelKeyRef.current !== channel.id) {
      lastChannelKeyRef.current = channel.id;
      deadlockRestartedRef.current = false;
      hasDataRef.current = false;
    }

    // 2. 彻底销毁旧流 Hls 实例
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 3. 彻底重置底层 video 管道：清空 src 并 load()，清空旧频道残存帧、currentTime 与 MSE 缓存
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (channel.isTestCard || !channel.streamUrl) {
      return;
    }

    // 4. 若本会话已确认 MP2 音频死锁，则在创建 Hls 前装好降级补丁（此后 hls.js 丢弃 MP2 音频轨）
    if (mpegAudioBlockedThisSession) {
      installMpegAudioBlocker();
    }

    const streamUrl = channel.streamUrl;
    const isHls = /\.m3u8(?:$|\?)/i.test(streamUrl);

    if (isHls && Hls.isSupported()) {
      // 针对标准 IPTV 直播流（非低延迟 LL-HLS）定制高可靠参数：关闭低延迟模式以杜绝死锁与跳帧
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 10,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        liveSyncDurationCount: 2, // 距直播尾部 2 个分片（约 8 秒），处于 20s 滑动窗口黄金安全区
        liveMaxLatencyDurationCount: 5,
        fragLoadingTimeOut: 15000,
        manifestLoadingTimeOut: 8000,
        levelLoadingTimeOut: 8000,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        safePlay(video);
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        hasDataRef.current = true;
        if (video.paused && powerState === "on") {
          safePlay(video);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              tunerStatusRef.current = "error";
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        }
      });
    } else {
      video.src = streamUrl;
      video.muted = true;
      safePlay(video);
    }
  }, [channel.id, channel.streamUrl, streamReloadTick]);

  // 电源开启或关闭时控制伴音与播放状态
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (powerState === "on") {
      safePlay(video);
      // 若当前已锁定就绪且用户已产生交互，恢复真实伴音
      if (tunerStatusRef.current === "locked" && userInteractedRef.current) {
        video.muted = isMuted;
        video.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
      }
    } else {
      // 关机或待机：静音，保持流在后台接收
      video.muted = true;
    }
  }, [powerState, isMuted, volume]);

  // 创建微凸显像管曲面网格 (Subtle Convex CRT Tube Faceplate)
  const curvedGeometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1.60, 1.20, 32, 24);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // 微弱球面凸起：中心向外突出约 0.045
      const z = -(x * x * 0.035 + y * y * 0.048);
      pos.setZ(i, -z);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  // 每一帧更新 Uniforms 与动画
  useFrame((state, delta) => {
    crtMaterial.uniforms.uTime.value += delta;

    // 平滑开机与关机坍缩过渡 (Power-on expansion & Power-off collapse)
    const targetPt = powerState === "on" ? 1.0 : powerState === "turning_on" ? 0.8 : 0.0;
    const speed = powerState === "turning_off" ? 5.5 : 3.5;
    powerTransitionRef.current = THREE.MathUtils.lerp(
      powerTransitionRef.current,
      targetPt,
      Math.min(1.0, delta * speed)
    );
    crtMaterial.uniforms.uPowerTransition.value = powerTransitionRef.current;

    const video = videoRef.current;
    const elapsed = (performance.now() - tuneStartTimeRef.current) / 1000;

    // 若处于开机状态且视频暂停，自动唤醒起播
    if (powerState === "on" && video && video.paused && video.readyState >= 1) {
      safePlay(video);
    }

    // ─── MP2 时钟死锁检测 ───
    // 指纹：持续 seeking 且 readyState≤1，但 MSE 缓冲区已有数据 → 音频管道无法产出，
    // seek 永远无法完成（Chrome 对裸 audio/mpeg 通道的 MP2 帧解码失败）。
    // 对策：会话级屏蔽 audio/mpeg 后重启本频道管线，hls.js 将丢弃 MP2 音频轨、纯视频起播。
    if (video && video.seeking && video.readyState <= 1 && video.buffered.length > 0) {
      if (seekDeadlockSinceRef.current < 0) {
        seekDeadlockSinceRef.current = performance.now();
      } else if (
        performance.now() - seekDeadlockSinceRef.current > 5000 &&
        !deadlockRestartedRef.current &&
        !channel.isTestCard
      ) {
        deadlockRestartedRef.current = true;
        seekDeadlockSinceRef.current = -1;
        installMpegAudioBlocker();
        // 重置调谐计时，给降级重启留足完整的搜台时间窗口
        tuneStartTimeRef.current = performance.now();
        setStreamReloadTick((t) => t + 1);
        return;
      }
    } else {
      seekDeadlockSinceRef.current = -1;
    }

    // ─── 卡死自愈：currentTime 长时间不推进时，跳过缓冲空洞 ───
    // 场景：音/视频缓冲在分片边界出现微小间隙（如 [.., 52.95] + [53.07, ..]），
    //       媒体时钟冻死在间隙边缘且不再 seeking。主动跳到下一个缓冲区间起点破局。
    if (video && !video.paused && !video.seeking && video.readyState <= 2 && video.buffered.length > 0) {
      const ct = video.currentTime;
      if (Math.abs(ct - lastCurrentTimeRef.current) < 0.05) {
        if (stallSinceRef.current < 0) {
          stallSinceRef.current = performance.now();
        } else if (performance.now() - stallSinceRef.current > 2500) {
          const ranges = video.buffered;
          let target = -1;
          for (let i = 0; i < ranges.length; i++) {
            const s = ranges.start(i);
            const e = ranges.end(i);
            if (ct >= s - 0.05 && ct < e) {
              // 脚下仍有数据：小步微调唤醒解码器
              if (ct < e - 0.25) target = ct + 0.3;
              break;
            }
            if (s > ct + 0.05) {
              // 空洞后的下一个区间：直接跳到其起点
              target = s + 0.1;
              break;
            }
          }
          if (target > 0) {
            video.currentTime = target;
          }
          stallSinceRef.current = -1;
        }
      } else {
        lastCurrentTimeRef.current = ct;
        stallSinceRef.current = -1;
      }
    } else {
      stallSinceRef.current = -1;
    }

    // 宽松判定：视频宽度已知 + readyState>=1 + 不处于 seeking 中 → 帧已可渲染
    // (readyState=1 = HAVE_METADATA, 直播流帧到了但未建立完整缓冲也算 ready)
    const isFrameReady =
      Boolean(video) &&
      video!.videoWidth > 0 &&
      video!.readyState >= 1 &&
      !video!.seeking;

    // 调谐状态转移控制
    if (tunerStatusRef.current === "tuning") {
      // 保持至少 0.45 秒物理调谐手感，当真实新帧完全就绪时平滑锁相锁定
      if (isFrameReady && elapsed >= 0.45) {
        tunerStatusRef.current = "locked";
        if (powerState === "on") {
          if (userInteractedRef.current) {
            video!.muted = isMuted;
            video!.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
          }
          safePlay(video);
        }
      } else if (channel.isTestCard && elapsed >= 0.45) {
        tunerStatusRef.current = "locked";
      } else if (!hasDataRef.current && elapsed > 16.0) {
        // 零数据流入超过 16 秒：上游确实无信号，才判死为蓝屏。
        // 已有切片到达的流绝不因时间流逝判死（交给死锁检测/自愈看门狗处理），
        // 绝对上限 45 秒兜底（覆盖"有数据但两轮调谐均无法出画面"的极端情况）。
        tunerStatusRef.current = "error";
      } else if (hasDataRef.current && elapsed > 45.0) {
        tunerStatusRef.current = "error";
      }
    }

    // 调谐雪花过渡插值：锁相成功后在 200ms 内平滑淡出至 0.0
    const targetBlend = tunerStatusRef.current === "locked" && !isSwitchingChannel ? 0.0 : 1.0;
    tuningBlendRef.current = THREE.MathUtils.lerp(
      tuningBlendRef.current,
      targetBlend,
      Math.min(1.0, delta * 5.5)
    );

    // 贴图源流向：
    // 1. 周二检修彩蛋 -> PM5544 测试卡 CanvasTexture
    // 2. 频道已锁定 (locked) -> 稳定输出 VideoTexture（即使晃动 3D 模型产生微小渲染时差，也绝对不闪烁蓝屏）
    // 3. 调谐搜台或无信号 -> 真实 CRT 显像管暗场与绿色点阵 OSD 调谐画面 / 特丽珑蓝屏
    if (channel.isTestCard) {
      testCardEngine.update();
      crtMaterial.uniforms.uTexture.value = testCardEngine.texture;
    } else if (tunerStatusRef.current === "locked" && videoTextureRef.current) {
      if (isFrameReady) {
        videoTextureRef.current.needsUpdate = true;
      }
      crtMaterial.uniforms.uTexture.value = videoTextureRef.current;
    } else {
      const isError = tunerStatusRef.current === "error";
      broadcastEngine.update(channel, state.clock.getElapsedTime(), true, elapsed, isError);
      crtMaterial.uniforms.uTexture.value = broadcastEngine.texture;
    }

    // 模拟电视高频雪花与水平同步撕裂计算
    const baseNoise = ((100 - signalQuality) / 100) * 0.45;
    const baseJitter = ((100 - signalQuality) / 100) * 0.04;
    const baseGhosting = ((100 - signalQuality) / 100) * 0.2;

    // 调谐时保留纯正复古显像管微噪与扫描质感，彻底消除剧烈撕裂抖动与暴风雪噪波，保证文字清晰平稳
    const tuningNoise = tuningBlendRef.current * 0.08;
    const tuningJitter = tuningBlendRef.current * 0.01;
    const tuningGhosting = tuningBlendRef.current * 0.06;

    crtMaterial.uniforms.uNoise.value = Math.max(baseNoise, tuningNoise);
    crtMaterial.uniforms.uJitter.value = Math.max(baseJitter, tuningJitter);
    crtMaterial.uniforms.uGhosting.value = Math.max(baseGhosting, tuningGhosting);
  });

  return (
    <group position={[0, 0.12, 0.64]}>
      {/* 显像管发光曲面 */}
      <mesh geometry={curvedGeometry} material={crtMaterial} />

      {/* 外层深色微反光厚玻璃罩 (Dark Tinted Protective Outer Glass) */}
      <mesh geometry={curvedGeometry} position={[0, 0, 0.008]}>
        <meshPhysicalMaterial
          color="#12161a"
          transparent
          opacity={0.16}
          roughness={0.06}
          metalness={0.1}
          reflectivity={0.9}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
        />
      </mesh>
    </group>
  );
}
