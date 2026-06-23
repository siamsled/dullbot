---
name: steep-ui
description: |
  Official Steep Style Reference (Soft dawn on a marble dashboard) defining colors, typography, spacing, border radii, shadows, layouts, and components for UI/UX engineering.
  Triggers on queries about frontend styling, landing pages, CSS design tokens, custom components, typography, layout gaps, or shadows.
---

# Steep — Style Reference
> Soft dawn on a marble dashboard

**Theme:** light

Steep is a daylight analytics workspace: an almost achromatic canvas of white and warm-gray surfaces warmed by a single, restrained rust-peach accent and softened by a serif/sans pairing that reads as editorial rather than enterprise. The hero is a peach-lit dawn — a soft radial glow behind a monumental Signifier headline and floating product cards — then the screen settles into a cool marble dashboard where the product does the talking. Signifier carries all display weight (a deliberate contrast against the utilitarian Sohne body), radii are generously large (24px cards feel like ceramic tiles, not windows), and the entire palette treats color as punctuation: chrome is monochrome, data visualization gets the only two chromatic voices (warm rust and cool blue), and one dark fill button does all the asking. The result feels closer to a magazine layout than a SaaS dashboard — calm, editorial, confident.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Ink | `#17191c` | `--color-ink` | Primary text, filled CTA buttons, dark surfaces — near-black with a whisper of warmth that pairs naturally with the peach accent |
| Pure White | `#ffffff` | `--color-pure-white` | Page canvas, card surfaces, text on dark buttons |
| Fog | `#f7f7f8` | `--color-fog` | Secondary canvas and section backgrounds, sidebar surfaces |
| Ash | `#4c4c4c` | `--color-ash` | Muted body text, secondary strokes |
| Graphite | `#777b86` | `--color-graphite` | Tertiary text, icon strokes, inactive link borders |
| Dove | `#a3a6af` | `--color-dove` | Hairline borders, placeholder text, low-emphasis dividers |
| Slate | `#8b8c8d` | `--color-slate` | Subtle icon and link borders in low-emphasis contexts |
| Obsidian | `#000000` | `--color-obsidian` | Sharp borders, hairlines, deep strokes — used at very small weights to delineate without color |
| Rust | `#5d2a1a` | `--color-rust` | Signature warm accent — donut chart strokes, chart line accents, warm data-viz borders, decorative strokes |
| Apricot Wash | `#fbe1d1` | `--color-apricot-wash` | Soft warm card background for warm-toned data widgets, hero glow tint |
| Sky Wash | `#d3e3fc` | `--color-sky-wash` | Soft cool card background for cool-toned data widgets and chat surfaces |

## Tokens — Typography

### Signifier — Display serif used exclusively for hero and section headlines — the only place the brand 'raises its voice'. Its editorial weight against Sohne's utility is the system's most distinctive typographic move · `--font-signifier`
- **Substitute:** GT Sectra, Tiempos Headline, Source Serif Pro, Source Serif 4, Georgia
- **Weights:** 400
- **Sizes:** 44px, 64px, 90px
- **Line height:** 1.10
- **Letter spacing:** -0.025em at 64-90px, -0.015em at 44px
- **Role:** Display serif used exclusively for hero and section headlines

### Sohne — Body and UI workhorse — navigation, buttons, table cells, form labels, captions · `--font-sohne`
- **Substitute:** Inter, Untitled Sans, Söhne (commercial), General Sans
- **Weights:** 400, 430, 450, 480, 500
- **Sizes:** 14px, 15px, 16px, 17px, 18px, 22px, 26px
- **Line height:** 1.25-1.50
- **Letter spacing:** -0.009em

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 14px | 1.5 | -0.13px | `--text-caption` |
| body | 16px | 1.38 | -0.14px | `--text-body` |
| body-lg | 18px | 1.35 | -0.16px | `--text-body-lg` |
| subheading | 22px | 1.25 | -0.2px | `--text-subheading` |
| heading-sm | 26px | 1.18 | -0.23px | `--text-heading-sm` |
| heading | 44px | 1.1 | -0.66px | `--text-heading` |
| heading-lg | 64px | 1.1 | -1.6px | `--text-heading-lg` |
| display | 90px | 1.1 | -2.25px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 4px
**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 28 | 28px | `--spacing-28` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |
| 96 | 96px | `--spacing-96` |
| 124 | 124px | `--spacing-124` |
| 128 | 128px | `--spacing-128` |
| 160 | 160px | `--spacing-160` |

### Border Radius

| Element | Value |
|---------|-------|
| tags | 9999px |
| cards | 24px |
| images | 12px |
| inputs | 16px |
| avatars | 9999px |
| buttons | 9999px |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| subtle | `rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08) 0px 20px 25px -5px, rgba(0, 0, 0, 0.08) 0px 8px 10px -6px` | `--shadow-subtle` |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 80px
- **Card padding:** 20-24px
- **Element gap:** 8px

## Components

### Filled Dark CTA
Pill shape (9999px radius), Ink (#17191c) background, white text at Sohne 15px weight 450, 8px 20px padding. The only filled button in the system; one per screen maximum.

### Text Link Button
Ink (#17191c) text, Sohne 15px weight 450, no border or background, paired horizontally with the filled CTA.

### Top Navigation Bar
White background, no shadow, Ink logo at left, horizontal nav links at Sohne 15px in Ink, ghost text-link and filled CTA grouped at right. Sticky, 64-72px tall.

### Product Dashboard Card
White surface, 24px radius, 20-24px internal padding, card shadow. Houses a single data visualization: bar chart, donut, line chart, or table.

### Warm Data Card
Apricot Wash (#fbe1d1) background, 24px radius, 20-24px padding. Contains warm-toned visualizations (donut with Rust stroke, line chart with Rust fill).

### Cool Data Card
Sky Wash (#d3e3fc) background, 24px radius, 20-24px padding. Contains cool-toned visualizations.

### Chat Input Field
White surface, 16-20px radius, 16px 20px padding, subtle 1px Dove border, 15px Sohne placeholder in Graphite. Black circular send button (40px, 9999px radius) anchored at right.

### AI Response Card
White surface, 24px radius, soft shadow, contains: light blue chart card (Sky Wash, 16px radius) with line chart in two colors (Rust for 'last month', blue for current), followed by H3 heading and body text in Ink and Ash.

## Do's and Don'ts

### Do
- Use Signifier exclusively at 44-90px for hero and section headlines; never below 40px.
- Set filled CTA radius to 9999px with Ink (#17191c) background — one per viewport.
- Use 24px radius for all content cards, 20px for inner padding, 12px for product image crops.
- Set letter-spacing to -0.009em on all Sohne text and -0.025em on Signifier 64px+.
- Build the signature card shadow as a three-layer stack: 1px ink-tinted border + 20px/25px drop + 8px/10px micro drop.

### Don't
- Don't use Signifier for body copy, labels, navigation, or anything below 40px.
- Don't introduce saturated blues, greens, or reds for UI chrome.
- Don't use sharp corners below 12px.
- Don't exceed one filled button per screen.
- Don't add borders heavier than 1px.
