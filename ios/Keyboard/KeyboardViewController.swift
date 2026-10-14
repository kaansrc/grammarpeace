import SwiftUI
import UIKit

final class KeyboardViewController: UIInputViewController {
    private lazy var state = KeyboardState(controller: self)
    private var heightConstraint: NSLayoutConstraint?

    override func viewDidLoad() {
        super.viewDidLoad()

        let host = UIHostingController(rootView: KeyboardRootView(state: state))
        host.view.backgroundColor = .clear
        // Fast typists press the next key before lifting the last one.
        host.view.isMultipleTouchEnabled = true
        host.view.translatesAutoresizingMaskIntoConstraints = false

        addChild(host)
        view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        host.didMove(toParent: self)

        let height = view.heightAnchor.constraint(equalToConstant: KeyboardMetrics.height(compact: false))
        height.priority = UILayoutPriority(999)
        height.isActive = true
        heightConstraint = height
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        state.refreshEnvironment()
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        let compact = traitCollection.verticalSizeClass == .compact
        let height = KeyboardMetrics.height(compact: compact)
        if heightConstraint?.constant != height {
            heightConstraint?.constant = height
        }
        // Only publish real changes, otherwise SwiftUI re-renders and we loop back into layout.
        if state.showGlobeKey != needsInputModeSwitchKey {
            state.showGlobeKey = needsInputModeSwitchKey
        }
    }

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        state.textDidChange()
    }
}

enum KeyboardMetrics {
    static let toolbarHeight: CGFloat = 46

    static func height(compact: Bool) -> CGFloat {
        toolbarHeight + (compact ? 162 : 216)
    }
}
