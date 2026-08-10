import { createClient } from "npm:@supabase/supabase-js@2.112.2";

type JsonRecord = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
const RATE_LIMIT_SALT = Deno.env.get("RATE_LIMIT_SALT") ?? "";
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "https://lhyzs-hub.github.io,http://127.0.0.1:8000,http://localhost:8000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const ALLOWED_HOSTNAMES = new Set(
  (Deno.env.get("TURNSTILE_ALLOWED_HOSTNAMES") ?? "lhyzs-hub.github.io,localhost,127.0.0.1")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const DEFAULT_BLOCKED_NICKNAMES = [
  "admin", "administrator", "system", "official", "管理员", "站长", "官方", "系统",
  "lhyzs", "傻逼", "煞笔", "操你妈", "草泥马",
];
const BLOCKED_NICKNAMES = [
  ...DEFAULT_BLOCKED_NICKNAMES,
  ...(Deno.env.get("BLOCKED_NICKNAME_TERMS") ?? "").split(","),
].map(normalizeForFilter).filter(Boolean);

function getSecretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch (_) {
      // Fall through to the legacy service role key.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

const SECRET_KEY = getSecretKey();
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function corsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://lhyzs-hub.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(origin: string | null, status: number, body: JsonRecord): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function normalizeForFilter(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}_]+/gu, "");
}

function isSafeNickname(value: string, maxLength: number): boolean {
  const length = [...value].length;
  if (length < 1 || length > maxLength || /[\u0000-\u001f\u007f]/u.test(value)) return false;
  const normalized = normalizeForFilter(value);
  return normalized.length > 0 && !BLOCKED_NICKNAMES.some((term) => normalized.includes(term));
}

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? `unknown:${request.headers.get("user-agent") ?? "visitor"}`;
}

