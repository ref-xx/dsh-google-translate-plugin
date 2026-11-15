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
