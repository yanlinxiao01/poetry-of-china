# Poetry of China - Technical Specification

## 1. Concept & Vision

**Poetry of China (诗语中国)** is a serene, immersive web experience for foreigners discovering Chinese classical poetry. The design channels the aesthetic of traditional ink wash paintings — mountains emerging from mist, moonlight on water, falling plum blossoms — while remaining clean, modern, and accessible. Every interaction should feel unhurried and contemplative, like turning pages in an ancient anthology.

---

## 2. Design Language

### Aesthetic Direction
Traditional Chinese ink wash painting meets modern editorial design. Warm parchment backgrounds, ink gradients, subtle geometric mountain silhouettes, and careful use of negative space. The feeling is "a beautifully preserved manuscript in a contemporary museum."

### Color Palette
| Role | Hex | Usage |
|------|-----|-------|
| Background | `#fff7ed` | Warm cream — primary surface |
| Background Alt | `#ffedd5` | Warm peach — section accents |
| Primary | `#ea580c` | Burnt orange — CTAs, highlights |
| Primary Dark | `#c2410c` | Deep orange — hover states |
| Accent | `#f43f5e` | Rose — secondary accent, tags |
| Text Primary | `#1c1917` | Near black — headings |
| Text Secondary | `#57534e` | Warm gray — body text |
| Text Muted | `#a8a29e` | Stone — captions |
| Border | `#fed7aa` | Soft orange — borders, dividers |

### Typography
- **Display/Headings**: `Noto Serif SC` (Chinese) + `Georgia` (English fallback) — scholarly elegance
- **Body**: `Inter` — clean readability for English
- **Mono/Pinyin**: `Noto Sans SC` — modern, legible for romanization

### Spatial System
- Base unit: 4px
- Section padding: 80px (desktop), 48px (mobile)
- Container max-width: 1280px
- Card border-radius: 32px (large), 16px (small)
- Component spacing: 24px grid gap

### Motion Philosophy
- Subtle entrance animations: fade-up with 400ms ease-out
- Hover interactions: gentle lift (`translateY(-4px)`) with shadow expansion
- Page transitions: crossfade between routes
- No jarring or playful animations — everything feels measured and intentional

### Visual Assets
- **Icons**: Minimal line icons, custom Chinese character glyphs for branding
- **Images**: Gradient-based abstract landscapes (no external image dependencies)
- **Decorative**: Subtle SVG mountain silhouettes, ink splatter textures via CSS

---

## 3. Layout & Structure

### Navigation
Fixed top navigation with blur backdrop. Structure:
- Logo (left): Character mark + bilingual name
- Links (center): Poems, Culture, Name Generator, Videos, About
- CTA (right): "Start Learning" button

### Page Architecture

| Route | Purpose | Key Components |
|-------|---------|----------------|
| `/` | Homepage | Hero, Feature Cards, Featured Poems, Audio Section, Culture Topics, Name Generator Preview, Video Section, CTA, Footer |
| `/poems` | Poem library | Filter bar, poem grid with metadata |
| `/poems/[slug]` | Poem detail | Full poem with pinyin/translation toggle, audio player, annotations, cultural connections |
| `/culture` | Culture topics | Topic grid with categories |
| `/culture/[slug]` | Culture article | Long-form content with related poems |
| `/name-generator` | Name generator | Full form with options, results display |
| `/videos` | Video lessons | Placeholder with YouTube embed ready |
| `/about` | About | Mission, team, acknowledgments |

### Responsive Strategy
- Desktop: Multi-column layouts, generous whitespace
- Tablet: 2-column grids, reduced padding
- Mobile: Single column, stacked navigation (hamburger menu)

---

## 4. Features & Interactions

### Homepage
- **Hero**: Full-bleed gradient background with floating mountain SVG, animated text reveal
- **Feature Cards**: 3-column grid with icon, hover lift effect
- **Featured Poems**: 6-card grid, each card shows title/pinyin/author/difficulty/tags
- **Audio Section**: Gradient panel with interactive audio player mockup
- **Culture Topics**: 8-tile grid with emoji icons
- **Name Generator**: Split-panel with preview and form
- **CTA**: Centered gradient banner

### Poems List (`/poems`)
- Filter chips: Dynasty (Tang/Song), Difficulty (Beginner/Intermediate/Advanced), Theme (Moon/Nature/etc.)
- Sort options: Alphabetical, Difficulty, Recently Added
- Card: Title, pinyin, author, dynasty badge, excerpt, audio indicator

