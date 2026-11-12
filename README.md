# pi-interject

Your agent is thirty seconds into a plan you know is wrong. You type the fix and hit Enter, and
nothing happens: the message is queued behind the very turn you are trying to stop, and the agent
will finish the detour before it reads a word of it.

pi-interject turns one key into a hard steer. The running turn stops immediately, and the message
you wrote becomes the next prompt as soon as the session settles. One keystroke, at the moment you
noticed.

## Why not just Esc?

pi can already interrupt a running turn, and it is worth being clear about what that costs you.
Esc stops the agent where it stands. Then you read the half-finished turn, reconstruct the
correction you were already typing, and send it as a fresh message. By then the moment has passed,
and the model is worse off too: pi drops interrupted assistant messages from the next request, so
the partial reasoning that produced the failure is not available to the agent that has to fix it.

An interject is a single gesture made while you still have the whole picture. The message you
already wrote lands at the exact settle point, and the partial turn is kept in the record so the
model can see what it was doing when you cut in.

## What happens when you interject

The care is in the details:

- The partial turn stays in the session, marked `stopReason: "aborted"`. Nothing is deleted, and
  the model can see what it was in the middle of.
- The model can still read its own interrupted thinking. pi's rule of dropping aborted messages
  is the right protection against dangling tool calls, but it sweeps away the partial thinking of
  the turn you cut along with them. This extension re-enables that thinking in the narrow case
  where replaying it is safe (the turn has thinking and no tool calls), and only for the request
  immediately following. The session file is left alone, and turns that contain tool calls stay
  dropped.
- Pressing the key several times before the session settles is fine: the last press wins. The
  queue of your own panic does not pile up.
- Nothing else is touched. Plain Enter keeps queueing steers, the follow-up key keeps queueing
  follow-ups, and `/commands`, `!bash`, submits while idle, and RPC or extension input all pass
  through untouched. Hard-steering is opt-in, per key, in configuration.

## Configure

Create `interject.json` next to the extension and run `/reload`:

```json
{ "trigger": "followUp" }
```

| `trigger`  | Behaviour                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `followUp` | the follow-up submit key hard-steers (the default; bind it under `app.message.followUp` in `keybindings.json`) |
| `enter`    | plain Enter hard-steers, for people who mean it every time                                          |
| `off`      | the extension is inactive and every submit passes through                                           |

## Why "hard" matters

Queued steers are designed for the agent's flow. Hard steering is designed for the moment you
realised something was wrong. When the plan has gone sideways, or a push is under way, or a
refactor is cutting the wrong abstraction, every remaining token of the running turn is waste. You
should be able to stop the clock and say the thing, in one motion.

## Install

```bash
pi install npm:pi-interject
```

This is TypeScript source, loaded directly by pi. It declares `@earendil-works/pi-coding-agent` as
a peer dependency and bundles nothing. No keys, no telemetry, no configuration required to try it.

## License

MIT
