import UIKit

/// Reads and replaces the text in the host app's field.
///
/// iOS only gives a keyboard the text near the cursor, so to read a whole message
/// we walk the cursor to the end, then step backwards collecting chunks.
@MainActor
struct DocumentText {
    let proxy: UITextDocumentProxy

    /// The host app needs a moment to update the proxy after the cursor moves.
    private let settleDelay: UInt64 = 40_000_000
    private let maxCharacters = 8000

    struct Capture {
        let text: String
        let isSelection: Bool
    }

    func capture() async -> Capture {
        if let selected = proxy.selectedText, !selected.isEmpty {
            return Capture(text: selected, isSelection: true)
        }

        await moveToEnd()

        var collected = ""
        var steps = 0
        while steps < 200, collected.count < maxCharacters {
            let before = proxy.documentContextBeforeInput ?? ""
            if before.isEmpty { break }
            collected = before + collected
            proxy.adjustTextPosition(byCharacterOffset: -before.count)
            try? await Task.sleep(nanoseconds: settleDelay)
            steps += 1
        }

        // Put the cursor back where the text ends.
        if !collected.isEmpty {
            proxy.adjustTextPosition(byCharacterOffset: collected.count)
            try? await Task.sleep(nanoseconds: settleDelay)
        }
        return Capture(text: collected, isSelection: false)
    }

    /// Replaces `original` with `replacement`. Returns false if the field no longer holds `original`.
    func replace(_ original: String, with replacement: String, isSelection: Bool) async -> Bool {
        if isSelection, let selected = proxy.selectedText, selected == original {
            proxy.insertText(replacement)
            return true
        }

        await moveToEnd()
        let before = proxy.documentContextBeforeInput ?? ""
        guard !before.isEmpty, original.hasSuffix(before) || before.hasSuffix(original) else {
            return false
        }

        for _ in 0..<original.count {
            proxy.deleteBackward()
        }
        proxy.insertText(replacement)
        return true
    }

    private func moveToEnd() async {
        var steps = 0
        while steps < 200 {
            let after = proxy.documentContextAfterInput ?? ""
            if after.isEmpty { break }
            proxy.adjustTextPosition(byCharacterOffset: after.count)
            try? await Task.sleep(nanoseconds: settleDelay)
            steps += 1
        }
    }
}
