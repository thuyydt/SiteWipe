//
//  ViewController.swift
//  Shared (App)
//
//  Created by phinq on 19/5/26.
//

import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
import os.log
typealias PlatformViewController = NSViewController

private let hostLog = OSLog(
    subsystem: Bundle.main.bundleIdentifier ?? "SitewipeHost",
    category: "Host",
)

private func logHostError(_ message: String) {
    os_log("%{public}@", log: hostLog, type: .error, message)
}

private enum ExtensionBundleId {
    static let fallback = "com.phinq.SitewipeHost.Extension"
    static let embeddedPlugInName = "SitewipeHost Extension.appex"

    static func resolve() -> String {
        guard let pluginsURL = Bundle.main.builtInPlugInsURL else {
            logHostError("builtInPlugInsURL is nil; using fallback extension bundle id")
            return fallback
        }
        let appexURL = pluginsURL.appendingPathComponent(embeddedPlugInName, isDirectory: true)
        if let id = Bundle(url: appexURL)?.bundleIdentifier {
            return id
        }
        logHostError("Could not read bundle id from \(appexURL.path); using fallback")
        return fallback
    }
}
#endif

class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

#if os(macOS)
    private let extensionBundleIdentifier = ExtensionBundleId.resolve()
    private var macStatusLabel: NSTextField!
    private var macOpenPrefsButton: NSButton!
    private var useSafariSettingsWording = false
#endif

    override func viewDidLoad() {
        super.viewDidLoad()

#if os(iOS)
        webView.navigationDelegate = self
        webView.scrollView.isScrollEnabled = false
        webView.configuration.userContentController.add(self, name: "controller")

        if let mainURL = Bundle.main.url(forResource: "Main", withExtension: "html"),
           let resourcesURL = Bundle.main.resourceURL {
            webView.loadFileURL(mainURL, allowingReadAccessTo: resourcesURL)
        }
#elseif os(macOS)
        webView.isHidden = true
        setupMacOnboardingUI()
        refreshMacExtensionState()
#endif
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        webView.evaluateJavaScript("show('ios')")
#endif
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
#if os(iOS)
        _ = userContentController
        _ = message
#endif
    }

#if os(macOS)
    private func setupMacOnboardingUI() {
        if #available(macOS 13, *) {
            useSafariSettingsWording = true
        }

        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .centerX
        stack.spacing = 20
        stack.translatesAutoresizingMaskIntoConstraints = false

        if let iconURL = Bundle.main.url(forResource: "Icon", withExtension: "png"),
           let icon = NSImage(contentsOf: iconURL) {
            let iconView = NSImageView(image: icon)
            iconView.imageScaling = .scaleProportionallyUpOrDown
            iconView.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                iconView.widthAnchor.constraint(equalToConstant: 128),
                iconView.heightAnchor.constraint(equalToConstant: 128),
            ])
            stack.addArrangedSubview(iconView)
        }

        let label = NSTextField(wrappingLabelWithString: macUnknownStatusText())
        label.isSelectable = false
        label.isBordered = false
        label.drawsBackground = false
        label.alignment = .center
        label.font = .preferredFont(forTextStyle: .body)
        label.preferredMaxLayoutWidth = 360
        macStatusLabel = label
        stack.addArrangedSubview(label)

        let button = NSButton(
            title: macOpenPrefsButtonTitle(),
            target: self,
            action: #selector(macOpenPreferencesClicked),
        )
        button.bezelStyle = .rounded
        macOpenPrefsButton = button
        stack.addArrangedSubview(button)

        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -20),
        ])
    }

    private func refreshMacExtensionState() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) {
            state,
            error in
            DispatchQueue.main.async {
                if let error {
                    logHostError("getStateOfSafariExtension failed: \(error.localizedDescription)")
                    self.macStatusLabel.stringValue = self.macUnknownStatusText()
                    return
                }
                guard let state else {
                    self.macStatusLabel.stringValue = self.macUnknownStatusText()
                    return
                }
                self.macStatusLabel.stringValue =
                    state.isEnabled ? self.macOnStatusText() : self.macOffStatusText()
            }
        }
    }

    @objc private func macOpenPreferencesClicked() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            if let error {
                logHostError("showPreferencesForExtension failed: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    NSAlert(error: error).runModal()
                }
                return
            }
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }
    }

    private func macUnknownStatusText() -> String {
        if useSafariSettingsWording {
            return "You can turn on SitewipeHost's extension in the Extensions section of Safari Settings."
        }
        return "You can turn on SitewipeHost's extension in Safari Extensions preferences."
    }

    private func macOnStatusText() -> String {
        if useSafariSettingsWording {
            return "SitewipeHost's extension is currently on. You can turn it off in the Extensions section of Safari Settings."
        }
        return "SitewipeHost's extension is currently on. You can turn it off in Safari Extensions preferences."
    }

    private func macOffStatusText() -> String {
        if useSafariSettingsWording {
            return "SitewipeHost's extension is currently off. You can turn it on in the Extensions section of Safari Settings."
        }
        return "SitewipeHost's extension is currently off. You can turn it on in Safari Extensions preferences."
    }

    private func macOpenPrefsButtonTitle() -> String {
        if useSafariSettingsWording {
            return "Quit and Open Safari Settings…"
        }
        return "Quit and Open Safari Extensions Preferences…"
    }
#endif

}