async function fingerprint(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${RATE_LIMIT_SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function consumeRateLimit(action: string, visitor: string, limit: number, windowSeconds: number) {
  const { data, error } = await supabase.rpc("consume_public_rate_limit", {
    p_action: action,
    p_fingerprint: visitor,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return (data?.[0] ?? { allowed: false, retry_after: windowSeconds }) as { allowed: boolean; retry_after: number };
}

async function verifyTurnstile(token: unknown, action: string, ip: string) {
  if (typeof token !== "string" || token.length < 1 || token.length > 2048) return false;
  const form = new FormData();
  form.set("secret", TURNSTILE_SECRET_KEY);
  form.set("response", token);
  form.set("remoteip", ip);
  form.set("idempotency_key", crypto.randomUUID());
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
  return result.success === true
    && result.action === action
    && typeof result.hostname === "string"
    && ALLOWED_HOSTNAMES.has(result.hostname.toLowerCase());
}

async function parseBody(request: Request): Promise<JsonRecord> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 6000) throw new Error("payload_too_large");
  const source = await request.text();
  if (source.length > 6000) throw new Error("payload_too_large");
  return JSON.parse(source) as JsonRecord;
}

async function startGame(origin: string | null, visitor: string) {
  const rate = await consumeRateLimit("game_start", visitor, 20, 600);
  if (!rate.allowed) return json(origin, 429, { ok: false, code: "rate_limited", retryAfter: rate.retry_after, message: "开局过于频繁，请稍后再试" });

  const { data, error } = await supabase
    .from("game_runs")
    .insert({ fingerprint: visitor })
    .select("id,expires_at")
    .single();
  if (error) throw error;
  return json(origin, 200, { ok: true, runId: data.id, expiresAt: data.expires_at });
}

async function submitComment(origin: string | null, body: JsonRecord, visitor: string, ip: string) {
  const author = typeof body.author === "string" ? body.author.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const pageKey = typeof body.pageKey === "string" ? body.pageKey.trim() : "";

  if (!isSafeNickname(author, 32)) return json(origin, 422, { ok: false, code: "nickname_rejected", message: "昵称不可用，请换一个昵称" });
  if (
    !/^(note|daily)\//u.test(pageKey)
    || [...pageKey].length > 220
    || /[\u0000-\u001f\u007f]/u.test(pageKey)
    || pageKey.split("/").includes("..")
  ) {
    return json(origin, 422, { ok: false, code: "invalid_page", message: "评论页面无效" });
  }
  if ([...content].length < 1 || [...content].length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(content)) {
    return json(origin, 422, { ok: false, code: "invalid_content", message: "评论内容需为 1–500 个字符" });
  }
  if ((content.match(/https?:\/\//gi) ?? []).length > 2 || /(.)\1{15,}/u.test(content)) {
    return json(origin, 422, { ok: false, code: "spam_content", message: "评论疑似包含重复或广告内容" });
  }

  const rate = await consumeRateLimit("comment", visitor, 3, 600);
  if (!rate.allowed) return json(origin, 429, { ok: false, code: "rate_limited", retryAfter: rate.retry_after, message: "评论过于频繁，请稍后再试" });
  if (!await verifyTurnstile(body.turnstileToken, "comment", ip)) {
    return json(origin, 400, { ok: false, code: "turnstile_failed", message: "人机验证已失效，请重新验证" });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: duplicate, error: duplicateError } = await supabase
    .from("site_comments")
    .select("id")
    .eq("submission_fingerprint", visitor)
    .eq("author", author)
    .eq("content", content)
    .gte("created_at", since)
    .limit(1);
  if (duplicateError) throw duplicateError;
  if (duplicate?.length) return json(origin, 409, { ok: false, code: "duplicate", message: "相同评论已提交，请勿重复发送" });

  const { error } = await supabase.from("site_comments").insert({
    page_key: pageKey,
    author,
    content,
    submission_fingerprint: visitor,
  });
  if (error) throw error;
  return json(origin, 201, { ok: true });
}

async function submitScore(origin: string | null, body: JsonRecord, visitor: string, ip: string) {
  const playerName = typeof body.playerName === "string" ? body.playerName.trim() : "";
  const runId = typeof body.runId === "string" ? body.runId : "";
  const score = typeof body.score === "number" ? body.score : Number.NaN;
  if (!isSafeNickname(playerName, 12)) return json(origin, 422, { ok: false, code: "nickname_rejected", message: "昵称不可用，请换一个昵称" });
  if (!Number.isInteger(score) || score < 1 || score > 10000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
    return json(origin, 422, { ok: false, code: "invalid_score", message: "本局成绩无效，请重新开始游戏" });
  }

  const rate = await consumeRateLimit("score", visitor, 5, 600);
  if (!rate.allowed) return json(origin, 429, { ok: false, code: "rate_limited", retryAfter: rate.retry_after, message: "成绩提交过于频繁，请稍后再试" });
  if (!await verifyTurnstile(body.turnstileToken, "score", ip)) {
    return json(origin, 400, { ok: false, code: "turnstile_failed", message: "人机验证已失效，请重新验证" });
  }

  const { data: claim, error: claimError } = await supabase.rpc("claim_game_run", {
    p_run_id: runId,
    p_fingerprint: visitor,
    p_score: score,
  });
  if (claimError) throw claimError;
  if (!claim?.[0]?.accepted) {
    return json(origin, 422, { ok: false, code: "score_rejected", message: "成绩未通过赛局校验，请重新开始游戏" });
  }

  const { error } = await supabase.from("game_scores").insert({
    player_name: playerName,
    score,
    run_id: runId,
    submission_fingerprint: visitor,
    review_status: "accepted",
  });
  if (error) throw error;
  return json(origin, 201, { ok: true });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json(origin, 405, { ok: false, message: "Method not allowed" });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(origin, 403, { ok: false, message: "Origin not allowed" });
  if (!SUPABASE_URL || !SECRET_KEY || !TURNSTILE_SECRET_KEY || !RATE_LIMIT_SALT) {
    return json(origin, 503, { ok: false, code: "not_configured", message: "安全服务尚未完成配置" });
  }

  try {
    const body = await parseBody(request);
    const action = typeof body.action === "string" ? body.action : "";
    const ip = clientIp(request);
    const visitor = await fingerprint(ip);
    if (action === "start_game") return await startGame(origin, visitor);
    if (action === "comment") return await submitComment(origin, body, visitor, ip);
    if (action === "score") return await submitScore(origin, body, visitor, ip);
    return json(origin, 400, { ok: false, code: "invalid_action", message: "Invalid action" });
  } catch (error) {
    console.error("public-submit failed", error);
    return json(origin, 500, { ok: false, code: "server_error", message: "安全服务暂时不可用，请稍后重试" });
  }
});
