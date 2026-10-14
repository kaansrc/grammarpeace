import SwiftUI

struct KeysView: View {
    @ObservedObject var state: KeyboardState

    private static let letterRows: [[String]] = [
        ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
        ["z", "x", "c", "v", "b", "n", "m"],
    ]

    private static let numberRows: [[String]] = [
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
        ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""],
        [".", ",", "?", "!", "'"],
    ]

    private static let symbolRows: [[String]] = [
        ["[", "]", "{", "}", "#", "%", "^", "*", "+", "="],
        ["_", "\\", "|", "~", "<", ">", "€", "£", "¥", "•"],
        [".", ",", "?", "!", "'"],
    ]

    private var rows: [[String]] {
        switch state.layer {
        case .letters: return Self.letterRows
        case .numbers: return Self.numberRows
        case .symbols: return Self.symbolRows
        }
    }

    var body: some View {
        GeometryReader { geo in
            let unit = geo.size.width / 10
            let rowHeight = (geo.size.height - 4) / 4

            VStack(spacing: 0) {
                characterRow(rows[0], width: unit)
                    .frame(height: rowHeight)
                characterRow(rows[1], width: unit)
                    .frame(height: rowHeight)
                thirdRow(unit: unit)
                    .frame(height: rowHeight)
                bottomRow(unit: unit)
                    .frame(height: rowHeight)
            }
            .padding(.bottom, 4)
        }
    }

    private func characterRow(_ keys: [String], width: CGFloat) -> some View {
        HStack(spacing: 0) {
            ForEach(keys, id: \.self) { key in
                characterKey(key)
                    .frame(width: width)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func thirdRow(unit: CGFloat) -> some View {
        let keys = rows[2]
        // Letters row has 7 keys, the number/symbol rows have 5 wider keys.
        let keyWidth = state.layer == .letters ? unit : unit * 7 / CGFloat(keys.count)

        return HStack(spacing: 0) {
            leftModifierKey
                .frame(width: unit * 1.5)
            Spacer(minLength: 0)
            ForEach(keys, id: \.self) { key in
                characterKey(key)
                    .frame(width: keyWidth)
            }
            Spacer(minLength: 0)
            KeyButton(style: .function, repeats: true, onTap: { state.backspace() }) {
                Image(systemName: "delete.left")
                    .font(.system(size: 18, weight: .regular))
            }
            .frame(width: unit * 1.5)
        }
    }

    @ViewBuilder
    private var leftModifierKey: some View {
        switch state.layer {
        case .letters:
            KeyButton(style: state.shift == .off ? .function : .active, onTap: { state.tapShift() }) {
                Image(systemName: shiftIcon)
                    .font(.system(size: 18, weight: .medium))
            }
        case .numbers:
            KeyButton(style: .function, onTap: { state.switchLayer(.symbols) }) {
                Text("#+=").font(.system(size: 15))
            }
        case .symbols:
            KeyButton(style: .function, onTap: { state.switchLayer(.numbers) }) {
                Text("123").font(.system(size: 15))
            }
        }
    }

    private var shiftIcon: String {
        switch state.shift {
        case .off: return "shift"
        case .on: return "shift.fill"
        case .locked: return "capslock.fill"
        }
    }

    private func bottomRow(unit: CGFloat) -> some View {
        HStack(spacing: 0) {
            KeyButton(style: .function, onTap: {
                state.switchLayer(state.layer == .letters ? .numbers : .letters)
            }) {
                Text(state.layer == .letters ? "123" : "ABC").font(.system(size: 15))
            }
            .frame(width: unit * 1.25)

            if state.showGlobeKey {
                KeyButton(style: .function, onTap: { state.nextKeyboard() }) {
                    Image(systemName: "globe")
                        .font(.system(size: 18))
                }
                .frame(width: unit * 1.25)
            }

            KeyButton(style: .character, onTap: { state.space() }) {
                Text("space").font(.system(size: 15))
            }

            KeyButton(style: .function, onTap: { state.newline() }) {
                Text(state.returnKeyLabel).font(.system(size: 15))
            }
            .frame(width: unit * 2.25)
        }
    }

    private func characterKey(_ key: String) -> some View {
        KeyButton(
            style: .character,
            onTap: { state.type(key) },
            onLongPress: KeyboardState.accents[key] == nil ? nil : { state.showAlternates(for: key) }
        ) {
            Text(state.shouldUppercase ? key.uppercased() : key)
                .font(.system(size: state.layer == .letters ? 23 : 21))
        }
    }
}

/// A single key. Uses a drag gesture so it reacts on touch down, supports long press and key repeat.
struct KeyButton<Label: View>: View {
    enum Style { case character, function, active }

    var style: Style
    var repeats = false
    var onTap: () -> Void
    var onLongPress: (() -> Void)?
    let label: () -> Label

    // GestureState resets by itself if the system cancels the touch, so a key can't get stuck down.
    @GestureState private var pressed = false
    @State private var longPressFired = false
    @State private var holdTask: Task<Void, Never>?

    init(
        style: Style,
        repeats: Bool = false,
        onTap: @escaping () -> Void,
        onLongPress: (() -> Void)? = nil,
        @ViewBuilder label: @escaping () -> Label
    ) {
        self.style = style
        self.repeats = repeats
        self.onTap = onTap
        self.onLongPress = onLongPress
        self.label = label
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 5, style: .continuous)
                .fill(fill)
                .shadow(color: Color.black.opacity(0.3), radius: 0, x: 0, y: 1)
                .padding(.horizontal, 3)
                .padding(.vertical, 5)
            label()
                .foregroundColor(style == .active ? .black : .primary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .updating($pressed) { _, isPressed, _ in isPressed = true }
                .onEnded { _ in
                    stopTimer()
                    if !longPressFired { onTap() }
                    // Reset here too, a very fast tap may never show up in onChange.
                    longPressFired = false
                }
        )
        .onChange(of: pressed) { isPressed in
            if isPressed {
                longPressFired = false
                startTimer()
            } else {
                // Also runs when the touch is cancelled, which stops delete from repeating forever.
                stopTimer()
            }
        }
        .onDisappear { stopTimer() }
    }

    private var fill: Color {
        switch style {
        case .character: return pressed ? Color.kbFunctionKey : Color.kbKey
        case .function: return pressed ? Color.kbKey : Color.kbFunctionKey
        case .active: return Color.white
        }
    }

    private func startTimer() {
        stopTimer()
        guard repeats || onLongPress != nil else { return }
        holdTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 450_000_000)
            guard !Task.isCancelled else { return }
            longPressFired = true
            if repeats {
                while !Task.isCancelled {
                    onTap()
                    try? await Task.sleep(nanoseconds: 80_000_000)
                }
            } else {
                onLongPress?()
            }
        }
    }

    private func stopTimer() {
        holdTask?.cancel()
        holdTask = nil
    }
}

extension Color {
    static let kbBackground = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 0.08, alpha: 1)
            : UIColor(red: 0.82, green: 0.83, blue: 0.86, alpha: 1)
    })

    static let kbKey = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 0.36, alpha: 1)
            : UIColor.white
    })

    static let kbFunctionKey = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 0.22, alpha: 1)
            : UIColor(red: 0.67, green: 0.69, blue: 0.73, alpha: 1)
    })
}
