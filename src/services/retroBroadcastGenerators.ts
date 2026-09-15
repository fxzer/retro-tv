import * as THREE from "three";
import { Channel } from "../types/tv";

/**
 * 00年代经典 CRT 显像管高频头调谐与无信号消隐引擎 (Authentic CRT Tuner & Blanking Engine)
 * 彻底杜绝任何伪造节目内容：
 * - 搜台与缓冲期间：纯正显像管暗场光栅 + 绿色荧光点阵 OSD（频道号、真实台标名称、载波频率与调谐进度）
 * - 配合 CRT Fragment Shader 叠加高频 RF 雪花噪点与水平扫描撕裂
 * - 超时或无信号：经典特丽珑纯蓝屏静噪 (Sony Trinitron Blue Screen Mute)
 */
export class RetroBroadcastEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private frame: number = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 768;
    this.ctx = this.canvas.getContext("2d")!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  public update(
    channelOrNumber: Channel | number,
    time: number,
    _isTuning: boolean = true,
    tuningTime: number = 0,
    hasError: boolean = false
  ) {
    this.frame++;
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    const channelNumber =
      typeof channelOrNumber === "number" ? channelOrNumber : channelOrNumber.number;
    const channelName =
      typeof channelOrNumber === "number"
        ? `CH ${channelNumber.toString().padStart(2, "0")}`
        : channelOrNumber.name;

    if (hasError) {
      this.renderBlueScreen(ctx, w, h, channelNumber, channelName);
    } else {
      this.renderTuningScreen(ctx, w, h, channelNumber, channelName, time, tuningTime);
    }

    this.texture.needsUpdate = true;
  }

  /**
   * 经典显像管调谐搜台暗场光栅与绿色点阵 OSD
   */
  private renderTuningScreen(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    chNum: number,
    chName: string,
    t: number,
    tuningTime: number
  ) {
    // 1. 显像管暗场光栅 (Cathode Dark Raster)
    const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7);
    bg.addColorStop(0, "#080e18");
    bg.addColorStop(0.7, "#04070d");
    bg.addColorStop(1, "#020306");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 微弱的显像管底栅扫描细纹
    ctx.fillStyle = "rgba(16, 28, 48, 0.4)";
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }

    // 2. 荧光点阵 OSD 风格参数
    const green = "#34d399";
    const greenGlow = "rgba(52, 211, 153, 0.35)";
    const freq = (168.25 + chNum * 8.0).toFixed(2);

    ctx.save();
    ctx.shadowColor = greenGlow;
    ctx.shadowBlur = 4;

    // 左上角主台标与频道号
    const badgeW = 160;
    const badgeH = 68;
    const padX = 64;
    const padY = 56;

    // 频道号边框盒
    ctx.strokeStyle = green;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(padX, padY, badgeW, badgeH);

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(padX, padY, badgeW, badgeH);

    ctx.fillStyle = green;
    ctx.font = "bold 44px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`CH ${chNum.toString().padStart(2, "0")}`, padX + badgeW / 2, padY + badgeH / 2 + 2);

    // 频道全称
    ctx.textAlign = "left";
    ctx.font = "bold 38px 'SimHei', 'Heiti SC', sans-serif";
    ctx.fillStyle = "#f3f4f6";
    ctx.fillText(chName, padX + badgeW + 28, padY + badgeH / 2 + 4);

    // 射频技术参数栏
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillStyle = "#86efac";
    ctx.fillText(`[ PAL-D/K  VHF-H  ${freq} MHz  NICAM-STEREO ]`, padX, padY + badgeH + 34);

    // 3. 中央搜台状态与锁定指示条 (去除高频刺眼闪烁，保持沉稳扎实的荧光显示)
    const midY = h * 0.52;

    ctx.textAlign = "center";
    ctx.font = "bold 26px 'Courier New', monospace";
    ctx.fillStyle = green;
    ctx.fillText("● 正在调谐载波频率 · TUNING CARRIER...", w / 2, midY - 30);

    // 动态搜索锁定指示条：调谐中呈自然对数渐近推进至 95%，锁相完成前不虚假停留在 100%
    const barTotal = 16;
    const progress = Math.min(0.94, 1.0 - Math.exp(-tuningTime * 1.8));
    const filledBars = Math.floor(progress * barTotal);
    let barStr = "";
    for (let i = 0; i < barTotal; i++) {
      barStr += i <= filledBars ? "■" : "□";
    }

    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.fillStyle = "#6ee7b7";
    ctx.fillText(`SIGNAL LOCK: [ ${barStr} ] ${(progress * 100).toFixed(0)}%`, w / 2, midY + 14);

    // 显像管底部射频提示
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillStyle = "rgba(134, 239, 172, 0.7)";
    ctx.fillText("SONY TRINITRON CATHODE RAY TUBE · AUTO FREQUENCY CONTROL", w / 2, h - 45);

    ctx.restore();
  }

  /**
   * 00年代特丽珑经典纯净静噪深蓝屏 (Sony Trinitron Blue Screen Mute)
   */
  private renderBlueScreen(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    chNum: number,
    chName: string
  ) {
    // 纯正索尼蓝
    ctx.fillStyle = "#001888";
    ctx.fillRect(0, 0, w, h);

    // 顶部台标
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`CH ${chNum.toString().padStart(2, "0")}  ${chName}`, 64, 80);

    // 中央无信号字样
    ctx.textAlign = "center";
    ctx.font = "bold 42px 'SimHei', 'Heiti SC', sans-serif";
    ctx.fillText("【 无信号 / NO SIGNAL 】", w / 2, h / 2 - 20);

    ctx.font = "bold 22px 'SimHei', sans-serif";
    ctx.fillStyle = "#93c5fd";
    ctx.fillText("未检测到当前频点广播载波，请检查天线连接", w / 2, h / 2 + 35);

    ctx.font = "18px 'Courier New', monospace";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText(`FREQUENCY: ${(168.25 + chNum * 8.0).toFixed(2)} MHz · PAL-D/K`, w / 2, h / 2 + 75);

    ctx.restore();
  }
}
