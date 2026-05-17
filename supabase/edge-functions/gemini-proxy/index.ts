// Supabase Edge Function: gemini-proxy
// 安全中转 Gemini API 调用，前端不直接暴露 API Key

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

serve(async (req: Request) => {
  try {
    const { prompt, systemInstruction } = await req.json()

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemInstruction
          ? { parts: { text: systemInstruction } }
          : undefined,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
