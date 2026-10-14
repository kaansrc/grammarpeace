import SwiftUI

struct ContentView: View {
    @StateObject private var model = SettingsModel()
    @State private var tryText = ""
    @State private var newWord = ""
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            Form {
                setupSection
                providerSection
                preferencesSection
                dictionarySection
                trySection
            }
            .navigationTitle("GrammarPeace ✌️")
        }
    }

    // MARK: Setup

    private var setupSection: some View {
        Section {
            SetupStep(number: 1, text: "Open Settings > General > Keyboard > Keyboards")
            SetupStep(number: 2, text: "Tap Add New Keyboard and pick GrammarPeace")
            SetupStep(number: 3, text: "Tap GrammarPeace and turn on Allow Full Access so it can reach the AI")
            SetupStep(number: 4, text: "In any app, hold the 🌐 key and switch to GrammarPeace")

            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    openURL(url)
                }
            }
        } header: {
            Text("Set up the keyboard")
        } footer: {
            Text("Full Access is only used to send the text you choose to fix to your AI provider. Nothing is stored or sent anywhere else.")
        }
    }

    // MARK: Provider

    private var providerSection: some View {
        Section {
            Picker("Provider", selection: $model.provider) {
                ForEach(Provider.allCases) { provider in
                    Text(provider.displayName).tag(provider)
                }
            }

            SecureField(model.provider.keyPlaceholder, text: $model.apiKey)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            if model.provider == .claude {
                LabeledField(title: "Model", text: $model.claudeModel, placeholder: SharedSettings.defaultClaudeModel)
            }

            if model.provider == .openai {
                LabeledField(title: "Base URL", text: $model.openaiBaseURL, placeholder: SharedSettings.defaultOpenAIBaseURL)
                LabeledField(title: "Model", text: $model.openaiModel, placeholder: SharedSettings.defaultOpenAIModel)
            }

            HStack {
                Button("Save") { model.saveKey() }
                    .buttonStyle(.borderedProminent)
                    .tint(.primary)
                Button("Test") { Task { await model.testKey() } }
                    .buttonStyle(.bordered)
                    .disabled(model.isTesting)
                if model.isTesting {
                    ProgressView().padding(.leading, 4)
                }
            }

            if let status = model.status {
                Text(status.text)
                    .font(.footnote)
                    .foregroundColor(status.isError ? .red : .green)
            }
        } header: {
            Text("AI provider")
        } footer: {
            Link("Get a \(model.provider.displayName) API key", destination: model.provider.keyURL)
        }
    }

    // MARK: Preferences

    private var preferencesSection: some View {
        Section("Preferences") {
            Picker("Grammar language", selection: $model.grammarLanguage) {
                ForEach(Language.allCases) { language in
                    Text(language.displayName).tag(language)
                }
            }
            Picker("Translate to", selection: $model.translateTo) {
                ForEach(Language.targets) { language in
                    Text(language.displayName).tag(language)
                }
            }
            Toggle("Replace instantly", isOn: $model.replaceInstantly)
            Toggle("Key click sound", isOn: $model.keyClickSound)
        }
    }

    // MARK: Dictionary

    private var dictionarySection: some View {
        Section {
            HStack {
                TextField("Add a word", text: $newWord)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onSubmit { addWord() }
                Button("Add") { addWord() }
                    .disabled(newWord.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            ForEach(model.dictionary, id: \.self) { word in
                Text(word)
            }
            .onDelete { model.removeWords(at: $0) }
        } header: {
            Text("Custom dictionary")
        } footer: {
            Text("Names and words that should never be flagged as errors.")
        }
    }

    private func addWord() {
        model.addWord(newWord)
        newWord = ""
    }

    // MARK: Try it

    private var trySection: some View {
        Section {
            TextEditor(text: $tryText)
                .frame(minHeight: 120)
        } header: {
            Text("Try it")
        } footer: {
            Text("Switch to the GrammarPeace keyboard, type something with mistakes and tap ✌️.")
        }
    }
}

private struct SetupStep: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(Color(UIColor.systemBackground))
                .frame(width: 22, height: 22)
                .background(Circle().fill(Color.primary))
            Text(text)
                .font(.subheadline)
        }
        .padding(.vertical, 2)
    }
}

private struct LabeledField: View {
    let title: String
    @Binding var text: String
    let placeholder: String

    var body: some View {
        HStack {
            Text(title)
            TextField(placeholder, text: $text)
                .multilineTextAlignment(.trailing)
                .foregroundColor(.secondary)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
        }
    }
}
