# UI Design System & Taste (Apple HIG + Fluent 11 Aesthetic)

When generating or editing UI components for Dullbot, strictly follow these visual design and micro-interaction guidelines to ensure a modern, premium desktop/web aesthetic.

## 1. Visual Hierarchy & Surface Aesthetics
- **Vibrancy & Translucency:** Use backdrop blur (`backdrop-blur-md` / `backdrop-blur-xl`) with subtle semi-transparent dark/light surfaces (`bg-background/80` or `bg-white/70 dark:bg-zinc-900/80`).
- **Borders & Separation:** Avoid heavy 1px solid high-contrast borders. Use ultra-subtle borders (`border border-white/10 dark:border-white/5` or `border-zinc-200/50`).
- **Corner Radii:** Use smooth continuous squircle-style curves (`rounded-2xl` for cards/modals, `rounded-xl` for buttons/inputs, `rounded-lg` for badges/pills).
- **Shadows & Elevation:** Multi-layered soft ambient shadows (`shadow-sm`, `shadow-md` with soft opacity). Avoid default harsh shadows.

## 2. Typography & Layout
- **Font Stack:** Clean, neutral system typography (`font-sans`, `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI"`).
- **Whitespace & Padding:** Generous padding (`p-6` or `p-8` for container cards; `px-4 py-2.5` for buttons). Never crowd text against borders.
- **Micro-Copy:** Crisp, sentence-case text with clear hierarchy through opacity levels (`text-foreground`, `text-muted-foreground`, `text-zinc-400`).

## 3. Interactive Polish & Micro-Interactions
- **Active State Feedback:** Smooth transitions on hover and press (`transition-all duration-200 ease-out`, `hover:bg-accent/80 active:scale-[0.98]`).
- **Focus Rings:** Subtle focus-visible rings with smooth outline offsets (`focus-visible:ring-2 focus-visible:ring-primary/50`).
- **Status Indicators:** Vibrant colored accents (emerald green for success, amber for warnings, indigo/rose for primary actions) with subtle glow effects.
