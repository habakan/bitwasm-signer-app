import Tauri
import UIKit

// Native screens built from design/tokens.json, in the language and theme the web view uses
enum Design {
  // "system", "light" or "dark", sent by the web view's Settings
  static var theme = "system"

  static var japanese: Bool { Locale.preferredLanguages.first?.hasPrefix("ja") == true }
  static func tr(_ ja: String, _ en: String) -> String { japanese ? ja : en }

  static var dark: Bool {
    theme == "dark" || (theme == "system" && UIScreen.main.traitCollection.userInterfaceStyle == .dark)
  }
  static var palette: Palette { dark ? DesignTokens.dark : DesignTokens.light }

  // Messages the web view shows when a native step stops; others, such as engine errors, pass through as they are
  private static let messages = [
    "Unlock was cancelled": "鍵を開くのをやめました。",
    "Mnemonic creation was cancelled": "新しいウォレットの作成をやめました。",
    "Message signing was cancelled": "メッセージへの署名をやめました。",
    "Account export was cancelled": "ウォレットアプリとの接続をやめました。",
    "Signing was cancelled": "署名をやめました。",
    "Seed import was cancelled": "鍵の読み込みをやめました。",
    "QR scan was cancelled": "QRの読み取りをやめました。",
    "Registration was cancelled": "マルチシグの登録をやめました。",
    "Dice entry was cancelled": "サイコロの入力をやめました。",
    "Deletion was cancelled": "削除をやめました。",
    "BIP85 derivation was cancelled": "子ニーモニックの作成をやめました。",
    "Address search was cancelled": "アドレスの確認をやめました。",
    "Erase was cancelled": "消去をやめました。",
    "Key storage was left on": "鍵の保存はオンのままです。",
    "Load a seed first": "先に鍵を読み込んでください。",
    "Load a SeedQR first": "先に鍵を読み込んでください。",
    "No seeds are saved on this device": "この端末に保存した鍵はありません。",
    "Set a passcode on this device first": "先にこのiPhoneにパスコードを設定してください。",
    "Camera permission was denied": "カメラの利用が許可されていません。",
    "Camera permission was denied. Enable it in Settings to scan QR codes.": "カメラの利用が許可されていません。QRを読み取るには、設定で許可してください。",
    "Could not get secure random bytes": "安全な乱数を用意できませんでした。",
    "Enter dice rolls": "サイコロの目を入れてください。",
    "The signing key is locked": "鍵が読み込まれていません。",
    "Use 12, 18, or 24 words and a valid index": "単語の数は12、18、24、番号は0以上にしてください。",
    "Enter an address, account, and search range": "アドレス、アカウント、調べる数を入れてください。",
    "Enter a message and valid signing path": "メッセージと、正しい番号を入れてください。",
    "Bluetooth access is off for this app. Allow it in Settings to check Bluetooth.": "このアプリのBluetoothの利用がオフです。確認するには、設定で許可してください。",
  ]

  static func fail(_ invoke: Invoke, _ message: String) {
    invoke.reject(japanese ? messages[message] ?? message : message)
  }

  enum Style { case display, heading, body, label, caption, overline, data, amount }

  static func font(_ style: Style) -> UIFont {
    switch style {
    case .display: return .systemFont(ofSize: 28, weight: .bold)
    case .heading: return .systemFont(ofSize: 17, weight: .semibold)
    case .body: return .systemFont(ofSize: 16)
    case .label: return .systemFont(ofSize: 15, weight: .semibold)
    case .caption: return .systemFont(ofSize: 13)
    case .overline: return .systemFont(ofSize: 12, weight: .semibold)
    case .data: return .monospacedSystemFont(ofSize: 15, weight: .medium)
    case .amount: return .monospacedSystemFont(ofSize: 24, weight: .semibold)
    }
  }

  static func label(_ text: String, _ style: Style, _ color: UIColor) -> UILabel {
    let label = UILabel()
    label.text = text
    label.font = font(style)
    label.textColor = color
    label.numberOfLines = 0
    return label
  }

  static func button(_ title: String, primary: Bool) -> UIButton {
    let p = palette
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.setTitleColor(primary ? p.onPrimary : p.ink, for: .normal)
    button.titleLabel?.font = font(.label)
    button.backgroundColor = primary ? p.primary : p.surfaceRaised
    button.layer.cornerRadius = DesignTokens.radiusMd
    button.layer.borderWidth = 1
    button.layer.borderColor = (primary ? p.primary : p.lineStrong).cgColor
    button.heightAnchor.constraint(greaterThanOrEqualToConstant: DesignTokens.controlHeight).isActive = true
    return button
  }

  static func card() -> UIView {
    let card = UIView()
    card.backgroundColor = palette.surfaceRaised
    card.layer.cornerRadius = DesignTokens.radiusLg
    card.layer.borderWidth = 1.5
    card.layer.borderColor = palette.line.cgColor
    return card
  }

