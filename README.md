# DSH Google Translate

I made this plugin so I can review an English version of my prompt before I send it to a model. I can edit the translation, send my final wording, or cancel and keep my original draft. I also added a response action for reading English replies in Turkish.

The interface and documentation are in English. Translation does not require a Google account or API key.

## Requirements

I currently target **DeepSeek Harness 0.2.2-rc.3**. The package accepts DSH versions matching `>=0.2.2-rc.3 <0.3.0`, but I do not assume that future changes to its plugin APIs will be compatible.

I use this with the browser-based DSH GUI and its Plugins page. The Host needs Node.js **24.9.0 or newer**, network access to Google, and the package manager required by the DSH installation. Installing directly from this repository also requires Git to be available to DSH.

This repository includes the ready-to-load browser module. **There is no build step**, and I do not run `npm install` inside a DSH profile directory.

## Install from GitHub

I recommend installing through DSH's plugin manager:

1. Open **Plugins** in DSH.
2. Choose **Add plugin**.
3. Paste this package source:

   ```text
   git+https://github.com/ref-xx/dsh-google-translate-plugin.git#main
   ```

4. Complete the installation and enable **Google input translator** if it is not already enabled.
5. Follow the installer's status. If it requests a restart, restart DSH; then refresh the existing GUI page.

The `main` branch can change. For a repeatable installation, I replace `main` in the source above with a reviewed, full 40-character commit hash.

### CLI alternative

If `dsh` is on my PATH and I use the `web` profile, I can install the same bundle with:

```sh
dsh plugin --profile web add "git+https://github.com/ref-xx/dsh-google-translate-plugin.git#main"
```

I replace `web` with the profile I actually use. This changes that profile, not just the current conversation.

### Local-directory alternative

I can also clone the repository:

```sh
git clone https://github.com/ref-xx/dsh-google-translate-plugin.git
```

Then I open **Plugins > Add plugin** and select the cloned directory, or enter its absolute path. I keep that directory in place while DSH uses a linked installation. No separate compilation or manual dependency installation is needed; DSH handles package installation.

## Preview a prompt

My input flow is:

1. Write a message in the normal composer.
2. Click **Translate & preview** below it.
3. Review the English translation and edit it as needed. The original draft is available in the dialog for comparison.
4. Click **Send English** to submit exactly the edited text, without another translation pass.
5. Or choose **Cancel — keep Turkish draft**, or press **Escape**, to return to the original draft without sending anything to the model.

**The normal Send button and normal submission shortcuts do not open the preview. They send the original draft unchanged.** I use the explicit preview button whenever I want translation first. Inputs from other clients or headless sessions are not automatically translated.

Confirmation queues an ordinary follow-up rather than steering a running step. After I confirm, DSH owns send progress and errors. If the send fails, the composer keeps my edited English text and attachments for retry; canceling a preview cannot retract a submitted message.

## Translate a response into Turkish

I click the **Translate response to Turkish** icon alongside the completed response's Copy, Like/Dislike and Branch actions. Before a new translation, the dialog explains that text will go to Google and asks me to confirm **Translate response to Turkish**.

I can read the result, choose **Copy Turkish**, or close the dialog to return to the original response. The standard Copy action still copies the original reply. A successful translation can be reopened without another request while its action component remains mounted.

I keep translated responses separate from the conversation: the original reply and the model's history are not rewritten. Reasoning and tool arguments are not translated. The result is selectable plain Markdown text, not a replacement for DSH's response renderer.

The action is available where DSH exposes its completed-response action bar, usually on the last text-bearing reply in a turn. Durable interrupted replies can be translated if they have a final message ID; transient output and intermediate steps may not have the action.

## Drafts, references and attachments

I keep these limitations in mind:

- Preview leaves the resident draft and attachments untouched until I confirm. Canceling during translation aborts the request, and late results cannot overwrite the draft.
- Structured reference chips are refused because replacing their text through the public composer API cannot preserve their metadata. I remove those chips or use normal Send instead.
- Literal paths and references typed as ordinary text are protected on a best-effort basis, along with fenced/inline code, indented code, URLs, common Markdown link destinations and line breaks.
- Confirming a preview flattens quoted selections into ordinary Markdown. Their full text is retained, but their quote-chip metadata is not.
- Attachments remain under the original composer's ownership. I wait for file uploads to finish before confirming. If a native send fails, DSH retains the edited draft for retry.
- If the draft, attachments or session change while I am reviewing, confirmation is refused instead of overwriting newer input. I cancel and translate the current draft again.
- Slash-command drafts, empty English previews and English previews starting with `/` are refused so that translation cannot accidentally execute a command.

## Privacy and reliability

I use an **unofficial Google Translate browser endpoint**, not the supported Google Cloud Translation API. It may rate-limit, stop working, or change its response format without notice. Google access must work from the machine running the DSH Host.

Requested prose is sent in a POST body to `https://translate.googleapis.com/translate_a/single`. Even English prose is sent if I ask to translate it. Code and path protection is **not secret detection or redaction**, so I do not use this plugin for sensitive material I would not send to Google.

The plugin does not store credentials, log submitted text, follow HTTP redirects, automatically retry, or fall back to another provider. Preview and response-translation requests do not append plugin records or send model messages. My original draft still follows DSH's own draft-persistence behavior, and an explicitly submitted message becomes ordinary conversation history.

There is also a `google_translate_text` agent tool that calls the same translation service for text I approve for transmission. It cannot confirm a preview, send a chat message, or rewrite history. If a model calls the tool, the normal tool call and result are part of its conversation history.

Translation is fallible. I review names, identifiers, formatting and meaning before sending. If a request fails or times out, the original remains available and I can cancel or explicitly try again.

## Configuration

I leave the defaults in place unless I need different limits:

| Setting | Default | Meaning |
| --- | --- | --- |
| `sourceLanguage` | `auto` | Source language for English previews; a tag such as `tr` can be supplied instead. |
| `timeoutMs` | `15000` | Per-request deadline, including the response body, in milliseconds. |
| `totalTimeoutMs` | `60000` | Deadline for the entire translation, in milliseconds. |
| `maxInputChars` | `24000` | Maximum source text, including protected spans, in UTF-16 code units. |
| `maxChunkChars` | `3000` | Maximum prose fragment per request, from 2 to 4000 UTF-16 code units. |

The preview target is always English. Response translation uses English as the source and Turkish as the target. Long prose is split into sequential requests, and each provider response is limited to 1 MiB.

For persistent changes, I use DSH's plugin configuration facilities for this plugin row rather than editing unrelated profile entries. The package's bundle patch documents the initial defaults; editing a cloned package alone does not reload an already cached Host module.

## Update or remove

I use the Plugins page to disable or remove **Google input translator**. Disabling removes its controls and cancels active translations; it does not undo messages I have already sent.

If DSH reports that the package is already installed when I install another revision, I remove the old bundle first and install the reviewed revision again. I follow any restart instruction and refresh the GUI afterward. I avoid enabling a second copy at the same time because both copies would claim the same translation service and UI slots.

## What I include here

I keep this repository installation-only: the Host modules, ready-to-load browser module, bundle patch, package manifest, English display metadata, icon and license. Tests, build tooling, development sources, local configuration, credentials and generated logs are intentionally excluded.

The translation logic and Host integration have automated coverage, and both translation directions have been exercised against Google with synthetic text. Automated checks do not establish the rendered appearance or browser interaction of the dialogs on every DSH installation.

## License

I share this plugin under the MIT license included in this repository. It is an independent plugin, not an official Google or DeepSeek product.
