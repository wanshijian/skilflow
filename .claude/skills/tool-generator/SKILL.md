---
name: tool-generator
description: Generate single-file HTML tools for the SkillFlow platform. Use when asked to create downloadable mini-apps, tools, widgets, or utilities.
---

# Tool Generator

Generate production-ready single-file HTML tools for SkillFlow. Every tool must be a complete, polished product — not a demo or prototype.

## Golden Rules

1. **Output ONLY the complete HTML file** — No markdown wrapping, no explanations, no "here's your code" preamble
2. **Self-contained** — All CSS and JS inline. Zero external dependencies unless a CDN library is truly essential
3. **file:// ready** — Must open via double-click in any browser, no server needed
4. **Truly responsive** — Mobile + desktop, flexbox/grid, touch events for mobile, min touch target 44px
5. **Chinese UI** — All labels, placeholders, error messages, and instructions in Chinese
6. **Production polish** — Not bare-bones. Proper spacing, colors, shadows, typography, transitions
7. **Graceful errors** — Handle empty input, invalid data, edge cases with friendly Chinese error messages
8. **Self-explanatory** — User should understand the tool instantly without reading instructions

## Design System (Non-Negotiable)

```css
:root {
  --bg: #0F172A;
  --card: #1E293B;
  --text: #FAFAF9;
  --text-secondary: #94A3B8;
  --accent: #F97316;
  --border: rgba(255,255,255,0.1);
  --radius: 12px;
  --radius-lg: 16px;
  --shadow: 0 4px 20px rgba(249,115,22,0.2);
  --font: Inter, system-ui, -apple-system, sans-serif;
}
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
```

- Primary buttons: `linear-gradient(135deg, #ea580c, #f97316)` + box-shadow + white text
- Cards: `#1E293B` background, subtle border, 16px radius
- 8px spacing baseline throughout
- Dark theme — not pure black (#0F172A has blue warmth)

## Quality Checklist

Before outputting, mentally verify:
- [ ] Opens via double-click in any modern browser
- [ ] All buttons, inputs, interactions work without errors
- [ ] Empty/invalid input shows a Chinese error message (not a JS console error)
- [ ] Works on 375px phone AND 1440px desktop
- [ ] Visual hierarchy is clear: title → controls → result area
- [ ] User can figure it out in 3 seconds without instructions
- [ ] Scrollbars, focus states, hover states all styled
- [ ] No broken references, dead code, or unused CSS

## Tool Type Patterns

### Converter
User needs to transform data. Key UX: input area → action button → result area. Support drag-and-drop file upload where relevant.

### Generator
User needs output from parameters. Key UX: parameter inputs → live preview or generate button → copy/download result.

### Calculator  
User needs computation. Key UX: inputs → real-time or button-triggered calculation → prominent result display.

### Text Tool
User manipulates text. Key UX: input textarea → action buttons → output textarea. Often benefits from side-by-side layout on desktop.

### Game
User wants entertainment. Key UX: game canvas/board → score display → controls. Use Canvas for animations, DOM for simpler games. Always support touch controls for mobile.

### Utility
Catch-all for timers, todo lists, notes, clipboard tools. Key UX: minimal controls, maximum clarity.

## Retry / Fix Mode

When given a `retryContext` with previous HTML and user feedback:
- **Edit the existing code, don't rewrite from scratch**
- Only fix what the user specifically complained about
- Keep all other features intact
- If the user said "样式太简陋" — enhance the visual design without changing functionality
- If the user said "功能不对" — fix the specific feature without touching the visual design

## Common Mistakes to Avoid

- ❌ White/light backgrounds — use the dark theme
- ❌ Tiny buttons on mobile — minimum 44px touch targets
- ❌ English UI — everything should be Chinese
- ❌ Bare-bones HTML with no styling — use shadows, gradients, transitions
- ❌ Ignoring the tool type hint — if user says "游戏", make a real game, not a static page
- ❌ JavaScript errors on empty input — validate before processing
- ❌ Outputting markdown-wrapped code — just the raw HTML file
