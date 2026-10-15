import SwiftUI

/// Emoji panel shown in place of the letter keys. One category at a time, scrolling sideways like the system keyboard.
struct EmojiView: View {
    @ObservedObject var state: KeyboardState
    @State private var selectedID: String?
    // Taken when the panel opens, so the grid doesn't reshuffle under your finger while you tap.
    @State private var recents: [String] = []

    private var categories: [EmojiCategory] {
        guard !recents.isEmpty else { return EmojiCategory.all }
        return [EmojiCategory("recent", "Frequently Used", icon: "clock", recents.joined(separator: " "))] + EmojiCategory.all
    }

    private var selected: EmojiCategory {
        let all = categories
        return all.first { $0.id == selectedID } ?? all[0]
    }

    var body: some View {
        VStack(spacing: 0) {
            Text(selected.title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .padding(.top, 4)

            GeometryReader { geo in
                let cell: CGFloat = 38
                let rowCount = max(2, Int(geo.size.height / cell))
                let rows = Array(repeating: GridItem(.fixed(cell), spacing: 0), count: rowCount)

                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHGrid(rows: rows, spacing: 0) {
                        ForEach(Array(selected.emoji.enumerated()), id: \.offset) { _, emoji in
                            Button {
                                state.insertEmoji(emoji)
                            } label: {
                                Text(emoji)
                                    .font(.system(size: 28))
                                    .frame(width: cell + 6, height: cell)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 6)
                }
                // New scroll position for each category instead of keeping the old offset.
                .id(selected.id)
            }

            bottomBar
                .frame(height: 40)
        }
        .onAppear {
            recents = state.recentEmoji
            if selectedID == nil {
                selectedID = recents.isEmpty ? "smileys" : "recent"
            }
        }
    }

    private var bottomBar: some View {
        HStack(spacing: 0) {
            KeyButton(style: .function, onTap: { state.switchLayer(.letters) }) {
                Text("ABC").font(.system(size: 15))
            }
            .frame(width: 56)

            HStack(spacing: 0) {
                ForEach(categories) { category in
                    Button {
                        selectedID = category.id
                    } label: {
                        Image(systemName: category.icon)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(category.id == selected.id ? .primary : .secondary)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(
                                Circle()
                                    .fill(category.id == selected.id ? Color.kbFunctionKey : Color.clear)
                                    .frame(width: 30, height: 30)
                            )
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }

            KeyButton(style: .function, repeats: true, onTap: { state.backspace() }) {
                Image(systemName: "delete.left")
                    .font(.system(size: 18))
            }
            .frame(width: 56)
        }
        .padding(.bottom, 4)
    }
}
