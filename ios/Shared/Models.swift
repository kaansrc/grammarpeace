import Foundation

enum Provider: String, CaseIterable, Identifiable {
    case claude
    case openai
    case openrouter

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .claude: return "Claude"
        case .openai: return "OpenAI"
        case .openrouter: return "OpenRouter (free)"
        }
    }

    var keyPlaceholder: String {
        switch self {
        case .claude: return "sk-ant-..."
        case .openai: return "sk-..."
        case .openrouter: return "sk-or-..."
        }
    }

    var keyURL: URL {
        switch self {
        case .claude: return URL(string: "https://console.anthropic.com/settings/keys")!
        case .openai: return URL(string: "https://platform.openai.com/api-keys")!
        case .openrouter: return URL(string: "https://openrouter.ai/keys")!
        }
    }
}

enum Tone: String, CaseIterable, Identifiable {
    case professional
    case casual
    case friendly
    case formal
    case concise
    // "Improve" in the UI: better wording, same tone
    case clear

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .professional: return "Professional"
        case .casual: return "Casual"
        case .friendly: return "Friendly"
        case .formal: return "Formal"
        case .concise: return "Concise"
        case .clear: return "Improve"
        }
    }

    /// Tones shown in the keyboard's Tone menu. `clear` has its own Improve button.
    static var menuTones: [Tone] { [.professional, .casual, .friendly, .formal, .concise] }

    var promptDescription: String {
        switch self {
        case .professional: return "professional and business-appropriate"
        case .casual: return "casual and conversational"
        case .friendly: return "friendly and warm"
        case .formal: return "formal and academic"
        case .concise: return "concise and to-the-point"
        case .clear: return "improved while preserving the original style"
        }
    }

    var promptDetails: String {
        switch self {
        case .professional:
            return "Use formal language, avoid slang, maintain clarity and professionalism suitable for business communication."
        case .casual:
            return "Use everyday language, contractions are fine, write as you would speak to a friend while keeping it clear."
        case .friendly:
            return "Use welcoming and approachable language, show empathy and warmth while maintaining professionalism."
        case .formal:
            return "Use sophisticated vocabulary, avoid contractions, maintain academic rigor and formal structure."
        case .concise:
            return "Remove unnecessary words, use direct language, keep sentences short and impactful."
        case .clear:
            return "Improve clarity, flow, and word choice WITHOUT changing the tone or formality level. Keep the same level of casualness/formality as the original. If the original uses contractions, keep using contractions. If the original is enthusiastic, stay enthusiastic. Only fix awkward phrasing and unclear sentences - do NOT flatten the personality or make it more generic."
        }
    }
}

enum Language: String, CaseIterable, Identifiable {
    case auto, en, es, fr, de, it, pt, ru, ja, ko, zh, ar, hi, tr, nl, pl

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .auto: return "Auto-detect"
        case .en: return "English"
        case .es: return "Spanish"
        case .fr: return "French"
        case .de: return "German"
        case .it: return "Italian"
        case .pt: return "Portuguese"
        case .ru: return "Russian"
        case .ja: return "Japanese"
        case .ko: return "Korean"
        case .zh: return "Chinese"
        case .ar: return "Arabic"
        case .hi: return "Hindi"
        case .tr: return "Turkish"
        case .nl: return "Dutch"
        case .pl: return "Polish"
        }
    }

    /// Languages you can translate into (everything except auto).
    static var targets: [Language] { allCases.filter { $0 != .auto } }
}

/// What the user asked the keyboard to do.
enum WritingAction: Equatable {
    case fix
    case tone(Tone)
    case translate(Language)

    var title: String {
        switch self {
        case .fix: return "Fix grammar"
        case .tone(let tone): return tone == .clear ? "Improve" : tone.displayName
        case .translate(let lang): return "Translate to \(lang.displayName)"
        }
    }
}
