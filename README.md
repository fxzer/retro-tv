# 📺 Retro CRT TV 2000 (00年代复古特丽珑 CRT 电视机)

> **拟物硬件第二期**：3D 拟物索尼特丽珑纯平显像管彩色电视机，嵌入**此时此刻真实电视频道在线直播**与纯原生 Web Audio 算法音效。

[![Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-f38020?logo=cloudflare)](https://retro-tv.pages.dev/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r163-black?logo=three.js)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🌐 **在线体验 (Online Demo)**: [https://retro-tv.pages.dev/](https://retro-tv.pages.dev/)

---

## ✨ 核心特性

### 1. 3D 特丽珑显像管硬件拟物建模
- **索尼 Trinitron 经典造型**：复刻 00 年代经典银灰阻燃抗磨塑料外壳、下沉咬合式纯平凸面微曲显像管、后部锥形高压电子枪座与散热百叶格栅；
- **实体交互机构**：
  - 自锁式机械 **POWER** 开关（按下开机、弹起关机）；
  - 双色工作指示灯（开机为翡翠绿环境泛光，关机为待机宝石红）；
  - 金属折叠伸缩 **V 型天线**，支持 3D 自由拨动调整仰角与长度，动态影响画面接收雪花点；
  - 经典前置烫银铭牌与 AV 黄白红输入插孔。

### 2. 真实电视频道在线直播（杜绝预录与虚构）
- **此时此刻真实电视广播**：屏幕中播出的正是此时此刻全国正在放送的真实电视信号；
- **20+ 频道实时矩阵**：
  - **CCTV-1 至 CCTV-17 央视全系列**（CCTV-1 综合、CCTV-2 财经、CCTV-5 体育、CCTV-6 电影、CCTV-13 新闻等）；
  - **各大一线卫视**（湖南卫视、浙江卫视、江苏卫视、东方卫视、北京卫视等）；
- **【经典彩蛋】周二下午检修测试卡**：CH 99 完整复刻 90/00 年代中国电视台周二停播检修标准 Philips PM5544 彩色圆盘测试图与 1000Hz 纯单音测试音。

### 3. 通用真实物理电视换台体系 (Authentic RF Tuner Transition)
- **瞬态射频雪花与同步撕裂**：切台瞬间伴随高频 RF 白噪声雪花（`uNoise: 0.96`）与水平同步扫描线抖动（`uJitter: 0.16`）；
- **荧光绿点阵 OSD**：显像管屏幕内嵌呈现经典点阵参数（`[ CH 02 ] CCTV-2 财经频道`、`PAL-D/K  184.25 MHz`、`TUNING CARRIER...` 锁定指示条）；
- **信号锁定与平滑淡出**：流媒体就绪后雪花在 200ms 内平滑淡出，真实电视画面与原声伴音自然接续，杜绝任何串音与虚假内容。

### 4. CRT 物理发光着色器 (Custom GLSL CRT Shader)
- **光学桶形曲面畸变 (Barrel Distortion)**：模拟球面显像管厚玻璃折射；
- **阴极扫描线 (Scanlines)**：精确模拟 15.625kHz (PAL-D/K) 行频交替明暗扫描线；
- **特丽珑垂直荧光粉栅格 (Aperture Grille)**：模拟每组红、绿、蓝垂直微细物理像素条纹；
- **经典关机塌缩特效 (Power-Off Beam Collapse)**：关机瞬间画面急速塌缩为一道高亮白线，随后横向收缩为中心光斑余辉并缓缓熄灭。

### 5. 纯原生 Web Audio 算法物理合成（零外部音频文件）
- **开机消磁轰鸣 (Degauss Thump-Bong)**：50Hz/108Hz 强电容消磁线圈电磁冲击脉冲；
- **15.625kHz 行频回扫高频啸叫**：模拟老显像管通电后的标志性微弱晶振啸叫；
- **机械微动按键音**：开关自锁机构弹力与按键触感；
- **换台射频杂音 (RF Static Hiss)**：1600Hz 带通白噪声突发；
- **彩蛋 1000Hz 纯正弦测试音**：广播电视台标准测试音频。

---

## 🛠 技术栈

| 领域 | 选型 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | React 18 + TypeScript + Vite 5 | 现代前端工程脚手架 |
| **3D 引擎** | Three.js + @react-three/fiber + @react-three/drei | 3D 拟物与材质管线 |
| **流媒体协议** | Hls.js | 广播电视 HLS (m3u8/TS) 实时切片流解码 |
| **边缘服务** | Cloudflare Pages + `cloudflare:sockets` | 边缘 TCP 代理转发国内 IPTV 流 |
| **音频合成** | Native Web Audio API | 100% 原生纯算法声学合成 |
| **样式与图标** | Tailwind CSS + Lucide React | 拟物遥控器与 OSD 屏幕界面 |

---

## 🚀 本地开发

```bash
# 1. 克隆代码仓库
git clone https://github.com/fxzer/retro-tv.git
cd retro-tv

# 2. 安装项目依赖
npm install

# 3. 启动本地开发服务（自带 HLS 反向代理）
npm run dev

# 4. 在浏览器中打开 http://localhost:3001/
```

---

## ☁️ 部署到 Cloudflare Pages

本项目通过 `functions/live-stream/[[catchall]].ts` 结合 `cloudflare:sockets` 原生 TCP 管道，在 Cloudflare Edge 上无缝代理 HLS 直播切片，自动注入 CORS 标头并规避 HTTPS Mixed Content 限制。

```bash
# 构建并部署
npm run build
npx wrangler pages deploy dist --project-name retro-tv --branch main
```

---

## 📄 开源许可

本项目遵循 [MIT License](LICENSE) 许可协议。
