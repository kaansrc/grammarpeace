import SwiftUI

struct KeyboardRootView: View {
    @ObservedObject var state: KeyboardState

    var body: some View {
        VStack(spacing: 0) {
            ToolbarView(state: state)
                .frame(height: KeyboardMetrics.toolbarHeight)

            Group {
                switch state.panel {
                case .keys:
                    KeysView(state: state)
                case .toneMenu:
                    ToneMenu(state: state)
                case .translateMenu:
                    TranslateMenu(state: state)
                case .loading(let action):
                    LoadingPanel(action: action)
                case .result(let result):
                    ResultPanel(state: state, result: result)
                case .message(let text):
                    MessagePanel(state: state, text: text)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Color.kbBackground)
    }
}

// MARK: - Toolbar

struct ToolbarView: View {
    @ObservedObject var state: KeyboardState

    var body: some View {
        HStack(spacing: 8) {
            Button {
                state.perform(.fix)
            } label: {
                Text("✌️")
                    .font(.system(size: 20))
                    .frame(width: 34, height: 34)
                    .background(Circle().fill(Color.kbKey))
                    .overlay(Circle().stroke(Color.primary.opacity(0.15), lineWidth: 0.5))
            }
            .accessibilityLabel("Fix grammar")

            content
        }
        .padding(.horizontal, 8)
    }

    @ViewBuilder
    private var content: some View {
        switch state.panel {
        case .keys:
            if !state.alternates.isEmpty {
                alternatesBar
            } else {
                actionsBar
            }
        case .toneMenu:
            panelHeader("Change tone")
        case .translateMenu:
            panelHeader("Translate to")
        case .loading(let action):
            panelHeader(action.title)
        case .result(let result):
            panelHeader(result.action.title)
        case .message:
            panelHeader("GrammarPeace")
        }
    }

    private var actionsBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                if state.undo != nil {
                    Chip(title: "Undo", systemImage: "arrow.uturn.backward") { state.undoLastReplace() }
                }
                Chip(title: "Fix") { state.perform(.fix) }
                Chip(title: "Improve") { state.perform(.tone(.clear)) }
                Chip(title: "Tone", systemImage: "chevron.down") { state.openPanel(.toneMenu) }
                Chip(title: "Translate", systemImage: "chevron.down") { state.openPanel(.translateMenu) }
            }
        }
    }

    private var alternatesBar: some View {
        HStack(spacing: 6) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(state.alternates, id: \.self) { letter in
                        Chip(title: letter) { state.insertAlternate(letter) }
                    }
                }
            }
            CloseButton { state.alternates = [] }
        }
    }

    private func panelHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .lineLimit(1)
            Spacer()
            CloseButton { state.closePanel() }
        }
    }
}

struct Chip: View {
    let title: String
    var systemImage: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 15, weight: .medium))
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 11, weight: .semibold))
                }
            }
            .foregroundColor(.primary)
            .padding(.horizontal, 12)
            .frame(height: 32)
            .background(Capsule().fill(Color.kbKey))
        }
        .buttonStyle(.plain)
    }
}

struct CloseButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "xmark")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.secondary)
                .frame(width: 32, height: 32)
                .background(Circle().fill(Color.kbKey))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Close")
    }
}

// MARK: - Panels

struct ToneMenu: View {
    @ObservedObject var state: KeyboardState
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(Tone.menuTones) { tone in
                PanelButton(title: tone.displayName) { state.perform(.tone(tone)) }
            }
            PanelButton(title: "Improve") { state.perform(.tone(.clear)) }
        }
        .padding(10)
        .frame(maxHeight: .infinity, alignment: .top)
    }
}

struct TranslateMenu: View {
    @ObservedObject var state: KeyboardState
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)

    private var languages: [Language] {
        let preferred = SharedSettings.shared.translateTo
        return [preferred] + Language.targets.filter { $0 != preferred }
    }

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(languages) { language in
                    PanelButton(title: language.displayName, prominent: language == languages.first) {
                        SharedSettings.shared.translateTo = language
                        state.perform(.translate(language))
                    }
                }
            }
            .padding(10)
        }
    }
}

struct LoadingPanel: View {
    let action: WritingAction

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Working on it...")
                .font(.system(size: 15))
                .foregroundColor(.secondary)
        }
    }
}

struct ResultPanel: View {
    @ObservedObject var state: KeyboardState
    let result: AIResult

    var body: some View {
        VStack(spacing: 8) {
            ScrollView {
                diffText
                    .font(.system(size: 16))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
            }
            .background(RoundedRectangle(cornerRadius: 10).fill(Color.kbKey))

            HStack(spacing: 8) {
                PanelButton(title: "Copy") { state.copy(result) }
                PanelButton(title: "Replace", prominent: true) {
                    Task { await state.apply(result) }
                }
            }
            .frame(height: 44)
        }
        .padding(10)
    }

    private var diffText: Text {
        // Translations change every word, so a diff is just noise there.
        if case .translate = result.action {
            return Text(result.output)
        }
        return result.segments.reduce(Text("")) { (text: Text, segment: TextDiff.Segment) -> Text in
            switch segment.kind {
            case .same:
                return text + Text(segment.text)
            case .added:
                return text + Text(segment.text).foregroundColor(.green).bold()
            case .removed:
                return text + Text(segment.text).foregroundColor(.red.opacity(0.7)).strikethrough()
            }
        }
    }
}

struct MessagePanel: View {
    @ObservedObject var state: KeyboardState
    let text: String

    var body: some View {
        VStack(spacing: 12) {
            ScrollView {
                Text(text)
                    .font(.system(size: 15))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)
            }
            PanelButton(title: "OK", prominent: true) { state.closePanel() }
                .frame(height: 44)
        }
        .padding(12)
    }
}

struct PanelButton: View {
    let title: String
    var prominent = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(prominent ? Color(UIColor.systemBackground) : .primary)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(prominent ? Color.primary : Color.kbKey)
                )
        }
        .buttonStyle(.plain)
    }
}
