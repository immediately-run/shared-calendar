# Shared calendar

A calendar for a family or a team, built as an [immediately.run](https://immediately.run)
app. **Events are files** — one JSON file per event in a space you share — so
everyone with access to the space sees the same calendar, and any day or event
can carry photos and documents.

## Try it

Open it on immediately.run:

**<https://immediately.run/present/github/immediately-run/shared-calendar/main/files/src/App.tsx>**

On first run it asks where the calendar should live:

- **Create a shared calendar** — makes a new space named "Calendar" (the host
  shows a consent dialog). Then share that space with people from
  immediately.run's Spaces page; the app itself cannot invite anyone.
- **Open an existing one** — pick a space that was shared with you (or one of
  your own) through the host's picker.
- **Keep it private** — stored in your private per-app folder, with zero
  prompts. Comes with a few sample events around today. You can switch to a
  shared calendar later from the badge in the top bar.

The choice is remembered and re-opened at the next launch.

## What it does

- **Month** view (default), **week** view and a **day** agenda; Today, previous
  and next. On a phone the month grid shows colored dots and a tap opens the
  day's agenda as a bottom sheet.
- Events have a title, date, an optional start/end time (or all-day), notes, a
  color tag, and remember who added them (`by`).
- **Repeats**: simple weekly or monthly rules with an optional end date. A
  repeating event is a single file; its occurrences are expanded in the client.
  Editing or deleting applies to the whole series.
- **Attachments** on an event, two ways:
  1. **Upload from device** — the file's bytes are written into the calendar's
     storage (`attachments/<eventId>/<name>`). Images show as thumbnails;
     PDFs and other files get Open / Save links.
  2. **Link a file from a space** — the platform's `pick-file` task browses a
     space and the event stores a *content reference* to the file (nothing is
     copied). Each viewer resolves it with their own consent (a "Show" button)
     before it is displayed.
- **Live updates**: a shared calendar polls the month on screen every 3 seconds,
  so other members' changes appear without a reload.
- Read-only members see everything but get no editing controls.

## How data is stored

Inside the chosen store (a space, or your private app folder):

```
events/<YYYY-MM>/<eventId>.json      one event per file (repeats live in the month of their first occurrence)
attachments/<eventId>/<filename>     uploaded bytes
```

`<private>/config.json` remembers the chosen store (`mode`, `spaceId`).
Because each event is its own file, two people editing different events never
overwrite each other; the last writer of the *same* event wins.

An event file looks like:

```json
{
  "id": "mtbyqtls-1pgu6y",
  "title": "Dentist",
  "date": "2026-08-30",
  "allDay": false,
  "start": "09:00",
  "end": "09:45",
  "notes": "Bring the insurance card.",
  "color": "sky",
  "repeat": "none",
  "attachments": [
    { "kind": "file", "id": "…", "name": "referral.pdf", "relPath": "attachments/mtbyqtls-1pgu6y/referral.pdf", "type": "application/pdf", "size": 48213 },
    { "kind": "ref", "id": "…", "name": "map.png", "ref": { "$cap": "file", "mountId": "space:…", "relPath": "trips/map.png", "mode": "ro" } }
  ],
  "by": "octocat",
  "created": "2026-08-27T19:00:00.000Z",
  "updated": "2026-08-27T19:00:00.000Z"
}
```

## Multi-user notes

- Sharing is the host's job: create or open a space here, then manage its
  members on immediately.run's Spaces page. A member's role (read-only /
  read-write) is what the app sees as the mount mode.
- Linked files are references into *some* space. When another member opens an
  event with a linked file, the host asks them once whether this app may read
  that file; declining (or a file that no longer exists) just shows a note.
- There are no remote change events on shared spaces, so the app polls the
  visible month's directory (and the `events/` root, for new months) every 3 s.

## SDK features used

`@immediately-run/sdk` (subpath imports only):

- `mounts`: `openSettings`, `createSpace`, `requestMount`, `mount('space:<id>')`,
  `makeContentRef`, `resolveContentRef`
- `tasks`: `invokeTask('pick-file', …)`, `capDir` (imported lazily — the module
  registers a task-input listener at evaluation and needs the host)
- `hooks`: `useObjectUrl` (with an `fs` fallback under `vite dev`)
- `auth`: `useAuth` for the writer's login
- `formFactor`: `useFormFactor` (plus a media query off-host)
- the async `fs` module, including binary `writeFile`/`readFile`

## Local development

```bash
npm install
npm run dev      # http://localhost:5173 — persistence goes to ./devfs-playground (git-ignored)
npm run build    # type-check + production build
npm run lint     # eslint, incl. the React Fast Refresh rule
```

Under `vite dev` there is no host, so the shared-store options are stubbed to a
local folder, and "Link a file from a space" reports that it needs the host.
To exercise the real thing, run the working tree inside the host with the CLI:
`immediately.run dev . --origin https://immediately.run`.

## License

MIT — see [LICENSE](./LICENSE).
