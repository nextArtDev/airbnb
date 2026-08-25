import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { buildChatSystemPrompt } from "@/lib/ai/chat-context";

export const dynamic = "force-dynamic";

const MAX_TURNS = 20;
const MAX_CHARS = 2000;

// Lightweight sliding-window limiter (per IP): 10 requests / minute.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  // opportunistic cleanup
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

function sanitizeMessages(raw: unknown): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_TURNS)
    .filter(
      (m): m is IncomingMessage =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as IncomingMessage).content === "string" &&
        ((m as IncomingMessage).role === "user" ||
          (m as IncomingMessage).role === "assistant"),
    )
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: (m.content as string).slice(0, MAX_CHARS),
    }))
    .filter((m) => m.content.trim().length > 0);
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { locale?: unknown; messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const locale = hasLocale(routing.locales, body.locale)
    ? body.locale
    : routing.defaultLocale;

  const messages = sanitizeMessages(body.messages);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(process.env.OPENAI_BASE_URL
      ? { baseURL: process.env.OPENAI_BASE_URL }
      : {}),
  });

  const system = await buildChatSystemPrompt(locale);

  const result = streamText({
    model: openai(process.env.CHAT_MODEL || "gpt-4o-mini"),
    system,
    messages,
    maxTokens: 400,
    temperature: 0.3,
  });

  return result.toDataStreamResponse();
}
