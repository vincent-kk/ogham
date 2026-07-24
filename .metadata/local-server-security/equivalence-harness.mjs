// Differential harness: OLD (commit 249e0151) vs NEW (shared/http-kit/dist)
// implementations over the same input matrix. Prints every observable delta.
//
// OLD implementations below are transcribed from
//   git show 249e0151:shared/http-kit/src/{body/parseBody,html/escapeJsonForHtml,response/sendJson}.ts
// with TypeScript annotations removed and nothing else changed. Transcription
// is pinned by the assertions in section 0.
import { createServer, request as httpRequest, Agent } from "node:http";
import { Readable } from "node:stream";

// Reads the built artifact, not the sources: run `yarn workspace
// @ogham/http-kit build` first, then `node <this file>`.
const DIST = "../../shared/http-kit/dist";
const NEW = {
  ...(await import(`${DIST}/body/index.js`)),
  ...(await import(`${DIST}/html/index.js`)),
  ...(await import(`${DIST}/response/index.js`)),
};

// ---------------------------------------------------------------- OLD sources

const OLD_MAX_BODY_BYTES = 10_485_760;

class OldRequestTooLargeError extends Error {
  constructor() {
    super("Request body too large");
    this.name = "RequestTooLargeError";
  }
}

function oldParseBody(req, maxBytes = OLD_MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      reject(new OldRequestTooLargeError());
      return;
    }

    const chunks = [];
    let receivedBytes = 0;
    let tooLarge = false;

    req.on("data", (chunk) => {
      if (tooLarge) return;
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        tooLarge = true;
        req.destroy();
        reject(new OldRequestTooLargeError());
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (tooLarge) return;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text.length === 0 ? {} : JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

const OLD_LINE_SEPARATOR = String.fromCharCode(0x2028);
const OLD_PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const OLD_ESCAPE_BY_CHARACTERS = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [OLD_LINE_SEPARATOR]: "\\u2028",
  [OLD_PARAGRAPH_SEPARATOR]: "\\u2029",
};
const OLD_UNSAFE = new RegExp(
  `[${Object.keys(OLD_ESCAPE_BY_CHARACTERS).join("")}]`,
  "g",
);

function oldEscapeJsonForHtml(value) {
  return JSON.stringify(value).replace(
    OLD_UNSAFE,
    (character) => OLD_ESCAPE_BY_CHARACTERS[character],
  );
}

function oldSendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

// OLD consumer ladders, verbatim in behavior.
function oldLadderSettings(err) {
  // cennad / filid / imbas / seiri
  if (
    err instanceof OldRequestTooLargeError ||
    err?.name === "RequestTooLargeError"
  )
    return { status: 413, message: "Request body too large" };
  return { status: 400, message: `Invalid JSON body: ${err.message}` };
}

function oldLadderRoute(err) {
  // atlassian route-level handleError
  if (
    err instanceof OldRequestTooLargeError ||
    err?.name === "RequestTooLargeError"
  )
    return { status: 413, message: "Request body too large" };
  return {
    status: 500,
    message: err instanceof Error ? err.message : "Internal server error",
  };
}

function oldEntrezOnError(err) {
  return {
    status: 500,
    message: err instanceof Error ? err.message : "Internal server error",
  };
}

// ------------------------------------------------------------------- helpers

const deltas = [];
const checks = { total: 0, same: 0 };

function compare(surface, input, oldOut, newOut, note) {
  checks.total += 1;
  const a = JSON.stringify(oldOut);
  const b = JSON.stringify(newOut);
  if (a === b) {
    checks.same += 1;
    return;
  }
  deltas.push({ surface, input, old: oldOut, new: newOut, note: note ?? "" });
}

function attempt(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return { ok: false, threw: `${err.name}: ${err.message}` };
  }
}

function mockResponse() {
  const calls = { head: null, body: null };
  return {
    res: {
      writeHead(status, headers) {
        calls.head = { status, headers };
      },
      end(text) {
        calls.body = text;
      },
    },
    calls,
  };
}

function mockRequest(chunks, headers = {}) {
  const req = Readable.from(chunks);
  req.headers = headers;
  return req;
}

// ------------------------------------------------- 0. transcription pinning

console.log("== 0. OLD transcription pinning ==");
const pins = [
  ["OLD MAX_BODY_BYTES", OLD_MAX_BODY_BYTES === 10_485_760],
  ["OLD escape has no $", oldEscapeJsonForHtml({ a: "$" }) === '{"a":"$"}'],
  [
    "OLD escape maps <&>",
    oldEscapeJsonForHtml("<&>") === '"\\u003c\\u0026\\u003e"',
  ],
  [
    "OLD sendJson throws on undefined",
    attempt(() => oldSendJson(mockResponse().res, 200, undefined)).ok === false,
  ],
  ["NEW MAX_BODY_BYTES is 1MB", NEW.MAX_BODY_BYTES === 1_000_000],
];
for (const [label, ok] of pins) console.log(`  ${ok ? "OK " : "BAD"} ${label}`);
if (pins.some(([, ok]) => !ok)) {
  console.error("transcription pinning failed — aborting");
  process.exit(1);
}

