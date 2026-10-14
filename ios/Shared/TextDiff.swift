import Foundation

/// Word-level diff used to highlight what the AI changed.
enum TextDiff {
    enum Kind { case same, added, removed }

    struct Segment: Identifiable {
        let id: Int
        let text: String
        let kind: Kind
    }

    /// Diff of `old` vs `new`. Falls back to showing `new` as unchanged when the text is too long to diff cheaply.
    static func segments(old: String, new: String, maxTokens: Int = 600) -> [Segment] {
        let a = tokenize(old)
        let b = tokenize(new)
        guard a.count <= maxTokens, b.count <= maxTokens else {
            return [Segment(id: 0, text: new, kind: .same)]
        }

        // LCS table, filled from the end so we can walk forward.
        var lcs = Array(repeating: Array(repeating: 0, count: b.count + 1), count: a.count + 1)
        if !a.isEmpty && !b.isEmpty {
            for i in stride(from: a.count - 1, through: 0, by: -1) {
                for j in stride(from: b.count - 1, through: 0, by: -1) {
                    lcs[i][j] = a[i] == b[j] ? lcs[i + 1][j + 1] + 1 : max(lcs[i + 1][j], lcs[i][j + 1])
                }
            }
        }

        var raw: [(String, Kind)] = []
        var i = 0, j = 0
        while i < a.count && j < b.count {
            if a[i] == b[j] {
                raw.append((a[i], .same)); i += 1; j += 1
            } else if lcs[i + 1][j] >= lcs[i][j + 1] {
                raw.append((a[i], .removed)); i += 1
            } else {
                raw.append((b[j], .added)); j += 1
            }
        }
        while i < a.count { raw.append((a[i], .removed)); i += 1 }
        while j < b.count { raw.append((b[j], .added)); j += 1 }

        // Merge neighbours of the same kind so the UI has fewer pieces.
        var merged: [Segment] = []
        for (text, kind) in raw {
            if let last = merged.last, last.kind == kind {
                merged[merged.count - 1] = Segment(id: last.id, text: last.text + text, kind: kind)
            } else {
                merged.append(Segment(id: merged.count, text: text, kind: kind))
            }
        }
        return merged
    }

    /// Splits into alternating runs of whitespace and non-whitespace so joining the tokens gives back the input.
    static func tokenize(_ text: String) -> [String] {
        var tokens: [String] = []
        var current = ""
        var currentIsSpace: Bool?
        for ch in text {
            let isSpace = ch.isWhitespace
            if currentIsSpace == nil || currentIsSpace == isSpace {
                current.append(ch)
            } else {
                tokens.append(current)
                current = String(ch)
            }
            currentIsSpace = isSpace
        }
        if !current.isEmpty { tokens.append(current) }
        return tokens
    }
}
