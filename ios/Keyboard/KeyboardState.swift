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
    @Published var undo: UndoInfo? = nil

    struct UndoInfo {
        let inserted: String
        let original: String
        let isSelection: Bool
    }

    private weak var controller: KeyboardViewController?
    private let settings = SharedSettings.shared
    private var aiTask: Task<Void, Never>?
    private var lastShiftTap = Date.distantPast
    /// True while text is being replaced, so a second tap can't start another cursor walk on top.
    private var isEditingDocument = false

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
        let label = Self.label(for: proxy?.returnKeyType)
        if returnKeyLabel != label { returnKeyLabel = label }
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
        guard let proxy, !isEditingDocument else { return }
        clearTransientUI()
        playClick(1104)

        let output = shouldUppercase ? text.uppercased() : text
        proxy.insertText(output)

        if shift == .on { setShift(.off) }
        if layer != .letters, text == "'" { layer = .letters }
        updateAutoShift()
    }

    func space() {
        guard let proxy, !isEditingDocument else { return }
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
        guard !isEditingDocument else { return }
        clearTransientUI()
        playClick(1156)
        proxy?.insertText("\n")
        updateAutoShift()
    }

    func backspace() {
        guard !isEditingDocument else { return }
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
        guard !isEditingDocument else { return }
        playClick(1104)
        proxy?.insertText(letter)
        alternates = []
        if shift == .on { setShift(.off) }
        updateAutoShift()
    }

    func showAlternates(for key: String) {
        guard let options = Self.accents[key.lowercased()] else { return }
        alternates = shouldUppercase ? options.map { $0.uppercased() } : options
    }

    var shouldUppercase: Bool { layer == .letters && shift != .off }

    // Typing calls these on every key, so only publish real changes to avoid redrawing the whole keyboard.
    private func clearTransientUI() {
        if !alternates.isEmpty { alternates = [] }
        if undo != nil { undo = nil }
    }

    private func setShift(_ newValue: ShiftState) {
        if shift != newValue { shift = newValue }
    }

    private func updateAutoShift() {
        guard shift != .locked, let proxy else { return }
        if proxy.autocapitalizationType == UITextAutocapitalizationType.none {
            setShift(.off)
            return
        }
        let before = proxy.documentContextBeforeInput ?? ""
        let trimmed = before.trimmingCharacters(in: .whitespaces)
        let lastMark = trimmed.last
        let endsSentence = lastMark == "." || lastMark == "!" || lastMark == "?"
        let startOfSentence = trimmed.isEmpty
            || before.hasSuffix("\n")
            || (before.hasSuffix(" ") && endsSentence)
        setShift(startOfSentence ? .on : .off)
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
        guard !isEditingDocument else { return }
        alternates = []
        undo = nil
        // Read it live, the user may have just turned Full Access on.
        hasFullAccess = controller?.hasFullAccess ?? false
        guard hasFullAccess else {
            panel = .message("Turn on Full Access so GrammarPeace can reach the AI.\n\nSettings > General > Keyboard > Keyboards > GrammarPeace > Allow Full Access")
            return
        }
        guard let proxy else { return }

        panel = .loading(action)
        aiTask?.cancel()
        // Block other edits while the cursor walks through the field.
        isEditingDocument = true
        aiTask = Task { [weak self] in
            guard let self else { return }
            let capture = await DocumentText(proxy: proxy).capture()
            self.isEditingDocument = false
            if Task.isCancelled { return }
            let original = capture.text

            guard !original.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                self.panel = .message("Type or select some text first, then tap a GrammarPeace button.")
                return
            }

            do {
                let answer = try await AIClient(settings: self.settings).run(action, on: original)
                if Task.isCancelled { return }
                let output = Self.keepingEdgeWhitespace(of: original, around: answer)

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
        guard let proxy, !isEditingDocument else { return }
        isEditingDocument = true
        defer { isEditingDocument = false }

        let replaced = await DocumentText(proxy: proxy).replace(result.original, with: result.output, isSelection: result.isSelection)
        if replaced {
            panel = .keys
            undo = UndoInfo(inserted: result.output, original: result.original, isSelection: result.isSelection)
            updateAutoShift()
        } else {
            panel = .message("The text changed since it was checked. Tap the button again.")
        }
    }

    /// The AI trims its answer, so put back the spaces or newlines the user had around the text.
    /// Otherwise "hello " becomes "Hello." and the next word gets glued on.
    private static func keepingEdgeWhitespace(of original: String, around answer: String) -> String {
        let leading = String(original.prefix { $0.isWhitespace })
        let trailing = String(original.reversed().prefix { $0.isWhitespace }.reversed())
        let core = answer.trimmingCharacters(in: .whitespacesAndNewlines)
        return leading + core + trailing
    }

    func copy(_ result: AIResult) {
        UIPasteboard.general.string = result.output
        panel = .keys
    }

    func undoLastReplace() {
        guard let undo, let proxy, !isEditingDocument else { return }
        self.undo = nil
        isEditingDocument = true
        Task {
            defer { isEditingDocument = false }
            let restored = await DocumentText(proxy: proxy).replace(undo.inserted, with: undo.original, isSelection: undo.isSelection)
            if !restored {
                panel = .message("Couldn't undo because the text changed.")
            }
            updateAutoShift()
        }
    }
}
