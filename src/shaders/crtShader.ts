import * as THREE from "three";

export const CRTVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const CRTFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uCurvature;        // 桶形畸变强度 (0.0 - 0.25)
  uniform float uScanlines;        // 扫描线可见度 (0.0 - 1.0)
  uniform float uPhosphor;         // RGB 荧光粉栅格强度
  uniform float uNoise;            // 雪花噪点强度 (0.0 - 1.0)
  uniform float uJitter;           // 水平同步撕裂抖动 (0.0 - 0.2)
  uniform float uGhosting;         // 信号多径重影 (0.0 - 0.5)
  uniform float uPowerTransition;  // 开关机动效进度 (0.0:关机, 1.0:全开)
  uniform vec2 uResolution;

  varying vec2 vUv;

  // 伪随机噪声发生器
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // 桶形曲面畸变
  vec2 barrelDistort(vec2 coord, float amt) {
    vec2 cc = coord - 0.5;
    float dist = dot(cc, cc);
    return coord + cc * dist * amt * 1.8;
  }

  void main() {
    // 1. 开关机关机收缩几何变换 (CRT Collapse Transition)
    // 关机时画面快速被压缩成一条极亮的水平白线，随后横向收缩为中心光斑并逐渐熄灭
    float pt = clamp(uPowerTransition, 0.0001, 1.0);
    vec2 uv = vUv;

    // 当关机过程中：垂直先坍缩，水平随后坍缩
    float scaleY = clamp(pt * 1.5 - 0.05, 0.002, 1.0);
    float scaleX = clamp(pt * 1.2, 0.002, 1.0);

    uv.y = (uv.y - 0.5) / scaleY + 0.5;
    uv.x = (uv.x - 0.5) / scaleX + 0.5;

    // 2. 桶形曲面畸变
    uv = barrelDistort(uv, uCurvature);

    // 边缘黑边裁剪判定（模拟显像管物理边框阴影）
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.015, 0.018, 0.022, 1.0);
      return;
    }

    // 3. 水平同步撕裂与信号抖动 (RF Sync Jitter)
    if (uJitter > 0.001) {
      float lineGlitch = step(0.92, sin(uv.y * 30.0 + uTime * 20.0)) * uJitter;
      uv.x += (hash(vec2(floor(uv.y * 120.0), floor(uTime * 40.0))) - 0.5) * lineGlitch * 0.15;
    }

    // 4. 色差重影与边缘扩散 (Chromatic Aberration & RF Multi-path Ghosting)
    vec2 uvR = uv - vec2(0.0025 * (1.0 + uGhosting * 4.0), 0.0);
    vec2 uvG = uv;
    vec2 uvB = uv + vec2(0.0025 * (1.0 + uGhosting * 4.0), 0.0);

    vec4 texR = texture2D(uTexture, uvR);
    vec4 texG = texture2D(uTexture, uvG);
    vec4 texB = texture2D(uTexture, uvB);

    vec3 color = vec3(texR.r, texG.g, texB.b);

    // 如果有多径重影，叠加一层微弱右移的半透明像
    if (uGhosting > 0.01) {
      vec4 ghost = texture2D(uTexture, uv + vec2(0.035, 0.005));
      color = mix(color, ghost.rgb, uGhosting * 0.4);
    }

    // 5. 模拟电视雪花杂音 (RF Static Snow)
    if (uNoise > 0.001) {
      float snow = hash(uv * 400.0 + fract(uTime * 37.0));
      // 混入雪花
      color = mix(color, vec3(snow), uNoise * 0.95);
    }

    // 6. 特丽珑 RGB 荧光粉栅格 (Aperture Grille Stripes)
    if (uPhosphor > 0.01) {
      float pixelX = uv.x * 640.0;
      float subPixel = mod(floor(pixelX), 3.0);
      vec3 phosphorMask = vec3(0.72);
      if (subPixel < 1.0) {
        phosphorMask = vec3(1.28, 0.68, 0.68); // 红
      } else if (subPixel < 2.0) {
        phosphorMask = vec3(0.68, 1.28, 0.68); // 绿
      } else {
        phosphorMask = vec3(0.68, 0.68, 1.28); // 蓝
      }
      color *= mix(vec3(1.0), phosphorMask, uPhosphor);
    }

    // 7. 真实阴极扫描线 (Scanlines & Beam Roll)
    if (uScanlines > 0.01) {
      float scanline = sin(uv.y * 580.0 + uTime * 4.0) * 0.5 + 0.5;
      scanline = pow(scanline, 1.8);
      color *= (1.0 - uScanlines * 0.22 * (1.0 - scanline));
    }

    // 8. 显像管玻璃暗角与边缘自然衰减 (Vignette)
    float vignette = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y) * 16.0;
    vignette = clamp(pow(vignette, 0.22), 0.0, 1.0);
    color *= (0.75 + 0.25 * vignette);

    // 9. 显像管荧光微光增益 (Phosphor High-voltage Boost)
    color *= 1.14;

    // 10. 关机坍缩光斑高能聚集过曝增强
    if (pt < 0.95) {
      float beamIntensity = 1.0 / (scaleY * 2.0 + 0.05);
      color = mix(color, vec3(1.6, 1.7, 1.9), clamp((1.0 - pt) * 1.5, 0.0, 1.0));
      color *= beamIntensity;
      // 中心余辉光晕
      float distToCenter = length(uv - 0.5);
      color += vec3(0.2, 0.8, 0.5) * exp(-distToCenter * 8.0) * (1.0 - pt) * 0.8;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createCRTMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CRTVertexShader,
    fragmentShader: CRTFragmentShader,
    uniforms: {
      uTexture: { value: null },
      uTime: { value: 0 },
      uCurvature: { value: 0.11 },
      uScanlines: { value: 0.75 },
      uPhosphor: { value: 0.55 },
      uNoise: { value: 0.0 },
      uJitter: { value: 0.0 },
      uGhosting: { value: 0.0 },
      uPowerTransition: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(1024, 768) },
    },
  });
}
