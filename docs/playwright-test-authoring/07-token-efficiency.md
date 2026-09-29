# Token Efficiency — Where They Go and How to Cut

## Where the tokens actually went (ranked)

| Cost | Est. tokens | Notes |
|---|---|---|
| **Conversation re-send across ~45 turns** | ~1–1.5 M processed (mostly cached) | Every tool round-trip resends the whole growing history. Dwarfs everything else. |
| `find` / `snapshot` outputs (~25 calls) | ~12,000 | Each `tail -40…-100` dumped the full **ancestor chain** around every match, not just the match line. |
| Thinking blocks (~30 turns) | ~7,000 | Much of the exploration was mechanical (find → click → find). |
| Spec file + replies | ~4,000 | Unavoidable. |
| Tool-discovery phase (cmds 4–10) | ~2,700 + 4 wasted turns + 1 hung browser | Pure "how do I invoke this CLI". |
| One full `cat` of the 95 KB snapshot (#12) | ~550 (would be ~24,000 un-persisted) | Dodged only because `playwright-cli` auto-persisted it to a file. |
| Test-run output (`tail -50`) | ~650 | Failure dump. |

---

## The dominant lever: fewer, fatter turns

42 separate `Bash` calls = 42 re-sends of an ever-larger transcript. Cutting
round-trips helps far more than trimming any single output.

### 1. Batch the walk into one script

Instead of ~30 interactive turns, write one shell script that does the whole
click-path and prints only what's needed, and run it once:

```bash
S="cli -s=ars47"
playwright-cli $S open "$URL"
playwright-cli $S click "getByRole('button',{name:'Devices'})"
playwright-cli $S click "getByRole('link',{name:'Explore Devices'})"
playwright-cli --raw $S find "Z Fold 8" | grep -E 'heading|Buy Now'
playwright-cli $S click "a[href\$='/add-to-cart/315']"
playwright-cli $S click "getByRole('tab',{name:'Graphite'})"
# ...
```

`playwright-cli` accepts **role / CSS / text locators directly**, so once you
know the labels you don't need refs or snapshots at all — you're essentially
writing the test as you walk.

### 2. Combine "act + verify" in one call

Several times an action was done in one turn and its result checked with a
separate `find` in the next. The `click` output already contains a fresh
snapshot link + the generated locator — ask for the slice you need in the
same call.

---

## Trim each output

### 3. `--raw` + `grep`, not `tail -N`

`playwright-cli --raw` strips the status / generated-code / snapshot-link
boilerplate. For `find`, you rarely need the ancestor tree:

```bash
playwright-cli --raw cli -s=ars47 find "Next" | grep -m1 -E 'button "Next"'
# -> button "Next" [disabled]       (~15 tokens instead of ~330)
```

### 4. Never `cat` a full snapshot

Go straight to `find` (cheap search) or `snapshot <ref> --depth=4` (bounded
subtree). The one full `cat` at #12 was avoidable.

### 5. Tighter test runs

```bash
npx playwright test <file> --project=incoming --reporter=line 2>&1 | tail -15
# on failure:
... 2>&1 | grep -E 'Error|expect|>.*\|'
```

---

## Remove the discovery tax

### 6. Record the invocation once

Commands 4–10 (~2,700 tokens, 4 turns, a stuck browser) were all "figure out
that it's `playwright-cli cli -s=<session> <cmd>`". A one-line note (project
README or an agent memory) eliminates that on every future run.

Key facts worth saving:

- stateful CLI = `playwright-cli cli -s=<session> <command>`
- a bare `playwright-cli -s=… open` fails (`unknown option '-s='`)
- `playwright-cli open --help` (no `cli`) **launches a real browser** and
  hangs the shell
- single-quote URLs containing `$` (the devices password is `YesMyDev123$@`)

### 7. Lower reasoning effort for the mechanical middle

The find → click → find loop doesn't need deep deliberation. Save the
thinking budget for the selector-design decisions (Z Fold 8 vs "Ultra", the
FPX strict-mode fix).

---

## What an efficient version of this run looks like

| | This run | Optimised |
|---|---|---|
| Interactive turns | ~42 | ~8–10 (one exploration script + a few fixes) |
| `find` / `snapshot` tokens | ~12,000 | ~3,000 (`--raw` + `grep`) |
| Discovery tokens | ~2,700 | ~0 (saved note) |
| Thinking tokens | ~7,000 | ~3,000 |
| **Net new context** | **~30,000** | **~10,000**, plus far less cumulative re-send from the turn cut |

Biggest bang: **batch the browser walk into a script (fewer turns)** and
**`--raw | grep` every query**. Everything else is incremental.

---

## Cheat sheet

| Want | Cheapest way |
|---|---|
| Find one control on a new page | `playwright-cli --raw cli -s=S find "Label" \| grep -m1 -E 'button\|tab\|textbox'` |
| See a whole form/card | `snapshot <ref> --depth=4` |
| Act without a ref | pass a locator string: `click "getByRole('tab',{name:'Graphite'})"` |
| Read an attribute | `eval "el => el.id" <ref>` |
| Run tests quietly | `--reporter=line 2>&1 \| tail -15` |
| Avoid huge snapshot dumps | never `cat` the `.playwright-cli/*.yml` files |
