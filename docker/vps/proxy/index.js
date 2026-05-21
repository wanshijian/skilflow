// Anthropic Messages API → OpenAI/DeepSeek Chat API Proxy
// Claude Code CLI → this proxy → DeepSeek API

import express from 'express';

const PORT = process.env.PROXY_PORT || 8787;
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';

// Model mapping: Anthropic model IDs → DeepSeek model IDs
function mapModel(anthropicModel) {
  const m = anthropicModel.toLowerCase();
  if (m.includes('haiku')) return 'deepseek-chat';
  if (m.includes('sonnet')) return 'deepseek-chat';
  if (m.includes('opus')) return 'deepseek-chat';
  return 'deepseek-chat';
}

// Convert Anthropic system blocks → single system string
function systemToString(system) {
  if (!system) return '';
  if (typeof system === 'string') return system;
  if (Array.isArray(system)) {
    return system
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n\n');
  }
  return String(system);
}

// Convert Anthropic messages → OpenAI messages
function convertMessages(anthropicMessages, systemStr) {
  const openaiMessages = [];
  if (systemStr) {
    openaiMessages.push({ role: 'system', content: systemStr });
  }
  for (const msg of anthropicMessages) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Flatten content blocks: text + tool_use → text representation
      const parts = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          parts.push(block.text);
        } else if (block.type === 'tool_use') {
          parts.push(`[Tool: ${block.name}(${JSON.stringify(block.input)})]`);
        } else if (block.type === 'tool_result') {
          parts.push(`[Result: ${block.content?.slice(0, 500) || ''}]`);
        }
      }
      content = parts.join('\n');
    }
    if (content) {
      openaiMessages.push({ role, content });
    }
  }
  return openaiMessages;
}

// Convert OpenAI response → Anthropic response
function toAnthropicResponse(openaiData, originalModel) {
  const choice = openaiData.choices?.[0];
  const content = choice?.message?.content || '';
  const finish = choice?.finish_reason || 'stop';

  return {
    id: `msg_${openaiData.id || Date.now()}`,
    type: 'message',
    role: 'assistant',
    model: originalModel,
    content: [{ type: 'text', text: content }],
    stop_reason: finish === 'stop' ? 'end_turn' : 'max_tokens',
    stop_sequence: null,
    usage: {
      input_tokens: openaiData.usage?.prompt_tokens || 0,
      output_tokens: openaiData.usage?.completion_tokens || 0,
    },
  };
}

// Convert OpenAI SSE stream → Anthropic SSE stream
function toAnthropicSSE(openaiChunk, originalModel) {
  const choice = openaiChunk.choices?.[0];
  if (!choice) return null;

  if (choice.delta?.content) {
    return {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: choice.delta.content },
    };
  }
  if (choice.finish_reason) {
    return { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: {} };
  }
  return null;
}

// ---- Server ----
const app = express();
app.use(express.json({ limit: '10mb' }));

// Health check for Claude Code (it probes /v1/messages sometimes)
app.get('/v1/messages', (req, res) => {
  res.json({ status: 'ok', provider: 'deepseek' });
});

// Main endpoint: Anthropic POST /v1/messages → DeepSeek POST /v1/chat/completions
app.post('/v1/messages', async (req, res) => {
  try {
    const { model, max_tokens, system, messages, stream, temperature } = req.body;
    const dsModel = mapModel(model || 'claude-sonnet-4-20250514');
    const systemStr = systemToString(system);
    const openaiMessages = convertMessages(messages || [], systemStr);

    const body = {
      model: dsModel,
      messages: openaiMessages,
      max_tokens: max_tokens || 8192,
      temperature: temperature || 0.7,
      stream: !!stream,
    };

    const upstream = await fetch(`${DEEPSEEK_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error(`DeepSeek error ${upstream.status}: ${errText.slice(0, 500)}`);
      return res.status(502).json({
        error: { type: 'upstream_error', message: `DeepSeek: ${upstream.status}` },
      });
    }

    if (stream) {
      // SSE streaming: DeepSeek SSE → Anthropic SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let started = false;

      // Send message_start
      res.write(`event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: `msg_${Date.now()}`, type: 'message', role: 'assistant', model: model, content: [], usage: {} } })}\n\n`);
      // Send content_block_start
      res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;

            try {
              const chunk = JSON.parse(data);
              const event = toAnthropicSSE(chunk, model);
              if (event) {
                if (event.type === 'content_block_delta') {
                  res.write(`event: content_block_delta\ndata: ${JSON.stringify(event)}\n\n`);
                } else if (event.type === 'message_delta') {
                  // will send at end
                }
              }
            } catch { /* skip malformed chunks */ }
          }
        }
      } catch (e) {
        console.error('Stream read error:', e.message);
      }

      // Send content_block_stop + message_delta + message_stop
      res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);
      res.write(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 0 } })}\n\n`);
      res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      res.end();
    } else {
      // Non-streaming
      const openaiData = await upstream.json();
      const anthropicResp = toAnthropicResponse(openaiData, model);
      res.json(anthropicResp);
    }
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: { type: 'proxy_error', message: err.message } });
  }
});

// Fallback: any other Anthropic endpoint → 404
app.all('*', (req, res) => {
  res.status(404).json({ error: { type: 'not_found', message: 'Only /v1/messages is supported' } });
});

app.listen(PORT, () => {
  console.log(`Anthropic→DeepSeek proxy listening on port ${PORT}`);
  console.log(`Upstream: ${DEEPSEEK_URL}`);
});
