import AudioToolbox
import SwiftUI
import UIKit

enum KeyboardLayer {
    case letters, numbers, symbols
}

enum ShiftState {
    case off, on, locked
}

struct AIResult {
    let action: WritingAction
    let original: String
    let output: String
    let isSelection: Bool
    let segments: [TextDiff.Segment]
}

enum Panel {
    case keys
    case toneMenu
    case translateMenu
    case loading(WritingAction)
    case result(AIResult)
    case message(String)
}

@MainActor
final class KeyboardState: ObservableObject {
    @Published var layer: KeyboardLayer = .letters
    @Published var shift: ShiftState = .on
    @Published var panel: Panel = .keys
    @Published var showGlobeKey = true
    @Published var hasFullAccess = false
    @Published var returnKeyLabel = "return"
    /// Accent options shown in the toolbar after a long press on a letter.
    @Published var alternates: [String] = []
    /// Set after a replace so the user can put the old text back.
    @Published var undo: (inserted: String, original: String)? = nil

    private weak var controller: KeyboardViewController?
    private let settings = SharedSettings.shared
    private var aiTask: Task<Void, Never>?
    private var lastShiftTap = Date.distantPast

    init(controller: KeyboardViewController) {
        self.controller = controller
    }

    private var proxy: UITextDocumentProxy? { controller?.textDocumentProxy }

    // MARK: Environment

    func refreshEnvironment() {
        hasFullAccess = controller?.hasFullAccess ?? false
        returnKeyLabel = Self.label(for: proxy?.returnKeyType)
        updateAutoShift()
    }

    func textDidChange() {
        returnKeyLabel = Self.label(for: proxy?.returnKeyType)
        updateAutoShift()
    }

    private static func label(for type: UIReturnKeyType?) -> String {
        switch type {
        case .go: return "go"
        case .google, .yahoo, .search: return "search"
        case .join: return "join"
        case .next: return "next"
        case .send: return "send"
        case .done: return "done"
        case .continue: return "continue"
        default: return "return"
        }
    }

    // MARK: Typing

    func type(_ text: String) {
        guard let proxy else { return }
        clearTransientUI()
        playClick(1104)

        let output = shouldUppercase ? text.uppercased() : text
        proxy.insertText(output)

        if shift == .on { shift = .off }
        if layer != .letters, text == "'" { layer = .letters }
        updateAutoShift()
    }

    func space() {
        guard let proxy else { return }
        clearTransientUI()
        playClick(1104)

        // Double space types a period, like the system keyboard.
        let before = proxy.documentContextBeforeInput ?? ""
        if before.hasSuffix(" "), before.count >= 2 {
            let previous = before[before.index(before.endIndex, offsetBy: -2)]
            if previous.isLetter || previous.isNumber {
                proxy.deleteBackward()
                proxy.insertText(". ")
                updateAutoShift()
                return
            }
        }

        proxy.insertText(" ")
        if layer != .letters { layer = .letters }
        updateAutoShift()
    }

    func newline() {
        clearTransientUI()
        playClick(1156)
        proxy?.insertText("\n")
        updateAutoShift()
    }

    func backspace() {
        clearTransientUI()
        playClick(1155)
        proxy?.deleteBackward()
        updateAutoShift()
    }

    func tapShift() {
        playClick(1156)
        let now = Date()
        if now.timeIntervalSince(lastShiftTap) < 0.3 {
            shift = .locked
        } else {
            shift = shift == .off ? .on : .off
        }
        lastShiftTap = now
    }

    func switchLayer(_ newLayer: KeyboardLayer) {
        playClick(1156)
        layer = newLayer
        if newLayer == .letters { updateAutoShift() }
    }

    func nextKeyboard() {
        controller?.advanceToNextInputMode()
    }

    /// Accent letters are already cased when shown, so insert them as-is.
    func insertAlternate(_ letter: String) {
        playClick(1104)
        proxy?.insertText(letter)
        alternates = []
        if shift == .on { shift = .off }
        updateAutoShift()
    }

    func showAlternates(for key: String) {
        guard let options = Self.accents[key.lowercased()] else { return }
        alternates = shouldUppercase ? options.map { $0.uppercased() } : options
    }

