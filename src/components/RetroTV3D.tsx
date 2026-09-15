import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Channel, TVPowerState } from "../types/tv";
import { CRTScreen } from "./CRTScreen";
import { PM5544TestCardEngine } from "../services/testCardGenerator";
import { RetroBroadcastEngine } from "../services/retroBroadcastGenerators";

interface RetroTV3DProps {
  powerState: TVPowerState;
  channel: Channel;
  volume: number;
  isMuted: boolean;
  signalQuality: number;
  isSwitchingChannel: boolean;
  antennaAngleL: number;
  antennaAngleR: number;
  antennaLength: number;
  testCardEngine: PM5544TestCardEngine;
  broadcastEngine: RetroBroadcastEngine;
  onPowerToggle: () => void;
  onChannelNext: () => void;
  onChannelPrev: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onAntennaTouch: () => void;
}

/**
 * 绘制 00 年代索尼特丽珑风格金属烫银铭牌
 */
function createTrinitronBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1e2124";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 银色高光边框
  ctx.strokeStyle = "#b0b6bc";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  ctx.fillStyle = "#e6ebf0";
  ctx.font = "bold 34px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SONY", canvas.width / 2, 36);

  ctx.fillStyle = "#a8afb5";
  ctx.font = "italic 20px 'Georgia', serif";
  ctx.fillText("Trinitron  Color TV", canvas.width / 2, 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 绘制前面板丝印标牌 (POWER, CH, VOL, NICAM STEREO)
 */
function createPanelDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4a4f55";
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("STANDBY / POWER", 16, 26);
  ctx.fillText("CH ▲ ▼", 262, 26);
  ctx.fillText("VOL ◀ ▶", 392, 26);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#636a72";
  ctx.fillText("FD TRINITRON · NICAM DIGITAL STEREO · AV MULTI", 16, 110);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function RetroTV3D({
  powerState,
  channel,
  volume,
  isMuted,
  signalQuality,
  isSwitchingChannel,
  antennaAngleL,
  antennaAngleR,
  antennaLength,
  testCardEngine,
  broadcastEngine,
  onPowerToggle,
  onChannelNext,
  onChannelPrev,
  onVolumeUp,
  onVolumeDown,
  onAntennaTouch,
}: RetroTV3DProps) {
  const badgeTexture = useMemo(() => createTrinitronBadgeTexture(), []);
  const panelDecalTexture = useMemo(() => createPanelDecalTexture(), []);

  // 银灰阻燃塑料材质 (00 年代经典质感)
  const chassisMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9ca1a7",
        roughness: 0.42,
        metalness: 0.14,
      }),
    []
  );

  // 屏幕深黑凹槽包边材质 (Bezel)
  const bezelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c1e22",
        roughness: 0.6,
        metalness: 0.08,
      }),
    []
  );

  // 扬声器黑色吸音布面材质
  const speakerClothMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#121417",
        roughness: 0.85,
        metalness: 0.05,
      }),
    []
  );

  // 镀铬高反光金属材质 (天线、旋钮饰圈)
  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e8edf2",
        roughness: 0.12,
        metalness: 0.95,
      }),
    []
  );

  // 深灰阻尼按键与旋钮材质
  const buttonMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#282a2e",
        roughness: 0.5,
        metalness: 0.2,
      }),
    []
  );

  // 橡胶脚垫材质
  const rubberFootMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#141517",
        roughness: 0.9,
        metalness: 0.02,
      }),
    []
  );

  const isPowerOn = powerState === "on" || powerState === "turning_on";

  // 天线微动摆动动画
  const antennaGroupL = useRef<THREE.Group>(null);
  const antennaGroupR = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (antennaGroupL.current) {
      antennaGroupL.current.rotation.z = THREE.MathUtils.lerp(
        antennaGroupL.current.rotation.z,
        antennaAngleL,
        delta * 6
      );
    }
    if (antennaGroupR.current) {
      antennaGroupR.current.rotation.z = THREE.MathUtils.lerp(
        antennaGroupR.current.rotation.z,
        antennaAngleR,
        delta * 6
      );
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================ */}
      {/* 1. 主机外壳前部 (Front Chassis Cabinet) */}
      {/* ============================================================ */}
      <mesh material={chassisMaterial} position={[0, 0.08, 0.35]} castShadow receiveShadow>
        <boxGeometry args={[2.22, 1.70, 0.55]} />
      </mesh>

      {/* 顶部微曲倒角顶盖 */}
      <mesh material={chassisMaterial} position={[0, 0.94, 0.28]} castShadow>
        <boxGeometry args={[2.14, 0.05, 0.62]} />
      </mesh>

      {/* ============================================================ */}
      {/* 2. 经典“大头”显象管锥形后背壳 (Rear CRT Housing & Louvers) */}
      {/* ============================================================ */}
      <mesh material={chassisMaterial} position={[0, 0.12, -0.28]} castShadow receiveShadow>
        <boxGeometry args={[1.72, 1.38, 0.72]} />
      </mesh>
      {/* 电子枪尾部深壳 */}
      <mesh material={chassisMaterial} position={[0, 0.12, -0.74]} castShadow>
        <boxGeometry args={[1.15, 0.95, 0.32]} />
      </mesh>

      {/* 顶部百叶散热排气栅格 (Top Heat Louvers) */}
      <group position={[0, 0.92, -0.15]}>
        {[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x, idx) => (
          <mesh key={idx} material={bezelMaterial} position={[x, 0.015, 0]}>
            <boxGeometry args={[0.12, 0.01, 0.35]} />
          </mesh>
        ))}
      </group>

      {/* 背部散热百叶槽 (Rear Vent Slots) */}
      <group position={[0, 0.16, -0.91]}>
        {[-0.3, -0.15, 0, 0.15, 0.3].map((y, idx) => (
          <mesh key={idx} material={bezelMaterial} position={[0, y, 0]}>
            <boxGeometry args={[0.75, 0.04, 0.02]} />
          </mesh>
        ))}
      </group>

      {/* ============================================================ */}
      {/* 3. 屏幕深黑内嵌边框 (Recessed Screen Bezel) */}
      {/* ============================================================ */}
      <mesh material={bezelMaterial} position={[0, 0.12, 0.62]}>
        <boxGeometry args={[1.68, 1.28, 0.04]} />
      </mesh>

      {/* 3D CRT 显像管曲面屏幕组件 */}
      <CRTScreen
        channel={channel}
        powerState={powerState}
        signalQuality={signalQuality}
        isSwitchingChannel={isSwitchingChannel}
        volume={volume}
        isMuted={isMuted}
        testCardEngine={testCardEngine}
        broadcastEngine={broadcastEngine}
      />

      {/* ============================================================ */}
      {/* 4. 正面下部立体声扬声器横栅 (Stereo Speaker Grilles) */}
      {/* ============================================================ */}
      <group position={[-0.72, -0.60, 0.63]}>
        <mesh material={speakerClothMaterial} position={[0, 0, -0.01]}>
          <planeGeometry args={[0.55, 0.22]} />
        </mesh>
        {[-0.08, -0.04, 0, 0.04, 0.08].map((y, idx) => (
          <mesh key={idx} material={chassisMaterial} position={[0, y, 0.005]}>
            <boxGeometry args={[0.52, 0.018, 0.015]} />
          </mesh>
        ))}
      </group>

      <group position={[0.72, -0.60, 0.63]}>
        <mesh material={speakerClothMaterial} position={[0, 0, -0.01]}>
          <planeGeometry args={[0.55, 0.22]} />
        </mesh>
        {[-0.08, -0.04, 0, 0.04, 0.08].map((y, idx) => (
          <mesh key={idx} material={chassisMaterial} position={[0, y, 0.005]}>
            <boxGeometry args={[0.52, 0.018, 0.015]} />
          </mesh>
        ))}
      </group>

      {/* 居中经典特丽珑 SONY 金属烫银铭牌 */}
      <mesh position={[0, -0.56, 0.635]}>
        <planeGeometry args={[0.34, 0.085]} />
        <meshStandardMaterial map={badgeTexture} roughness={0.3} metalness={0.4} />
      </mesh>

      {/* ============================================================ */}
      {/* 5. 实体物理控制面板 (Physical Buttons, Dials & Dual LEDs) */}
      {/* ============================================================ */}
      <group position={[0, -0.69, 0.635]}>
        {/* 丝印文字底板 */}
        <mesh position={[0, 0.04, 0]}>
          <planeGeometry args={[1.4, 0.06]} />
          <meshBasicMaterial map={panelDecalTexture} transparent opacity={0.85} />
        </mesh>

        {/* --- A. 机械按键：POWER 电源自锁大按键 --- */}
        <group
          position={[-0.55, -0.02, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onPowerToggle();
          }}
        >
          <mesh material={bezelMaterial} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.02, 24]} />
          </mesh>
          <mesh
            material={buttonMaterial}
            position={[0, 0, isPowerOn ? 0.008 : 0.02]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.034, 0.034, 0.025, 24]} />
          </mesh>
          <mesh position={[0, 0, isPowerOn ? 0.022 : 0.034]}>
            <circleGeometry args={[0.012, 16]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>

        {/* --- B. 双色工作状态 LED 指示灯 --- */}
        <group position={[-0.42, -0.02, 0.01]}>
          <mesh>
            <sphereGeometry args={[0.018, 16, 16]} />
            <meshStandardMaterial
              color={isPowerOn ? "#10ff40" : "#ff2525"}
              emissive={isPowerOn ? "#10ff40" : "#ff1515"}
              emissiveIntensity={isPowerOn ? 2.2 : 0.8}
              roughness={0.1}
            />
          </mesh>
          <pointLight
            color={isPowerOn ? "#20ff50" : "#ff3030"}
            intensity={isPowerOn ? 0.45 : 0.18}
            distance={0.22}
            position={[0, 0, 0.03]}
          />
        </group>

        {/* --- C. 阶梯按键：CH+ 与 CH- --- */}
        <group position={[0.22, -0.02, 0]}>
          <mesh
            material={buttonMaterial}
            position={[-0.045, 0, 0.015]}
            onClick={(e) => {
              e.stopPropagation();
              onChannelPrev();
            }}
          >
            <boxGeometry args={[0.055, 0.035, 0.02]} />
          </mesh>
          <mesh
            material={buttonMaterial}
            position={[0.045, 0, 0.015]}
            onClick={(e) => {
              e.stopPropagation();
              onChannelNext();
            }}
          >
            <boxGeometry args={[0.055, 0.035, 0.02]} />
          </mesh>
        </group>

        {/* --- D. 阶梯按键：VOL- 与 VOL+ --- */}
        <group position={[0.48, -0.02, 0]}>
          <mesh
            material={buttonMaterial}
            position={[-0.045, 0, 0.015]}
            onClick={(e) => {
              e.stopPropagation();
              onVolumeDown();
            }}
          >
            <boxGeometry args={[0.055, 0.035, 0.02]} />
          </mesh>
          <mesh
            material={buttonMaterial}
            position={[0.045, 0, 0.015]}
            onClick={(e) => {
              e.stopPropagation();
              onVolumeUp();
            }}
          >
            <boxGeometry args={[0.055, 0.035, 0.02]} />
          </mesh>
        </group>

        {/* --- E. 前置 AV 插孔盖板 --- */}
        <group position={[-0.05, -0.02, 0.01]}>
          <mesh position={[-0.035, 0, 0]}>
            <circleGeometry args={[0.009, 16]} />
            <meshBasicMaterial color="#eab308" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <circleGeometry args={[0.009, 16]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0.035, 0, 0]}>
            <circleGeometry args={[0.009, 16]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>

      {/* ============================================================ */}
      {/* 6. 顶部经典伸缩兔耳天线 (Dual Telescopic Antennas) */}
      {/* ============================================================ */}
      <group
        position={[0, 0.95, -0.25]}
        onClick={(e) => {
          e.stopPropagation();
          onAntennaTouch();
        }}
      >
        <mesh material={bezelMaterial} position={[0, 0.02, 0]}>
          <boxGeometry args={[0.42, 0.04, 0.16]} />
        </mesh>

        {/* 左天线 */}
        <group position={[-0.12, 0.04, 0]}>
          <mesh material={chromeMaterial}>
            <sphereGeometry args={[0.032, 16, 16]} />
          </mesh>
          <group ref={antennaGroupL}>
            <mesh material={chromeMaterial} position={[0, 0.45 * antennaLength, 0]}>
              <cylinderGeometry args={[0.012, 0.015, 0.9 * antennaLength, 16]} />
            </mesh>
            <mesh material={chromeMaterial} position={[0, 1.15 * antennaLength, 0]}>
              <cylinderGeometry args={[0.008, 0.01, 0.7 * antennaLength, 16]} />
            </mesh>
            <mesh material={chromeMaterial} position={[0, 1.52 * antennaLength, 0]}>
              <sphereGeometry args={[0.022, 16, 16]} />
            </mesh>
          </group>
        </group>

        {/* 右天线 */}
        <group position={[0.12, 0.04, 0]}>
          <mesh material={chromeMaterial}>
            <sphereGeometry args={[0.032, 16, 16]} />
          </mesh>
          <group ref={antennaGroupR}>
            <mesh material={chromeMaterial} position={[0, 0.45 * antennaLength, 0]}>
              <cylinderGeometry args={[0.012, 0.015, 0.9 * antennaLength, 16]} />
            </mesh>
            <mesh material={chromeMaterial} position={[0, 1.15 * antennaLength, 0]}>
              <cylinderGeometry args={[0.008, 0.01, 0.7 * antennaLength, 16]} />
            </mesh>
            <mesh material={chromeMaterial} position={[0, 1.52 * antennaLength, 0]}>
              <sphereGeometry args={[0.022, 16, 16]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ============================================================ */}
      {/* 7. 底部防滑软胶脚垫 (Anti-slip Rubber Feet) */}
      {/* ============================================================ */}
      {[
        [-0.85, 0.45],
        [0.85, 0.45],
        [-0.75, -0.45],
        [0.75, -0.45],
      ].map(([x, z], idx) => (
        <mesh
          key={idx}
          material={rubberFootMaterial}
          position={[x, -0.79, z]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.055, 0.065, 0.05, 16]} />
        </mesh>
      ))}
    </group>
  );
}