// ------------------------------------------------------- 1. escapeJsonForHtml

console.log("\n== 1. escapeJsonForHtml (value corpus) ==");
const ESCAPE_CORPUS = [
  null,
  true,
  0,
  -1.5,
  "",
  "plain",
  "한글 텍스트",
  "<b>&</b>",
  "</script>",
  `${OLD_LINE_SEPARATOR}${OLD_PARAGRAPH_SEPARATOR}`,
  'tab\tnewline\nquote"backslash\\',
  { a: 1, b: "x", c: [1, 2, { d: null }] },
  { keywords: ["code", "refactor"], ratio: { codex: 65 } },
  [],
  {},
  { deep: { deeper: { deepest: "<&>" } } },
  // dollar variants — the intended behavior change
  "$",
  "$$",
  "$&",
  "$`",
  "$'",
  "$1",
  "a$'b",
  "price: $5.00",
  { note: "a$`b$'c$$d$&e" },
  { path: "/Users/x/$HOME/file.ts" },
  "$<name>",
];
let escapeByteDeltas = 0;
let escapeValueDeltas = 0;
for (const value of ESCAPE_CORPUS) {
  const oldOut = oldEscapeJsonForHtml(value);
  const newOut = NEW.escapeJsonForHtml(value);
  checks.total += 1;
  if (oldOut === newOut) {
    checks.same += 1;
    continue;
  }
  escapeByteDeltas += 1;
  // Both must decode to the same value: $ is a JSON escape for "$".
  const sameDecoded =
    JSON.stringify(JSON.parse(oldOut)) === JSON.stringify(JSON.parse(newOut));
  if (!sameDecoded) {
    escapeValueDeltas += 1;
    deltas.push({
      surface: "escapeJsonForHtml",
      input: JSON.stringify(value),
      old: oldOut,
      new: newOut,
      note: "DECODED VALUE DIFFERS",
    });
  }
  const hadDollar = JSON.stringify(value).includes("$");
  if (!hadDollar)
    deltas.push({
      surface: "escapeJsonForHtml",
      input: JSON.stringify(value),
      old: oldOut,
      new: newOut,
      note: "byte delta without a $ in the input",
    });
}
console.log(
  `  corpus ${ESCAPE_CORPUS.length} · byte-level deltas ${escapeByteDeltas} (all with $ in input) · decoded-value deltas ${escapeValueDeltas}`,
);

