# DSH Google Translate

I made this plugin so I can review an English version of my prompt before I send it to a model. 

The interface and documentation are in English. Translation does not require a Google account or API key.


## Requirements

This plugin targets **DeepSeek Harness 0.2.2-rc.3**. The package accepts DSH versions matching `>=0.2.2-rc.3 <0.3.0`, though future compatibility across plugin API changes is not guaranteed.

It is designed for use with the browser-based DSH GUI and its Plugins page. The Host requires Node.js **24.9.0 or newer**, network access to Google, and the package manager required by the DSH installation. Installing directly from this repository also requires Git to be available to DSH.

This repository includes the pre-built, ready-to-load browser module. **There is no build step**, and running `npm install` inside a DSH profile directory is not required.

## Install from GitHub

The recommended installation method is via DSH's plugin manager:

1. Open **Plugins** in DSH.
2. Select **Add plugin**.
3. Paste the following package source:

   ```text
   git+https://github.com/ref-xx/dsh-google-translate-plugin.git#main
   ```

4. Complete the installation and enable **Google input translator** if it is not enabled automatically.
5. Follow the installer prompt. If a restart is requested, restart DSH and refresh the GUI page.

> **Note:** The `main` branch can change over time. For a reproducible installation, replace `main` in the source above with a full 40-character commit hash.

### CLI alternative

If `dsh` is in the system PATH and using the `web` profile, install the bundle using:

```sh
dsh plugin --profile web add "git+https://github.com/ref-xx/dsh-google-translate-plugin.git#main"
```

Replace `web` with the target profile. This modifies that specific profile rather than just the active session.

### Local-directory alternative

Alternatively, clone the repository locally:

```sh
git clone https://github.com/ref-xx/dsh-google-translate-plugin.git
```

Then open **Plugins > Add plugin** and select the cloned directory or specify its absolute path. Keep this directory in place while DSH uses the linked installation. No separate compilation or manual dependency installation is needed; DSH manages package installation automatically.

## Preview a prompt

Workflow:

1. Compose a message in the standard composer.
2. Click **Translate & preview** below the text area.
3. Review the English translation and make any necessary edits. The original draft remains visible in the dialog for comparison.
4. Click **Send English** to submit the finalized text directly, without a second translation pass.
5. Alternatively, click **Cancel — keep Turkish draft** or press **Escape** to return to the original draft without sending any message to the model.

**The default Send button and standard keyboard shortcuts bypass the preview and submit the original draft unchanged.** Use the dedicated preview button whenever translation is needed. Inputs submitted via other clients or headless sessions are not automatically translated.

Confirmation queues an ordinary follow-up message rather than steering an active step. Once confirmed, DSH handles sending progress and error handling. If a send attempt fails, the composer retains the edited English text and attachments for retry; canceling a preview cannot retract an already submitted message.

## Translate a response into Turkish

Click the **Translate response to Turkish** icon located alongside the completed response's Copy, Like/Dislike, and Branch actions. Prior to generating a new translation, a dialog clarifies that text will be transmitted to Google and prompts for confirmation (**Translate response to Turkish**).

Once translated, options include viewing the result, clicking **Copy Turkish**, or closing the dialog to return to the original response. The standard Copy button continues to copy the original response text. A successful translation can be reopened without initiating a new request as long as its action component remains mounted.

Translated responses remain decoupled from the active conversation: the original response and model history are never altered. Model reasoning tokens and tool arguments are excluded from translation. The output is provided as selectable plain Markdown text rather than replacing DSH's built-in renderer.

This action is accessible wherever DSH exposes its completed-response action bar—typically on the final text response of a turn. Interrupted responses that persist with a final message ID can also be translated; transient outputs and intermediate steps may not display the action.

## Drafts, references and attachments

Important operational considerations and limitations:

