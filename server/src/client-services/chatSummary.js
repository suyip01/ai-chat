import { getRedis, keySummary } from './redis.js'
import TextGenerationService from './textGenerationService.js'
import { getMessages } from './chatMessages.js'

const thresholdRounds = parseInt(process.env.CHAT_SUMMARY_ROUNDS || '30')

export const maybeSummarizeSession = async (sid) => {
  console.log('[svc:maybeSummarizeSession] sid=', sid)
  const r = await getRedis()
  const len = await r.lLen(`chat:msgs:${sid}`)
  console.log('[svc:maybeSummarizeSession] len=', len)
  if (Math.floor(len / 2) < thresholdRounds) return null
  const history = await getMessages(sid, 120)
  const latestUserText = ''
  const svc = new TextGenerationService()
  const prompt = '请用不超过200字的中文概括以下对话的关键信息、人物关系、用户偏好与目标，便于后续继续对话。'
  const content = prompt + '\n' + history.map(m => `${m.role === 'assistant' ? 'AI' : '用户'}: ${m.content}`).join('\n')
  const summary = await svc.generateResponse([], content, '你是对话总结助手，请仅输出总结，不要建议下一步。')
  await r.set(keySummary(sid), summary)
  console.log('[svc:maybeSummarizeSession] summaryLen=', String(summary||'').length)
  return summary
}
