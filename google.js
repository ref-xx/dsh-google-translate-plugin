const ENDPOINT = 'https://translate.googleapis.com/translate_a/single'
const MAX_RESPONSE_BYTES = 1024 * 1024

export class TranslationError extends Error {
  constructor(code, message) {
    super(`Google translation: ${message}. Your original text has not been changed; cancel or try translating again.`)
    this.name = 'TranslationError'
    this.code = code
  }
}

// The caller owns cancellation. A disposable deadline also bounds body reads.
export function deadline(parent, milliseconds) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new TranslationError('TIMEOUT', 'the translation deadline expired')), milliseconds)
  return {
    signal: AbortSignal.any([parent, controller.signal]),
    dispose: () => clearTimeout(timer),
  }
}

export async function translateGoogle(text, config, parentSignal, fetchImpl = globalThis.fetch) {
  const timeout = deadline(parentSignal, config.timeoutMs)
  const { signal } = timeout
  try {
    signal.throwIfAborted()
    const body = new URLSearchParams({
      client: 'gtx', sl: config.sourceLanguage, tl: config.targetLanguage ?? 'en', dt: 't', q: text,
    })
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'error', credentials: 'omit', signal,
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new TranslationError('HTTP', `Google returned HTTP ${response.status}`)
    }
    if (!response.body) throw new TranslationError('RESPONSE', 'Google returned an empty response')
    const reader = response.body.getReader()
    const chunks = []
    let bytes = 0
    try {
      while (true) {
        const item = await reader.read()
        signal.throwIfAborted()
        if (item.done) break
        bytes += item.value.byteLength
        if (bytes > MAX_RESPONSE_BYTES) {
          await reader.cancel()
          throw new TranslationError('RESPONSE_LIMIT', 'the response exceeded 1 MiB')
        }
        chunks.push(item.value)
      }
    } finally {
      reader.releaseLock()
    }
    let payload
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      throw new TranslationError('RESPONSE', 'Google returned invalid JSON')
    }
    const segments = Array.isArray(payload) ? payload[0] : undefined
    if (!Array.isArray(segments) || segments.length === 0 || segments.some(segment => !Array.isArray(segment) || typeof segment[0] !== 'string')) {
      throw new TranslationError('RESPONSE', 'Google returned an invalid translation')
    }
    const translated = segments.map(segment => segment[0]).join('')
    if (!translated.trim()) throw new TranslationError('RESPONSE', 'Google returned blank text')
    signal.throwIfAborted()
    return translated
  } catch (error) {
    // Never include source text, provider error bodies, or transport URLs in errors.
    signal.throwIfAborted()
    if (error instanceof TranslationError) throw error
    throw new TranslationError('NETWORK', 'the Google request failed')
  } finally {
    timeout.dispose()
  }
}
