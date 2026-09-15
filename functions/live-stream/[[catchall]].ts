import { connect } from "cloudflare:sockets";

export const onRequest: PagesFunction = async (context) => {
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(context.request.url);
  const targetPath = url.pathname.replace(/^\/live-stream/, "") + url.search;

  try {
    const socket = connect({ hostname: "182.140.125.47", port: 808 });
    const writer = socket.writable.getWriter();
    const reqText = `${context.request.method} ${targetPath} HTTP/1.1\r\nHost: 182.140.125.47:808\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`;
    await writer.write(new TextEncoder().encode(reqText));
    writer.releaseLock();

    const reader = socket.readable.getReader();
    let headerBuffer = new Uint8Array(0);
    let headerEndIndex = -1;
    let initialChunk: Uint8Array | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done || !value) break;

      const merged = new Uint8Array(headerBuffer.length + value.length);
      merged.set(headerBuffer);
      merged.set(value, headerBuffer.length);
      headerBuffer = merged;

      for (let i = 0; i <= headerBuffer.length - 4; i++) {
        if (
          headerBuffer[i] === 13 &&
          headerBuffer[i + 1] === 10 &&
          headerBuffer[i + 2] === 13 &&
          headerBuffer[i + 3] === 10
        ) {
          headerEndIndex = i;
          break;
        }
      }

      if (headerEndIndex !== -1) {
        initialChunk = headerBuffer.slice(headerEndIndex + 4);
        break;
      }
    }

    if (headerEndIndex === -1) {
      return new Response("Bad Gateway: invalid upstream response", { status: 502 });
    }

    const headerText = new TextDecoder().decode(headerBuffer.slice(0, headerEndIndex));
    const lines = headerText.split("\r\n");
    const statusLine = lines[0];
    const statusMatch = statusLine.match(/HTTP\/\d\.\d\s+(\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 200;

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    for (let i = 1; i < lines.length; i++) {
      const colon = lines[i].indexOf(":");
      if (colon !== -1) {
        const k = lines[i].slice(0, colon).trim().toLowerCase();
        const v = lines[i].slice(colon + 1).trim();
        if (k === "content-type" || k === "content-length" || k === "last-modified" || k === "etag") {
          responseHeaders.set(k, v);
        }
      }
    }

    const bodyStream = new ReadableStream({
      async start(controller) {
        if (initialChunk && initialChunk.length > 0) {
          controller.enqueue(initialChunk);
        }
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) controller.enqueue(value);
          }
        } catch {
          // stream done
        } finally {
          controller.close();
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(bodyStream, {
      status: statusCode,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(`Socket Proxy Error: ${err?.message || "Unknown"}`, { status: 502 });
  }
};