- Previews leave the active draft and attachments untouched until confirmed. Canceling mid-translation aborts the request, preventing late results from overwriting the draft.
- Structured reference chips are not supported because updating their text via the public composer API cannot preserve their metadata. Remove these chips or use standard Send instead.
- Literal file paths and plain-text references are protected on a best-effort basis, along with fenced/inline code, indented blocks, URLs, standard Markdown link destinations, and line breaks.
- Confirming a preview converts quoted selections into plain Markdown. The full quote text is preserved, though quote-chip metadata is discarded.
- Attachments remain managed by the native composer. Ensure file uploads complete before confirming. If sending fails, DSH preserves the edited draft for retry.
- If the draft, attachments, or session state change during review, confirmation is blocked to prevent overwriting newer input. Cancel and re-translate the updated draft.
- Slash-command drafts, empty English previews, and translated outputs starting with `/` are rejected to prevent accidental command execution.

## Privacy and reliability

This plugin relies on an **unofficial Google Translate web endpoint**, not the official Google Cloud Translation API. As such, it may encounter rate limits, service disruptions, or unannounced API format changes. The host machine running DSH must have direct network access to Google.

Submitted text is transmitted via POST requests to `https://translate.googleapis.com/translate_a/single`. Code and path preservation mechanisms are **not intended for secret detection or redaction**; this plugin should not be used with sensitive or confidential data that cannot be shared with Google.

The plugin does not store credentials, log submitted content, follow HTTP redirects, automatically retry failed requests, or provide fallback providers. Translation requests do not persist plugin-specific records or inject model prompts. Original drafts adhere to DSH's native persistence behavior, and confirmed messages enter regular conversation history.

An optional `google_translate_text` agent tool provides translation capabilities for approved content within agent turns. This tool cannot confirm previews, trigger chat messages, or modify history. Any agent tool execution and its output become standard parts of conversation context.

Automated translation is inherently imperfect. Always verify proper nouns, technical identifiers, formatting, and semantic accuracy before submitting. If a request fails or times out, the original text is preserved for cancellation or retry.

## Configuration

Default settings are suitable for most use cases, but can be customized as needed:

| Setting | Default | Meaning |
| --- | --- | --- |
| `sourceLanguage` | `auto` | Source language for English previews; a tag such as `tr` can be supplied instead. |
| `timeoutMs` | `15000` | Per-request deadline, including the response body, in milliseconds. |
| `totalTimeoutMs` | `60000` | Deadline for the entire translation, in milliseconds. |
| `maxInputChars` | `24000` | Maximum source text, including protected spans, in UTF-16 code units. |
| `maxChunkChars` | `3000` | Maximum prose fragment per request, from 2 to 4000 UTF-16 code units. |

The preview target is always English. Response translation uses English as the source and Turkish as the target. Long prose is split into sequential requests, and each provider response is limited to 1 MiB.

To persist configuration changes, use DSH's plugin settings interface for this entry rather than modifying unrelated profile files. Default values are defined in the package's bundle patch; modifying local package files directly will not invalidate or reload a cached Host module.

## Update or remove

Use the Plugins page to disable or uninstall **Google input translator**. Disabling the plugin removes its interface controls and terminates active translation requests without altering previously sent messages.

If DSH indicates that the package is already installed when updating to a different revision, uninstall the existing bundle before reinstalling the new version. Complete any requested restarts and refresh the web GUI. Avoid enabling multiple instances concurrently, as conflicting instances will contest the same translation services and UI hooks.

## Package Contents

This repository is packaged strictly for runtime installation and includes: Host modules, pre-built browser assets, the bundle patch, package manifest, English display metadata, icon, and license. Test suites, build tooling, source files, local configs, credentials, and generated logs are omitted.

The core translation logic and Host integration include automated test coverage, with both translation directions validated against Google using synthetic test cases. However, automated tests do not guarantee identical visual rendering or browser behavior across all DSH environments.

## License

Distributed under the MIT License. See the repository license file for details. This is an independent open-source plugin and is not affiliated with or endorsed by Google or DeepSeek.
