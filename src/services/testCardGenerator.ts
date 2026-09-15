import * as THREE from "three";

/**
 * 经典【周二下午电视台检修彩色圆盘测试卡】(Philips PM5544 标准中国电视台版)
 * 使用 HTML5 2D Canvas 纯代码动态绘制，包含：
 * 1. 经典网格标线底图与几何定位边角标
 * 2. 巨型中央校准圆盘与黑白格阵列
 * 3. EBU 标准彩条测试块（黄、青、绿、品红、红、蓝）
 * 4. 五阶标准阶梯灰度带 (0%, 25%, 50%, 75%, 100%)
 * 5. 多频多波段高频解像力测试栅线
 * 6. “中央电视台 CCTV” 经典台标字样与实时动态数字时钟 (HH:MM:SS)
 */
export class PM5544TestCardEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private lastSecond: number = -1;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 768;
    this.ctx = this.canvas.getContext("2d")!;

    this.renderTestCard();

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  public update(): boolean {
    const now = new Date();
    const currentSecond = now.getSeconds();
    if (currentSecond !== this.lastSecond) {
      this.lastSecond = currentSecond;
      this.renderTestCard();
      this.texture.needsUpdate = true;
      return true;
    }
    return false;
  }

  private renderTestCard() {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = h * 0.44; // 半径约 338px

    // 1. 背景底色：标准 50% 电视中性灰
    ctx.fillStyle = "#686a6d";
    ctx.fillRect(0, 0, w, h);

    // 2. 绘制 4:3 电视网格底纹
    ctx.strokeStyle = "#404245";
    ctx.lineWidth = 2;
    const gridSize = 64;
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 3. 四角几何安全区标线
    ctx.fillStyle = "#ffffff";
    const cornerSize = 28;
    // 顶左、顶右、底左、底右十字线
    ctx.fillRect(40, 40, cornerSize, 4);
    ctx.fillRect(40, 40, 4, cornerSize);
    ctx.fillRect(w - 40 - cornerSize, 40, cornerSize, 4);
    ctx.fillRect(w - 44, 40, 4, cornerSize);
    ctx.fillRect(40, h - 44, cornerSize, 4);
    ctx.fillRect(40, h - 40 - cornerSize, 4, cornerSize);
    ctx.fillRect(w - 40 - cornerSize, h - 44, cornerSize, 4);
    ctx.fillRect(w - 44, h - 40 - cornerSize, 4, cornerSize);

    // 4. 绘制中心大圆盘剪裁区
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // 大圆盘灰色底
    ctx.fillStyle = "#707376";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // 圆盘黑色外边框环
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 14;
    ctx.stroke();

    // 5. 顶端黑白交替方格 (Checkerboard)
    const topBoxY = cy - r + 14;
    const topBoxHeight = 56;
    const checkWidth = (r * 2) / 16;
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#000000" : "#ffffff";
      ctx.fillRect(cx - r + i * checkWidth, topBoxY, checkWidth + 1, topBoxHeight);
    }

    // 6. 电视台顶端标牌栏："中央电视台 CCTV"
    const titleY = topBoxY + topBoxHeight;
    const titleHeight = 50;
    ctx.fillStyle = "#000000";
    ctx.fillRect(cx - r, titleY, r * 2, titleHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px 'SimHei', 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("中 央 电 视 台  C C T V", cx, titleY + titleHeight / 2);

    // 7. EBU 彩色横条 (Color Bars: 黄、青、绿、品红、红、蓝)
    const colorBarY = titleY + titleHeight;
    const colorBarHeight = 90;
    const colors = [
      "#ffff00", // Yellow
      "#00ffff", // Cyan
      "#00ff00", // Green
      "#ff00ff", // Magenta
      "#ff0000", // Red
      "#0000ff", // Blue
    ];
    const barWidth = (r * 1.7) / colors.length;
    const colorStartX = cx - (r * 1.7) / 2;

    // 彩条两侧黑色衬底
    ctx.fillStyle = "#000000";
    ctx.fillRect(cx - r, colorBarY, r * 2, colorBarHeight);

    colors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(colorStartX + idx * barWidth, colorBarY, barWidth + 1, colorBarHeight);
    });

    // 8. 中央信息栏与实时数字时钟 (HH:MM:SS)
    const clockY = colorBarY + colorBarHeight;
    const clockHeight = 58;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - r, clockY, r * 2, clockHeight);

    // 时钟两边黑色方块
    ctx.fillStyle = "#000000";
    ctx.fillRect(cx - r, clockY, 70, clockHeight);
    ctx.fillRect(cx + r - 70, clockY, 70, clockHeight);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    ctx.fillStyle = "#000000";
    ctx.font = "bold 34px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`周二检修 · ${timeStr}`, cx, clockY + clockHeight / 2);

    // 9. 五级阶梯灰度阶 (Grayscale Step Wedge: 0%, 25%, 50%, 75%, 100%)
    const grayY = clockY + clockHeight;
    const grayHeight = 56;
    const grayTones = ["#000000", "#404040", "#808080", "#c0c0c0", "#ffffff"];
    const stepWidth = (r * 1.7) / grayTones.length;
    const grayStartX = cx - (r * 1.7) / 2;

    ctx.fillStyle = "#000000";
    ctx.fillRect(cx - r, grayY, r * 2, grayHeight);

    grayTones.forEach((g, idx) => {
      ctx.fillStyle = g;
      ctx.fillRect(grayStartX + idx * stepWidth, grayY, stepWidth + 1, grayHeight);
    });

    // 10. 高频解像力测试栅线 (Multi-burst Sine Grating)
    const burstY = grayY + grayHeight;
    const burstHeight = 62;
    ctx.fillStyle = "#000000";
    ctx.fillRect(cx - r, burstY, r * 2, burstHeight);

    // 绘制 5 组不同频率的黑白相间密集扫描竖线
    const burstWidth = (r * 1.7) / 5;
    const frequencies = [4, 8, 14, 20, 28]; // 线条密度
    frequencies.forEach((freq, idx) => {
      const start = grayStartX + idx * burstWidth;
      const step = burstWidth / freq;
      for (let k = 0; k < freq; k++) {
        ctx.fillStyle = k % 2 === 0 ? "#ffffff" : "#000000";
        ctx.fillRect(start + k * step, burstY, step + 0.5, burstHeight);
      }
    });

    // 11. 底端标牌栏："PM 5544 TEST PATTERN"
    const bottomBoxY = burstY + burstHeight;
    const bottomBoxHeight = 50;
    ctx.fillStyle = "#000000";
    ctx.fillRect(cx - r, bottomBoxY, r * 2, bottomBoxHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px 'Courier New', Courier, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("COLOR BAR · PAL-D/K · 1000Hz", cx, bottomBoxY + bottomBoxHeight / 2);

    ctx.restore();

    // 12. 绘制圆盘外围黑边金边保护框
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1a1a1a";
    ctx.stroke();

    // 屏幕中央微小红色校准十字光标 (Red Crosshairs)
    ctx.strokeStyle = "rgba(255, 0, 0, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy);
    ctx.lineTo(cx + 24, cy);
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx, cy + 24);
    ctx.stroke();
  }
}