### Poem Detail (`/poems/[slug]`)
- **Header**: Title block with author/dynasty/difficulty
- **Display Modes**: Toggle buttons for Original / Pinyin / Translation / Side-by-side
- **Audio Player**: Full poem + line-by-line buttons, play/pause, speed control
- **Annotations**: Hover/tap on words for definitions, cultural notes
- **Appreciation**: Curated English explanation
- **Cultural Links**: Related culture topics
- **Video Area**: YouTube embed placeholder

### Culture Pages
- Topic cards with emoji, brief description
- Article page with rich content, related poem sidebar

### Name Generator (`/name-generator`)
- **Inputs**: Name, gender tendency, style, cultural imagery, length, pronunciation preference
- **Output**: 3-5 name suggestions with pinyin, meaning, character breakdown, style notes
- **Regeneration**: "Generate more" button

### Videos (`/videos`)
- Grid of video placeholders
- Each card: thumbnail area, title, poem association
- YouTube iframe embed (lazy loaded)

### Error States
- 404: "Poem not found" with return home link
- Empty search: "No poems match your search" with reset button
- Loading: Skeleton cards with pulse animation

---

## 5. Component Inventory

### Navigation (`<Header>`)
- States: Default (transparent), Scrolled (blur + border)
- Mobile: Hamburger menu with slide-in drawer

### Poem Card (`<PoemCard>`)
- States: Default, Hover (lift + shadow), Loading (skeleton)
- Variants: Compact (list view), Expanded (grid view)

### Audio Player (`<AudioPlayer>`)
- States: Idle, Playing, Loading, Error
- Controls: Play/pause, progress, speed toggle, line selector

### Filter Chip (`<FilterChip>`)
- States: Default, Selected, Disabled
- Variants: Checkbox-style, radio-style

### Name Result Card (`<NameCard>`)
- States: Default, Highlighted (user selected)
- Content: Chinese name, pinyin, meaning, character analysis

### Button (`<Button>`)
- Variants: Primary (gradient), Secondary (outline), Ghost
- States: Default, Hover, Active, Disabled, Loading

### Toggle (`<DisplayToggle>`)
- Options: Original / Pinyin / Translation
- States: Unselected, Selected

---

## 6. Technical Approach

### Framework
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling (via CDN/plugin)

### Project Structure
```
app/
├── layout.tsx          # Root layout with navigation
├── page.tsx            # Homepage
├── poems/
│   ├── page.tsx        # Poems list
│   └── [slug]/page.tsx # Poem detail
├── culture/
│   ├── page.tsx        # Culture topics
│   └── [slug]/page.tsx # Culture article
├── name-generator/page.tsx
├── videos/page.tsx
└── about/page.tsx

components/
├── Header.tsx
├── Footer.tsx
├── PoemCard.tsx
├── AudioPlayer.tsx
├── FilterChips.tsx
├── NameCard.tsx
└── ...

data/
├── poems/              # Poem content (MDX or JSON)
├── culture/            # Culture articles
└── poets/             # Poet data
```

### Data Model

**Poem**
```typescript
interface Poem {
  slug: string;
  title: string;
  pinyin: string;
  englishTitle: string;
  author: string;
  authorPinyin: string;
  dynasty: 'Tang' | 'Song';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  themes: string[];
  audio: {
    full: string;
    lines: string[];
  };
  youtubeId?: string;
  content: {
    original: string[];
    translation: string[];
    annotations: Record<string, string>;
  };
  appreciation: string;
  relatedCulture: string[];
}
```

**Culture Article**
```typescript
interface CultureArticle {
  slug: string;
  title: string;
  category: 'poets' | 'dynasties' | 'imagery' | 'themes' | 'forms' | 'festivals';
  summary: string;
  content: string;
  relatedPoems: string[];
  keywords: string[];
}
```

**Name Generation**
```typescript
interface NameRequest {
  name: string;
  genderTendency: 'neutral' | 'feminine' | 'masculine' | 'any';
  style: string[];
  imagery: string[];
  length: 2 | 3;
  preference: 'meaning' | 'sound' | 'balanced';
}

interface NameResult {
  chinese: string;
  pinyin: string;
  meaning: string;
  characters: { char: string; meaning: string }[];
  style: string;
  imagery: string[];
}
```

### API Routes (Future Phase 2)
- `POST /api/name` — Generate Chinese names
- `POST /api/audio` — Generate TTS audio (Phase 2)
- `POST /api/pronunciation` — Speech recognition + scoring (Phase 2)

### Content Management
Phase 1: JSON files in `/data` directory
Phase 2: MDX for richer content
Phase 3: Headless CMS (Contentful, Sanity)

### Deployment
- **Vercel** (free tier)
- Environment variables for API keys
- Edge caching for static content
