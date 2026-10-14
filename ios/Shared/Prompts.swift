import Foundation

/// Same prompts as the Chrome extension (background.js), so results match across platforms.
enum Prompts {
    static func grammar(_ text: String, language: Language, dictionary: [String]) -> String {
        let dictionaryInstruction = dictionary.isEmpty
            ? ""
            : "- These words are correct and should NOT be flagged as errors: \(dictionary.joined(separator: ", "))\n"

        if language == .auto {
            return """
            You are a grammar correction assistant. Your ONLY task is to:
            1. Detect the language of the input text
            2. Fix ALL grammar, spelling, and punctuation errors in that SAME language
            3. Maintain the EXACT same writing style, tone, and voice of the original text
            4. Keep the text in its ORIGINAL language - DO NOT translate

            CRITICAL RULES:
            - Return ONLY the corrected text with errors fixed
            - Do NOT change the tone or style
            - Do NOT rewrite or rephrase unless fixing errors
            - Do NOT translate to another language
            - Do NOT add explanations, comments, or notes
            - Do NOT use markdown formatting
            - Do NOT use em dashes (—) - use hyphens (-) or commas instead
            - Preserve the author's original voice and style
            \(dictionaryInstruction)
            Text to correct:
            \(text)

            Corrected text:
            """
        }

        let name = language.displayName
        return """
        You are a grammar correction assistant. The input text is in \(name). Your ONLY task is to:
        1. Fix ALL grammar, spelling, and punctuation errors in \(name)
        2. Maintain the EXACT same writing style, tone, and voice of the original text
        3. Keep the text in \(name) - DO NOT change the language

        CRITICAL RULES:
        - Return ONLY the corrected text with errors fixed
        - Do NOT change the tone or style
        - Do NOT rewrite or rephrase unless fixing errors
        - Do NOT translate to another language
        - Do NOT add explanations, comments, or notes
        - Do NOT use markdown formatting
        - Do NOT use em dashes (—) - use hyphens (-) or commas instead
        - The text must remain in \(name)
        - Preserve the author's original voice and style
        \(dictionaryInstruction)
        Text to correct:
        \(text)

        Corrected text in \(name):
        """
    }

    static func tone(_ text: String, tone: Tone) -> String {
        """
        You are a professional writing assistant. Your task is to rewrite the following text with a \(tone.promptDescription) tone.

        INSTRUCTIONS:
        1. Rewrite the text to match the \(tone.promptDescription) tone
        2. \(tone.promptDetails)
        3. Fix any grammar, spelling, or punctuation errors
        4. Keep the text in the SAME language as the input
        5. Maintain the core message and meaning

        CRITICAL RULES:
        - Return ONLY the rewritten text
        - Do NOT translate to another language
        - Do NOT add explanations, comments, or notes
        - Do NOT use markdown formatting
        - Do NOT use em dashes (—) - use hyphens (-) or commas instead
        - Write in correct, fluent English (or the original language if not English)

        Original text:
        \(text)

        Rewritten text with \(tone.promptDescription) tone:
        """
    }

    static func translate(_ text: String, to target: Language) -> String {
        let toLanguage = target.displayName
        return """
        You are a professional translator. Your task is to:
        1. Detect the language of the input text
        2. Translate it accurately to \(toLanguage)
        3. Maintain the meaning, tone, and style of the original text

        CRITICAL RULES:
        - Return ONLY the translated text in \(toLanguage)
        - Do NOT add explanations, comments, or notes
        - Do NOT use markdown formatting
        - Do NOT add phrases like "Here's the translation"
        - Preserve the original formatting and structure

        Text to translate:
        \(text)

        Translation in \(toLanguage):
        """
    }
}
