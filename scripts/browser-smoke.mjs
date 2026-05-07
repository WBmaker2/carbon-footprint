import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USER_DATA_DIR = path.join(tmpdir(), "carbon-footprint-smoke-" + process.pid);
const REQUEST_TIMEOUT_MS = 15000;
const WAIT_TIMEOUT_MS = 12000;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const checks = [];
let server;
let browserProcess;

function logCheck(label) {
  checks.push(label);
  console.log("[ok] " + label);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function delay(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
}

function startStaticServer() {
  server = createServer(async function (request, response) {
    try {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      const rawPath = decodeURIComponent(requestUrl.pathname);
      const normalizedPath = rawPath === "/" ? "/index.html" : rawPath;
      const filePath = path.resolve(ROOT_DIR, "." + normalizedPath);

      if (!filePath.startsWith(ROOT_DIR + path.sep)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      let content = await readFile(filePath);
      if (path.basename(filePath) === "index.html") {
        content = Buffer.from(
          content
            .toString("utf8")
            .replace(
              '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>',
              "<script>window.Chart = undefined;</script>"
            )
        );
      }
      response.writeHead(200, {
        "content-type": getContentType(filePath),
        "cache-control": "no-store",
      });
      response.end(content);
    } catch (error) {
      response.writeHead(error && error.code === "ENOENT" ? 404 : 500);
      response.end("Not found");
    }
  });

  return new Promise(function (resolve, reject) {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", function () {
      const address = server.address();
      resolve("http://127.0.0.1:" + address.port + "/");
    });
  });
}

function getBrowserCandidates() {
  return [
    process.env.SMOKE_BROWSER,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
}

function findBrowserPath() {
  const browserPath = getBrowserCandidates().find(function (candidate) {
    return existsSync(candidate);
  });

  if (!browserPath) {
    fail(
      "Chrome/Chromium 실행 파일을 찾지 못했습니다. SMOKE_BROWSER=/path/to/browser 환경변수로 지정해 주세요."
    );
  }

  return browserPath;
}

async function waitForDevToolsPort() {
  const activePortFile = path.join(USER_DATA_DIR, "DevToolsActivePort");
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const raw = await readFile(activePortFile, "utf8");
      const lines = raw.trim().split(/\r?\n/);
      const port = Number(lines[0]);
      if (Number.isInteger(port) && port > 0) {
        return port;
      }
    } catch (error) {
      await delay(100);
    }
  }

  fail("브라우저 DevTools 포트를 열지 못했습니다.");
}

function launchBrowser() {
  const browserPath = findBrowserPath();
  browserProcess = spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    "--remote-allow-origins=*",
    "--user-data-dir=" + USER_DATA_DIR,
    "about:blank",
  ], {
    stdio: ["ignore", "ignore", "pipe"],
  });

  browserProcess.stderr.on("data", function () {});
  browserProcess.on("exit", function (code) {
    if (code !== 0 && code !== null) {
      console.error("[browser] exited with code " + code);
    }
  });
}

function requestJson(options) {
  return new Promise(function (resolve, reject) {
    const request = import("node:http").then(function ({ request: httpRequest }) {
      const req = httpRequest(options, function (res) {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", function (chunk) {
          body += chunk;
        });
        res.on("end", function () {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error("HTTP " + res.statusCode + ": " + body));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      });
      req.on("error", reject);
      req.end();
    });
    request.catch(reject);
  });
}

async function createPageWebSocket(port) {
  const pathName = "/json/new?about:blank";
  const options = {
    hostname: "127.0.0.1",
    port: port,
    path: pathName,
    method: "PUT",
  };

  try {
    const target = await requestJson(options);
    return target.webSocketDebuggerUrl;
  } catch (error) {
    const fallbackTarget = await requestJson(Object.assign({}, options, { method: "GET" }));
    return fallbackTarget.webSocketDebuggerUrl;
  }
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  connect() {
    if (typeof WebSocket !== "function") {
      fail("현재 Node 런타임에 WebSocket 전역 객체가 없습니다. Node 22 이상으로 실행해 주세요.");
    }

    this.socket = new WebSocket(this.webSocketUrl);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(function () {
        reject(new Error("CDP WebSocket 연결 시간이 초과되었습니다."));
      }, REQUEST_TIMEOUT_MS);

      this.socket.addEventListener("open", function () {
        clearTimeout(timeoutId);
        resolve();
      });

      this.socket.addEventListener("error", function () {
        clearTimeout(timeoutId);
        reject(new Error("CDP WebSocket 연결에 실패했습니다."));
      });

      this.socket.addEventListener("message", (event) => {
        this.handleMessage(event.data);
      });
    });
  }

  handleMessage(rawMessage) {
    const message = JSON.parse(rawMessage);
    if (message.id && this.pending.has(message.id)) {
      const handlers = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        handlers.reject(new Error(message.error.message));
      } else {
        handlers.resolve(message.result || {});
      }
      return;
    }

    if (message.method && this.listeners.has(message.method)) {
      this.listeners.get(message.method).forEach(function (listener) {
        listener(message.params || {});
      });
    }
  }

  send(method, params) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = JSON.stringify({
      id: id,
      method: method,
      params: params || {},
    });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve, reject: reject });
      this.socket.send(payload);
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

