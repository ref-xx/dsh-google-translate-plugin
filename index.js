import { Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { TranslationEngine, RPC_METHOD, translateRpc } from './plugin.js'

export default class GoogleInputTranslator extends Service {
  static inject = ['connection', 'tools']
  static Config = z.object({
    sourceLanguage: z.string().default('auto').description('Source language for English previews, e.g. tr, or auto for detection. Responses translate from English to Turkish.'),
    timeoutMs: z.natural().min(1).max(120000).default(15000).description('Deadline in milliseconds for each Google request, including its response body.'),
    totalTimeoutMs: z.natural().min(1).max(300000).default(60000).description('Deadline in milliseconds for the entire translation.'),
    maxInputChars: z.natural().min(2).max(100000).default(24000).description('Maximum text in UTF-16 code units, including protected code and paths.'),
    maxChunkChars: z.natural().min(2).max(4000).default(3000).description('Maximum prose fragment per Google request in UTF-16 code units; long prose is split.'),
  })

  constructor(ctx, config) {
    super(ctx, 'googleInputTranslator')
    this.engine = new TranslationEngine(config)
    ctx.effect(() => () => this.engine.dispose())
    ctx.effect(() => ctx.connection.rpc.handle('/local-google-translation',
      (method, payload, signal, peer) => method === RPC_METHOD
        ? translateRpc(this.engine, payload, signal, peer)
        : Promise.resolve({ ok: false, error: { code: 'not-found', message: 'Unknown translation operation', details: {} } })))
    ctx.tools.register(defineTool({
      name: 'google_translate_text',
      description: 'Translate explicitly supplied text to English or Turkish with Google. Sends prose to an unofficial Google endpoint. Does not send a chat message, confirm a preview, or modify conversation history.',
      parameters: {
        text: { type: 'string', required: true, description: 'Text approved for transmission to Google.' },
        targetLanguage: { type: 'string', enum: ['en', 'tr'], required: true },
      },
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      execute: (args, exec) => this.translate(args.text, args.targetLanguage, exec.signal),
    }))
  }

  translate(text, targetLanguage, signal) {
    return this.engine.translate(text, targetLanguage, signal)
  }
}
