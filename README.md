# Poetry of China · 诗语中国

Learn classic Chinese poetry by putting it back together. Each poem is a rice-grid
fill-in game: recall the line, tap the tiles, hear every character. Pinyin and English
translations are available on demand.

## Stack

Next.js 16 (App Router, static export) · React 19 · Tailwind CSS v4

## Commands

```bash
npm install
npm run dev     # local dev server on http://localhost:3000
npm run build   # static export to ./out
```

## Structure

- `app/` — routes and global styles
- `components/` — poem card, game modal, leaderboard
- `data/poems/` — one JSON per poem (content, per-character pinyin, translation, audio paths)
- `lib/` — poem loading, display constants, leaderboard logic, audio playback
- `public/audio/` — pre-generated MP3 clips (whole lines and single characters)
- `scripts/` — audio generation and poem data validation

`python scripts/validate-poems.py` checks every poem's fields, line/pinyin alignment and
audio file presence before shipping new content.

## Notes

Progress and scores are stored in the browser (localStorage). The leaderboard currently
aggregates locally; a shared backend is a later step.
