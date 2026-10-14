import Foundation
import Security

/// Settings shared between the app and the keyboard extension.
/// Plain preferences live in the App Group's UserDefaults, API keys live in the
/// Keychain under the same App Group so the keyboard can read them.
final class SharedSettings {
    static let shared = SharedSettings()

    /// Comes from the GPAppGroup Info.plist key, which project.yml fills from APP_GROUP_ID.
    static let appGroupID: String =
        Bundle.main.object(forInfoDictionaryKey: "GPAppGroup") as? String ?? "group.com.grammarpeace.shared"

    static let defaultOpenAIBaseURL = "https://api.openai.com/v1"
    static let defaultOpenAIModel = "gpt-5-nano"
    static let defaultClaudeModel = "claude-haiku-5-5"

    private let defaults: UserDefaults

    init() {
        defaults = UserDefaults(suiteName: Self.appGroupID) ?? .standard
    }

    // MARK: Provider

    var provider: Provider {
        get { Provider(rawValue: defaults.string(forKey: "apiProvider") ?? "") ?? .claude }
        set { defaults.set(newValue.rawValue, forKey: "apiProvider") }
    }

    func apiKey(for provider: Provider) -> String {
        Keychain.read(account: "apiKey.\(provider.rawValue)") ?? ""
    }

    @discardableResult
    func setAPIKey(_ key: String, for provider: Provider) -> Bool {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            Keychain.delete(account: "apiKey.\(provider.rawValue)")
            return true
        }
        return Keychain.write(trimmed, account: "apiKey.\(provider.rawValue)")
    }

    var claudeModel: String {
        get { nonEmpty(defaults.string(forKey: "claudeModel")) ?? Self.defaultClaudeModel }
        set { defaults.set(newValue.trimmingCharacters(in: .whitespaces), forKey: "claudeModel") }
    }

    var openaiBaseURL: String {
        get { nonEmpty(defaults.string(forKey: "openaiBaseUrl")) ?? Self.defaultOpenAIBaseURL }
        set { defaults.set(newValue.trimmingCharacters(in: .whitespaces), forKey: "openaiBaseUrl") }
    }

    var openaiModel: String {
        get { nonEmpty(defaults.string(forKey: "openaiModel")) ?? Self.defaultOpenAIModel }
        set { defaults.set(newValue.trimmingCharacters(in: .whitespaces), forKey: "openaiModel") }
    }

    var maxTokens: Int {
        get {
            let value = defaults.integer(forKey: "maxTokens")
            return value > 0 ? value : 2048
        }
        set { defaults.set(newValue, forKey: "maxTokens") }
    }

    // MARK: Preferences

    var grammarLanguage: Language {
        get { Language(rawValue: defaults.string(forKey: "defaultGrammarLang") ?? "") ?? .auto }
        set { defaults.set(newValue.rawValue, forKey: "defaultGrammarLang") }
    }

    var translateTo: Language {
        get { Language(rawValue: defaults.string(forKey: "defaultToLang") ?? "") ?? .en }
        set { defaults.set(newValue.rawValue, forKey: "defaultToLang") }
    }

    /// When on, results replace the text right away (with Undo) instead of showing a preview first.
    var replaceInstantly: Bool {
        get { defaults.bool(forKey: "replaceInstantly") }
        set { defaults.set(newValue, forKey: "replaceInstantly") }
    }

    var keyClickSound: Bool {
        get { defaults.object(forKey: "keyClickSound") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "keyClickSound") }
    }

    var customDictionary: [String] {
        get { defaults.stringArray(forKey: "customDictionary") ?? [] }
        set { defaults.set(newValue, forKey: "customDictionary") }
    }

    private func nonEmpty(_ value: String?) -> String? {
        guard let value, !value.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        return value
    }
}

enum Keychain {
    private static let service = "com.grammarpeace.keys"

    private static func baseQuery(account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: SharedSettings.appGroupID,
        ]
    }

    static func read(account: String) -> String? {
        var query = baseQuery(account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func write(_ value: String, account: String) -> Bool {
        let data = Data(value.utf8)
        let query = baseQuery(account: account)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var insert = query
            insert.merge(attributes) { _, new in new }
            return SecItemAdd(insert as CFDictionary, nil) == errSecSuccess
        }
        return status == errSecSuccess
    }

    static func delete(account: String) {
        SecItemDelete(baseQuery(account: account) as CFDictionary)
    }
}
