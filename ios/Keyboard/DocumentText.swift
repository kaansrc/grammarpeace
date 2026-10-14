import UIKit

/// Reads and replaces the text in the host app's field.
///
/// iOS only gives a keyboard the text near the cursor, so to read a whole message
/// we walk the cursor to the end, then step backwards collecting chunks.
@MainActor
struct DocumentText {
    let proxy: UITextDocumentProxy

    private let maxCharacters = 8000

    struct Capture {
        let text: String
        let isSelection: Bool
    }

    /// Returns the selected text, or the whole field when nothing is selected.
    func capture(ignoringSelection: Bool = false) async -> Capture {
        if !ignoringSelection, let selected = proxy.selectedText, !selected.isEmpty {
            return Capture(text: selected, isSelection: true)
        }

        await moveToEnd()

        var collected = ""
        var steps = 0
        while steps < 200, collected.count < maxCharacters {
            let before = proxy.documentContextBeforeInput ?? ""
            if before.isEmpty { break }
            collected = before + collected
            guard await move(by: -before.utf16.count) else { break }
            steps += 1
        }

        // Put the cursor back where the text ends.
        if !collected.isEmpty {
            await move(by: collected.utf16.count)
        }
        return Capture(text: collected, isSelection: false)
    }

    /// Replaces `original` with `replacement`. Returns false if the field no longer holds `original`,
    /// so we never delete text the user changed in the meantime.
    func replace(_ original: String, with replacement: String, isSelection: Bool) async -> Bool {
        if isSelection {
            if let selected = proxy.selectedText, selected == original {
                proxy.insertText(replacement)
                return true
            }
            // Selection is gone but the cursor is still right after the text (for example on Undo).
            let before = proxy.documentContextBeforeInput ?? ""
            guard !original.isEmpty, before.hasSuffix(original) else { return false }
            delete(original.count)
            proxy.insertText(replacement)
            return true
        }

        // Read the field again and only replace if it still matches exactly.
        let current = await capture(ignoringSelection: true)
        guard !original.isEmpty, current.text == original else { return false }
        delete(original.count)
        proxy.insertText(replacement)
        return true
    }

    /// deleteBackward removes one visible character, so this counts Characters, not UTF-16 units.
    private func delete(_ count: Int) {
        for _ in 0..<count {
            proxy.deleteBackward()
        }
    }

    private func moveToEnd() async {
        var steps = 0
        while steps < 200 {
            let after = proxy.documentContextAfterInput ?? ""
            if after.isEmpty { break }
            guard await move(by: after.utf16.count) else { break }
            steps += 1
        }
    }

    /// Moves the cursor by UTF-16 units (what UIKit text positions use, an emoji is 2+)
    /// and waits until the host app reports the new context.
    /// Without this we could read the old context twice and duplicate text.
    /// Returns false if the context never changed (the host ignored the move).
    @discardableResult
    private func move(by offset: Int) async -> Bool {
        guard offset != 0 else { return true }
        let oldBefore = proxy.documentContextBeforeInput
        let oldAfter = proxy.documentContextAfterInput
        proxy.adjustTextPosition(byCharacterOffset: offset)

        for _ in 0..<25 {
            await pause(milliseconds: 20)
            if proxy.documentContextBeforeInput != oldBefore || proxy.documentContextAfterInput != oldAfter {
                return true
            }
        }
        return false
    }

    /// A sleep that ignores task cancellation. Cancelling halfway through a cursor walk
    /// must not turn the waits into no-ops, or the cursor ends up in the wrong place.
    private func pause(milliseconds: Int) async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(milliseconds)) {
                continuation.resume()
            }
        }
    }
}
