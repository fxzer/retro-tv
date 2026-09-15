/**
 * 00年代复古 CRT 电视机原生 Web Audio 音效引擎
 * 零外部音频文件依赖，纯物理声学算法合成：
 * 1. 开机消磁大线圈冲击音 (Degauss Thump-Bong)
 * 2. 15.625kHz 行频回扫高频晶振啸叫 (Flyback Transformer Squeal)
 * 3. 显像管高压静电吸附噼啪声 (CRT High-Voltage Crackle)
 * 4. 换台雪花杂音 (RF Static Hiss)
 * 5. 机械实体按键脆响 (Tactile Switch Clack)
 * 6. 彩蛋频道 99：1000Hz 电视台标准正弦测试音 (1kHz Test Tone)
 */
class RetroTVSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.7;

  // 持续性音效节点
  private flybackOsc: OscillatorNode | null = null;
  private flybackGain: GainNode | null = null;
  private testToneOsc: OscillatorNode | null = null;
  private testToneGain: GainNode | null = null;
  private rfNoiseNode: AudioBufferSourceNode | null = null;
  private rfNoiseGain: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.flybackGain) {
      this.flybackGain.gain.setValueAtTime(muted ? 0 : 0.018, this.ctx ? this.ctx.currentTime : 0);
    }
    if (this.testToneGain && muted) {
      this.testToneGain.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
    }
  }

  public setVolume(vol: number) {
    // vol 0 - 100
    this.masterVolume = Math.max(0, Math.min(1, vol / 100));
    if (this.testToneGain && !this.isMuted) {
      const targetGain = 0.12 * this.masterVolume;
      this.testToneGain.gain.setTargetAtTime(targetGain, this.ctx ? this.ctx.currentTime : 0, 0.05);
    }
  }

  /**
   * 1. 经典开机消磁与高压启动音
   * 真实 CRT 开机时的“咚——嗡”消磁继电器声 + 15.625kHz 行频回扫啸叫 + 屏幕表面高压静电吸附轻响
   */
  public playPowerOn() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // --- A. 消磁线圈强脉冲 (Degaussing Coil "THUMP-WHUMMM") ---
      // 50Hz 主基频衰减 + 120Hz 铁芯电磁微震
      const degaussOsc1 = ctx.createOscillator();
      const degaussOsc2 = ctx.createOscillator();
      const degaussGain = ctx.createGain();

      degaussOsc1.type = "sine";
      degaussOsc2.type = "sine";
      degaussOsc1.frequency.setValueAtTime(54, now);
      degaussOsc1.frequency.exponentialRampToValueAtTime(42, now + 1.1);
      degaussOsc2.frequency.setValueAtTime(108, now);
      degaussOsc2.frequency.exponentialRampToValueAtTime(84, now + 0.9);

      degaussGain.gain.setValueAtTime(0.85 * this.masterVolume, now);
      degaussGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      degaussOsc1.connect(degaussGain);
      degaussOsc2.connect(degaussGain);
      degaussGain.connect(ctx.destination);

      degaussOsc1.start(now);
      degaussOsc2.start(now);
      degaussOsc1.stop(now + 1.25);
      degaussOsc2.stop(now + 1.25);

      // --- B. 玻璃表面高压静电噼啪微爆 (Static Charge Crackle) ---
      const crackleLength = ctx.sampleRate * 0.4;
      const crackleBuffer = ctx.createBuffer(1, crackleLength, ctx.sampleRate);
      const crackleData = crackleBuffer.getChannelData(0);
      for (let i = 0; i < crackleLength; i++) {
        // 稀疏随机脉冲
        crackleData[i] = Math.random() > 0.94 ? (Math.random() * 2 - 1) * 0.5 : 0;
      }
      const crackleSource = ctx.createBufferSource();
      crackleSource.buffer = crackleBuffer;

      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = "highpass";
      crackleFilter.frequency.setValueAtTime(3200, now);

      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(0.4 * this.masterVolume, now + 0.15);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      crackleSource.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(ctx.destination);

      crackleSource.start(now + 0.15);
      crackleSource.stop(now + 0.6);

      // --- C. 15.625kHz 行频回扫高频晶振啸叫 (PAL 行频) ---
      this.startFlybackWhine();
    } catch {
      // 忽略未交互时的静默拦截
    }
  }

  /**
   * 启动特丽珑 15.625kHz 行频回扫轻微啸叫（真实 CRT 独特标志，低电平但极富拟物灵魂）
   */
  private startFlybackWhine() {
    try {
      if (this.flybackOsc) return;
      const ctx = this.getContext();
      const now = ctx.currentTime;

      this.flybackOsc = ctx.createOscillator();
      this.flybackGain = ctx.createGain();

      this.flybackOsc.type = "sine";
      // 国际标准 PAL-D/K 电视行频 15625 Hz
      this.flybackOsc.frequency.setValueAtTime(15625, now);

      // 微弱背景音量，不刺耳但营造真实显像管环绕感
      const initialGain = this.isMuted ? 0 : 0.014 * this.masterVolume;
      this.flybackGain.gain.setValueAtTime(0.0001, now);
      this.flybackGain.gain.exponentialRampToValueAtTime(initialGain, now + 0.8);

      this.flybackOsc.connect(this.flybackGain);
      this.flybackGain.connect(ctx.destination);

      this.flybackOsc.start(now);
    } catch {}
  }

  /**
   * 停止 15.625kHz 行频啸叫
   */
  private stopFlybackWhine() {
    try {
      if (this.flybackOsc && this.flybackGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.flybackGain.gain.setValueAtTime(this.flybackGain.gain.value, now);
        this.flybackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        const osc = this.flybackOsc;
        setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        }, 350);
        this.flybackOsc = null;
        this.flybackGain = null;
      }
    } catch {}
  }

  /**
   * 2. 关机音效：行频骤降扫频 + 继电器释放切断咔哒声
   */
  public playPowerOff() {
    try {
      this.stopFlybackWhine();
      this.playTestTone(false);

      if (this.isMuted) return;
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // 快速下落的电容放电声
      const offOsc = ctx.createOscillator();
      const offGain = ctx.createGain();

      offOsc.type = "triangle";
      offOsc.frequency.setValueAtTime(950, now);
      offOsc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      offGain.gain.setValueAtTime(0.35 * this.masterVolume, now);
      offGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      offOsc.connect(offGain);
      offGain.connect(ctx.destination);

      offOsc.start(now);
      offOsc.stop(now + 0.26);

      // 机械微动释放 "Click"
      this.playButtonClick("power");
    } catch {}
  }

  /**
   * 3. 换台雪花杂音 (RF Static Hiss)
   * 模拟切换模拟频道时的无信号白噪突发 (0.3 秒)
   */
  public playChannelSwitchStatic(duration = 0.3) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // 生成调制白噪声，模拟天线失谐杂音
      let lastVal = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // 粉红化混合与快速偶发瞬态爆音
        lastVal = lastVal * 0.7 + white * 0.3;
        const pop = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 0.6 : 0;
        data[i] = lastVal * 0.8 + pop;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // 带通滤波：集中在 1400Hz 传统模拟接收机频段
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(1.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.45 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration + 0.05);
    } catch {}
  }

  /**
   * 4. 机械实体按键咔哒声 (Tactile Switch Click)
   */
  public playButtonClick(type: "power" | "channel" | "volume" | "remote" = "channel") {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (type === "power") {
        // 厚重沉稳的行程电源自锁开关
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.06);

        gain.gain.setValueAtTime(0.6 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.075);
      } else if (type === "remote") {
        // 导电橡胶按键软微动
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

        gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      } else {
        // 电视机阶梯式硬塑按键清脆弹簧微动
        const bufferSize = ctx.sampleRate * 0.03;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2400, now);
        filter.Q.setValueAtTime(3.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.55 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.035);
      }
    } catch {}
  }

  /**
   * 5. 彩蛋频道 99：1000.0Hz 电视台校准正弦测试音 (1kHz Sine Wave Test Tone)
   */
  public playTestTone(enable: boolean) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (enable && !this.testToneOsc) {
        this.testToneOsc = ctx.createOscillator();
        this.testToneGain = ctx.createGain();

        this.testToneOsc.type = "sine";
        // 国际标准广播校准 1000.0 Hz
        this.testToneOsc.frequency.setValueAtTime(1000.0, now);

        const targetGain = this.isMuted ? 0 : 0.12 * this.masterVolume;
        this.testToneGain.gain.setValueAtTime(0.0001, now);
        this.testToneGain.gain.exponentialRampToValueAtTime(targetGain, now + 0.06);

        this.testToneOsc.connect(this.testToneGain);
        this.testToneGain.connect(ctx.destination);

        this.testToneOsc.start(now);
      } else if (!enable && this.testToneOsc && this.testToneGain) {
        this.testToneGain.gain.setValueAtTime(this.testToneGain.gain.value, now);
        this.testToneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        const osc = this.testToneOsc;
        setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {}
        }, 80);
        this.testToneOsc = null;
        this.testToneGain = null;
      }
    } catch {}
  }

  /**
   * 6. 天线信号微调背景杂音 (随着信号质量下降而逐渐显现的无线电背景沙沙声)
   */
  public updateSignalHiss(quality: number) {
    if (quality >= 90 || this.isMuted) {
      if (this.rfNoiseGain && this.ctx) {
        this.rfNoiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      return;
    }

    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (!this.rfNoiseNode) {
        // 创建持续循环的粉红白噪 buffer
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.15;
        }

        this.rfNoiseNode = ctx.createBufferSource();
        this.rfNoiseNode.buffer = buffer;
        this.rfNoiseNode.loop = true;

        this.rfNoiseGain = ctx.createGain();
        this.rfNoiseGain.gain.setValueAtTime(0, now);

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.setValueAtTime(1.0, now);

        this.rfNoiseNode.connect(filter);
        filter.connect(this.rfNoiseGain);
        this.rfNoiseGain.connect(ctx.destination);

        this.rfNoiseNode.start(now);
      }

      if (this.rfNoiseGain) {
        // 信号质量越低 (0-90)，杂音越大 (最大约 0.22)
        const intensity = (1 - quality / 90) * 0.22 * this.masterVolume;
        this.rfNoiseGain.gain.setTargetAtTime(intensity, now, 0.08);
      }
    } catch {}
  }
}

export const tvSoundEngine = new RetroTVSoundEngine();
