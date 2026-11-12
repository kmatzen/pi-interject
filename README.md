# pi-interject

**Your agent is 30 seconds into a plan you know is wrong, and the fix you just typed queues
*behind* the turn you are trying to stop.**

While a pi agent runs, every submit queues. Enter delivers a steer at the next safe point; the
follow-up key queues for later. Both mean the agent finishes the turn you already know is a
waste — spending tokens on a plan you rejected, editing files you can see it mangling — and reads
your correction *after*.

pi-interject makes one key **hard-steer**: the in-flight turn aborts, and the message you wrote is
the next prompt as soon as the run settles. One keystroke — the turn stops, the steer lands.

## Why not just Esc?

pi can abort a running turn, and people forget how much work the second half of that is. Esc
stops the agent; then you re-read the half-finished turn, write the correction you were already
typing, and send. The moment has passed, and the model has lost its own partial reasoning —
pi-ai drops `aborted` assistant messages from the next request (see the replay note below), so
the thinking that produced the failure is invisible to the fix.

An interject is one action, taken while you still know everything the agent is about to forget:
the message you already wrote lands at the exact settle point, with the partial turn preserved
for the model to read.

## What happens when you interject

The details are the product:

- **The partial turn stays in the session**, with `stopReason: "aborted"`. Nothing vanishes from
  the record, and the model sees what it was in the middle of.
- **The model can read its own interrupted thinking.** pi-ai's drop-aborted-messages rule is the
  right defense against dangling tool calls, and it also quietly deletes the partial thinking of
  the turn you cut. A context hook re-enables replay exactly where it is safe — thinking present,
  no tool calls — request-local only; turns with tool calls stay dropped, the session file keeps
  `aborted`.
- **Multiple presses before the run settles: latest wins.** No queue of your own panic.
- **Nothing else is intercepted.** `/commands`, `!bash`, submits while idle, and RPC/extension
  input always pass through. Plain Enter keeps queueing steers and the follow-up key keeps
  queueing follow-ups — hard-steer is opt-in, per key, by configuration.

## Configure

`interject.json` next to the extension (reload with `/reload`):

```json
{ "trigger": "followUp" }
```

| `trigger` | Behaviour |
| --- | --- |
| `"followUp"` | the follow-up submit key hard-steers (default; bind it under `app.message.followUp` in `keybindings.json`) |
| `"enter"` | plain Enter hard-steers — for people who mean it every time |
| `"off"` | extension inactive; every submit passes through |

## Why "hard" is the point

A queued steer optimizes for the agent's flow. A hard-steer optimizes for the moment you noticed.
When the remaining tokens of the in-flight turn are waste — the plan is wrong, the push is
happening, the refactor is carving the wrong abstraction — you should be able to stop the clock
and say the thing, in one motion.

## Install

```bash
pi install npm:pi-interject
```

TypeScript source loaded by pi directly; `@earendil-works/pi-coding-agent` is a peer dependency
and never bundled. No keys, no telemetry, no configuration required to try it.

## License

MIT
