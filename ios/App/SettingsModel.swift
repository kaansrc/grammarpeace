import SwiftUI

/// Bridges SharedSettings to SwiftUI. Every change is written straight through,
/// so the keyboard picks it up the next time it runs.
@MainActor
final class SettingsModel: ObservableObject {
    private let store = SharedSettings.shared

    @Published var provider: Provider { didSet { store.provider = provider; loadKey() } }
    /// Saved as you type so switching provider or leaving the app never loses it. Save/Test validate it.
    @Published var apiKey = "" {
        didSet { if apiKey != oldValue { store.setAPIKey(apiKey, for: provider) } }
    }
    @Published var claudeModel: String { didSet { store.claudeModel = claudeModel } }
    @Published var openaiBaseURL: String { didSet { store.openaiBaseURL = openaiBaseURL } }
    @Published var openaiModel: String { didSet { store.openaiModel = openaiModel } }
    @Published var grammarLanguage: Language { didSet { store.grammarLanguage = grammarLanguage } }
    @Published var translateTo: Language { didSet { store.translateTo = translateTo } }
    @Published var replaceInstantly: Bool { didSet { store.replaceInstantly = replaceInstantly } }
    @Published var keyClickSound: Bool { didSet { store.keyClickSound = keyClickSound } }
    @Published var dictionary: [String] { didSet { store.customDictionary = dictionary } }

    @Published var status: Status? = nil
    @Published var isTesting = false

    struct Status: Equatable {
        let text: String
        let isError: Bool
    }

    init() {
        provider = store.provider
        claudeModel = store.claudeModel
        openaiBaseURL = store.openaiBaseURL
        openaiModel = store.openaiModel
        grammarLanguage = store.grammarLanguage
        translateTo = store.translateTo
        replaceInstantly = store.replaceInstantly
        keyClickSound = store.keyClickSound
        dictionary = store.customDictionary
        loadKey()
    }

    private func loadKey() {
        apiKey = store.apiKey(for: provider)
        status = nil
    }

    func saveKey() {
        if let problem = validate(apiKey) {
            status = Status(text: problem, isError: true)
            return
        }
        if store.setAPIKey(apiKey, for: provider) {
            status = Status(text: "Saved.", isError: false)
        } else {
            status = Status(text: "Couldn't save to the Keychain. Check that the App Group is set up for both targets.", isError: true)
        }
    }

    func testKey() async {
        saveKey()
        guard status?.isError == false else { return }
        isTesting = true
        defer { isTesting = false }
        do {
            let output = try await AIClient(settings: store).run(.fix, on: "This are a test.")
            status = Status(text: "Works. Got back: \"\(output)\"", isError: false)
        } catch {
            status = Status(text: error.localizedDescription, isError: true)
        }
    }

    func addWord(_ word: String) {
        let trimmed = word.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !dictionary.contains(trimmed) else { return }
        dictionary.append(trimmed)
    }

    func removeWords(at offsets: IndexSet) {
        dictionary.remove(atOffsets: offsets)
    }

    private func validate(_ key: String) -> String? {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "Enter your \(provider.displayName) API key." }
        switch provider {
        case .claude where !trimmed.hasPrefix("sk-ant-"):
            return "Claude keys start with \"sk-ant-\"."
        case .openrouter where !trimmed.hasPrefix("sk-or-"):
            return "OpenRouter keys start with \"sk-or-\"."
        default:
            return nil
        }
    }
}
