import { TranslationError, deadline, translateGoogle } from './google.js'
import { segmentText, splitText } from './text.js'

export const DEFAULTS = Object.freeze({
  sourceLanguage: 'auto', timeoutMs: 15000, totalTimeoutMs: 60000,
  maxInputChars: 24000, maxChunkChars: 3000,
})

export function normalizeConfig(input = {}) {
  const config = { ...DEFAULTS, ...input }
  if (!/^(?:auto|[a-z]{2,3}(?:-[a-z0-9]{2,8})*)$/i.test(config.sourceLanguage)) {
    throw new Error('Google input translator: sourceLanguage must be auto or a language tag')
  }
  for (const [key, min, max] of [
    ['timeoutMs', 1, 120000], ['totalTimeoutMs', 1, 300000],
    ['maxInputChars', 2, 100000], ['maxChunkChars', 2, 4000],
  ]) {
    if (!Number.isSafeInteger(config[key]) || config[key] < min || config[key] > max) {
      throw new Error(`Google input translator: invalid ${key}`)
    }
  }
  return Object.freeze(config)
}

export async function translateText(text, config, signal, fetchImpl) {
  const output = []
  for (const span of segmentText(text)) {
    signal.throwIfAborted()
    if (span.protected || !/\p{L}/u.test(span.text)) {
      output.push(span.text)
      continue
    }
    for (const chunk of splitText(span.text, config.maxChunkChars)) {
      const [, before, prose, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(chunk)
      if (!/\p{L}/u.test(prose)) output.push(chunk)
      else output.push(before + (await translateGoogle(prose, config, signal, fetchImpl)).trim() + after)
    }
  }
  return output.join('')
}

/** No input hook: preview confirmation submits exactly the user's edited text. */
export class TranslationEngine {
  constructor(input = {}, fetchImpl = globalThis.fetch) {
    this.config = normalizeConfig(input)
    this.fetchImpl = fetchImpl
    this.lifetime = new AbortController()
    this.pending = new Set()
  }

  async translate(text, targetLanguage, signal = new AbortController().signal) {
    if (typeof text !== 'string' || !['en', 'tr'].includes(targetLanguage)) {
      throw new TranslationError('INPUT', 'expected text and an English or Turkish target')
    }
    if (text.length > this.config.maxInputChars) {
      throw new TranslationError('INPUT_LIMIT', `text exceeds ${this.config.maxInputChars} UTF-16 code units; split it into smaller parts`)
    }
    const timeout = deadline(AbortSignal.any([signal, this.lifetime.signal]), this.config.totalTimeoutMs)
    const config = { ...this.config, targetLanguage, sourceLanguage: targetLanguage === 'tr' ? 'en' : this.config.sourceLanguage }
    const task = translateText(text, config, timeout.signal, this.fetchImpl)
    this.pending.add(task)
    try { return await task }
    finally { timeout.dispose(); this.pending.delete(task) }
  }

  async dispose() {
    this.lifetime.abort(new Error('Google input translator was disabled'))
    await Promise.allSettled([...this.pending])
  }
}

export const RPC_METHOD = 'local.googleInputTranslator.translate'

/** Shared endpoint operation. Preview and output translation do not send model input. */
export async function translateRpc(engine, payload, signal, peer) {
  if (peer?.principal.kind !== 'owner') {
    return { ok: false, error: { code: 'forbidden', message: 'Owner access required', details: {} } }
  }
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new TranslationError('INPUT', 'expected a translation request')
    }
    const result = await engine.translate(payload.text, payload.targetLanguage, AbortSignal.any([signal, peer.signal]))
    return { ok: true, value: { text: result } }
  } catch (error) {
    return { ok: false, error: {
      code: error instanceof TranslationError ? error.code : 'TRANSLATION_FAILED',
      message: error instanceof TranslationError ? error.message : 'Translation canceled or unavailable. Your original text is unchanged.',
      details: {},
    } }
  }
}