async function evaluate(client, expression, awaitPromise) {
  const result = await client.send("Runtime.evaluate", {
    expression: expression,
    awaitPromise: Boolean(awaitPromise),
    returnByValue: true,
    userGesture: true,
  });

  if (result.exceptionDetails) {
    const exception = result.exceptionDetails.exception;
    const description =
      (exception && (exception.description || exception.value)) ||
      result.exceptionDetails.text ||
      "Runtime.evaluate failed";
    fail(description);
  }

  return result.result ? result.result.value : undefined;
}

async function waitForExpression(client, expression, label, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || WAIT_TIMEOUT_MS);
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const value = await evaluate(client, expression, false);
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error.message;
    }
    await delay(150);
  }

  fail(label + " 대기 시간이 초과되었습니다." + (lastError ? " 마지막 오류: " + lastError : ""));
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url: url });
  await waitForExpression(
    client,
    "document.readyState === 'complete' || document.readyState === 'interactive'",
    "문서 로드",
    WAIT_TIMEOUT_MS
  );
  await waitForExpression(
    client,
    "Boolean(window.CarbonTrackerStorage && document.querySelectorAll('#controlGrid .control-card').length >= 6)",
    "앱 초기 렌더링",
    WAIT_TIMEOUT_MS
  );
}

