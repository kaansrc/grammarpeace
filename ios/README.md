# GrammarPeace for iPhone ✌️

A custom iOS keyboard that fixes grammar, improves wording, changes tone and translates, right where you type. Same prompts and providers as the Chrome extension.

## How it works

Type with the GrammarPeace keyboard in any app. The bar above the keys has:

- **✌️** (or **Fix**): fixes grammar and spelling in the whole message
- **Improve**: better wording, same tone
- **Tone**: Professional, Casual, Friendly, Formal, Concise
- **Translate**: 15 languages
- **Undo**: shows up after a replace and puts your original text back

If you select text first, only the selection is changed. Otherwise the keyboard reads the whole field.

By default you get a preview with the changes highlighted, then tap **Replace**. Turn on **Replace instantly** in the app to skip the preview.

Long press a letter for accents (ç, ğ, ı, ö, ş, ü, é, ñ...).

## Project layout

```
ios/
  project.yml      XcodeGen spec (generates the .xcodeproj)
  App/             Container app: setup guide, API key, preferences
  Keyboard/        Keyboard extension: keys, AI toolbar, result panel
  Shared/          Used by both: settings, Keychain, prompts, API client, diff
```

The app and the keyboard share settings through an App Group. API keys are stored in the Keychain under that group.

## Build it

You need a Mac with Xcode 15 or later and an iPhone running iOS 16+.

1. Install XcodeGen and generate the project:
   ```sh
   brew install xcodegen
   cd ios
   xcodegen
   open GrammarPeace.xcodeproj
   ```
2. In `project.yml`, set `DEVELOPMENT_TEAM` to your team ID (or pick your team in Xcode under Signing & Capabilities for **both** targets).
3. If Xcode says the bundle ID or App Group is taken, change `BUNDLE_ID_PREFIX` and replace `group.com.grammarpeace.shared` everywhere in `project.yml`, then run `xcodegen` again.
4. Plug in your iPhone, select the **GrammarPeace** scheme and run.

The keyboard needs App Groups, which needs a paid Apple Developer account ($99/year) to run on a device. The simulator works for UI checks, but test real typing on a phone.

Run `xcodegen` again whenever you add or remove files.

## Set it up on the phone

1. Open the GrammarPeace app, pick a provider, paste your API key, tap **Test**.
2. Settings > General > Keyboard > Keyboards > Add New Keyboard > GrammarPeace.
3. Tap GrammarPeace and turn on **Allow Full Access**. Without it iOS blocks network access, so the AI buttons can't work.
4. In any app, hold the 🌐 key and pick GrammarPeace.

## Providers

| Provider | Default model | Notes |
|---|---|---|
| Claude | `claude-haiku-5-5` | Fast and cheap, good fit for a keyboard. Model can be changed in the app. |
| OpenAI | `gpt-5-nano` | Base URL and model can be changed, so any OpenAI-compatible API works. |
| OpenRouter | `openrouter/free` | Free models. |

## Limits to know

- iOS only gives keyboards the text near the cursor. GrammarPeace walks the cursor through the field to read it all, up to about 8,000 characters. A few apps return less, so selecting the text first is the most reliable.
- Password fields, phone number pads and some banking apps always force the system keyboard.
- Keyboard extensions get around 50-70MB of memory. This one only does network calls, so that's fine.

## App Store notes

- Apple requires keyboards to work as real keyboards, which this does.
- Full Access needs a clear privacy policy. Point the App Store listing to the existing one at grammarpeace.com/privacy and mention that text is only sent to the AI provider the user picks, with their own key.
