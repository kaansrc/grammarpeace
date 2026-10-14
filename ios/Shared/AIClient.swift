import Foundation

struct AIError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }

    static let tooLong = "The answer was cut off, so nothing was replaced. Try a shorter piece of text or select part of it."
}

/// Calls Claude, OpenAI (or any OpenAI-compatible endpoint), or OpenRouter.
struct AIClient {
    var settings: SharedSettings = .shared

    func run(_ action: WritingAction, on text: String) async throws -> String {
        let prompt: String
        switch action {
        case .fix:
            prompt = Prompts.grammar(text, language: settings.grammarLanguage, dictionary: settings.customDictionary)
        case .tone(let tone):
            prompt = Prompts.tone(text, tone: tone)
        case .translate(let language):
            prompt = Prompts.translate(text, to: language)
        }
        return try await complete(prompt, maxTokens: outputBudget(for: text))
    }

    /// The rewrite is about as long as the input, so the token limit has to grow with it.
    /// A cut-off answer would replace the user's text with half a message.
    private func outputBudget(for text: String) -> Int {
        let estimate = text.utf8.count / 2 + 1024
        return min(16000, max(settings.maxTokens, estimate))
    }

    func complete(_ prompt: String, maxTokens: Int) async throws -> String {
        let provider = settings.provider
        let key = settings.apiKey(for: provider)
        guard !key.isEmpty else {
            throw AIError("Add your \(provider.displayName) API key in the GrammarPeace app.")
        }

        switch provider {
        case .claude:
            return try await callClaude(key: key, prompt: prompt, maxTokens: maxTokens)
        case .openai:
            let baseURL = settings.openaiBaseURL
            let isNative = baseURL == SharedSettings.defaultOpenAIBaseURL
            return try await callChatCompletions(
                baseURL: baseURL,
                key: key,
                model: settings.openaiModel,
                tokenParam: isNative ? "max_completion_tokens" : "max_tokens",
                maxTokens: maxTokens,
                prompt: prompt,
                providerName: "OpenAI"
            )
        case .openrouter:
            return try await callChatCompletions(
                baseURL: "https://openrouter.ai/api/v1",
                key: key,
                model: "openrouter/free",
                tokenParam: "max_tokens",
                maxTokens: maxTokens,
                prompt: prompt,
                providerName: "OpenRouter"
            )
        }
    }

    // MARK: Claude

    private func callClaude(key: String, prompt: String, maxTokens: Int) async throws -> String {
        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(key, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")

        let model = settings.claudeModel
        var body: [String: Any] = [
            "model": model,
            "max_tokens": maxTokens,
            "messages": [["role": "user", "content": prompt]],
        ]
        // Grammar fixes are simple, low effort keeps the keyboard fast.
        // Only set it on the default model since older models reject the parameter.
        if model == SharedSettings.defaultClaudeModel {
            body["output_config"] = ["effort": "low"]
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let json = try await send(request, providerName: "Claude")

        switch json["stop_reason"] as? String {
        case "refusal":
            throw AIError("Claude declined to rewrite this text.")
        case "max_tokens":
            throw AIError(AIError.tooLong)
        default:
            break
        }

        // Content can include thinking blocks, so only join the text blocks.
        let blocks = json["content"] as? [[String: Any]] ?? []
        let text = blocks
            .filter { $0["type"] as? String == "text" }
            .compactMap { $0["text"] as? String }
            .joined()
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty else { throw AIError("Claude returned an empty response. Please try again.") }
        return text
    }

    // MARK: OpenAI-compatible

    private func callChatCompletions(
        baseURL: String,
        key: String,
        model: String,
        tokenParam: String,
        maxTokens: Int,
        prompt: String,
        providerName: String
    ) async throws -> String {
        let trimmedBase = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        guard let url = URL(string: "\(trimmedBase)/chat/completions") else {
            throw AIError("Invalid \(providerName) base URL.")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "model": model,
            tokenParam: maxTokens,
            "messages": [["role": "user", "content": prompt]],
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let json = try await send(request, providerName: providerName)

        guard let choices = json["choices"] as? [[String: Any]],
              let message = choices.first?["message"] as? [String: Any] else {
            throw AIError("Invalid response from \(providerName).")
        }
        if choices.first?["finish_reason"] as? String == "length" {
            throw AIError(AIError.tooLong)
        }
        if let refusal = message["refusal"] as? String, !refusal.isEmpty {
            throw AIError("\(providerName) refused to respond: \(refusal)")
        }
        let text = (message["content"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { throw AIError("\(providerName) returned an empty response. Please try again.") }
        return text
    }

    // MARK: Networking

    private func send(_ request: URLRequest, providerName: String) async throws -> [String: Any] {
        let result: (Data, URLResponse)
        do {
            result = try await URLSession.shared.data(for: request)
        } catch let error as URLError where error.code == .notConnectedToInternet {
            throw AIError("No internet connection. If you're using the keyboard, make sure Allow Full Access is on.")
        } catch {
            throw AIError(error.localizedDescription)
        }

        let (data, response) = result
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        guard (200..<300).contains(status) else {
            let apiMessage = (json["error"] as? [String: Any])?["message"] as? String
            throw AIError(apiMessage ?? "\(providerName) request failed (\(status)).")
        }
        return json
    }
}
