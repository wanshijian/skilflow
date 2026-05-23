---
name: doc-cleanup
description: Clean and format AI-generated text into structured documents. Use when asked to 整理文档, clean Markdown, or format text for export.
---

# Document Cleanup

Clean AI-generated text by removing Markdown artifacts and restructuring into well-formatted documents ready for Word export.

## Workflow

### Step 1: Clean Markdown

Remove all formatting symbols while preserving content:
- `##`, `###` → remove, keep heading text
- `**bold**` → remove `**`, keep text
- `*italic*` → remove `*`, keep text
- `- item`, `* item`, `+ item` → remove markers
- `> quote` → remove `>`
- `` `code` `` → remove backticks
- ` ```blocks``` ` → remove fences
- Curly quotes `"" ''` → straight quotes
- Zero-width characters and control chars → remove
- Normalize multiple blank lines

### Step 2: Identify Structure

Semantically analyze the cleaned text:
- **Title**: Usually the first non-empty line or the most prominent short sentence
- **Headings**: Lines that semantically introduce a new topic section (not just short lines)
- **Paragraphs**: Body text, merge overly short adjacent paragraphs
- **Lists**: Consecutive items that form a natural list

### Step 3: Format for Output

Layout rules:
- Title: centered, prominent
- Headings: slightly larger, bold
- Paragraphs: first-line indent, 1.8 line height, 6px paragraph spacing
- Lists: bullet points with proper indentation

## Output Format

Output STRICT JSON only — no markdown wrapping, no explanation:

```json
{
  "title": "文档标题",
  "format": "normal",
  "sections": [
    { "type": "paragraph", "text": "正文段落内容..." },
    { "type": "heading", "level": 1, "text": "一级标题" },
    { "type": "heading", "level": 2, "text": "二级标题" },
    { "type": "list", "items": ["第一项", "第二项", "第三项"] }
  ],
  "stats": {
    "chars": 1234,
    "paragraphs": 8,
    "headings": 2
  }
}
```

## Format Presets

| Format | Target | Special Rules |
|---|---|---|
| normal | General document | Standard cleaning rules |
| gongwen | Official Chinese document | Formal tone, strict paragraph structure |
| wechat | WeChat public account | Short paragraphs, emoji-friendly, no indent |

## Edge Cases

- **Very short text** (< 50 chars): Return as single paragraph, infer title from content
- **No clear title**: Use first 20 chars as title
- **Purely code blocks**: Treat as plain text, remove fences
- **Mixed Chinese/English**: Preserve original language, don't translate
- **Tables in markdown**: Convert to readable paragraph format

## What NOT to Do

- Don't add content or commentary
- Don't change the meaning of text
- Don't remove meaningful content (only symbols/formatting)
- Don't output markdown — output bare JSON
- Don't translate or rewrite
