// SkillFlow Code Gen HTTP API
// Receives requests from Supabase Edge Functions, spawns Claude Code CLI

import { spawn } from 'child_process';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import express from 'express';

const PORT = process.env.CODE_GEN_PORT || 8081;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || 'dev-key';
const TIMEOUT_MS = parseInt(process.env.GENERATION_TIMEOUT || '300000', 10);

// Claude Code config: point to our proxy
const PROXY_URL = process.env.ANTHROPIC_BASE_URL || 'http://proxy:8787';
const WORKSPACE = process.env.WORKSPACE_DIR || '/workspace';
const SKILLS_DIR = process.env.SKILLS_DIR || '/skills';

function buildPrompt(type, params) {
  const prompt = params.prompt || '';
  const toolType = params.toolType || 'utility';
  const style = params.style || 'clean';
  const language = params.language || 'html';

  switch (type) {
    case 'tool': {
      let p = `生成一个单文件 HTML 工具。需求：${prompt}。类型：${toolType}。风格：${style}。

输出要求：
- 只输出完整的 HTML 文件，不要 markdown 包裹，不要解释
- 内联 CSS + JS，零外部依赖
- 必须能通过 file:// 协议双击打开
- 移动端响应式，使用触摸事件
- 中文界面
- 专业的视觉效果`;

      if (params.retryContext) {
        p += `\n\n## 这是根据用户反馈的重新生成
之前生成的 HTML（请在此基础上升级修改，不要完全推翻重做）：
\`\`\`html
${(params.retryContext.previousOutput || '').slice(0, 3000)}
\`\`\`

用户不满意的原因：${params.retryContext.userFeedback || '不符合预期'}

请在上述代码基础上，根据用户的反馈针对性修改。保持原有的好功能，只修复/优化用户提到的问题。`;
      }
      return p;
    }

    case 'app':
      return `生成一个 ${language} 应用。需求：${prompt}。

输出要求：
- 只输出完整代码，不要额外解释
- 对于 HTML：单文件内联 CSS+JS
- 对于 Python：可独立运行的脚本
- 中文界面，专业的视觉效果`;

    case 'doc':
      return `整理以下文本，去除 Markdown 符号，识别结构，输出 JSON：
{ text: "${(params.text || '').slice(0, 5000)}", format: "${params.format || 'normal'}" }

输出格式：{"title":"...","format":"normal","sections":[...],"stats":{...}}
只输出 JSON，不要其他内容。`;

    default:
      return prompt;
  }
}

function runClaudeCode(userPrompt, timeout) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ANTHROPIC_BASE_URL: PROXY_URL,
      ANTHROPIC_API_KEY: 'proxy-managed',  // proxy doesn't check this
      HOME: process.env.HOME || '/root',
      NO_COLOR: '1',
    };

    const child = spawn('claude', [
      '-p',
      '--output-format', 'json',
      '--no-session-persistence',
      userPrompt,
    ], {
      env,
      cwd: WORKSPACE,
      stdio: ['ignore', 'pipe', 'pipe'],  // ignore stdin (like < /dev/null)
      timeout,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        // Claude Code sometimes exits non-zero but still has useful output
        if (stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Claude Code exited ${code}: ${stderr.slice(0, 500)}`));
        }
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start Claude Code: ${err.message}`));
    });
  });
}

function parseOutput(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed.result || raw;
  } catch {
    return raw;
  }
}

// ---- Server ----
const app = express();
app.use(express.json({ limit: '10mb' }));

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-api-key'] || '';
  if (key !== SERVICE_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});

// Health
app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    proxy_url: PROXY_URL,
    skills_dir: SKILLS_DIR,
  });
});

// Tool generation
app.post('/generate/tool', async (req, res) => {
  try {
    const prompt = buildPrompt('tool', req.body);
    console.log(`[tool] generating: ${req.body.prompt?.slice(0, 80)}...`);

    const raw = await runClaudeCode(prompt, TIMEOUT_MS);
    const output = parseOutput(raw);

    // Extract HTML from Claude Code output (may contain surrounding text)
    const htmlMatch = output.match(/```html\s*([\s\S]*?)```/) || output.match(/```\s*([\s\S]*?)```/);
    const html = htmlMatch ? htmlMatch[1].trim() : output;
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : (req.body.prompt || 'Tool').slice(0, 50);

    res.json({ success: true, html, title });
  } catch (err) {
    console.error('[tool] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// App factory
app.post('/generate/app', async (req, res) => {
  try {
    const prompt = buildPrompt('app', req.body);
    console.log(`[app] generating: ${req.body.prompt?.slice(0, 80)}...`);

    const raw = await runClaudeCode(prompt, TIMEOUT_MS);
    const output = parseOutput(raw);

    const codeMatch = output.match(/```(?:\w+)?\s*([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : output;

    res.json({
      success: true,
      code,
      language: req.body.language || 'html',
      app: {
        title: (req.body.prompt || 'App').slice(0, 50),
        description: `A ${req.body.language || 'html'} application`,
        type: req.body.language || 'html',
      },
    });
  } catch (err) {
    console.error('[app] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Document cleanup
app.post('/cleanup/document', async (req, res) => {
  try {
    if (!req.body.text) return res.status(400).json({ error: 'Missing text' });
    const prompt = buildPrompt('doc', req.body);
    console.log(`[doc] cleaning ${req.body.text.length} chars...`);

    const output = await runClaudeCode(prompt, Math.min(TIMEOUT_MS, 60000));

    const jsonMatch = output.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      title: '文档', sections: [], stats: { chars: req.body.text.length, paragraphs: 0 },
    };

    res.json({ success: true, output: parsed });
  } catch (err) {
    console.error('[doc] error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SkillFlow Code Gen API listening on port ${PORT}`);
  console.log(`Proxy: ${PROXY_URL}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Skills: ${SKILLS_DIR}`);
});
