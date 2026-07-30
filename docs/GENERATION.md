# Monthly Deliverable Generation — How It Works

Generation turns each active sponsor's package (plus any per-sponsor overrides)
into the concrete deliverable rows you owe for a given **service month**.

## Running it

Deliverables → pick a month with the arrows → **Generate monthly deliverables**.
You'll see a **preview** of exactly what will be created, grouped by sponsor, plus
how many already exist. Confirm to create them. A record of the run is saved.

## The rules

For each **active** sponsor subscription with **auto-generate enabled**:

1. **Date window.** Nothing is generated for months before the subscription's
   start month or after its end month.
2. **Effective deliverables.** The package's deliverable rules are merged with any
   per-sponsor overrides (override quantity replaces the package; `0` removes a
   type; a new type is added). This is what "Customize package" edits.
3. **Recurrence** decides which months a deliverable applies to, counted from the
   subscription's start month:
   - **Monthly** — every month
   - **Quarterly** — the start month, then every 3rd month
   - **Annually** — the start month, then every 12th month
   - **One time** — only the start month
   - **Custom** — treated as monthly (adjust manually if needed)
4. **Quantity → sequence.** A quantity of 2 creates "1 of 2" and "2 of 2".

## Safety: it never duplicates

Generation is **idempotent**. Each generated deliverable is uniquely keyed by
`(subscription, deliverable type, original service month, sequence)`. Running
generation again only creates the rows that are missing:

- Run it twice → the second run creates nothing (everything is "skipped").
- Increase a sponsor's quantity from 2 to 3, then re-run → only "3 of 3" is added.

## Manual deliverables

Use **Add deliverable** for one-offs that aren't part of a package. These are not
tied to a subscription and are never touched by generation.

## Carrying forward

If a deliverable isn't finished in its month, **Carry forward** moves it into the
next month for fulfillment while **preserving its original service month** (shown as
"Owed for"), so your history stays accurate. Carried items appear in the
"Carried forward" bucket of the fulfillment summary.

## Editing packages later

Editing a package changes **future** generation only. Deliverables already created
are separate records and are never rewritten.
