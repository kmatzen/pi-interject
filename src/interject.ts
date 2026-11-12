/**
 * interject — hard-steer a running agent (submit-interrupt).
 *
 * Submitting with the configured trigger key while the agent is running:
 *   1. aborts the in-flight turn immediately (partial turn preserved in session),
 *   2. delivers your message as the next prompt as soon as the run settles.
 *
 * Config (interject.json next to this file, /reload after editing):
 *   { "trigger": "followUp" }  // the follow-up submit key -> hard interject (default)
 *                              // keybindings.json: app.message.followUp = ["alt+enter", "ctrl+shift+i"]
 *   { "trigger": "enter"   }   // plain Enter -> hard interject (old behavior)
 *   { "trigger": "off"     }   // extension inactive; all submits pass through
 *
 * Untouched submits do the default: plain Enter while running queues a steer,
 * the follow-up key queues a follow-up. "/cmd", "!bash", idle submits, and
 * RPC/extension input always pass through.
 * Several trigger presses before settle -> latest wins.
 *
 * CoT replay: pi-ai's transformMessages drops every assistant message with
 * stopReason "aborted" from the next request (guard against dangling tool
 * calls). That also discards the partial thinking of an interjected turn,
 * so the model never reads its own chain of thought. A "context" hook
 * re-enables aborted turns that are safe to replay (thinking present, no
 * tool calls) — request-local only, the session file keeps stopReason
 * "aborted".
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

type Trigger = "followUp" | "enter" | "off";

function loadTrigger(): Trigger {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(new URL("./interject.json", `file://${here}/`), "utf8");
    const cfg = JSON.parse(raw);
    if (cfg && (cfg.trigger === "followUp" || cfg.trigger === "enter" || cfg.trigger === "off")) {
      return cfg.trigger;
    }
  } catch {
    // No config file or invalid -> default.
  }
  return "followUp";
}

export default function (pi: any) {
  const trigger = loadTrigger();
  // Which input streamingBehavior maps to the configured trigger key.
  const interceptBehavior = trigger === "enter" ? "steer" : trigger === "followUp" ? "followUp" : null;
  const keyLabel = trigger === "enter" ? "Enter" : trigger === "followUp" ? "Ctrl+Shift+I" : "off";

  let waitingForSettle = false;
  let pending: { text: string; images?: any[] } | null = null;

  // Load proof: persistent footer badge, set at startup and on /reload.
  pi.on("session_start", (_e: any, ctx: any) => {
    const label =
      trigger === "off" ? "interject: off" : `interject: on (${keyLabel} while running = interrupt)`;
    ctx.ui?.setStatus?.("interject", label);
  });

  if (interceptBehavior === null) return; // "off": everything passes through.

  // Re-enable aborted assistant turns that carry thinking but no tool
  // calls, so the next model request includes the model's own partial CoT.
  pi.on("context", (event: any) => {
    const msgs: any[] = event.messages ?? [];
    let changed = false;
    const out = msgs.map((m) => {
      if (
        m &&
        m.role === "assistant" &&
        m.stopReason === "aborted" &&
        Array.isArray(m.content) &&
        m.content.some((b: any) => b?.type === "thinking") &&
        !m.content.some((b: any) => b?.type === "toolCall")
      ) {
        changed = true;
        return { ...m, stopReason: "stop" };
      }
      return m;
    });
    return changed ? { messages: out } : undefined;
  });

  pi.on("input", (event: any, ctx: any) => {
    const text: string = event.text ?? "";

    // Only hard-interrupt the configured interactive submission; the other
    // submit key keeps its default queued steer / follow-up behavior.
    if (event.source && event.source !== "interactive") return;
    if (event.streamingBehavior !== interceptBehavior) return;
    if (!text.trim()) return;
    if (text.startsWith("/") || text.startsWith("!")) return;

    // Cut the in-flight turn; deliver after settle.
    pending = { text, images: event.images };
    ctx.abort();
    ctx.ui?.notify?.("interject: cutting current turn", "info");

    // Already waiting: just keep the latest message (latest wins).
    if (waitingForSettle) return { action: "handled" };
    waitingForSettle = true;

    const off = pi.on("agent_settled", () => {
      off();
      waitingForSettle = false;
      const p = pending;
      pending = null;
      if (!p) return;
      try {
        const content =
          p.images && p.images.length > 0
            ? [{ type: "text" as const, text: p.text }, ...p.images]
            : p.text;
        pi.sendUserMessage(content);
      } catch (e: any) {
        ctx.ui?.notify?.(`interject: failed to submit — ${String(e)}`, "error");
      }
    });
    return { action: "handled" };
  });
}
