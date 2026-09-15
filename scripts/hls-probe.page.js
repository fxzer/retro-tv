// 页内 HLS 探针：由自动化注入 retro-tv 应用页面执行（scripts/hls-probe.page.js）
//
// 用法（Playwright evaluate）:
//   await tab.playwright.evaluate(probeFn, {
//     seconds: 25,            // 采样时长
//     channelKey: null,       // 可选：探测开始前派发键盘事件切台，如 "2"
//     rig: true,              // 是否同时运行诊断台（第二个 video + 独立 hls.js 实例）
//     rigConfig: {},          // 诊断台 Hls 配置覆盖项（对照组实验用）
//     streamUrl: "/live-stream/hls/1/index.m3u8",
//   });
//
// 判定（verdict）:
//   playing = true  → 存在 ≥5s 的窗口，currentTime 以 ≥0.7 倍壁钟时间持续推进（GREEN）
//   playing = false → 时钟卡死（RED），附带卡死指纹（seeking/readyState/buffered）

(async function runHlsProbe(opts) {
  const cfg = Object.assign(
    {
      seconds: 25, channelKey: null, rig: true, rigConfig: {},
      rigDelayMs: 0,          // 延迟创建诊断台（等 app 自己先出缓冲，保证对照独立性）
      blockMpegAudio: false,  // true: 让 hls.js 认为 audio/mpeg 不受支持 → 解复用层丢弃 MP2 音频
      streamUrl: "/live-stream/hls/1/index.m3u8",
    },
    opts || {}
  );

  const appVideo = document.body.querySelector("video");
  if (!appVideo) return { error: "app video element not found" };

  // 可选：模拟用户按数字键切台（走应用真实的 switchChannelByIndex 路径）
  if (cfg.channelKey) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: cfg.channelKey, bubbles: true }));
  }

  // ─── 诊断台：第二个 video + 独立 hls.js（与生产同源、同代理、同解码环境） ───
  const events = [];
  let rigVideo = null;
  let rigHls = null;
  let unblockMpegAudio = null;
  if (cfg.rig) {
    try {
      if (cfg.rigDelayMs > 0) {
        await new Promise((r) => setTimeout(r, cfg.rigDelayMs));
      }
      // 记录浏览器对 MPEG 音频的原生 MSE 支持情况
      events.push({
        t: +(performance.now() / 1000).toFixed(2),
        ev: "NATIVE_SUPPORT",
        mpeg: window.MediaSource.isTypeSupported("audio/mpeg"),
        mp3InMp4: window.MediaSource.isTypeSupported('audio/mp4; codecs="mp3"'),
        managedMediaSource: typeof window.ManagedMediaSource,
        appBufferedAtRigStart: appVideo.buffered.length,
      });
      if (!window.Hls) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "/node_modules/hls.js/dist/hls.min.js";
          s.onload = res;
          s.onerror = () => rej(new Error("failed to load hls.min.js"));
          document.head.appendChild(s);
        });
      }
      if (cfg.blockMpegAudio) {
        // hls.js 在创建解复用器时实时调用 isTypeSupported('audio/mpeg')；
        // 返回 false 走其原生降级路径：tsdemuxer 直接不采纳 0x03/0x04 MP2 音频 PID
        const patched = [];
        for (const MS of [window.MediaSource, window.ManagedMediaSource]) {
          if (MS && typeof MS.isTypeSupported === "function") {
            const orig = MS.isTypeSupported;
            MS.isTypeSupported = (mime) => (/^audio\/mpeg/i.test(String(mime)) ? false : orig(mime));
            patched.push([MS, orig]);
          }
        }
        unblockMpegAudio = () => {
          for (const [MS, orig] of patched) MS.isTypeSupported = orig;
        };
      }
      rigVideo = document.createElement("video");
      rigVideo.muted = true;
      rigVideo.playsInline = true;
      rigVideo.style.display = "none";
      document.body.appendChild(rigVideo);
      // 与 CRTScreen.tsx 生产配置逐项一致
      const hls = new window.Hls(
        Object.assign(
          {
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 10,
            maxBufferLength: 10,
            maxMaxBufferLength: 20,
            liveSyncDurationCount: 2,
            liveMaxLatencyDurationCount: 5,
            fragLoadingTimeOut: 15000,
            manifestLoadingTimeOut: 8000,
            levelLoadingTimeOut: 8000,
          },
          cfg.rigConfig
        )
      );
      rigHls = hls;
      const logEv = (name) => (e, d) => {
        const rec = { t: +(performance.now() / 1000).toFixed(2), ev: name };
        if (name === "ERROR") {
          rec.type = d.type; rec.details = d.details; rec.fatal = !!d.fatal;
          if (d.error && d.error.message) rec.msg = String(d.error.message).slice(0, 300);
        } else if (name === "BUFFER_CODECS") {
          rec.audio = d.audio ? { codec: d.audio.codec, container: d.audio.container } : null;
          rec.video = d.video ? { codec: d.video.codec, container: d.video.container } : null;
        } else if (name === "LEVEL_LOADED") {
          rec.live = d.details.live; rec.totalduration = +d.details.totalduration.toFixed(2);
        }
        events.push(rec);
      };
      ["MANIFEST_PARSED", "LEVEL_LOADED", "BUFFER_CODECS", "FRAG_BUFFERED", "FRAG_CHANGED", "ERROR", "AUDIO_TRACKS_UPDATED"].forEach(
        (n) => hls.on(window.Hls.Events[n], logEv(n))
      );
      // 生产同款致命错误自愈（可选）：MEDIA_ERROR → recoverMediaError，NETWORK_ERROR → startLoad
      if (cfg.selfHeal) {
        let rigRecoveries = 0;
        hls.on(window.Hls.Events.ERROR, (_e, d) => {
          if (!d.fatal) return;
          const t = +(performance.now() / 1000).toFixed(2);
          if (d.type === window.Hls.ErrorTypes.MEDIA_ERROR && rigRecoveries < 5) {
            rigRecoveries++;
            events.push({ t, ev: "RIG_RECOVER_MEDIA", n: rigRecoveries, details: d.details });
            hls.recoverMediaError();
          } else if (d.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
            events.push({ t, ev: "RIG_RECOVER_NETWORK", details: d.details });
            hls.startLoad();
          }
        });
      }
      hls.loadSource(cfg.streamUrl);
      hls.attachMedia(rigVideo);
      rigVideo.play().catch(() => {});
    } catch (e) {
      events.push({ t: 0, ev: "RIG_SETUP_FAILED", msg: String(e && e.message) });
    }
  }

  // ─── 主采样：应用自己的 video 元素（真实用户症状的载体） ───
  const samples = [];
  const rigSamples = [];
  const t0 = performance.now();
  const stepMs = 500;
  const snap = (v) => {
    const buf = [];
    for (let i = 0; i < v.buffered.length; i++) {
      buf.push([+v.buffered.start(i).toFixed(2), +v.buffered.end(i).toFixed(2)]);
    }
    let q = null;
    try { q = v.getVideoPlaybackQuality(); } catch (e) { /* ignore */ }
    return {
      ct: +v.currentTime.toFixed(3),
      rs: v.readyState,
      sk: v.seeking,
      ps: v.paused,
      mu: v.muted,
      vw: v.videoWidth,
      err: v.error ? v.error.code : null,
      frames: q ? q.totalVideoFrames : null,
      buf: JSON.stringify(buf),
    };
  };
  await new Promise((resolve) => {
    const iv = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      const s = snap(appVideo);
      s.t = +t.toFixed(2);
      samples.push(s);
      if (rigVideo) {
        const rs2 = snap(rigVideo);
        rs2.t = +t.toFixed(2);
        rigSamples.push(rs2);
      }
      if (t * 1000 >= cfg.seconds * 1000) { clearInterval(iv); resolve(); }
    }, stepMs);
  });

  // 清理诊断台
  if (rigHls) rigHls.destroy();
  if (rigVideo) rigVideo.remove();
  if (unblockMpegAudio) unblockMpegAudio();

  // ─── 判定：任何 ≥5s 窗口内 currentTime 推进 ≥ 壁钟的 0.7 倍 → playing ───
  const analyze = (arr) => {
    let playing = false;
    let best = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const dw = arr[j].t - arr[i].t;
        if (dw >= 5) {
          const rate = (arr[j].ct - arr[i].ct) / dw;
          if (rate > best) best = rate;
          if (rate >= 0.7) playing = true;
        }
      }
    }
    return { playing, best };
  };

  const last = samples[samples.length - 1];
  const seekTrueMs = samples.filter((s) => s.sk).length * stepMs;
  const fingerprint = {
    last: last,
    seekingTotalMs: seekTrueMs,
    readyStateMax: Math.max.apply(null, samples.map((s) => s.rs)),
    framesEverDecoded: Math.max.apply(null, samples.map((s) => s.frames || 0)),
  };

  const verdict = analyze(samples);
  return {
    probeSeconds: cfg.seconds,
    verdict: { playing: verdict.playing, bestAdvanceRate: +verdict.best.toFixed(3) },
    fingerprint,
    rigState: rigSamples.length ? rigSamples[rigSamples.length - 1] : null,
    rigTimeline: rigSamples.filter((_, i) => i % 4 === 0 || i === rigSamples.length - 1),
    hlsEvents: events,
    samples: samples.filter((_, i) => i % 2 === 0 || i === samples.length - 1),
  };
})
