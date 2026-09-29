# Why keep running `find` when a snapshot already exists?

Question raised in the session:

> We ran `find --regex "/\"Next\"|skip|accessor/i"` to locate the accessories
> page's Next button. Why do that if we already have a snapshot of the page
> and can access any element from it?

Because "the snapshot we already have" is **stale the moment the page
changes**, and it isn't even in context. Four reasons:

---

## 1. Refs are per-snapshot, not stable IDs

Every navigation or re-render throws away the old refs and mints new ones.
You can see it in the prefixes across this one test:

| Page | Ref prefix | Example |
|---|---|---|
| `/devices/` | `e` | `e31` (Devices nav) |
| after "Explore Devices" | `f2e` | `f2e150` (Z Fold 8 heading) |
| `/cart` | `f4e` | `f4e76` (Graphite tab) |
| `/verification` | `f5e` | `f5e138` (Full Name) |
| `/accessories` | `f6e` | `f6e140` (Next) |
| `/delivery-addresses` | `f7e` | `f7e167` (Next) |
| `/payment` | `f8e` | `f8e188` (Pay Now) |

After clicking **Next** on `/verification` and landing on `/accessories`,
**every `f5e…` ref is dead**. The accessories page's Next button has a ref
(`f6e140`) that only exists once you read that page.

---

## 2. `playwright-cli` hands you a *link*, not the snapshot content

After an action the output is:

```
### Snapshot
- [Snapshot](.playwright-cli/page-2026-08-28T08-49-03-171Z.yml)
```

The tree is written to a **file on disk**. To act on an element you need its
`ref`, and to get that you must look *inside* that file. Options:

| How | Cost |
|---|---|
| `cat` the whole file | The `/devices/` tree was **95.6 KB ≈ 24,000 tokens**. |
| `snapshot <ref>` | Needs a ref you don't have yet. |
| **`find "Next"`** | Returns just the matching node(s) + ~3 lines of context: **~330 tokens**. |

`find` is the targeted way to convert "I'm on a new page" into "here is the
ref and state of the one control I care about".

---

## 3. `find` also reports the element's *state*

```
button "Next" [disabled]                        <- form incomplete, keep filling
button "Next" [ref=f6e140] [cursor=pointer]     <- safe to click / assert toBeEnabled()
```

That single distinction drove the `await expect(next).toBeEnabled()` guard
before every `Next` click in the spec. Finding it by eye in a wall of YAML
would be slow and error-prone.

---

## 4. Signal vs noise

On a page with hundreds of nodes, `find "Next"` immediately isolates the one
interactive element and its context. A full `snapshot` buries it.

---

## The workflow, stated correctly

```
navigate ─▶ page writes a fresh snapshot to DISK
        ─▶ find "<label>"   (cheap search of that file → ref + state)
        ─▶ act on the ref   (playwright-cli prints the locator code)
        ─▶ paste into spec
```

`snapshot` (full) or `snapshot <ref> --depth=N` (bounded subtree) is only
worth pulling into context when you genuinely need to see a whole region at
once — e.g. reading an entire form's fields in one go
(`snapshot f5e114` for the verification form).

---

## Rule of thumb

| Situation | Use |
|---|---|
| "I'm on a new page, where is control X?" | `find "X"` |
| "Show me every field in this form / card" | `snapshot <container-ref> --depth=4` |
| "I need the whole page tree" (rare) | full `snapshot` — and let it persist to a file, never `cat` it |
| "I need an attribute not shown (id, data-*, class)" | `eval "el => el.id" <ref>` |
