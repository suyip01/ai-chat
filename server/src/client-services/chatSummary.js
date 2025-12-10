import { getRedis, keySummary } from './redis.js'
import TextGenerationService from './textGenerationService.js'
import { getMessages } from './chatMessages.js'
import { createLogger } from '../utils/logger.js'
const logger = createLogger({ area: 'client', component: 'service.chatSummary' })

const thresholdRounds = parseInt(process.env.CHAT_SUMMARY_ROUNDS || '200')

export const maybeSummarizeSession = async (sid) => {
  try {
    logger.info('summary.start', { sid })
    const r = await getRedis()
    const len = await r.lLen(`chat:msgs:${sid}`)
    logger.info('summary.len', { sid, total: len })
    if (Math.floor(len / 2) < thresholdRounds) return null
    const history = await getMessages(sid, 400)
    const svc = new TextGenerationService()
    const prompt = '请用不超过100字的中文概括以下对话的关键信息、人物关系、用户偏好与目标，便于后续继续对话。'
    const content = prompt + '\n' + history.map(m => `${m.role === 'assistant' ? 'AI' : '用户'}: ${m.content}`).join('\n')
    const summary = await svc.generateResponse([], content, '你是对话总结助手，请仅输出总结对话总结，包含user的情感状态，不要建议下一步。', undefined, undefined, { sid })
    await r.set(keySummary(sid), summary)
    logger.info('summary.ok', { sid, summaryLen: String(summary||'').length, summary })
    return summary
  } catch (err) {
    logger.error('summary.error', { message: err?.message, stack: err?.stack, sid })
    return null
  }
}