    var shouldUppercase: Bool { layer == .letters && shift != .off }

    private func clearTransientUI() {
        alternates = []
        undo = nil
    }

    private func updateAutoShift() {
        guard shift != .locked, let proxy else { return }
        if proxy.autocapitalizationType == UITextAutocapitalizationType.none {
            shift = .off
            return
        }
        let before = proxy.documentContextBeforeInput ?? ""
        let trimmed = before.trimmingCharacters(in: .whitespaces)
        let lastMark = trimmed.last
        let endsSentence = lastMark == "." || lastMark == "!" || lastMark == "?"
        let startOfSentence = trimmed.isEmpty
            || before.hasSuffix("\n")
            || (before.hasSuffix(" ") && endsSentence)
        shift = startOfSentence ? .on : .off
    }

    private func playClick(_ sound: SystemSoundID) {
        guard hasFullAccess, settings.keyClickSound else { return }
        AudioServicesPlaySystemSound(sound)
    }

    static let accents: [String: [String]] = [
        "a": ["à", "á", "â", "ä", "æ", "ã", "å"],
        "c": ["ç", "ć", "č"],
        "e": ["è", "é", "ê", "ë", "ę"],
        "g": ["ğ"],
        "i": ["ı", "î", "ï", "í", "ì"],
        "l": ["ł"],
        "n": ["ñ", "ń"],
        "o": ["ö", "ô", "ò", "ó", "œ", "ø", "õ"],
        "s": ["ş", "ß", "ś", "š"],
        "u": ["ü", "û", "ù", "ú"],
        "y": ["ÿ"],
        "z": ["ž", "ź", "ż"],
    ]

    // MARK: AI actions

    func openPanel(_ newPanel: Panel) {
        alternates = []
        panel = newPanel
    }

    func closePanel() {
        aiTask?.cancel()
        aiTask = nil
        panel = .keys
    }

    func perform(_ action: WritingAction) {
        alternates = []
        undo = nil
        guard hasFullAccess else {
            panel = .message("Turn on Full Access so GrammarPeace can reach the AI.\n\nSettings > General > Keyboard > Keyboards > GrammarPeace > Allow Full Access")
            return
        }
        guard let proxy else { return }

        panel = .loading(action)
        aiTask?.cancel()
        aiTask = Task { [weak self] in
            guard let self else { return }
            let document = DocumentText(proxy: proxy)
            let capture = await document.capture()
            let original = capture.text

            guard !original.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                self.panel = .message("Type or select some text first, then tap a GrammarPeace button.")
                return
            }

            do {
                let output = try await AIClient(settings: self.settings).run(action, on: original)
                if Task.isCancelled { return }

                if output.trimmingCharacters(in: .whitespacesAndNewlines) == original.trimmingCharacters(in: .whitespacesAndNewlines) {
                    self.panel = .message(action == .fix ? "Looks good. No grammar issues found." : "No changes needed.")
                    return
                }

                let result = AIResult(
                    action: action,
                    original: original,
                    output: output,
                    isSelection: capture.isSelection,
                    segments: TextDiff.segments(old: original, new: output)
                )

                if self.settings.replaceInstantly {
                    await self.apply(result)
                } else {
                    self.panel = .result(result)
                }
            } catch {
                if Task.isCancelled { return }
                self.panel = .message(error.localizedDescription)
            }
        }
    }

    func apply(_ result: AIResult) async {
        guard let proxy else { return }
        let replaced = await DocumentText(proxy: proxy).replace(result.original, with: result.output, isSelection: result.isSelection)
        if replaced {
            panel = .keys
            undo = (inserted: result.output, original: result.original)
            updateAutoShift()
        } else {
            panel = .message("The text changed since it was checked. Tap the button again.")
        }
    }

    func copy(_ result: AIResult) {
        UIPasteboard.general.string = result.output
        panel = .keys
    }

    func undoLastReplace() {
        guard let undo, let proxy else { return }
        self.undo = nil
        Task {
            let restored = await DocumentText(proxy: proxy).replace(undo.inserted, with: undo.original, isSelection: false)
            if !restored {
                panel = .message("Couldn't undo because the text changed.")
            }
            updateAutoShift()
        }
    }
}