  // Puts the view inside the card with the standard padding
  static func pad(_ view: UIView, in card: UIView, _ inset: CGFloat = DesignTokens.space4) {
    view.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(view)
    NSLayoutConstraint.activate([
      view.topAnchor.constraint(equalTo: card.topAnchor, constant: inset),
      view.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: inset),
      view.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -inset),
      view.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -inset),
    ])
  }

  // A tappable row inside a card: title, optional detail and a chevron
  static func row(_ title: String, detail: String?, onTap: @escaping () -> Void) -> UIControl {
    let p = palette
    let row = UIControl()
    let text = stack([label(title, .label, p.ink)] + (detail.map { [label($0, .caption, p.inkMuted)] } ?? []), spacing: 2)
    let chevron = UIImageView(image: UIImage(systemName: "chevron.right"))
    chevron.tintColor = p.inkMuted
    chevron.setContentHuggingPriority(.required, for: .horizontal)
    let line = UIStackView(arrangedSubviews: [text, chevron])
    line.alignment = .center
    line.spacing = DesignTokens.space3
    line.isUserInteractionEnabled = false
    pad(line, in: row)
    row.heightAnchor.constraint(greaterThanOrEqualToConstant: DesignTokens.controlHeight).isActive = true
    row.addAction(UIAction { _ in onTap() }, for: .touchUpInside)
    return row
  }

  static func pill(_ text: String, fill: UIColor, color: UIColor) -> UIView {
    let label = Design.label(text, .caption, color)
    label.font = .systemFont(ofSize: 13, weight: .semibold)
    let pill = UIView()
    pill.backgroundColor = fill
    pill.layer.cornerRadius = 13
    pad(label, in: pill, 4)
    label.leadingAnchor.constraint(equalTo: pill.leadingAnchor, constant: 10).isActive = true
    return pill
  }

  // The bar at the top of every screen: back, title and the network
  static func topBar(_ title: String, testnet: Bool, onBack: (() -> Void)? = nil) -> UIView {
    let p = palette
    let bar = UIView()
    bar.backgroundColor = p.surfaceRaised
    let row = UIStackView()
    row.alignment = .center
    row.spacing = DesignTokens.space2
    if let onBack {
      let back = UIButton(type: .system)
      back.setImage(UIImage(systemName: "chevron.left"), for: .normal)
      back.tintColor = p.ink
      back.accessibilityLabel = tr("戻る", "Back")
      back.addAction(UIAction { _ in onBack() }, for: .touchUpInside)
      back.widthAnchor.constraint(equalToConstant: 32).isActive = true
      row.addArrangedSubview(back)
    }
    let name = label(title, .heading, p.ink)
    name.numberOfLines = 1
    // The title takes the spare width; a pill has no width of its own and would stretch instead
    name.setContentHuggingPriority(.defaultLow - 1, for: .horizontal)
    row.addArrangedSubview(name)
    row.addArrangedSubview(testnet ? pill(tr("テストネット", "Testnet"), fill: p.surfaceSunken, color: p.ink)
                                   : pill(tr("メインネット", "Mainnet"), fill: p.accent, color: p.onAccent))
    let line = UIView()
    line.backgroundColor = p.line
    for view in [row, line] { view.translatesAutoresizingMaskIntoConstraints = false; bar.addSubview(view) }
    NSLayoutConstraint.activate([
      bar.heightAnchor.constraint(equalToConstant: 56),
      row.leadingAnchor.constraint(equalTo: bar.leadingAnchor, constant: DesignTokens.space4),
      row.trailingAnchor.constraint(equalTo: bar.trailingAnchor, constant: -DesignTokens.space4),
      row.centerYAnchor.constraint(equalTo: bar.centerYAnchor),
      line.leadingAnchor.constraint(equalTo: bar.leadingAnchor),
      line.trailingAnchor.constraint(equalTo: bar.trailingAnchor),
      line.bottomAnchor.constraint(equalTo: bar.bottomAnchor),
      line.heightAnchor.constraint(equalToConstant: 1),
    ])
    return bar
  }

  // A full-screen step: top bar, scrolling content and the actions pinned within thumb reach
  static func screen(_ controller: UIViewController, title: String, testnet: Bool, content: UIView, actions: [UIView], onBack: (() -> Void)? = nil) -> UIScrollView {
    let p = palette
    let view = controller.view!
    view.backgroundColor = p.surface
    let bar = topBar(title, testnet: testnet, onBack: onBack)
    let scroll = UIScrollView()
    let footer = UIStackView(arrangedSubviews: actions)
    footer.axis = .vertical
    footer.spacing = DesignTokens.space3
    let line = UIView()
    line.backgroundColor = p.line
    line.isHidden = actions.isEmpty
    for item in [bar, scroll, line, footer, content] as [UIView] { item.translatesAutoresizingMaskIntoConstraints = false }
    scroll.addSubview(content)
    for item in [bar, scroll, line, footer] { view.addSubview(item) }
    NSLayoutConstraint.activate([
      bar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scroll.topAnchor.constraint(equalTo: bar.bottomAnchor),
      scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scroll.bottomAnchor.constraint(equalTo: line.topAnchor),
      content.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor, constant: DesignTokens.space6),
      content.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -DesignTokens.space6),
      content.leadingAnchor.constraint(equalTo: scroll.frameLayoutGuide.leadingAnchor, constant: DesignTokens.space4),
      content.trailingAnchor.constraint(equalTo: scroll.frameLayoutGuide.trailingAnchor, constant: -DesignTokens.space4),
      line.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      line.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      line.heightAnchor.constraint(equalToConstant: 1),
      line.bottomAnchor.constraint(equalTo: footer.topAnchor, constant: -DesignTokens.space3),
      footer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: DesignTokens.space4),
      footer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -DesignTokens.space4),
      // Above the keyboard while one is up, otherwise at the safe area's bottom
      footer.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor, constant: -DesignTokens.space3),
    ])
    return scroll
  }

  // One labelled value; addresses go in a sunken well in groups of four so they can be read aloud
  static func field(_ title: String, _ value: UIView, note: String? = nil) -> UIView {
    var views: [UIView] = [label(title, .overline, palette.inkMuted), value]
    if let note { views.append(label(note, .caption, palette.inkMuted)) }
    return stack(views, spacing: DesignTokens.space2)
  }

  static func well(_ text: String, grouped: Bool) -> UIView {
    well(label(grouped ? stride(from: 0, to: text.count, by: 4).map { i -> String in
      let start = text.index(text.startIndex, offsetBy: i)
      return String(text[start..<(text.index(start, offsetBy: 4, limitedBy: text.endIndex) ?? text.endIndex)])
    }.joined(separator: " ") : text, .data, palette.ink))
  }

  // A well around a label the caller keeps, to change its text later
  static func well(_ value: UILabel) -> UIView {
    let well = UIView()
    well.backgroundColor = palette.surfaceSunken
    well.layer.cornerRadius = DesignTokens.radiusSm
    value.lineBreakMode = .byCharWrapping
    pad(value, in: well, DesignTokens.space3)
    return well
  }

  static func input(_ placeholder: String) -> UITextField {
    let p = palette
    let field = UITextField()
    field.attributedPlaceholder = NSAttributedString(string: placeholder, attributes: [.foregroundColor: p.inkMuted])
    field.font = font(.data)
    field.textColor = p.ink
    field.backgroundColor = p.surfaceRaised
    field.layer.cornerRadius = DesignTokens.radiusMd
    field.layer.borderWidth = 1
    field.layer.borderColor = p.lineStrong.cgColor
    field.leftView = UIView(frame: CGRect(x: 0, y: 0, width: DesignTokens.space3, height: 1))
    field.leftViewMode = .always
    field.autocorrectionType = .no
    field.spellCheckingType = .no
    field.autocapitalizationType = .none
    field.heightAnchor.constraint(greaterThanOrEqualToConstant: DesignTokens.controlHeight).isActive = true
    return field
  }

  // Where a new wallet is among its three steps: one bar a step, filled up to this one, and its name
  private static let steps = [("単語を作る", "MAKE THE WORDS"), ("書き写す", "WRITE THEM DOWN"), ("確かめる", "CHECK THEM")]

  static func steps(_ current: Int) -> UIView {
    let bars = UIStackView(arrangedSubviews: (1...steps.count).map { i -> UIView in
      let bar = UIView()
      bar.backgroundColor = i <= current ? palette.primary : palette.line
      bar.layer.cornerRadius = 2
      bar.heightAnchor.constraint(equalToConstant: 4).isActive = true
      return bar
    })
    bars.distribution = .fillEqually
    bars.spacing = 4
    let (ja, en) = steps[current - 1]
    return stack([bars, label(tr("\(current) / \(steps.count)  \(ja)", "\(current) OF \(steps.count)  \(en)"), .overline, palette.inkMuted)], spacing: 6)
  }

  static func stack(_ views: [UIView], spacing: CGFloat = DesignTokens.space6) -> UIStackView {
    let stack = UIStackView(arrangedSubviews: views)
    stack.axis = .vertical
    stack.spacing = spacing
    return stack
  }

  // Alerts and full-screen controllers follow the chosen theme rather than the system one
  static func style(_ controller: UIViewController) {
    controller.overrideUserInterfaceStyle = dark ? .dark : .light
    controller.view.tintColor = palette.primary
  }
}