// splice equivalence: what the page actually ends up with
console.log(
  "\n== 1b. escapeJsonForHtml spliced into a page (consumer shape) ==",
);
const HEAD = "<html><head><script>var boot=1;</script></head><body>x";
const TEMPLATE = `${HEAD}<script>window.S = "__STATE__";</script>`;
let spliceOldBroken = 0;
let spliceNewBroken = 0;
for (const value of ESCAPE_CORPUS) {
  const oldPage = TEMPLATE.replace(
    /["']__STATE__["']/,
    oldEscapeJsonForHtml(value),
  );
  const newPage = TEMPLATE.replace(
    /["']__STATE__["']/,
    NEW.escapeJsonForHtml(value),
  );
  const oldInline = oldPage.slice(HEAD.length);
  const newInline = newPage.slice(HEAD.length);
  // The inline script must contain exactly one </script> (its own closer).
  if ((oldInline.match(/<\/script>/g) ?? []).length !== 1) spliceOldBroken += 1;
  if ((newInline.match(/<\/script>/g) ?? []).length !== 1) spliceNewBroken += 1;
  // Decoded state must survive the splice on the new path.
  const literal = newInline.match(/window\.S = (.*);<\/script>/)?.[1];
  if (literal !== undefined) {
    const decoded = JSON.parse(literal);
    if (JSON.stringify(decoded) !== JSON.stringify(value))
      deltas.push({
        surface: "escapeJsonForHtml/splice",
        input: JSON.stringify(value),
        old: "n/a",
        new: literal,
        note: "NEW spliced state does not decode back to the input",
      });
  }
}
console.log(
  `  broken inline scripts — OLD ${spliceOldBroken} / NEW ${spliceNewBroken} (of ${ESCAPE_CORPUS.length})`,
);

// -------------------------------------------------------------- 2. sendJson

console.log("\n== 2. sendJson (body corpus) ==");
const SEND_CORPUS = [
  { label: "object", body: { ok: true } },
  { label: "nested", body: { a: [1, 2], b: { c: "한글" } } },
  { label: "array", body: [1, 2, 3] },
  { label: "string", body: "text" },
  { label: "number", body: 42 },
  { label: "true", body: true },
  { label: "null", body: null },
  { label: "empty object", body: {} },
  { label: "unicode", body: { msg: "한글" } },
  { label: "undefined", body: undefined },
  { label: "function", body: () => 1 },
  { label: "symbol", body: Symbol("s") },
];
for (const { label, body } of SEND_CORPUS) {
  const o = mockResponse();
  const n = mockResponse();
  const oldRes = attempt(() => {
    oldSendJson(o.res, 200, body);
    return o.calls;
  });
  const newRes = attempt(() => {
    NEW.sendJson(n.res, 200, body);
    return n.calls;
  });
  compare("sendJson", label, oldRes, newRes);
}
console.log(`  corpus ${SEND_CORPUS.length} compared`);

// ------------------------------------------------- 3. parseBody (stream mock)

console.log("\n== 3. parseBody (stream mock, explicit maxBytes=64) ==");
const PARSE_CORPUS = [
  { label: "empty", chunks: [] },
  { label: "valid object", chunks: [Buffer.from('{"a":1}')] },
  {
    label: "split across chunks",
    chunks: [Buffer.from('{"a"'), Buffer.from(":1}")],
  },
  { label: "unicode", chunks: [Buffer.from('{"k":"한글"}')] },
  { label: "malformed", chunks: [Buffer.from("{not json")] },
  { label: "array body", chunks: [Buffer.from("[1,2,3]")] },
  {
    label: "exactly at cap",
    chunks: [Buffer.from(`{"a":"${"x".repeat(64 - 8)}"}`.slice(0, 64))],
  },
  { label: "over cap", chunks: [Buffer.alloc(100, 0x61)] },
  {
    label: "over cap in 2 chunks",
    chunks: [Buffer.alloc(40, 0x61), Buffer.alloc(40, 0x62)],
  },
  {
    label: "declared over cap",
    chunks: [Buffer.from('{"a":1}')],
    headers: { "content-length": "9999" },
  },
];
for (const { label, chunks, headers } of PARSE_CORPUS) {
  const settle = async (fn, req) => {
    try {
      return { resolved: await fn(req, 64) };
    } catch (err) {
      return { rejected: err.name, message: err.message };
    }
  };
  const oldOut = await settle(oldParseBody, mockRequest(chunks, headers));
  const newOut = await settle(NEW.parseBody, mockRequest(chunks, headers));
  compare("parseBody", label, oldOut, newOut);
}
console.log(`  corpus ${PARSE_CORPUS.length} compared`);

// --------------------------------------------------- 4. parseBody over HTTP

console.log("\n== 4. parseBody over a real socket (cap 1024) ==");
const HTTP_CAP = 1024;

function startServer(parse) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      parse(req, HTTP_CAP).then(
        (value) => {
          const text = JSON.stringify({ ok: true, value });
          res.writeHead(200, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(text),
          });
          res.end(text);
        },
        (err) => {
          const status = err.name === "RequestTooLargeError" ? 413 : 400;
          const text = JSON.stringify({ ok: false, name: err.name });
          res.writeHead(status, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(text),
          });
          res.end(text);
        },
      );
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function post(port, body, { declare = true, agent } = {}) {
  return new Promise((resolve) => {
    const headers = { "Content-Type": "application/json" };
    if (declare) headers["Content-Length"] = String(body.length);
    const options = {
      host: "127.0.0.1",
      port,
      method: "POST",
      path: "/",
      headers,
    };
    if (agent) options.agent = agent;
    const req = httpRequest(options, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (text += c));
      res.on("end", () => resolve({ status: res.statusCode, body: text }));
    });
    req.on("error", (err) =>
      resolve({ status: null, transport: err.code ?? err.message }),
    );
    for (let sent = 0; sent < body.length; sent += 256)
      req.write(body.subarray(sent, sent + 256));
    req.end();
  });
}

const oldServer = await startServer(oldParseBody);
const newServer = await startServer(NEW.parseBody);
const oldPort = oldServer.address().port;
const newPort = newServer.address().port;

