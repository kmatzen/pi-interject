# pi-interject

**Your agent is 30 seconds into the wrong plan. The fix you just typed queues *behind* the turn
you are trying to stop.**

While a pi agent runs, submits queue: plain Enter becomes a steer delivered at the next safe
point, the follow-up key queues for later. Both mean the model finishes the turn you already know
is wrong — spending tokens, editing files, sometimes committing the damage you saw coming — and
only then reads your correction.

pi-interject makes one submit key **hard-steer**: abort the in-flight turn now, deliver your
message as the next prompt as soon as the run settles.

## Install

```bash
pi install npm:pi-interject
```

## Configure

`interject.json` next to the extension (pi reloads with `/reload`):

```json
{ "trigger": "followUp" }
```

| `trigger` | Behaviour |
| --- | --- |
| `"followUp"` | the follow-up submit key hard-steers (default; bind it in `keybindings.json` under `app.message.followUp`) |
| `"enter"` | plain Enter hard-steers — aggressive, for people who mean it |
| `"off"` | extension inactive, every submit passes through |

## What hard-steer guarantees

The details are the product:

- **The partial turn is preserved in the session.** The session file keeps what the agent got
  through, with `stopReason: "aborted"` — nothing vanishes from your record.
- **Aborted submits always pass through untouched**: `/commands`, `!bash`, submits while idle,
  RPC and extension input. The extension never intercepts what isn't a running-turn submit.
- **Several presses before the run settles: latest wins.** No steering queue of your own panic.
- **Chain-of-thought replay stays intact where it is safe.** pi-ai drops every `aborted` assistant
  message from the next request — a good default against dangling tool calls, but it also throws
  away the model's partial thinking, so the model never sees its own reasoning from the turn you
  cut. This extension's context hook re-enables replay exactly where it is safe (thinking present,
  no tool calls in the aborted turn), request-local only: the session file keeps `aborted`, and
  turns with tool calls stay dropped.

## Why "hard" is the point

A queued steer optimizes for the agent's flow; a hard-steer optimizes for the moment you noticed.
When the in-flight turn is cheap, use the queue. When every remaining token of it is waste — the
plan is wrong, the push is happening, the refactor is carving the wrong abstraction — pull the
lever.

## Compatibility

TypeScript source loaded by pi directly; `@earendil-works/pi-coding-agent` is a peer dependency
and never bundled.

## License

MIT
