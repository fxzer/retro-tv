import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Channel, TVPowerState } from "../types/tv";
import { RetroTV3D } from "./RetroTV3D";
import { PM5544TestCardEngine } from "../services/testCardGenerator";
import { RetroBroadcastEngine } from "../services/retroBroadcastGenerators";

interface TVSceneProps {
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

export function TVScene({
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
}: TVSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.75, 4.3], fov: 42 }}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    >
      <Suspense fallback={null}>
        <color attach="background" args={["#0b0d10"]} />

        {/* 基础环境漫反射光 */}
        <ambientLight intensity={1.15} color="#fbfbfd" />

        {/* 主台灯暖光投射 (产生机身与桌面阴影) */}
        <directionalLight
          position={[-2.4, 4.5, 3.2]}
          intensity={3.0}
          color="#fff5e8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
        >
          <orthographicCamera attach="shadow-camera" args={[-3, 3, 3, -3, 0.1, 10]} />
        </directionalLight>

        {/* 右上方冷色边缘光，勾勒塑料外壳高光与天线镀铬金属反光 */}
        <directionalLight position={[3.2, 3.4, 1.8]} intensity={1.4} color="#dbeafe" />

        {/* 前方微弱正面柔光 */}
        <directionalLight position={[0, -0.4, 3.2]} intensity={0.4} color="#ffffff" />

        {/* 3D 复古 CRT 电视机主体 */}
        <RetroTV3D
          powerState={powerState}
          channel={channel}
          volume={volume}
          isMuted={isMuted}
          signalQuality={signalQuality}
          isSwitchingChannel={isSwitchingChannel}
          antennaAngleL={antennaAngleL}
          antennaAngleR={antennaAngleR}
          antennaLength={antennaLength}
          testCardEngine={testCardEngine}
          broadcastEngine={broadcastEngine}
          onPowerToggle={onPowerToggle}
          onChannelNext={onChannelNext}
          onChannelPrev={onChannelPrev}
          onVolumeUp={onVolumeUp}
          onVolumeDown={onVolumeDown}
          onAntennaTouch={onAntennaTouch}
        />

        {/* 电视机底部真实接触阴影 (Contact Shadows) */}
        <ContactShadows
          position={[0, -0.81, 0]}
          opacity={0.88}
          scale={6.2}
          blur={1.8}
          far={2.5}
          color="#040507"
        />

        {/* 桌面底板 (深色复古胡桃木桌纹质感) */}
        <mesh position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#161413" roughness={0.78} metalness={0.08} />
        </mesh>

        {/* 3D 自由轨道相机控制 (OrbitControls) */}
        <OrbitControls
          target={[0, 0.12, 0]}
          minDistance={1.8}
          maxDistance={5.5}
          maxPolarAngle={Math.PI / 2 - 0.04}
          minPolarAngle={Math.PI / 8}
          enablePan={false}
          dampingFactor={0.06}
        />
      </Suspense>
    </Canvas>
  );
}