async function runSmoke(client, appUrl) {
  await navigateAndWait(client, appUrl);
  await evaluate(client, "localStorage.removeItem(window.CarbonTrackerConfig.STORAGE_KEY);");
  await navigateAndWait(client, appUrl + "?smoke=" + Date.now());
  logCheck("앱 로드");

  const chartFallbackVisible = await evaluate(
    client,
    "(() => { const daily = document.getElementById('chartFallback'); const trend = document.getElementById('trendFallback'); const dailyCanvas = document.getElementById('carbonChart'); const trendCanvas = document.getElementById('weeklyTrendChart'); return !daily.hidden && !trend.hidden && dailyCanvas.hidden && trendCanvas.hidden; })();"
  );
  assert(chartFallbackVisible, "Chart.js fallback 표시 상태가 올바르지 않습니다.");
  logCheck("Chart.js fallback 표시");

  await evaluate(client, "document.querySelector('[data-key=\"plastic\"] .increase-button').click();");
  await waitForExpression(client, "document.querySelector('[data-key=\"plastic\"] .value-chip').textContent === '1개'", "입력 증가 화면 반영");
  const savedPlastic = await evaluate(
    client,
    "(() => { const raw = localStorage.getItem(window.CarbonTrackerConfig.STORAGE_KEY); const data = JSON.parse(raw); const today = window.CarbonTrackerDate.getTodayKey(); return data.dailyRecords[today].plastic; })();"
  );
  assert(savedPlastic === 1, "입력 증가 후 localStorage 저장값이 1이 아닙니다.");
  await navigateAndWait(client, appUrl + "?persist=" + Date.now());
  await waitForExpression(client, "document.querySelector('[data-key=\"plastic\"] .value-chip').textContent === '1개'", "새로고침 후 저장 유지");
  logCheck("입력 증가 후 저장 유지");

  const yesterdayKey = await evaluate(
    client,
    "(() => { const d = new Date(); d.setDate(d.getDate() - 1); return window.CarbonTrackerDate.getLocalDateKey(d); })();"
  );
  await evaluate(
    client,
    "(() => { const input = document.getElementById('recordDate'); input.value = '" +
      yesterdayKey +
      "'; input.dispatchEvent(new Event('change', { bubbles: true })); })();"
  );
  await waitForExpression(
    client,
    "document.getElementById('selectedDateTitle').textContent.includes('과거 기록') && document.getElementById('selectedDateDescription').textContent.includes('과거 기록')",
    "과거 날짜 문구"
  );
  logCheck("날짜 선택/과거 날짜 문구");

  await evaluate(client, "document.querySelector('[data-key=\"paper\"] .increase-button').click();");
  await waitForExpression(client, "document.querySelector('[data-key=\"paper\"] .value-chip').textContent === '1장'", "과거 날짜 입력");
  const resetGate = await evaluate(
    client,
    "(() => { window.__confirmMessages = []; window.confirm = (message) => { window.__confirmMessages.push(message); return false; }; document.getElementById('resetButton').click(); return window.__confirmMessages[0] || ''; })();"
  );
  assert(resetGate.includes("초기화") && resetGate.includes("삭제 대상"), "선택 날짜 초기화 확인 문구를 찾지 못했습니다.");
  await waitForExpression(client, "document.querySelector('[data-key=\"paper\"] .value-chip').textContent === '1장'", "초기화 취소 후 값 유지");
  await evaluate(
    client,
    "(() => { window.confirm = () => true; document.getElementById('resetButton').click(); })();"
  );
  await waitForExpression(client, "document.querySelector('[data-key=\"paper\"] .value-chip').textContent === '0장'", "초기화 승인 후 값 삭제");
  logCheck("선택 날짜 초기화 확인 게이트");

  await evaluate(client, "document.getElementById('todayButton').click(); document.querySelector('[data-key=\"can\"] .increase-button').click();");
  await waitForExpression(client, "document.querySelector('[data-key=\"can\"] .value-chip').textContent === '1개'", "전체 삭제 전 기록 생성");
  const clearAllGate = await evaluate(
    client,
    "(() => { window.__confirmMessages = []; window.confirm = (message) => { window.__confirmMessages.push(message); return false; }; document.getElementById('clearAllButton').click(); return window.__confirmMessages[0] || ''; })();"
  );
  assert(clearAllGate.includes("모든 날짜 기록") && clearAllGate.includes("되돌릴 수 없습니다"), "전체 데이터 삭제 확인 문구를 찾지 못했습니다.");
  const recordsAfterCancel = await evaluate(
    client,
    "(() => { const raw = localStorage.getItem(window.CarbonTrackerConfig.STORAGE_KEY); return Object.keys(JSON.parse(raw).dailyRecords).length; })();"
  );
  assert(recordsAfterCancel > 0, "전체 삭제 취소 후 기록이 유지되지 않았습니다.");
  await evaluate(client, "window.confirm = () => true; document.getElementById('clearAllButton').click();");
  await waitForExpression(
    client,
    "(() => { const raw = localStorage.getItem(window.CarbonTrackerConfig.STORAGE_KEY); return raw === null || Object.keys(JSON.parse(raw).dailyRecords).length === 0; })();",
    "전체 삭제 승인 후 저장소 비움"
  );
  logCheck("전체 데이터 삭제 확인 게이트");

  const exportUiExists = await evaluate(
    client,
    "Boolean(document.getElementById('exportBackupButton') && document.getElementById('exportBackupButton').textContent.includes('JSON 백업 내보내기'))"
  );
  assert(exportUiExists, "JSON 백업 내보내기 UI가 없습니다.");
  logCheck("JSON 백업 내보내기 UI 존재");

  const importMode = await evaluate(
    client,
    "document.querySelector('input[name=\"importMode\"]:checked')?.value"
  );
  assert(importMode === "merge", "JSON 가져오기 기본 모드가 병합이 아닙니다.");
  logCheck("JSON 가져오기 모드 기본값 병합");

  await evaluate(client, "document.querySelector('[data-key=\"plastic\"] .increase-button').click();");
  await waitForExpression(client, "document.querySelector('[data-key=\"plastic\"] .value-chip').textContent === '1개'", "잘못된 JSON 테스트 전 기록 생성");
  await evaluate(
    client,
    "(() => { const input = document.getElementById('backupFileInput'); const file = new File(['{ bad json'], 'bad.json', { type: 'application/json' }); const dataTransfer = new DataTransfer(); dataTransfer.items.add(file); input.files = dataTransfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); })();"
  );
  await waitForExpression(
    client,
    "document.getElementById('backupStatus').textContent.includes('백업 가져오기에 실패')",
    "잘못된 JSON 가져오기 실패 안내"
  );
  const plasticAfterBadImport = await evaluate(
    client,
    "(() => { const raw = localStorage.getItem(window.CarbonTrackerConfig.STORAGE_KEY); const data = JSON.parse(raw); const today = window.CarbonTrackerDate.getTodayKey(); return data.dailyRecords[today].plastic; })();"
  );
  assert(plasticAfterBadImport === 1, "잘못된 JSON 가져오기 후 기존 기록이 유지되지 않았습니다.");
  logCheck("잘못된 JSON import 실패 시 기존 기록 유지");

  await evaluate(
    client,
    "(() => { window.__nativeSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('forced smoke failure', 'QuotaExceededError'); }; document.querySelector('[data-key=\"can\"] .increase-button').click(); })();"
  );
  await waitForExpression(
    client,
    "document.getElementById('storageStatus').textContent.includes('저장하지 못했어요')",
    "저장 실패 안내"
  );
  await evaluate(
    client,
    "(() => { if (window.__nativeSetItem) { Storage.prototype.setItem = window.__nativeSetItem; } })();"
  );
  logCheck("저장 실패 안내 표시 가능 여부");
}

async function cleanup(client) {
  if (client) {
    client.close();
  }
  if (browserProcess && !browserProcess.killed) {
    browserProcess.kill();
  }
  if (server) {
    await new Promise(function (resolve) {
      server.close(resolve);
    });
  }
  await rm(USER_DATA_DIR, { recursive: true, force: true });
}

let client;

try {
  const appUrl = await startStaticServer();
  launchBrowser();
  const port = await waitForDevToolsPort();
  const pageWebSocketUrl = await createPageWebSocket(port);
  client = new CdpClient(pageWebSocketUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await runSmoke(client, appUrl);
  console.log("\nBrowser smoke passed: " + checks.length + " checks");
} catch (error) {
  console.error("\nBrowser smoke failed: " + error.message);
  process.exitCode = 1;
} finally {
  await cleanup(client);
}
