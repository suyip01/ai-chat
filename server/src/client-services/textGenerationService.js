import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js'

export class TextGenerationService {
  constructor() {
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ASR_API_KEY;
    const baseURL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || process.env.ASR_BASE_URL;
    this.client = new OpenAI({ apiKey, baseURL });
    this.systemPrompt = null;
    this.timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 120000);
    this.retryCount = Number(process.env.LLM_RETRY || 2);
    this.lastAttempts = 0;
  }

  async loadSystemPrompt() {
    if (this.systemPrompt) return this.systemPrompt;
    this.systemPrompt = process.env.SYSTEM_PROMPT || '你是一位温暖、可靠的中文情感陪伴者，请用清晰、尊重边界且可操作的建议进行回应。';
    return this.systemPrompt;
  }

  buildMessages(history, latestUserText, systemPromptOverride) {
    const messages = [];
    const sys = systemPromptOverride || this.systemPrompt;
    if (sys) messages.push({ role: 'system', content: sys });
    const normalized = Array.isArray(history) ? history.filter(x => x && typeof x.content === 'string') : [];
    const sliced = normalized.slice(-40);
    for (const m of sliced) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      messages.push({ role, content: m.content });
    }
    const lt = (latestUserText || '').trim();
    const last = sliced.length ? sliced[sliced.length - 1] : null;
    const isDup = last && (last.role === 'user') && (String(last.content || '').trim() === lt);
    if (lt && !isDup) messages.push({ role: 'user', content: latestUserText });
    return messages;
  }

  async generateResponse(history, latestUserText, systemPromptOverride, modelOverride, temperatureOverride, context = {}) {
    await this.loadSystemPrompt();
    const messages = this.buildMessages(history, latestUserText, systemPromptOverride);
    const wlog = createLogger({ component: 'llm' })
    wlog.info('llm.request', { userId: context.userId, sid: context.sid, messageCount: messages.length })
    wlog.debug('llm.messages.full', { messages })
    try { console.log('\x1b[31mLLM REQUEST MESSAGES\x1b[0m', JSON.stringify(messages)); } catch {}
    const model = modelOverride || process.env.LLM_MODEL;
    const temperature = typeof temperatureOverride === 'number' ? temperatureOverride : 0.2;
    wlog.info('llm.params', { userId: context.userId, sid: context.sid, model, temperature })
    const withTimeout = (p, ms) => new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('llm_timeout')), ms);
      p.then(r => { clearTimeout(t); resolve(r); }).catch(e => { clearTimeout(t); reject(e); });
    });
    let lastErr = null;
    this.lastAttempts = 0;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const t0 = process.hrtime.bigint()
        wlog.info('llm.attempt', { userId: context.userId, sid: context.sid, attempt: i + 1 })
        const resp = await withTimeout(this.client.chat.completions.create({ model, messages, temperature }), this.timeoutMs);
        const out = resp.choices?.[0]?.message?.content || '';
        const durMs = Number(process.hrtime.bigint() - t0) / 1e6
        wlog.info('llm.success', { userId: context.userId, sid: context.sid, attempt: i + 1, duration_ms: Math.round(durMs), rawLen: String(out).length })
        wlog.debug('llm.success.full', { userId: context.userId, sid: context.sid, content: out })
        try { console.log('\x1b[31mLLM OUTPUT CONTENT\x1b[0m', out); } catch {}
        this.lastAttempts = i + 1;
        if (String(out).trim().length === 0) throw new Error('llm_empty');
        return out;
      } catch (e) {
        lastErr = e;
        wlog.error('llm.error', { userId: context.userId, sid: context.sid, attempt: i + 1, message: e?.message || String(e), stack: e?.stack })
        if (i < this.retryCount) {
          const backoff = Math.min(2000 * (i + 1), 8000);
          wlog.info('llm.backoff', { userId: context.userId, sid: context.sid, attempt: i + 1, delay_ms: backoff })
          await new Promise(res => setTimeout(res, backoff));
          continue;
        }
      }
    }
    wlog.error('llm.failed', { userId: context.userId, sid: context.sid, message: lastErr?.message || String(lastErr || 'llm_failed'), stack: lastErr?.stack })
    throw lastErr || new Error('llm_failed');
  }
}

export default TextGenerationService;
