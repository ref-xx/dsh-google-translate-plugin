// Self-contained browser plugin. No build step is required.
window.__ModuleLoader__.load({
  id: '@local/dsh-google-input-translator',
  factory(require) {
const React = require('react')
// Pure composer operations used by the preview.
class PreviewError extends Error {
  constructor(code) { super(code); this.code = code }
}

function capturePreview(input) {
  const state = input.state.getSnapshot()
  if (state.phase !== 'plain') throw new PreviewError('busy')
  if (!state.draft.trim()) throw new PreviewError('empty')
  if (state.draft.trimStart().startsWith('/')) throw new PreviewError('command')
  if (state.occurrences.length) throw new PreviewError('references')
  return { input, draft: state.draft, draftRev: state.draftRev, attachmentIds: [...state.attachmentIds], confirmed: false }
}

function confirmPreview(request, input, english) {
  if (!request) throw new PreviewError('stale')
  if (request.confirmed) throw new PreviewError('confirmed')
  if (typeof english !== 'string' || !english.trim()) throw new PreviewError('emptyEnglish')
  if (english.trimStart().startsWith('/')) throw new PreviewError('commandEnglish')
  const state = input?.state.getSnapshot()
  if (input !== request.input || !state || state.phase !== 'plain' || state.draftRev !== request.draftRev || state.draft !== request.draft ||
    state.occurrences.length || state.attachmentIds.length !== request.attachmentIds.length ||
    state.attachmentIds.some((id, index) => id !== request.attachmentIds[index])) {
    throw new PreviewError('stale')
  }
  request.confirmed = true
  // Synchronous guard + edit + native submission; no second translation.
  input.setDraft(english)
  input.submit('queue', 'click')
}

function assistantText(snapshot, messageId) {
  const node = snapshot.nodes.values().find(item => item.kind === 'assistant-step' && ['settled', 'interrupted'].includes(item.data.status) && item.data.finalNode?.messageId === messageId)
  return node?.data.blocks.filter(block => block.kind === 'text').map(block => block.text).join('') ?? ''
}

// Browser UI with English interface text and no internal Harness UI imports.
function createClientPlugin(React) {
const h = React.createElement
const NS = 'local-google-translation'
const copy = {
  en: {
    preview: 'Translate & preview', previewTitle: 'Review English translation', english: 'English message — edit before sending',
    translating: 'Translating…', send: 'Send English', cancel: 'Cancel — keep Turkish draft', retry: 'Translate again',
    privacy: 'Prose is sent to Google. Do not include secrets. Nothing is sent to the model until you confirm.',
    nativeSend: 'Normal Send skips translation and sends the original unchanged.',
    beforeTranslate: 'Translation sends prose to Google. Do not include secrets.',
    ready: 'Translation ready.',
    context: 'Attachments stay attached. Quoted selections become ordinary Markdown after confirmation.',
    original: 'Original draft', failed: 'Translation failed. Your original is unchanged.',
    busy: 'Finish the current submission before translating.', empty: 'Write a message first.',
    command: 'Slash commands cannot be translated in preview.', references: 'Preview cannot preserve reference chips. Remove them or use the normal Send button.',
    stale: 'The draft, attachments or session changed. Cancel and translate the current draft again.',
    emptyEnglish: 'The English message cannot be empty.', commandEnglish: 'The English message cannot start with a slash command.',
    confirmed: 'This preview has already been submitted.', unavailable: 'The session is no longer available.',
    translateTurkish: 'Translate response to Turkish', turkishTitle: 'Turkish translation', turkish: 'Turkish response',
    responsePrivacy: 'This sends the response prose to Google. The original response and model history stay unchanged.',
    close: 'Close', copyTurkish: 'Copy Turkish', copied: 'Copied', copyFailed: 'Could not copy. Select and copy the translation manually.',
  },
}
// DSH requires both baseline locales; this distribution uses English for both.
copy.zh = copy.en
const css = `
.git-wrap{font:inherit;color:var(--dsw-alias-label-primary);min-width:0}
.git-preview{max-width:620px}
.git-button{font:inherit;font-size:13px;line-height:20px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 10px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}
.git-button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.git-button:disabled{opacity:.45;cursor:default}
.git-button:focus-visible,.git-icon:focus-visible,.git-editor:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.git-primary{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.git-dialog{box-sizing:border-box;width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;padding:22px 24px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit}
.git-dialog::backdrop{background:var(--dsw-alias-bg-mask-1)}
.git-title{font-size:16px;line-height:24px;font-weight:500;margin:0 0 12px}
.git-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);margin:8px 0;white-space:normal}
.git-label{display:block;font-size:13px;line-height:20px;margin:12px 0 6px}
.git-editor{box-sizing:border-box;width:100%;min-height:180px;max-height:50vh;resize:vertical;padding:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:22px;white-space:pre-wrap}
.git-original{white-space:pre-wrap;overflow-wrap:anywhere;max-height:140px;overflow:auto;font:inherit;font-size:13px}
.git-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:16px}
.git-error{font-size:13px;line-height:20px;white-space:normal;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);margin:8px 0}
.git-status{font-size:13px;line-height:20px;margin:8px 0}
.git-tip-wrap{position:relative;display:inline-flex;align-items:center}
.git-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:6px;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.git-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.git-icon:disabled{opacity:.4;cursor:default}
.git-icon svg{width:17px;height:17px}
.git-tip{visibility:hidden;position:absolute;top:calc(100% + 5px);left:50%;transform:translateX(-50%);z-index:20;max-width:230px;width:max-content;padding:5px 8px;font-size:12px;line-height:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);pointer-events:none}
.git-tip-wrap:hover>.git-tip,.git-tip-wrap:focus-within>.git-tip{visibility:visible}
@media(max-width:480px){.git-dialog{padding:16px}.git-actions>*{flex:1}.git-editor{min-height:140px}}
`
function Styles() { return h('style', null, css) }
function TranslateIcon() {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    h('path', { d: 'M3 5h11M8 3v2M12 5c-1 6-4 9-9 11M5 9c2 3 5 5 8 6M14 20l4-10 4 10M15.5 16h5' }))
}
function Modal({ title, onCancel, children }) {
  const ref = React.useRef(null)
  const id = React.useId()
  React.useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])
  return h('dialog', { ref, className: 'git-dialog', 'aria-labelledby': id, onCancel: event => { event.preventDefault(); onCancel() } },
    h(Styles), h('h2', { id, className: 'git-title' }, title), children)
}
function Preview({ useInput, t, getInput, translate }) {
  const phase = useInput(state => state.phase)
  const draft = useInput(state => state.draft)
  const [preview, setPreview] = React.useState(null)
  const [notice, setNotice] = React.useState('')
  const request = React.useRef(null)
  const editor = React.useRef(null)
  React.useEffect(() => () => { request.current?.abort.abort(); request.current = null }, [])
  React.useEffect(() => { if (preview?.status === 'ready') editor.current?.focus() }, [preview?.status])
  const cancel = () => {
    const current = request.current
    current?.abort.abort()
    request.current = null
    setPreview(null)
  }
  const begin = () => {
    try {
      const input = getInput()
      if (!input) throw new PreviewError('unavailable')
      const capture = capturePreview(input)
      const current = { ...capture, abort: new AbortController() }
      request.current?.abort.abort()
      request.current = current
      setNotice('')
      setPreview({ status: 'loading', english: '', original: capture.draft, error: '' })
      void translate(capture.draft, 'en', current.abort.signal).then(english => {
        if (request.current === current && !current.abort.signal.aborted) setPreview({ status: 'ready', english, original: capture.draft, error: '' })
      }, error => {
        if (request.current === current && !current.abort.signal.aborted) setPreview({ status: 'error', english: '', original: capture.draft, error: error.message })
      })
    } catch (error) { setNotice(t(error instanceof PreviewError ? error.code : 'unavailable')) }
  }
  const send = () => {
    if (!request.current || preview?.status !== 'ready') return
    try {
      confirmPreview(request.current, getInput(), preview.english)
      request.current.abort.abort()
      request.current = null
      setPreview(null)
      // Native composer owns acceptance/errors after explicit confirmation.
    } catch (error) { setPreview(value => ({ ...value, error: t(error instanceof PreviewError ? error.code : 'unavailable') })) }
  }
  return h('div', { className: 'git-wrap git-preview' }, h(Styles),
    h('button', { type: 'button', className: 'git-button', disabled: phase !== 'plain' || !draft.trim() || preview !== null, onClick: begin }, t('preview')),
    h('p', { className: 'git-muted' }, `${t('beforeTranslate')} ${t('nativeSend')}`),
    notice && h('div', { role: 'alert', className: 'git-error' }, notice),
    preview && h(Modal, { title: t('previewTitle'), onCancel: cancel },
      h('p', { className: 'git-muted' }, t('privacy')),
      h('p', { className: 'git-muted' }, t('context')),
      h('details', null, h('summary', null, t('original')), h('pre', { className: 'git-original', lang: 'tr' }, preview.original)),
      preview.status === 'loading' && h('p', { role: 'status', className: 'git-status' }, t('translating')),
      preview.status === 'ready' && h('p', { role: 'status', 'aria-live': 'polite', className: 'git-status' }, t('ready')),
      preview.status === 'ready' && h('label', { className: 'git-label' }, t('english'),
        h('textarea', { ref: editor, className: 'git-editor', lang: 'en', value: preview.english, onChange: event => setPreview(value => ({ ...value, english: event.target.value })), spellCheck: true })),
      preview.error && h('p', { role: 'alert', className: 'git-error' }, preview.status === 'error' ? `${t('failed')} ${preview.error}` : preview.error),
      h('div', { className: 'git-actions' },
        h('button', { type: 'button', className: 'git-button', onClick: cancel }, t('cancel')),
        preview.status === 'error' && h('button', { type: 'button', className: 'git-button', onClick: begin }, t('retry')),
        h('button', { type: 'button', className: 'git-button git-primary', disabled: preview.status !== 'ready' || !preview.english.trim(), onClick: send }, t('send')))))
}
function TurkishAction({ messageId, useChat, t, translate }) {
  const source = useChat(snapshot => assistantText(snapshot, messageId))
  const [view, setView] = React.useState(null)
  const cached = React.useRef(null)
  const active = React.useRef(null)
  const editor = React.useRef(null)
  const tooltip = React.useId()
  React.useEffect(() => { if (view?.status === 'ready') editor.current?.focus() }, [view?.status])
  React.useEffect(() => {
    setView(null)
    if (cached.current?.source !== source) cached.current = null
    return () => { active.current?.abort(); active.current = null }
  }, [messageId, source])
  const close = () => { active.current?.abort(); active.current = null; setView(null) }
  const open = () => {
    if (cached.current?.source === source) { setView({ status: 'ready', text: cached.current.text, error: '', copied: false }); return }
    setView({ status: 'consent', text: '', error: '', copied: false })
  }
  const runTranslation = () => {
    const controller = new AbortController()
    active.current?.abort()
    active.current = controller
    setView({ status: 'loading', text: '', error: '', copied: false })
    void translate(source, 'tr', controller.signal).then(text => {
      if (active.current === controller && !controller.signal.aborted) {
        cached.current = { source, text }
        setView({ status: 'ready', text, error: '', copied: false })
      }
    }, error => {
      if (active.current === controller && !controller.signal.aborted) setView({ status: 'error', text: '', error: error.message, copied: false })
    })
  }
  const copyText = async () => {
    try { await navigator.clipboard.writeText(view.text); setView(value => value ? ({ ...value, copied: true, error: '' }) : value) }
    catch { setView(value => value ? ({ ...value, error: t('copyFailed') }) : value) }
  }
  return h(React.Fragment, null,
    h('span', { className: 'git-tip-wrap' }, h(Styles),
      h('button', { type: 'button', className: 'git-icon', 'aria-label': t('translateTurkish'), 'aria-describedby': tooltip, disabled: !source, onClick: open }, h(TranslateIcon)),
      h('span', { className: 'git-tip', id: tooltip, role: 'tooltip' }, t('translateTurkish'))),
    view && h(Modal, { title: t('turkishTitle'), onCancel: close },
      h('p', { className: 'git-muted' }, t('responsePrivacy')),
      view.status === 'loading' && h('p', { role: 'status', className: 'git-status' }, t('translating')),
      view.status === 'ready' && h('p', { role: 'status', 'aria-live': 'polite', className: 'git-status' }, t('ready')),
      view.status === 'ready' && h('label', { className: 'git-label' }, t('turkish'),
        h('textarea', { ref: editor, className: 'git-editor', lang: 'tr', readOnly: true, value: view.text })),
      view.error && h('p', { role: 'alert', className: 'git-error' }, view.error),
      h('div', { className: 'git-actions' },
        view.status === 'consent' && h('button', { type: 'button', className: 'git-button git-primary', onClick: runTranslation }, t('translateTurkish')),
        view.status === 'error' && h('button', { type: 'button', className: 'git-button', onClick: runTranslation }, t('retry')),
        view.status === 'ready' && h('button', { type: 'button', className: 'git-button', onClick: copyText }, t(view.copied ? 'copied' : 'copyTurkish')),
        h('button', { type: 'button', className: 'git-button', onClick: close }, t('close')))))
}
return {
  inject: ['slots', 'locale', 'connection', 'sessions', 'conversation'],
  apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, copy))
    const lifetime = new AbortController()
    ctx.effect(() => () => lifetime.abort())
    const translate = async (text, targetLanguage, signal) => {
      const combined = AbortSignal.any([signal, lifetime.signal])
      const result = await ctx.connection.rpc.call('/local-google-translation', 'local.googleInputTranslator.translate', { text, targetLanguage }, combined)
      combined.throwIfAborted()
      if (!result.ok) throw new Error(result.error.message)
      if (typeof result.value?.text !== 'string') throw new Error(ctx.locale.bind(NS)('failed'))
      return result.value.text
    }
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
      name: 'conversation.composer.dock', id: 'google-translation-preview', order: 10, locale: NS,
      inject: sessionId => ({
        translate,
        getInput: () => {
          const scope = ctx.sessions.scope(sessionId)
          return scope ? ctx.conversation.input.for(scope) : null
        },
      }),
    }, Preview))
    ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
      name: 'conversation.chat.assistant-actions', id: 'google-translation-turkish', order: 20, locale: NS,
      inject: () => ({ translate }),
    }, TurkishAction))
  },
}
}

return createClientPlugin(React)
  },
})
