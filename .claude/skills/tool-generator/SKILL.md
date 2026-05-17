---
name: tool-generator
description: Generate single-file HTML tools for the SkillFlow platform. Use when asked to create downloadable mini-apps, tools, widgets, or utilities.
---

# Tool Generator

Generate production-ready single-file HTML tools. Every tool must work when double-clicked and opened in any browser.

## Rules

1. Output ONLY the complete HTML file. No markdown wrappers, no explanations.
2. Self-contained: inline CSS + JS. Zero external dependencies unless CDN library is essential.
3. Must work via `file://` protocol (no server needed).
4. Responsive: mobile + desktop. Use touch events for mobile interaction.
5. Include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
6. Clear UI with title, instructions, and visual hierarchy.
7. Graceful error handling with user-friendly messages.
8. Professional appearance — not bare-bones. Use proper spacing, colors, and typography.

## Quality Checklist

Before outputting, verify:
- [ ] Opens via double-click in any browser
- [ ] All interactions work without errors
- [ ] Handles empty/invalid input gracefully
- [ ] Mobile responsive (flexbox/grid, touch events)
- [ ] Visual hierarchy clear (heading, body, actions)
- [ ] Self-explanatory — user doesn't need instructions

## Common Tool Types

- **converter**: Format conversion (Word→PDF, image compression, JSON↔CSV)
- **generator**: Generate output from input (QR code, password, UUID)
- **calculator**: Compute results (BMI, mortgage, unit conversion)
- **text-tool**: Text manipulation (Markdown preview, regex tester, diff viewer)
- **game**: Simple games (snake, 2048, minesweeper, memory card)
- **utility**: Miscellaneous (timer, todo list, notes, clipboard tools)

## Output Format

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tool Name</title>
  <style>/* Complete styles here */</style>
</head>
<body>
  <!-- Tool UI here -->
  <script>// All logic here</script>
</body>
</html>
```
