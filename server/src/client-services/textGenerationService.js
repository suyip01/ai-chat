import OpenAI from 'openai';

export class TextGenerationService {
  constructor() {
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ASR_API_KEY;
    const baseURL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || process.env.ASR_BASE_URL;
    this.client = new OpenAI({ apiKey, baseURL });
    this.systemPrompt = null;
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

  async generateResponse(history, latestUserText, systemPromptOverride, modelOverride, temperatureOverride) {
    await this.loadSystemPrompt();
    const messages = this.buildMessages(history, latestUserText, systemPromptOverride);
    console.log('LLM prompt messages:', messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : String(m.content) })));
    const model = modelOverride || process.env.LLM_MODEL;
    const temperature = typeof temperatureOverride === 'number' ? temperatureOverride : 0.2;
    console.log('LLM model params:', { model, temperature, max_tokens: 20000 });
    const resp = await this.client.chat.completions.create({
      model,
      messages,
      //      stream: false,
      temperature,
      //      max_tokens: 200000
    });
    const out = resp.choices?.[0]?.message?.content || '';
    console.log('LLM raw content:', out);
    return out;
  }
}

export default TextGenerationService;