const HTTP_MATRIX = [
  {
    label: "small valid, declared",
    body: Buffer.from('{"a":1}'),
    declare: true,
  },
  {
    label: "small valid, chunked",
    body: Buffer.from('{"a":1}'),
    declare: false,
  },
  { label: "empty, declared", body: Buffer.alloc(0), declare: true },
  {
    label: "malformed, declared",
    body: Buffer.from("{not json"),
    declare: false,
  },
  {
    label: "unicode, chunked",
    body: Buffer.from('{"k":"한글"}'),
    declare: false,
  },
  {
    label: "at cap, chunked",
    body: Buffer.from(`{"a":"${"x".repeat(HTTP_CAP - 9)}"}`),
    declare: false,
  },
  {
    label: "over cap, declared",
    body: Buffer.alloc(HTTP_CAP * 4, 0x61),
    declare: true,
  },
  {
    label: "over cap, chunked",
    body: Buffer.alloc(HTTP_CAP * 4, 0x61),
    declare: false,
  },
];
for (const { label, body, declare } of HTTP_MATRIX) {
  const oldOut = await post(oldPort, body, { declare });
  const newOut = await post(newPort, body, { declare });
  compare("parseBody/http", label, oldOut, newOut);
}

// keep-alive reuse after an over-cap chunked POST
for (const [label, port] of [
  ["OLD", oldPort],
  ["NEW", newPort],
]) {
  const agent = new Agent({ keepAlive: true, maxSockets: 1 });
  const first = await post(port, Buffer.alloc(HTTP_CAP * 4, 0x61), {
    declare: false,
    agent,
  });
  const second = await post(port, Buffer.from('{"a":1}'), {
    declare: true,
    agent,
  });
  console.log(
    `  keep-alive ${label}: over-cap → ${first.status ?? first.transport} · next request → ${second.status ?? second.transport}`,
  );
  agent.destroy();
}
oldServer.close();
newServer.close();
console.log(`  matrix ${HTTP_MATRIX.length} compared`);

// --------------------------------------------- 5. error → status/message map

console.log("\n== 5. error mapping (old ladders vs describeBodyError) ==");
let parseError;
try {
  JSON.parse("{not json");
} catch (err) {
  parseError = err;
}
// Each era gets its own error instance for the same scenario — comparing
// instanceof across two class identities would be a harness artefact.
const ERROR_CASES = [
  {
    label: "over-cap body",
    oldErr: new OldRequestTooLargeError(),
    newErr: new NEW.RequestTooLargeError(),
  },
  { label: "SyntaxError (JSON.parse)", oldErr: parseError, newErr: parseError },
  {
    label: "socket Error",
    oldErr: new Error("aborted"),
    newErr: new Error("aborted"),
  },
  { label: "non-Error throwable", oldErr: "boom", newErr: "boom" },
];
for (const { label, oldErr, newErr } of ERROR_CASES) {
  const newOut = NEW.describeBodyError(newErr);
  const oldSettings = oldLadderSettings(oldErr);
  const oldRoute = oldLadderRoute(oldErr);
  const oldEntrez = oldEntrezOnError(oldErr);
  const line = (label_, value) => `${label_}=${value.status}`;
  console.log(
    `  ${label.padEnd(24)} ${line("settings(cennad/filid/imbas/seiri)", oldSettings)} ${line("route(atlassian)", oldRoute)} ${line("entrez", oldEntrez)} → NEW=${newOut.status}` +
      (oldSettings.message === newOut.message
        ? " (message identical to settings era)"
        : ` (message: ${JSON.stringify(newOut.message)})`),
  );
}

// D7 probe: when parseBody rejects through req.on("error"), is the status the
// caller writes observable at all? Client aborts mid-body.
console.log(
  "\n== 5b. aborted request — is the error-path status observable? ==",
);
for (const [era, parse] of [
  ["OLD", oldParseBody],
  ["NEW", NEW.parseBody],
]) {
  const server = await startServer(parse);
  const port = server.address().port;
  const observed = await new Promise((resolve) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port,
        method: "POST",
        path: "/",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "500",
        },
      },
      (res) => {
        res.resume();
        resolve(`status ${res.statusCode}`);
      },
    );
    req.on("error", (err) => resolve(`transport ${err.code ?? err.message}`));
    req.write(Buffer.alloc(100, 0x61));
    setTimeout(() => req.destroy(new Error("client abort")), 30);
  });
  console.log(`  ${era}: client saw → ${observed}`);
  server.close();
}

// ------------------------------------------------------------------ verdict

console.log("\n== verdict ==");
console.log(`  compared ${checks.total} cases · identical ${checks.same}`);
if (deltas.length === 0) console.log("  UNEXPECTED DELTAS: none");
else {
  console.log(`  UNEXPECTED DELTAS: ${deltas.length}`);
  for (const d of deltas)
    console.log(
      `   - [${d.surface}] ${d.input} :: old=${JSON.stringify(d.old)} new=${JSON.stringify(d.new)} ${d.note}`,
    );
}
