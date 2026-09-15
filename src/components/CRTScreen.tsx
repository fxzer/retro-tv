import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import Hls from "hls.js";
import { Channel, TVPowerState } from "../types/tv";
import { createCRTMaterial } from "../shaders/crtShader";
import { PM5544TestCardEngine } from "../services/testCardGenerator";
import { RetroBroadcastEngine } from "../services/retroBroadcastGenerators";

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

  // 物理显像管高频头调谐状态控制
  const isTuningRef = useRef<boolean>(true);
  const tuneStartTimeRef = useRef<number>(performance.now());
  const tuningBlendRef = useRef<number>(1.0);
  const powerTransitionRef = useRef<number>(powerState === "on" ? 1.0 : 0.0);

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
      video.play().catch(() => {});
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

    // 换台时进入调谐雪花态，先静音避免杂音泄露
    isTuningRef.current = true;
    tuningBlendRef.current = 1.0;
    tuneStartTimeRef.current = performance.now();
    video.muted = true;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (channel.isTestCard || !channel.streamUrl) {
      video.pause();
      return;
    }

    const streamUrl = channel.streamUrl;
    const isHls = /\.m3u8(?:$|\?)/i.test(streamUrl);

    if (isHls && Hls.isSupported()) {
      // 方案 B：Hls.js 极速起播参数深度优化
      const hls = new Hls({
        enableWorker: true, // 启用 Worker 异步解复用，消除主线程卡顿
        lowLatencyMode: true,
        liveSyncDurationCount: 1, // 立即从首个分片起播，无需等待积攒 3 个分片
        liveMaxLatencyDurationCount: 3,
        maxBufferLength: 4, // 快速轻量缓冲
        maxMaxBufferLength: 8,
        initialLiveManifestSize: 1,
        fragLoadingTimeOut: 6000,
        manifestLoadingTimeOut: 4000,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // 静默预加载起播
        video.muted = true;
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        // 分片缓冲就绪后触发播放
        if (video.paused) {
          video.play().catch(() => {});
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
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        }
      });
    } else {
      video.src = streamUrl;
      video.muted = true;
      video.play().catch(() => {});
    }
  }, [channel.id, channel.streamUrl]);

  // 电源开启或关闭时控制伴音与播放状态（方案 A：不销毁流，常驻保活）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (powerState === "on") {
      video.play().catch(() => {});
      // 若当前未在换台调谐中，恢复真实伴音
      if (!isTuningRef.current) {
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
      video.play().catch(() => {});
    }

    // 真实电视频道实时流是否就绪出帧（尺寸存在且已产生当前帧数据）
    const hasLiveVideo =
      Boolean(video) &&
      video!.videoWidth > 0 &&
      (video!.readyState >= 2 || video!.currentTime > 0) &&
      !channel.isTestCard &&
      Boolean(channel.streamUrl);

    // 最小物理调谐过渡时间 0.35 秒，确保模拟高频头切换手感
    if (hasLiveVideo && elapsed >= 0.35) {
      if (isTuningRef.current) {
        isTuningRef.current = false;
        // 信号锁定完毕，若当前处于开机状态，确保起播并恢复广播伴音
        if (powerState === "on") {
          video!.play().catch(() => {});
          video!.muted = isMuted;
          video!.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
        }
      }
    } else if (channel.isTestCard && elapsed >= 0.35) {
      if (isTuningRef.current) {
        isTuningRef.current = false;
      }
    }

    // 调谐雪花过渡插值：调谐中为 1.0，锁相成功后在 200ms 内平滑淡出至 0.0
    const targetBlend = isTuningRef.current || isSwitchingChannel ? 1.0 : 0.0;
    tuningBlendRef.current = THREE.MathUtils.lerp(
      tuningBlendRef.current,
      targetBlend,
      Math.min(1.0, delta * 5.5)
    );

    // 贴图源流向：
    // 1. 周二检修彩蛋 -> PM5544 测试卡 CanvasTexture
    // 2. 真实电视频道流已锁定就绪 -> 真实 VideoTexture
    // 3. 换台过渡期或等待视频出帧 -> 通用 CRT 显像管暗场与绿色点阵 OSD 调谐画面（杜绝任何假造内容）
    if (channel.isTestCard) {
      testCardEngine.update();
      crtMaterial.uniforms.uTexture.value = testCardEngine.texture;
    } else if (!isTuningRef.current && hasLiveVideo && videoTextureRef.current) {
      videoTextureRef.current.needsUpdate = true;
      crtMaterial.uniforms.uTexture.value = videoTextureRef.current;
    } else {
      const hasError = elapsed > 8.0;
      broadcastEngine.update(channel, state.clock.getElapsedTime(), isTuningRef.current, elapsed, hasError);
      crtMaterial.uniforms.uTexture.value = broadcastEngine.texture;
    }

    // 模拟电视高频雪花与水平同步撕裂计算
    const baseNoise = ((100 - signalQuality) / 100) * 0.65;
    const baseJitter = ((100 - signalQuality) / 100) * 0.12;
    const baseGhosting = ((100 - signalQuality) / 100) * 0.4;

    const tuningNoise = tuningBlendRef.current * 0.96;
    const tuningJitter = tuningBlendRef.current * 0.16;
    const tuningGhosting = tuningBlendRef.current * 0.35;

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
