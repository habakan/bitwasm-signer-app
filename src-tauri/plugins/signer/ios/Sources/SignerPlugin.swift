import AVFoundation
import CoreBluetooth
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import LocalAuthentication
import Network
import SwiftRs
import Tauri
import UIKit
import Vision
import WebKit
import Security

@_silgen_name("bitwasm_ios_engine_init")
private func bitwasmEngineInit() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_state")
private func bitwasmEngineState() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_set_network")
private func bitwasmEngineSetNetwork(_ testnet: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_parser_info")
private func bitwasmEngineParserInfo() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_load_seed_qr")
private func bitwasmEngineLoadSeedQr(_ bytes: UnsafePointer<UInt8>, _ length: Int32, _ passphrase: UnsafePointer<UInt8>?, _ passLength: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_load_mnemonic")
private func bitwasmEngineLoadMnemonic(_ bytes: UnsafePointer<UInt8>, _ length: Int32, _ passphrase: UnsafePointer<UInt8>?, _ passLength: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_preview_fingerprint")
private func bitwasmEnginePreviewFingerprint(_ bytes: UnsafePointer<UInt8>, _ length: Int32, _ passphrase: UnsafePointer<UInt8>?, _ passLength: Int32, _ mnemonic: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_wordlist")
private func bitwasmEngineWordlist() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_word_letters")
private func bitwasmEngineWordLetters(_ letters: UnsafePointer<UInt8>?, _ length: Int32, _ filter: UnsafePointer<UInt8>?, _ filterBytes: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_word_matches")
private func bitwasmEngineWordMatches(_ letters: UnsafePointer<UInt8>?, _ length: Int32, _ filter: UnsafePointer<UInt8>?, _ filterBytes: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_final_words")
private func bitwasmEngineFinalWords(_ first: UnsafePointer<UInt8>?, _ bytes: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_word_entry_end")
private func bitwasmEngineWordEntryEnd() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_lock")
private func bitwasmEngineLock() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_reset_ur")
private func bitwasmEngineResetUr() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_receive_ur")
private func bitwasmEngineReceiveUr(_ part: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_cancel_review")
private func bitwasmEngineCancelReview() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_sign")
private func bitwasmEngineSign() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_account")
private func bitwasmEngineAccount(_ purpose: Int32, _ account: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_mnemonic_from_entropy")
private func bitwasmEngineMnemonicFromEntropy(_ bytes: UnsafePointer<UInt8>, _ length: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_dice_check")
private func bitwasmEngineDiceCheck(_ bytes: UnsafePointer<UInt8>, _ length: Int32, _ words: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_mnemonic_from_dice")
private func bitwasmEngineMnemonicFromDice(_ bytes: UnsafePointer<UInt8>, _ length: Int32, _ words: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_seedqr_from_mnemonic")
private func bitwasmEngineSeedQrFromMnemonic(_ bytes: UnsafePointer<UInt8>, _ length: Int32, _ compact: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_bip85_mnemonic")
private func bitwasmEngineBip85Mnemonic(_ words: Int32, _ index: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_find_address")
private func bitwasmEngineFindAddress(_ address: UnsafePointer<CChar>, _ account: Int32, _ count: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_message_review")
private func bitwasmEngineMessageReview(_ bytes: UnsafePointer<UInt8>, _ length: Int32, _ purpose: Int32, _ account: Int32, _ chain: Int32, _ index: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_message_sign")
private func bitwasmEngineMessageSign() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_multisig_load")
private func bitwasmEngineMultisigLoad(_ bytes: UnsafePointer<UInt8>, _ length: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_receive_multisig_ur")
private func bitwasmEngineReceiveMultisigUr(_ part: UnsafePointer<CChar>) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_multisig_forget")
private func bitwasmEngineMultisigForget() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_account_ur")
private func bitwasmEngineAccountUr(_ account: Int32) -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_multisig_ur")
private func bitwasmEngineMultisigUr() -> UnsafeMutablePointer<CChar>?

@_silgen_name("bitwasm_ios_engine_free_string")
private func bitwasmEngineFreeString(_ pointer: UnsafeMutablePointer<CChar>)

private enum SignerError: LocalizedError {
  case initialization(String)
  case invalidResponse
  case missingData
  case cameraUnavailable
  case restricted(String)

  var errorDescription: String? {
    switch self {
    case .initialization(let message): return message
    case .invalidResponse: return "The signing engine returned an invalid response."
    case .missingData: return "The signing engine returned incomplete data."
    case .cameraUnavailable: return Design.tr("この端末では使えるカメラがありません。", "This device does not have an available camera.")
    case .restricted(let name): return Design.tr("\(name)がオンです。設定の「端末の機能制限」で、オフにすることを必須にしています。", "\(name) is on, and Device restrictions in Settings require it to be off.")
    }
  }
}

private enum SignerBridge {
  static func read(_ pointer: UnsafeMutablePointer<CChar>?) throws -> [String: Any] {
    guard let pointer else { throw SignerError.invalidResponse }
    defer { bitwasmEngineFreeString(pointer) }
    guard let bytes = String(validatingUTF8: pointer),
          let data = bytes.data(using: .utf8),
          let envelope = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw SignerError.invalidResponse
    }
    guard envelope["ok"] as? Bool == true else {
      throw SignerError.initialization(envelope["error"] as? String ?? "The signing operation failed.")
    }
    guard let result = envelope["data"] as? [String: Any] else { throw SignerError.missingData }
    return result
  }

  static func initialize() throws {
    _ = try read(bitwasmEngineInit())
  }

  static func state() throws -> [String: Any] { try read(bitwasmEngineState()) }
  static var testnet: Bool { (try? state()["testnet"] as? Bool) ?? false }
  static func parserInfo() throws -> [String: Any] { try read(bitwasmEngineParserInfo()) }

  static func setNetwork(_ testnet: Bool) throws -> [String: Any] {
    try read(bitwasmEngineSetNetwork(testnet ? 1 : 0))
  }

  static let words: [String] = (try? read(bitwasmEngineWordlist())["words"] as? [String]) ?? []

  // Word entry runs in a signer.wasm of its own; endWordEntry unloads it
  static func wordLetters(_ typed: String, filter: [Int]?) -> Int {
    (withWords(typed, filter, bitwasmEngineWordLetters)["letters"] as? Int) ?? 0
  }

  static func wordMatches(_ typed: String, filter: [Int]?) -> [Int] {
    (withWords(typed, filter, bitwasmEngineWordMatches)["matches"] as? [Int]) ?? []
  }

  static func finalWords(_ first: [Int]) -> [Int] {
    (withWords("", first) { _, _, packed, bytes in bitwasmEngineFinalWords(packed, bytes) }["words"] as? [Int]) ?? []
  }

  static func endWordEntry() { _ = try? read(bitwasmEngineWordEntryEnd()) }

  private static func withWords(
    _ typed: String, _ indices: [Int]?,
    _ call: (UnsafePointer<UInt8>?, Int32, UnsafePointer<UInt8>?, Int32) -> UnsafeMutablePointer<CChar>?
  ) -> [String: Any] {
    var letters = Array(typed.utf8)
    var packed = (indices ?? []).flatMap { [UInt8($0 & 0xff), UInt8($0 >> 8)] }
    defer {
      letters.withUnsafeMutableBytes { _ = $0.initializeMemory(as: UInt8.self, repeating: 0) }
      packed.withUnsafeMutableBytes { _ = $0.initializeMemory(as: UInt8.self, repeating: 0) }
    }
    return letters.withUnsafeBufferPointer { l in
      packed.withUnsafeBufferPointer { p in
        (try? read(call(l.baseAddress, Int32(l.count), p.baseAddress, Int32(p.count)))) ?? [:]
      }
    }
  }

  static func loadSeedQr(_ payload: Data, passphrase: String = "") throws -> [String: Any] {
    try load(payload, passphrase: passphrase, with: bitwasmEngineLoadSeedQr)
  }

  static func loadMnemonic(_ mnemonic: String, passphrase: String) throws -> [String: Any] {
    try load(Data(mnemonic.utf8), passphrase: passphrase, with: bitwasmEngineLoadMnemonic)
  }

  // The fingerprint a seed gets with this passphrase, from a module dropped right after, so no key is loaded
  static func previewFingerprint(_ payload: Data, mnemonic: Bool, passphrase: String) throws -> String {
    let reply = try withSecret(payload, passphrase: passphrase) { bitwasmEnginePreviewFingerprint($0, $1, $2, $3, mnemonic ? 1 : 0) }
    guard let fingerprint = reply["fingerprint"] as? String else { throw SignerError.missingData }
    return fingerprint
  }

  private static func load(
    _ payload: Data,
    passphrase: String,
    with engine: (UnsafePointer<UInt8>, Int32, UnsafePointer<UInt8>?, Int32) -> UnsafeMutablePointer<CChar>?
  ) throws -> [String: Any] {
    if let name = DeviceRestrictions.blockedBy { throw SignerError.restricted(name) }
    let state = try withSecret(payload, passphrase: passphrase, engine)
    // A wallet registered while storage was on comes back with its seed; it is public, so it is kept in the clear
    guard let saved = UserDefaults.standard.string(forKey: walletKey(state)), (try? multisigLoad(Data(saved.utf8))) != nil else { return state }
    return try self.state()
  }

  private static func withSecret(
    _ payload: Data,
    passphrase: String,
    _ engine: (UnsafePointer<UInt8>, Int32, UnsafePointer<UInt8>?, Int32) -> UnsafeMutablePointer<CChar>?
  ) throws -> [String: Any] {
    var payload = payload
    var passphrase = Data(passphrase.utf8)
    defer {
      payload.resetBytes(in: 0..<payload.count)
      passphrase.resetBytes(in: 0..<passphrase.count)
    }
    return try payload.withUnsafeBytes { buffer in
      guard let bytes = buffer.bindMemory(to: UInt8.self).baseAddress else { throw SignerError.missingData }
      return try passphrase.withUnsafeBytes { passBuffer in
        try read(engine(bytes, Int32(payload.count), passBuffer.bindMemory(to: UInt8.self).baseAddress, Int32(passphrase.count)))
      }
    }
  }

  static func walletKey(_ state: [String: Any]) -> String {
    "multisig-\(state["fingerprint"] as? String ?? "")-\(state["testnet"] as? Bool == true ? "test" : "main")"
  }

  static func multisigLoad(_ text: Data) throws -> [String: Any] {
    try text.withUnsafeBytes { buffer in
      guard let bytes = buffer.bindMemory(to: UInt8.self).baseAddress else { throw SignerError.missingData }
      return try read(bitwasmEngineMultisigLoad(bytes, Int32(text.count)))
    }
  }

  static func receiveMultisigUr(_ part: String) throws -> [String: Any] {
    try part.withCString { try read(bitwasmEngineReceiveMultisigUr($0)) }
  }

  static func multisigForget() throws -> [String: Any] { try read(bitwasmEngineMultisigForget()) }

  static func accountUr(account: Int) throws -> [String] {
    guard let frames = try read(bitwasmEngineAccountUr(Int32(account)))["frames"] as? [String] else { throw SignerError.missingData }
    return frames
  }

  static func multisigUr() throws -> [String] {
    guard let frames = try read(bitwasmEngineMultisigUr())["frames"] as? [String] else { throw SignerError.missingData }
    return frames
  }

  static func lock() throws { _ = try read(bitwasmEngineLock()) }
  static func resetUr() throws { _ = try read(bitwasmEngineResetUr()) }

  static func receiveUr(_ part: String) throws -> [String: Any] {
    try part.withCString { try read(bitwasmEngineReceiveUr($0)) }
  }

  static func cancelReview() { _ = try? read(bitwasmEngineCancelReview()) }
  static func sign() throws -> [String] {
    guard let frames = try read(bitwasmEngineSign())["frames"] as? [String] else { throw SignerError.missingData }
    return frames
  }

  static func account(purpose: Int, account: Int) throws -> [String] {
    guard let frames = try read(bitwasmEngineAccount(Int32(purpose), Int32(account)))["frames"] as? [String] else { throw SignerError.missingData }
    return frames
  }

  static func mnemonicFromEntropy(_ entropy: Data) throws -> String {
    try entropy.withUnsafeBytes { buffer in
      guard let bytes = buffer.bindMemory(to: UInt8.self).baseAddress else { throw SignerError.missingData }
      guard let mnemonic = try read(bitwasmEngineMnemonicFromEntropy(bytes, Int32(entropy.count)))["mnemonic"] as? String else { throw SignerError.missingData }
      return mnemonic
    }
  }

  static func mnemonicFromDice(_ rolls: Data, words: Int) throws -> String {
    try rolls.withUnsafeBytes { buffer in
      guard let bytes = buffer.bindMemory(to: UInt8.self).baseAddress else { throw SignerError.missingData }
      guard let mnemonic = try read(bitwasmEngineMnemonicFromDice(bytes, Int32(rolls.count), Int32(words)))["mnemonic"] as? String else { throw SignerError.missingData }
      return mnemonic
    }
  }

  // 1 for the right count of 1 to 6, with 2 when the faces are uneven and 4 when the steps between rolls are
  static func diceCheck(_ rolls: Data, words: Int) throws -> Int {
    try rolls.withUnsafeBytes { buffer in
      guard let bytes = buffer.bindMemory(to: UInt8.self).baseAddress else { throw SignerError.missingData }
      return try read(bitwasmEngineDiceCheck(bytes, Int32(rolls.count), Int32(words)))["flags"] as? Int ?? 0
    }
  }

  static func seedQrFromMnemonic(_ mnemonic: String, compact: Bool) throws -> Data {
    let bytes = Data(mnemonic.utf8)
    return try bytes.withUnsafeBytes { buffer in
      guard let input = buffer.bindMemory(to: UInt8.self).baseAddress else { throw SignerError.missingData }
      let result = try read(bitwasmEngineSeedQrFromMnemonic(input, Int32(bytes.count), compact ? 1 : 0))
      guard let values = result["payload"] as? [Int] else { throw SignerError.missingData }
      return Data(values.map { UInt8(truncatingIfNeeded: $0) })
    }
  }

  static func bip85Mnemonic(words: Int, index: Int) throws -> String {
    guard let mnemonic = try read(bitwasmEngineBip85Mnemonic(Int32(words), Int32(index)))["mnemonic"] as? String else { throw SignerError.missingData }
    return mnemonic
  }

  static func findAddress(_ address: String, account: Int, count: Int) throws -> [String: Any] {
    try address.withCString { try read(bitwasmEngineFindAddress($0, Int32(account), Int32(count))) }
  }

  static func reviewMessage(_ message: String, purpose: Int, account: Int, chain: Int, index: Int) throws -> [String: Any] {
    let bytes = Data(message.utf8)
    return try bytes.withUnsafeBytes { buffer in
      guard let input = buffer.bindMemory(to: UInt8.self).baseAddress else { throw SignerError.missingData }
      return try read(bitwasmEngineMessageReview(input, Int32(bytes.count), Int32(purpose), Int32(account), Int32(chain), Int32(index)))
    }
  }

  static func signMessage() throws -> Data {
    guard let values = try read(bitwasmEngineMessageSign())["signature"] as? [Int] else { throw SignerError.missingData }
    return Data(values.map { UInt8(truncatingIfNeeded: $0) })
  }
}

private struct SetNetworkArgs: Decodable {
  let testnet: Bool
}

private struct SetStorageArgs: Decodable {
  let enabled: Bool
}

private struct SetThemeArgs: Decodable {
  let theme: String
}

private struct SetRestrictionArgs: Decodable {
  let id: String
  let level: String
}

// Device features an airgapped signer would rather have off, each "off" (not checked), "warn" or "require".
// iOS blocks third-party keyboards itself and has no USB debugging, so only the radios are listed
private enum DeviceRestrictions {
  private static let defaults = [("network", "warn"), ("bluetooth", "off")]
  private static let names = ["network": Design.tr("ネットワーク", "A network"), "bluetooth": "Bluetooth"]
  private static let monitor = NWPathMonitor()
  private static var online = false

  private static func level(_ id: String) -> String {
    UserDefaults.standard.string(forKey: "restriction-\(id)") ?? defaults.first { $0.0 == id }?.1 ?? "off"
  }

  private static func active(_ id: String) -> Bool {
    guard level(id) != "off" else { return false }
    return id == "network" ? online : BluetoothWatch.shared.on
  }

  static var blockedBy: String? {
    defaults.first { level($0.0) == "require" && active($0.0) }.flatMap { names[$0.0] }
  }

  static var state: [[String: Any]] {
    defaults.map { ["id": $0.0, "level": level($0.0), "active": active($0.0), "detail": ""] }
  }

  // Every interface counts, not only ones with internet, so a local Wi-Fi also shows as connected
  static func start(onBlocked: @escaping () -> Void) {
    monitor.pathUpdateHandler = { path in
      online = path.availableInterfaces.contains { $0.type != .loopback }
      if blockedBy != nil { onBlocked() }
    }
    monitor.start(queue: .main)
    BluetoothWatch.shared.onChange = { if blockedBy != nil { onBlocked() } }
    if level("bluetooth") != "off" { BluetoothWatch.shared.start() }
  }

  // Bluetooth asks for its permission when it is first checked; a refusal leaves it off
  static func set(_ id: String, _ value: String, done: @escaping (String?) -> Void) {
    guard defaults.contains(where: { $0.0 == id }), ["off", "warn", "require"].contains(value) else { return done("Unknown restriction") }
    let save = {
      UserDefaults.standard.set(value, forKey: "restriction-\(id)")
      done(nil)
    }
    guard id == "bluetooth" else { return save() }
    guard value != "off" else {
      BluetoothWatch.shared.stop()
      return save()
    }
    BluetoothWatch.shared.start { state in
      guard state != .unauthorized else {
        BluetoothWatch.shared.stop()
        return done("Bluetooth access is off for this app. Allow it in Settings to check Bluetooth.")
      }
      save()
    }
  }
}

// Creating the manager is what asks for the Bluetooth permission, so it only exists while detection is on
private final class BluetoothWatch: NSObject, CBCentralManagerDelegate {
  static let shared = BluetoothWatch()
  private var manager: CBCentralManager?
  private var waiting: [(CBManagerState) -> Void] = []
  private(set) var on = false
  var onChange: () -> Void = {}

  func start(_ done: @escaping (CBManagerState) -> Void = { _ in }) {
    if let manager, manager.state != .unknown { return done(manager.state) }
    waiting.append(done)
    if manager == nil {
      manager = CBCentralManager(delegate: self, queue: .main, options: [CBCentralManagerOptionShowPowerAlertKey: false])
    }
  }

  func stop() {
    manager = nil
    on = false
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    on = central.state == .poweredOn
    let done = waiting
    waiting = []
    done.forEach { $0(central.state) }
    onChange()
  }
}

// Saved seeds: BIP39 entropy encrypted to a Secure Enclave key per seed that needs the device owner to decrypt.
// The passphrase is never stored; the fingerprint kept is the words' alone, to tell saved seeds apart
private enum SeedVault {
  struct Entry {
    let id: String
    let name: String
    let fingerprint: String
    let sealed: Data
  }

  private static let service = "com.diysigner.bitwasm-signer.vault"
  private static let algorithm = SecKeyAlgorithm.eciesEncryptionStandardVariableIVX963SHA256AESGCM

  static var enabled: Bool {
    get { UserDefaults.standard.bool(forKey: "vaultEnabled") }
    set { UserDefaults.standard.set(newValue, forKey: "vaultEnabled") }
  }

  static var deviceSecure: Bool { LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) }

  static func annotate(_ state: [String: Any]) -> [String: Any] {
    state.merging([
      "storage": enabled, "deviceSecure": deviceSecure, "saved": entries().count,
      "restrictions": DeviceRestrictions.state,
    ]) { $1 }
  }

  static func entries() -> [Entry] {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecMatchLimit as String: kSecMatchLimitAll,
      kSecReturnAttributes as String: true,
      kSecReturnData as String: true,
    ]
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let items = result as? [[String: Any]] else { return [] }
    return items.compactMap { item in
      guard let id = item[kSecAttrAccount as String] as? String,
            let data = item[kSecValueData as String] as? Data,
            let record = try? JSONSerialization.jsonObject(with: data) as? [String: String],
            let name = record["name"], let fingerprint = record["fingerprint"],
            let sealed = record["sealed"].flatMap({ Data(base64Encoded: $0) }) else { return nil }
      return Entry(id: id, name: name, fingerprint: fingerprint, sealed: sealed)
    }.sorted { $0.name < $1.name }
  }

  static func save(name: String, fingerprint: String, entropy: Data) throws {
    let id = UUID().uuidString
    var error: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, [.privateKeyUsage, .userPresence], &error) else {
      throw error!.takeRetainedValue() as Error
    }
    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecAttrKeySizeInBits as String: 256,
      kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
      kSecPrivateKeyAttrs as String: [
        kSecAttrIsPermanent as String: true,
        kSecAttrApplicationTag as String: tag(id),
        kSecAttrAccessControl as String: access,
      ],
    ]
    guard let key = SecKeyCreateRandomKey(attributes as CFDictionary, &error), let publicKey = SecKeyCopyPublicKey(key) else {
      throw error.map { $0.takeRetainedValue() as Error } ?? SignerError.initialization(Design.tr("Secure Enclaveを使えません", "The Secure Enclave is not available"))
    }
    guard let sealed = SecKeyCreateEncryptedData(publicKey, algorithm, entropy as CFData, &error) as Data? else {
      deleteKey(id)
      throw error.map { $0.takeRetainedValue() as Error } ?? SignerError.initialization(Design.tr("鍵を暗号化できませんでした", "Could not encrypt the seed"))
    }
    let record = try JSONSerialization.data(withJSONObject: ["name": name, "fingerprint": fingerprint, "sealed": sealed.base64EncodedString()])
    let item: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: id,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
      kSecValueData as String: record,
    ]
    let status = SecItemAdd(item as CFDictionary, nil)
    guard status == errSecSuccess else {
      deleteKey(id)
      throw SignerError.initialization(Design.tr("鍵を保存できませんでした(\(status))", "Could not save the seed (\(status))"))
    }
  }

  // Blocks while the system asks for Face ID, Touch ID, or the passcode, so call it off the main thread
  static func open(_ entry: Entry) throws -> Data {
    let context = LAContext()
    context.localizedReason = Design.tr("\(entry.name)を開く", "Unlock \(entry.name)")
    let query: [String: Any] = [
      kSecClass as String: kSecClassKey,
      kSecAttrApplicationTag as String: tag(entry.id),
      kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
      kSecReturnRef as String: true,
      kSecUseAuthenticationContext as String: context,
    ]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess, let key = result else {
      throw SignerError.initialization(Design.tr("この保存した鍵を開く鍵がありません(\(status))。削除して、バックアップから戻してください。", "The key for this saved seed is gone (\(status)). Delete it and restore from your backup."))
    }
    var error: Unmanaged<CFError>?
    guard let entropy = SecKeyCreateDecryptedData(key as! SecKey, algorithm, entry.sealed as CFData, &error) as Data? else {
      throw error.map { $0.takeRetainedValue() as Error } ?? SignerError.initialization(Design.tr("保存した鍵を開けませんでした", "Could not open the saved seed"))
    }
    return entropy
  }

  static func authenticate(_ reason: String, completion: @escaping (Error?) -> Void) {
    LAContext().evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, error in
      DispatchQueue.main.async { completion(ok ? nil : error ?? SignerError.initialization(Design.tr("認証できませんでした", "Authentication failed"))) }
    }
  }

  static func delete(_ entry: Entry) {
    deleteKey(entry.id)
    SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: entry.id] as CFDictionary)
  }

  static func eraseAll() {
    entries().forEach(delete)
    forgetWallets()
  }

  static func forgetWallets() {
    UserDefaults.standard.dictionaryRepresentation().keys.filter { $0.hasPrefix("multisig-") }.forEach(UserDefaults.standard.removeObject)
  }

  private static func deleteKey(_ id: String) {
    SecItemDelete([kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: tag(id)] as CFDictionary)
  }

  private static func tag(_ id: String) -> Data { Data("com.diysigner.bitwasm-signer.seed.\(id)".utf8) }
}

final class SignerPlugin: Plugin {
  private var engineError: String?
  private let worker = DispatchQueue(label: "com.diysigner.bitwasm-signer.signer")
  private var privacyCover: UIView?

  @objc public override func load(webview: WKWebView) {
    Self.blockCustomKeyboards()
    do {
      try SignerBridge.initialize()
    } catch {
      engineError = error.localizedDescription
    }
    DeviceRestrictions.start { [weak self] in self?.worker.async { try? SignerBridge.lock() } }
    let center = NotificationCenter.default
    center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
      self?.worker.async { try? SignerBridge.lock() }
    }
    // The app switcher snapshots the screen as the app resigns, so cover it first; also while it is recorded or mirrored
    center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
      self?.setCovered(true)
    }
    for name in [UIApplication.didBecomeActiveNotification, UIScreen.capturedDidChangeNotification] {
      center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
        self?.setCovered(UIScreen.main.isCaptured)
      }
    }
  }

  // Third-party keyboards can log or upload keystrokes. tao's AppDelegate does not answer this, so add it at runtime
  private static func blockCustomKeyboards() {
    guard let delegate = UIApplication.shared.delegate else { return }
    let selector = #selector(UIApplicationDelegate.application(_:shouldAllowExtensionPointIdentifier:))
    let answer: @convention(block) (AnyObject, UIApplication, NSString) -> Bool = { _, _, identifier in
      identifier as String != UIApplication.ExtensionPointIdentifier.keyboard.rawValue
    }
    class_addMethod(type(of: delegate), selector, imp_implementationWithBlock(answer), "B@:@@")
  }

  @objc public func state(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    do { invoke.resolve(SeedVault.annotate(try SignerBridge.state())) }
    catch { invoke.reject(error.localizedDescription) }
  }

  @objc public func setNetwork(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    do {
      let args = try invoke.parseArgs(SetNetworkArgs.self)
      invoke.resolve(SeedVault.annotate(try SignerBridge.setNetwork(args.testnet)))
    } catch {
      invoke.reject(error.localizedDescription)
    }
  }

  @objc public func setStorage(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    do {
      let enabled = try invoke.parseArgs(SetStorageArgs.self).enabled
      if enabled && !SeedVault.deviceSecure { return Design.fail(invoke, "Set a passcode on this device first") }
      if !enabled && !SeedVault.entries().isEmpty { return confirmErase(invoke, turningOff: true) }
      SeedVault.enabled = enabled
      if !enabled { SeedVault.forgetWallets() }
      invoke.resolve(SeedVault.annotate(try SignerBridge.state()))
    } catch {
      invoke.reject(error.localizedDescription)
    }
  }

  @objc public func setTheme(_ invoke: Invoke) {
    guard let args = try? invoke.parseArgs(SetThemeArgs.self) else { return Design.fail(invoke, "Invalid arguments") }
    Design.theme = args.theme
    invoke.resolve()
  }

  @objc public func setRestriction(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.setRestriction(invoke) } }
    guard ready(invoke) else { return }
    guard let args = try? invoke.parseArgs(SetRestrictionArgs.self) else { return Design.fail(invoke, "Invalid arguments") }
    DeviceRestrictions.set(args.id, args.level) { error in
      if let error { return Design.fail(invoke, error) }
      if DeviceRestrictions.blockedBy != nil { try? SignerBridge.lock() }
      do { invoke.resolve(SeedVault.annotate(try SignerBridge.state())) } catch { invoke.reject(error.localizedDescription) }
    }
  }

  @objc public func unlockSaved(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.unlockSaved(invoke) } }
    guard ready(invoke) else { return }
    let entries = SeedVault.entries()
    guard !entries.isEmpty else { return Design.fail(invoke, "No seeds are saved on this device") }
    choose(Design.tr("保存した鍵", "Saved seeds"), title: Design.tr("開く鍵を選んでください", "Choose a seed to unlock"),
           lead: Design.tr("開くときに、Face ID、Touch IDかパスコードと、付けていればパスフレーズを入力します。", "Unlocking asks for Face ID, Touch ID or the passcode, then the passphrase if the seed has one."),
           options: entries.map { ($0.name, Design.tr("フィンガープリント \($0.fingerprint)", "Fingerprint \($0.fingerprint)")) },
           onCancel: { Design.fail(invoke, "Unlock was cancelled") }) { [weak self] in self?.chooseSaved(entries[$0], invoke: invoke) }
  }

  // A full-screen list of choices; Back cancels
  private func choose(_ heading: String, title: String, lead: String, options: [(String, String?)], onCancel: @escaping () -> Void, onPick: @escaping (Int) -> Void) {
    let p = Design.palette
    let controller = UIViewController()
    controller.modalPresentationStyle = .fullScreen
    controller.isModalInPresentation = true
    controller.loadViewIfNeeded()
    var rows: [UIView] = []
    for (i, option) in options.enumerated() {
      if i > 0 {
        let divider = UIView()
        divider.backgroundColor = p.line
        divider.heightAnchor.constraint(equalToConstant: 1).isActive = true
        rows.append(divider)
      }
      rows.append(Design.row(option.0, detail: option.1) { [weak controller] in controller?.dismiss(animated: true) { onPick(i) } })
    }
    let card = Design.card()
    card.clipsToBounds = true
    Design.pad(Design.stack(rows, spacing: 0), in: card, 0)
    let content = Design.stack([Design.label(title, .display, p.ink), Design.label(lead, .body, p.inkMuted), card], spacing: DesignTokens.space4)
    _ = Design.screen(controller, title: heading, testnet: SignerBridge.testnet, content: content, actions: []) { [weak controller] in controller?.dismiss(animated: true, completion: onCancel) }
    present(controller)
  }

  @objc public func eraseSaved(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    confirmErase(invoke, turningOff: false)
  }

  // Switching to RAM only erases what is saved, so nothing stays behind that the setting says is not there
  private func confirmErase(_ invoke: Invoke, turningOff: Bool) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.confirmErase(invoke, turningOff: turningOff) } }
    let count = SeedVault.entries().count
    let alert = UIAlertController(
      title: turningOff ? Design.tr("メモリのみに切り替えますか", "Switch to RAM only?") : Design.tr("保存した鍵をすべて消去しますか", "Erase every saved seed?"),
      message: turningOff ? Design.tr("この端末に保存した\(count)件の鍵を消去します。元に戻すには、バックアップが必要です。", "The \(count) saved seed\(count == 1 ? "" : "s") on this device will be erased. You need your backups to restore them.")
        : Design.tr("この端末にある写しだけを消去します。元に戻すには、バックアップが必要です。", "Only the copies on this device are erased. You need your backups to restore them."),
      preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { _ in Design.fail(invoke, turningOff ? "Key storage was left on" : "Erase was cancelled") })
    alert.addAction(UIAlertAction(title: turningOff ? Design.tr("消去して切り替える", "Erase and switch") : Design.tr("消去する", "Erase"), style: .destructive) { _ in
      SeedVault.authenticate(Design.tr("保存した鍵を消去", "Erase saved seeds")) { error in
        if let error { return invoke.reject(error.localizedDescription) }
        SeedVault.eraseAll()
        if turningOff { SeedVault.enabled = false }
        invoke.resolve(SeedVault.annotate((try? SignerBridge.state()) ?? [:]))
      }
    })
    present(alert)
  }

  private func chooseSaved(_ entry: SeedVault.Entry, invoke: Invoke) {
    let alert = UIAlertController(title: entry.name, message: Design.tr("フィンガープリント \(entry.fingerprint)", "Fingerprint \(entry.fingerprint)"), preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: Design.tr("開く", "Unlock"), style: .default) { [weak self] _ in
      self?.worker.async {
        do {
          let entropy = try SeedVault.open(entry)
          DispatchQueue.main.async { self?.unlockWithPassphrase(entry, entropy: entropy, invoke: invoke) }
        } catch {
          DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
        }
      }
    })
    alert.addAction(UIAlertAction(title: Design.tr("削除", "Delete"), style: .destructive) { [weak self] _ in
      let confirm = UIAlertController(title: Design.tr("\(entry.name)を削除しますか", "Delete \(entry.name)?"), message: Design.tr("この端末にある写しだけを削除します。元に戻すには、バックアップが必要です。", "Only the copy on this device is deleted. You need your backup to restore it."), preferredStyle: .alert)
      confirm.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { _ in Design.fail(invoke, "Deletion was cancelled") })
      confirm.addAction(UIAlertAction(title: Design.tr("削除する", "Delete"), style: .destructive) { _ in
        SeedVault.authenticate(Design.tr("\(entry.name)を削除", "Delete \(entry.name)")) { error in
          if let error { return invoke.reject(error.localizedDescription) }
          SeedVault.delete(entry)
          invoke.resolve(SeedVault.annotate((try? SignerBridge.state()) ?? [:]))
        }
      })
      self?.present(confirm)
    })
    alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { _ in Design.fail(invoke, "Unlock was cancelled") })
    present(alert)
  }

  private func unlockWithPassphrase(_ entry: SeedVault.Entry, entropy: Data, invoke: Invoke) {
    askPassphrase(Design.tr("\(entry.name)のパスフレーズ", "Passphrase for \(entry.name)"), seed: (entropy, false), seedQr: seedQr(entropy: entropy), onCancel: { Design.fail(invoke, "Unlock was cancelled") }) { [weak self] passphrase in
      self?.worker.async {
        do {
          let result = try SignerBridge.loadSeedQr(entropy, passphrase: passphrase)
          DispatchQueue.main.async { invoke.resolve(SeedVault.annotate(result)) }
        } catch {
          DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
        }
      }
    }
  }

  // Called once a seed has loaded: offers to keep a 12 or 24 word seed when storage is on. The fingerprint
  // kept is the words' alone, since one seed can open with several passphrases
  private func offerSave(_ entropy: Data?, fingerprint: String?, result: [String: Any], invoke: Invoke) {
    guard let entropy, let fingerprint, SeedVault.enabled, SeedVault.deviceSecure else {
      return invoke.resolve(SeedVault.annotate(result))
    }
    let alert = UIAlertController(title: Design.tr("この鍵をこの端末に保存しますか", "Save this seed on this device?"), message: Design.tr("単語は、Face ID、Touch IDかパスコードが必要なSecure Enclaveの鍵で暗号化して保存します。パスフレーズは保存しません。", "The words are encrypted to a Secure Enclave key that needs Face ID, Touch ID, or the passcode. The passphrase is not saved."), preferredStyle: .alert)
    alert.addTextField { field in field.text = Design.tr("鍵 \(fingerprint)", "Seed \(fingerprint)"); field.placeholder = Design.tr("名前", "Name") }
    alert.addAction(UIAlertAction(title: Design.tr("今はしない", "Not now"), style: .cancel) { _ in invoke.resolve(SeedVault.annotate(result)) })
    alert.addAction(UIAlertAction(title: Design.tr("保存する", "Save"), style: .default) { [weak self] _ in
      let typed = alert.textFields?.first?.text?.trimmingCharacters(in: .whitespaces) ?? ""
      do {
        try SeedVault.save(name: typed.isEmpty ? Design.tr("鍵 \(fingerprint)", "Seed \(fingerprint)") : typed, fingerprint: fingerprint, entropy: entropy)
        invoke.resolve(SeedVault.annotate(result))
      } catch {
        let failed = UIAlertController(title: Design.tr("鍵を保存できませんでした", "The seed was not saved"), message: error.localizedDescription, preferredStyle: .alert)
        failed.addAction(UIAlertAction(title: "OK", style: .default) { _ in invoke.resolve(SeedVault.annotate(result)) })
        self?.present(failed)
      }
    })
    present(alert)
  }

  // The 16 or 32 bytes of a 12 or 24 word seed, which is what the vault keeps; nil for anything else
  private func entropy(seedQr payload: Data) -> Data? {
    guard SeedVault.enabled else { return nil }
    if payload.count == 16 || payload.count == 32 { return payload }
    return phrase(standardSeedQr: payload).flatMap(entropy(mnemonic:))
  }

  // The words of a Standard SeedQR: four digits per word index
  private func phrase(standardSeedQr payload: Data) -> String? {
    guard payload.count == 48 || payload.count == 96, payload.allSatisfy({ (48...57).contains($0) }) else { return nil }
    let indices = stride(from: 0, to: payload.count, by: 4).map { Int(String(decoding: payload[$0..<$0 + 4], as: UTF8.self)) ?? 0 }
    guard indices.allSatisfy({ $0 < SignerBridge.words.count }) else { return nil }
    return indices.map { SignerBridge.words[$0] }.joined(separator: " ")
  }

  private func entropy(mnemonic: String) -> Data? {
    SeedVault.enabled ? try? SignerBridge.seedQrFromMnemonic(mnemonic, compact: true) : nil
  }

  private func setCovered(_ covered: Bool) {
    guard covered else {
      privacyCover?.removeFromSuperview()
      privacyCover = nil
      return
    }
    guard privacyCover == nil, let window = keyWindow() else { return }
    let cover = UIView(frame: window.bounds)
    cover.backgroundColor = .black
    cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(cover)
    privacyCover = cover
  }

  @objc public func parserInfo(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    do { invoke.resolve(try SignerBridge.parserInfo()) }
    catch { invoke.reject(error.localizedDescription) }
  }

  @objc public func lock(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    worker.async {
      do {
        try SignerBridge.lock()
        DispatchQueue.main.async { invoke.resolve() }
      } catch {
        DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
      }
    }
  }

  @objc public func scanSeedQr(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    requestCamera(invoke) { [weak self] in
      guard let self else { return }
      let scanner = QRScannerViewController(mode: .seed)
      scanner.onCancel = { Design.fail(invoke, "QR scan was cancelled") }
      scanner.onError = { error in
        scanner.close { invoke.reject(error.localizedDescription) }
      }
      scanner.onCode = { [weak self, weak scanner] payload in
        guard let self, let scanner else { return }
        scanner.close {
          if payload.data.count == 64 {
            self.loadSeed(invoke) { try SignerBridge.loadSeedQr(payload.data) }
          } else {
            self.askPassphrase(Design.tr("パスフレーズ", "Passphrase"), seed: (payload.data, false), seedQr: self.seedQr(payload: payload.data), onCancel: { Design.fail(invoke, "Seed import was cancelled") }) { passphrase in
              self.loadSeed(invoke, saving: self.entropy(seedQr: payload.data)) { try SignerBridge.loadSeedQr(payload.data, passphrase: passphrase) }
            }
          }
        }
      }
      self.present(scanner)
    }
  }

  @objc public func scanPsbt(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    do {
      guard try SignerBridge.state()["loaded"] as? Bool == true else {
        Design.fail(invoke, "Load a SeedQR first")
        return
      }
      try SignerBridge.resetUr()
    } catch {
      invoke.reject(error.localizedDescription)
      return
    }
    requestCamera(invoke) { [weak self] in
      guard let self else { return }
      let scanner = QRScannerViewController(mode: .psbt)
      scanner.onCancel = {
        SignerBridge.cancelReview()
        Design.fail(invoke, "QR scan was cancelled")
      }
      scanner.onError = { error in
        scanner.close {
          SignerBridge.cancelReview()
          invoke.reject(error.localizedDescription)
        }
      }
      scanner.onCode = { [weak self, weak scanner] payload in
        guard let self, let scanner, let value = payload.text, scanner.beginProcessing() else { return }
        self.worker.async {
          do {
            let result = try SignerBridge.receiveUr(value)
            let complete = result["complete"] as? Bool == true
            let progress = result["progress"] as? Int ?? 0
            DispatchQueue.main.async {
              scanner.finishProcessing()
              guard !scanner.isClosed else {
                SignerBridge.cancelReview()
                return
              }
              scanner.setProgress(progress)
              guard complete, let review = result["review"] as? [String: Any] else { return }
              scanner.close {
                self.showReview(review, invoke: invoke)
              }
            }
          } catch {
            DispatchQueue.main.async {
              scanner.finishProcessing()
              scanner.close {
                SignerBridge.cancelReview()
                invoke.reject(error.localizedDescription)
              }
            }
          }
        }
      }
      self.present(scanner)
    }
  }

  @objc public func importMnemonic(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.importMnemonic(invoke) } }
    guard ready(invoke) else { return }
    let entry = MnemonicEntryViewController(words: SignerBridge.words)
    entry.onCancel = { Design.fail(invoke, "Seed import was cancelled") }
    entry.onPhrase = { [weak self] phrase in
      self?.askPassphrase(Design.tr("パスフレーズ", "Passphrase"), seed: (Data(phrase.utf8), true), seedQr: self?.seedQr(phrase: phrase), onCancel: { Design.fail(invoke, "Seed import was cancelled") }) { passphrase in
        self?.loadSeed(invoke, saving: self?.entropy(mnemonic: phrase)) { try SignerBridge.loadMnemonic(phrase, passphrase: passphrase) }
      }
    }
    present(entry)
  }

  // A pending seed's SeedQR for the passphrase step, while its words are still here: 12 or 24 words only
  private func seedQr(phrase: String) -> ((Bool) throws -> Data)? {
    [12, 24].contains(phrase.split(separator: " ").count) ? { try SignerBridge.seedQrFromMnemonic(phrase, compact: $0) } : nil
  }

  private func seedQr(entropy: Data) -> (Bool) throws -> Data {
    { compact in compact ? entropy : try SignerBridge.seedQrFromMnemonic(SignerBridge.mnemonicFromEntropy(entropy), compact: false) }
  }

  private func seedQr(payload: Data) -> ((Bool) throws -> Data)? {
    if payload.count == 16 || payload.count == 32 { return seedQr(entropy: payload) }
    return phrase(standardSeedQr: payload).flatMap(seedQr(phrase:))
  }

  // The SeedQR format chooser, then the secret QR
  private func showSeedQr(_ payload: @escaping (Bool) throws -> Data, onCancel: @escaping () -> Void, onDone: @escaping () -> Void, onError: @escaping (Error) -> Void) {
    choose(Design.tr("SeedQRの形式", "SeedQR format"), title: Design.tr("形式を選んでください", "Choose a format"),
           lead: Design.tr("読み取るウォレットが対応している形式を選んでください。", "Pick the format your wallet can scan."),
           options: [(Design.tr("標準のSeedQR", "Standard SeedQR"), Design.tr("多くのウォレットが対応", "Works with most wallets")), ("CompactSeedQR", Design.tr("小さいQR・対応するウォレットのみ", "Smaller QR · supported wallets only"))],
           onCancel: onCancel) { [weak self] which in
      self?.worker.async {
        do {
          let bytes = try payload(which == 1)
          DispatchQueue.main.async {
            self?.showQr([""], title: which == 1 ? "CompactSeedQR" : Design.tr("標準のSeedQR", "Standard SeedQR"), interval: 3_600, binaryPayload: bytes, qrName: "SeedQR", onDone: onDone)
          }
        } catch {
          DispatchQueue.main.async { onError(error) }
        }
      }
    }
  }

  // The pending seed's last screen: the fingerprint with no passphrase and with the typed one, so a typo
  // shows before the key loads, and with `seedQr` its SeedQR. seed is a SeedQR payload or, when the flag is set, words
  private func askPassphrase(_ title: String, seed: (Data, Bool), seedQr: ((Bool) throws -> Data)?, onCancel: @escaping () -> Void, onContinue: @escaping (String) -> Void) {
    let p = Design.palette
    let working = Design.tr("計算しています…", "Working…")
    let none = Design.tr("入力すると表示します", "Shown as you type")
    var generation = 0
    var pending: DispatchWorkItem?
    let plain = Design.label(working, .data, p.ink)
    let typed = Design.label(none, .data, p.ink)
    func preview(_ passphrase: String, done: @escaping (String) -> Void) {
      worker.async {
        let value = (try? SignerBridge.previewFingerprint(seed.0, mnemonic: seed.1, passphrase: passphrase)).map { "\($0.prefix(4)) \($0.dropFirst(4))" }
        DispatchQueue.main.async { done(value ?? Design.tr("計算できません", "Unavailable")) }
      }
    }
    func stop() {
      pending?.cancel()
      generation += 1
    }
    let field = Design.input(Design.tr("パスフレーズ", "Passphrase"))
    field.isSecureTextEntry = true
    // Waits for typing to pause, since each fingerprint runs the 2048 round BIP39 stretch
    field.addAction(UIAction { _ in
      generation += 1
      let asked = generation
      pending?.cancel()
      let text = field.text ?? ""
      typed.text = text.isEmpty ? none : working
      guard !text.isEmpty else { return }
      let item = DispatchWorkItem { preview(text) { if asked == generation { typed.text = $0 } } }
      pending = item
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: item)
    }, for: .editingChanged)
    let divider = UIView()
    divider.backgroundColor = p.line
    divider.heightAnchor.constraint(equalToConstant: 1).isActive = true
    let card = Design.card()
    Design.pad(Design.stack([
      Design.field(Design.tr("パスフレーズなし", "WITHOUT A PASSPHRASE"), Design.well(plain)),
      divider,
      Design.field(Design.tr("入力したパスフレーズ", "WITH THIS PASSPHRASE"), Design.well(typed),
                   note: Design.tr("控えておいたフィンガープリントと同じか確かめてください。1文字違うだけで別の鍵になります。", "Check it matches the fingerprint you noted. One wrong character makes a different key.")),
    ], spacing: DesignTokens.space4), in: card)
    let controller = UIViewController()
    controller.modalPresentationStyle = .fullScreen
    controller.isModalInPresentation = true
    controller.loadViewIfNeeded()
    let next = Design.button(Design.tr("ウォレットを開く", "Open the wallet"), primary: true)
    next.addAction(UIAction { [weak controller] _ in
      stop()
      let passphrase = field.text ?? ""
      field.text = ""
      controller?.dismiss(animated: true) { onContinue(passphrase) }
    }, for: .touchUpInside)
    let clears = Design.label(seedQr != nil ? Design.tr("ウォレットを開くと、単語はメモリから消えます。SeedQRは、その前にここで表示できます。", "Opening the wallet clears the words from memory. Show the SeedQR here before that.")
      : Design.tr("ウォレットを開くと、単語はメモリから消えます。", "Opening the wallet clears the words from memory."), .caption, p.inkMuted)
    var actions: [UIView] = [clears]
    if let seedQr {
      let show = Design.button(Design.tr("SeedQRを表示", "Show SeedQR"), primary: false)
      show.addAction(UIAction { [weak self] _ in
        self?.showSeedQr(seedQr, onCancel: {}, onDone: {}) { error in
          let failed = UIAlertController(title: Design.tr("SeedQRを作れませんでした", "Could not encode the SeedQR"), message: error.localizedDescription, preferredStyle: .alert)
          failed.addAction(UIAlertAction(title: "OK", style: .default))
          self?.present(failed)
        }
      }, for: .touchUpInside)
      actions.append(show)
    }
    actions.append(next)
    let content = Design.stack([
      Design.label(Design.tr("単語にパスフレーズを足すと、別の鍵になります。付けていない場合は、空のままにしてください。", "A passphrase added to the words makes a different key. If this seed has none, leave it blank."), .body, p.inkMuted),
      field,
      Design.label(Design.tr("フィンガープリント", "FINGERPRINT"), .overline, p.inkMuted),
      card,
    ], spacing: DesignTokens.space4)
    _ = Design.screen(controller, title: title, testnet: SignerBridge.testnet, content: content, actions: actions) { [weak controller] in
      stop()
      field.text = ""
      controller?.dismiss(animated: true, completion: onCancel)
    }
    present(controller)
    preview("") { plain.text = $0 }
  }

  private func loadSeed(_ invoke: Invoke, saving entropy: Data? = nil, _ operation: @escaping () throws -> [String: Any]) {
    worker.async {
      do {
        let result = try operation()
        let fingerprint = entropy.flatMap { try? SignerBridge.previewFingerprint($0, mnemonic: false, passphrase: "") }
        DispatchQueue.main.async { self.offerSave(entropy, fingerprint: fingerprint, result: result, invoke: invoke) }
      } catch {
        DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
      }
    }
  }

  // The engine packs all four purposes or none, so the choice is all of them (nil) or exactly one
  @objc public func exportAccount(_ invoke: Invoke) {
    // Tauri calls plugins off the main thread, and UIKit views must be built on it
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.exportAccount(invoke) } }
    guard ready(invoke) else { return }
    guard (try? SignerBridge.state()["loaded"] as? Bool) == true else {
      Design.fail(invoke, "Load a SeedQR first")
      return
    }
    let p = Design.palette
    let t = SignerBridge.testnet
    let kinds: [(Int?, String, String)] = [
      (nil, "", Design.tr("まとめて渡す・おすすめ", "All at once · recommended")),
      (84, t ? "tb1q…" : "bc1q…", Design.tr("標準・いちばん一般的", "Standard · most common")),
      (86, t ? "tb1p…" : "bc1p…", Design.tr("Taproot・新しい形式", "Taproot · newest")),
      (49, t ? "2…" : "3…", Design.tr("古いウォレット向け", "For older wallets")),
      (48, t ? "tb1q…" : "bc1q…", Design.tr("マルチシグ用・複数の鍵で管理", "Multisig · several keys")),
    ]
    var chosen: Int? = nil
    let heading = Design.tr("ウォレットアプリと接続する", "Connect your wallet app")
    let controller = UIViewController()
    controller.modalPresentationStyle = .fullScreen
    controller.isModalInPresentation = true
    controller.loadViewIfNeeded()
    let summary = Design.label("", .body, p.ink)
    var cards: [UIControl] = []
    var marks: [UIView] = []
    func refresh() {
      for (i, kind) in kinds.enumerated() {
        let on = chosen == kind.0
        cards[i].backgroundColor = on ? p.primarySoft : p.surfaceRaised
        cards[i].layer.borderColor = (on ? p.primary : p.line).cgColor
        marks[i].backgroundColor = on ? p.primary : p.surfaceRaised
        marks[i].layer.borderWidth = on ? 6 : 2
        marks[i].layer.borderColor = (on ? p.primarySoft : p.lineStrong).cgColor
      }
      summary.text = chosen.map { Design.tr("BIP\($0)のxpubとディスクリプターを渡します。xpubだけを読むアプリにも使えます。", "Shares the BIP\($0) xpub and descriptor, which wallets that only read an xpub accept too.") }
        ?? Design.tr("4種類を1つのアニメーションQR(UR crypto-account)で渡します。Sparrow、Nunchuk、Keystoneなどで読めます。", "All four go in one animated QR (UR crypto-account) for Sparrow, Nunchuk, Keystone and similar wallets.")
    }
    for (purpose, prefix, name) in kinds {
      let card = UIControl()
      card.layer.cornerRadius = DesignTokens.radiusMd
      card.layer.borderWidth = 1.5
      // The all-at-once card shows every prefix it carries, two to a row
      let prefixes = purpose == nil ? kinds.dropFirst().map { $0.1 } : [prefix]
      let grid = Design.stack(stride(from: 0, to: prefixes.count, by: 2).map { i -> UIView in
        let row = UIStackView(arrangedSubviews: prefixes[i..<min(i + 2, prefixes.count)].map { text -> UIView in
          let label = Design.label(text, .data, p.ink)
          label.font = .monospacedSystemFont(ofSize: prefixes.count > 1 ? 12 : 20, weight: .bold)
          label.textAlignment = .center
          return label
        })
        row.distribution = .fillEqually
        return row
      }, spacing: 2)
      let well = UIView()
      grid.translatesAutoresizingMaskIntoConstraints = false
      well.addSubview(grid)
      NSLayoutConstraint.activate([
        grid.centerYAnchor.constraint(equalTo: well.centerYAnchor),
        grid.leadingAnchor.constraint(equalTo: well.leadingAnchor, constant: 4),
        grid.trailingAnchor.constraint(equalTo: well.trailingAnchor, constant: -4),
      ])
      well.backgroundColor = p.surface
      well.layer.cornerRadius = DesignTokens.radiusSm
      well.layer.borderWidth = 1
      well.layer.borderColor = p.line.cgColor
      well.clipsToBounds = true
      well.widthAnchor.constraint(equalToConstant: 88).isActive = true
      well.heightAnchor.constraint(equalToConstant: 48).isActive = true
      let text = Design.stack([Design.label(name, .label, p.ink), Design.label(purpose.map { "BIP\($0)" } ?? "BIP84・86・49・48", .caption, p.inkMuted)], spacing: 2)
      let mark = UIView()
      mark.layer.cornerRadius = 12
      mark.widthAnchor.constraint(equalToConstant: 24).isActive = true
      mark.heightAnchor.constraint(equalToConstant: 24).isActive = true
      let line = UIStackView(arrangedSubviews: [well, text, mark])
      line.alignment = .center
      line.spacing = DesignTokens.space3
      line.isUserInteractionEnabled = false
      Design.pad(line, in: card, DesignTokens.space3)
      card.addAction(UIAction { _ in chosen = purpose; refresh() }, for: .touchUpInside)
      cards.append(card)
      marks.append(mark)
    }
    let list = Design.stack([cards[0], Design.label(Design.tr("1種類だけ渡す", "ONLY ONE KIND"), .overline, p.inkMuted)] + cards.dropFirst().map { $0 as UIView }, spacing: DesignTokens.space2)
    list.setCustomSpacing(DesignTokens.space6, after: cards[0])
    let content = Design.stack([
      Design.label(Design.tr("渡す公開鍵を選ぶ", "Choose the keys to share"), .display, p.ink),
      Design.label(Design.tr("左の文字は、受け取りアドレスの始まり方です。公開鍵だけを渡し、秘密鍵は含まれていません。", "On the left is how each kind of receive address starts. Only public keys are shared, never private keys."), .body, p.inkMuted),
      list,
      summary,
    ], spacing: DesignTokens.space4)
    let show = Design.button(Design.tr("QRを表示", "Show QR"), primary: true)
    show.addAction(UIAction { [weak self, weak controller] _ in
      controller?.dismiss(animated: true) {
        if let purpose = chosen { self?.exportAccountKey(invoke, purpose: purpose) }
        else { self?.showPublicFrames(heading, invoke: invoke) { try SignerBridge.accountUr(account: 0) } }
      }
    }, for: .touchUpInside)
    _ = Design.screen(controller, title: heading, testnet: t, content: content, actions: [show]) { [weak controller] in
      controller?.dismiss(animated: true) { Design.fail(invoke, "Account export was cancelled") }
    }
    refresh()
    present(controller)
  }

  private func exportAccountKey(_ invoke: Invoke, purpose: Int) {
    worker.async {
      do {
        let frames = try SignerBridge.account(purpose: purpose, account: 0)
        DispatchQueue.main.async {
          self.showQr(frames, title: "BIP\(purpose)", interval: 1.5) {
            invoke.resolve(["loaded": true, "fingerprint": (try? SignerBridge.state()["fingerprint"]) as? String, "testnet": SignerBridge.testnet, "shown": true])
          }
        }
      } catch {
        DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
      }
    }
  }

  @objc public func registerMultisig(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.registerMultisig(invoke) } }
    guard ready(invoke) else { return }
    guard (try? SignerBridge.state()["loaded"] as? Bool) == true else {
      Design.fail(invoke, "Load a seed first")
      return
    }
    try? SignerBridge.resetUr()
    requestCamera(invoke) { [weak self] in
      guard let self else { return }
      let scanner = QRScannerViewController(mode: .multisig)
      scanner.onCancel = { Design.fail(invoke, "QR scan was cancelled") }
      scanner.onError = { error in scanner.close { invoke.reject(error.localizedDescription) } }
      scanner.onCode = { [weak self, weak scanner] payload in
        guard let self, let scanner, let value = payload.text, scanner.beginProcessing() else { return }
        self.worker.async {
          do {
            // A descriptor, BSMS record or setup file fits one plain QR; a longer one comes as an animated ur:bytes
            let wallet: [String: Any]?
            if value.lowercased().hasPrefix("ur:") {
              wallet = try SignerBridge.receiveMultisigUr(value)["multisig"] as? [String: Any]
            } else {
              wallet = try SignerBridge.multisigLoad(Data(value.utf8))
            }
            DispatchQueue.main.async {
              scanner.finishProcessing()
              guard let wallet else { return }
              scanner.close { self.showMultisigReview(wallet, invoke: invoke) }
            }
          } catch {
            DispatchQueue.main.async {
              scanner.finishProcessing()
              scanner.close { invoke.reject(error.localizedDescription) }
            }
          }
        }
      }
      self.present(scanner)
    }
  }

  // Registering decides what is shown as change, so the wallet is confirmed against the coordinator first
  private func showMultisigReview(_ wallet: [String: Any], invoke: Invoke) {
    let fingerprints = wallet["fingerprints"] as? [String] ?? []
    let ours = wallet["ours"] as? Int ?? -1
    let keys = fingerprints.enumerated().map { "\($0.element)\($0.offset == ours ? Design.tr("  ← この鍵", "  ← this seed") : "")" }.joined(separator: "\n")
    let alert = UIAlertController(
      title: Design.tr("マルチシグ \(wallet["threshold"] as? Int ?? 0)/\(fingerprints.count) を登録しますか", "Register \(wallet["threshold"] as? Int ?? 0) of \(fingerprints.count) multisig?"),
      message: Design.tr("鍵\n\(keys)\n\n最初の受け取りアドレス\n\(wallet["receive"] as? String ?? "")\n\nコーディネーターに同じ最初の受け取りアドレスが表示されているか確かめてください。", "Keys\n\(keys)\n\nFirst receive address\n\(wallet["receive"] as? String ?? "")\n\nCheck that your coordinator shows the same first receive address."),
      preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { _ in
      _ = try? SignerBridge.multisigForget()
      Design.fail(invoke, "Registration was cancelled")
    })
    alert.addAction(UIAlertAction(title: Design.tr("登録する", "Register"), style: .default) { _ in
      guard let state = try? SignerBridge.state() else { return Design.fail(invoke, "The signing key is locked") }
      if SeedVault.enabled, let descriptor = wallet["descriptor"] as? String {
        UserDefaults.standard.set(descriptor, forKey: SignerBridge.walletKey(state))
      }
      invoke.resolve(SeedVault.annotate(state))
    })
    present(alert)
  }

  @objc public func exportMultisig(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.exportMultisig(invoke) } }
    guard ready(invoke) else { return }
    showPublicFrames(Design.tr("マルチシグの設定", "Multisig setup"), invoke: invoke) { try SignerBridge.multisigUr() }
  }

  @objc public func forgetMultisig(_ invoke: Invoke) {
    guard ready(invoke) else { return }
    do {
      let state = try SignerBridge.multisigForget()
      UserDefaults.standard.removeObject(forKey: SignerBridge.walletKey(state))
      invoke.resolve(SeedVault.annotate(state))
    } catch {
      invoke.reject(error.localizedDescription)
    }
  }

  private func showPublicFrames(_ title: String, invoke: Invoke, frames: @escaping () throws -> [String]) {
    worker.async {
      do {
        let frames = try frames()
        DispatchQueue.main.async {
          self.showQr(frames, title: title, interval: 0.35) {
            let state = (try? SignerBridge.state()) ?? [:]
            invoke.resolve(SeedVault.annotate(state).merging(["shown": true]) { $1 })
          }
        }
      } catch {
        DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
      }
    }
  }

  // How the new wallet being written down was made: its rolls, kept until the flow ends or the user clears them
  private var origin: (dice: Bool, rolls: [UInt8]?)?

  private func forgetOrigin() {
    origin?.rolls?.withUnsafeMutableBytes { $0.initializeMemory(as: UInt8.self, repeating: 0) }
    origin = nil
  }

  @objc public func createMnemonic(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.createMnemonic(invoke) } }
    guard ready(invoke) else { return }
    if let name = DeviceRestrictions.blockedBy { return invoke.reject(SignerError.restricted(name).localizedDescription) }
    let flow = NewWalletController()
    func show(_ make: @escaping () throws -> String) {
      worker.async {
        do {
          let phrase = try make()
          DispatchQueue.main.async {
            flow.dismiss(animated: true) { self.showMnemonic(phrase, title: Design.tr("新しいウォレット", "New wallet"), seedQrAvailable: true, verify: true, invoke: invoke) }
          }
        } catch {
          DispatchQueue.main.async { flow.dismiss(animated: true) { invoke.reject(error.localizedDescription) } }
        }
      }
    }
    flow.onRandom = { [weak self] words in
      self?.origin = (false, nil)
      show {
        var entropy = Data(count: words / 3 * 4)
        defer { entropy.resetBytes(in: 0..<entropy.count) }
        let status = entropy.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, $0.count, $0.baseAddress!) }
        guard status == errSecSuccess else { throw SignerError.initialization("Could not get secure random bytes") }
        return try SignerBridge.mnemonicFromEntropy(entropy)
      }
    }
    flow.onDice = { [weak flow] rolls, words, reset in
      let flags = (try? SignerBridge.diceCheck(rolls, words: words)) ?? 0
      func make() {
        self.origin = (true, [UInt8](rolls))
        show { try SignerBridge.mnemonicFromDice(rolls, words: words) }
      }
      if flags & 6 == 0 { return make() }
      let alert = UIAlertController(title: flags & 2 != 0 ? Design.tr("出た目に偏りがあります", "The rolls are uneven") : Design.tr("出た目に規則性があります", "The rolls follow a pattern"),
                                    message: Design.tr("公平なサイコロなら、ほとんど起きない並びです。目の押し間違いや、偏ったサイコロでないか確かめてください。振り直すことをおすすめします。",
                                                       "A fair die almost never gives rolls like these. Check for mistyped rolls or a weighted die. Rolling again is recommended."),
                                    preferredStyle: .alert)
      alert.addAction(UIAlertAction(title: Design.tr("このまま作る", "Use them anyway"), style: .destructive) { _ in make() })
      alert.addAction(UIAlertAction(title: Design.tr("振り直す", "Roll again"), style: .cancel) { _ in reset() })
      Design.style(alert)
      flow?.present(alert, animated: true)
    }
    flow.onCancel = { Design.fail(invoke, "Mnemonic creation was cancelled") }
    present(flow)
  }

  @objc public func bip85Mnemonic(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.bip85Mnemonic(invoke) } }
    guard ready(invoke) else { return }
    guard (try? SignerBridge.state()["loaded"] as? Bool) == true else {
      Design.fail(invoke, "Load a seed first")
      return
    }
    let alert = UIAlertController(title: Design.tr("子ニーモニックを作る", "Derive a child mnemonic"), message: Design.tr("この鍵から、別のシードフレーズを作ります(m/83696968'/39'/0'/単語数'/番号')。", "Derived at m/83696968'/39'/0'/words'/index'."), preferredStyle: .alert)
    alert.addTextField { field in field.text = "24"; field.keyboardType = .numberPad; field.placeholder = Design.tr("単語の数(12、18、24)", "12, 18, or 24 words") }
    alert.addTextField { field in field.text = "0"; field.keyboardType = .numberPad; field.placeholder = Design.tr("番号(BIP85のインデックス)", "BIP85 index") }
    alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { _ in Design.fail(invoke, "BIP85 derivation was cancelled") })
    alert.addAction(UIAlertAction(title: Design.tr("作る", "Show phrase"), style: .default) { [weak self] _ in
      guard let self,
            let words = Int(alert.textFields?[0].text ?? ""), [12, 18, 24].contains(words),
            let index = Int(alert.textFields?[1].text ?? ""), index >= 0, index <= Int(Int32.max) else {
        Design.fail(invoke, "Use 12, 18, or 24 words and a valid index")
        return
      }
      self.worker.async {
        do {
          let phrase = try SignerBridge.bip85Mnemonic(words: words, index: index)
          DispatchQueue.main.async { self.showMnemonic(phrase, title: Design.tr("子ニーモニック", "Child mnemonic"), seedQrAvailable: words == 12 || words == 24, invoke: invoke) }
        } catch {
          DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
        }
      }
    })
    present(alert)
  }

  @objc public func findAddress(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.findAddress(invoke) } }
    guard ready(invoke) else { return }
    guard (try? SignerBridge.state()["loaded"] as? Bool) == true else {
      Design.fail(invoke, "Load a seed first")
      return
    }
    let p = Design.palette
    let address = Design.input(Design.tr("アドレスかbitcoin: URI", "Address or bitcoin: URI"))
    address.keyboardType = .asciiCapable
    let account = Design.input("")
    account.text = "0"
    account.keyboardType = .numberPad
    let count = Design.input("")
    count.text = "1000"
    count.keyboardType = .numberPad
    let range = UIStackView(arrangedSubviews: [
      Design.stack([Design.label(Design.tr("アカウント", "Account"), .caption, p.inkMuted), account], spacing: DesignTokens.space1),
      Design.stack([Design.label(Design.tr("それぞれ探す数", "Addresses per chain"), .caption, p.inkMuted), count], spacing: DesignTokens.space1),
    ])
    range.distribution = .fillEqually
    range.spacing = DesignTokens.space3
    let problem = Design.label("", .caption, p.danger)
    problem.isHidden = true
    let controller = UIViewController()
    controller.modalPresentationStyle = .fullScreen
    controller.isModalInPresentation = true
    controller.loadViewIfNeeded()
    func search() {
      let text = (address.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      guard !text.isEmpty, let accountValue = Int(account.text ?? ""), accountValue >= 0, accountValue <= Int(Int32.max),
            let countValue = Int(count.text ?? ""), (1...100_000).contains(countValue) else {
        problem.text = Design.tr("アドレスと、0以上のアカウント、1〜100000の探す数を入れてください。", "Enter an address, an account of 0 or more, and 1 to 100000 addresses.")
        problem.isHidden = false
        return
      }
      let shown = String((text.lowercased().hasPrefix("bitcoin:") ? String(text.dropFirst(8)) : text).split(separator: "?", omittingEmptySubsequences: false).first ?? "")
      controller.dismiss(animated: true) {
        self.worker.async {
          do {
            let result = try SignerBridge.findAddress(shown, account: accountValue, count: countValue)
            DispatchQueue.main.async { self.showAddressResult(shown, account: accountValue, count: countValue, result: result, invoke: invoke) }
          } catch {
            DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
          }
        }
      }
    }
    let scan = Design.button(Design.tr("QRを読み取る", "Scan a QR"), primary: false)
    scan.addAction(UIAction { [weak self] _ in
      // Without the camera the address can still be typed, so a refusal leaves this screen open
      self?.requestCamera(invoke, denied: {
        problem.text = Design.tr("カメラを使えません。アドレスを入力してください。", "The camera is not available. Type the address.")
        problem.isHidden = false
      }) {
        let scanner = QRScannerViewController(mode: .address)
        scanner.onCancel = {}
        scanner.onError = { _ in scanner.close {} }
        scanner.onCode = { [weak scanner] payload in
          guard let scanner, let text = payload.text else { return }
          scanner.close {
            address.text = text
            search()
          }
        }
        self?.present(scanner)
      }
    }, for: .touchUpInside)
    let check = Design.button(Design.tr("調べる", "Check"), primary: true)
    check.addAction(UIAction { _ in search() }, for: .touchUpInside)
    let content = Design.stack([
      Design.label(Design.tr("アドレスを確認する", "Check an address"), .display, p.ink),
      Design.label(Design.tr("ウォレットアプリに出た受け取りのアドレスが、この鍵のものか確かめます。QRを読み取るか、アドレスを入力してください。",
                             "Check that a receive address shown in your wallet app belongs to this key. Scan its QR or type it."), .body, p.inkMuted),
      address,
      problem,
      Design.label(Design.tr("探す範囲", "SEARCH RANGE"), .overline, p.inkMuted),
      range,
      Design.label(Design.tr("受け取りとおつりのアドレスを、それぞれ最初から探す数だけ調べます。", "The first addresses of the receive and change chains are checked, this many of each."), .caption, p.inkMuted),
    ], spacing: DesignTokens.space4)
    _ = Design.screen(controller, title: Design.tr("アドレスの確認", "Address check"), testnet: SignerBridge.testnet, content: content, actions: [scan, check]) { [weak controller] in
      controller?.dismiss(animated: true) { Design.fail(invoke, "Address search was cancelled") }
    }
    present(controller)
  }

  private func showAddressResult(_ address: String, account: Int, count: Int, result: [String: Any], invoke: Invoke) {
    let p = Design.palette
    let found = result["found"] as? Bool == true
    var rows: [UIView] = [Design.field(Design.tr("アドレス", "ADDRESS"), Design.well(address, grouped: true))]
    if found {
      let chain = (result["chain"] as? Int ?? 0) == 0 ? Design.tr("受け取り", "Receive") : Design.tr("おつり", "Change")
      let index = result["index"] as? Int ?? 0
      rows.append(Design.field(Design.tr("場所", "WHERE"), Design.label(Design.tr("\(chain)・番号 \(index)", "\(chain) · index \(index)"), .data, p.ink),
                               note: Design.tr("アカウント \(account)", "Account \(account)")))
    }
    let card = Design.card()
    Design.pad(Design.stack(rows, spacing: DesignTokens.space4), in: card)
    let content = Design.stack([
      Design.label(found ? Design.tr("このウォレットのアドレスです", "This address is yours") : Design.tr("見つかりませんでした", "Not found"), .display, p.ink),
      Design.label(found ? Design.tr("この鍵から作られたアドレスです。", "It was made from this key.")
                         : Design.tr("アカウント \(account) の受け取りとおつり、それぞれ最初の\(count)個にはありません。別のウォレットのアドレスか、探す範囲の外です。",
                                     "It is not among the first \(count) receive and change addresses of account \(account). It belongs to another wallet or lies outside the range."), .body, p.inkMuted),
      card,
    ], spacing: DesignTokens.space4)
    let controller = UIViewController()
    controller.modalPresentationStyle = .fullScreen
    controller.isModalInPresentation = true
    controller.loadViewIfNeeded()
    let again = Design.button(Design.tr("別のアドレスを調べる", "Check another address"), primary: false)
    again.addAction(UIAction { [weak self, weak controller] _ in controller?.dismiss(animated: true) { self?.findAddress(invoke) } }, for: .touchUpInside)
    let done = Design.button(Design.tr("完了", "Done"), primary: true)
    done.addAction(UIAction { [weak controller] _ in controller?.dismiss(animated: true) { invoke.resolve(["shown": true]) } }, for: .touchUpInside)
    _ = Design.screen(controller, title: Design.tr("アドレスの確認", "Address check"), testnet: SignerBridge.testnet, content: content, actions: [again, done]) { [weak controller] in
      controller?.dismiss(animated: true) { invoke.resolve(["shown": true]) }
    }
    present(controller)
  }

  @objc public func signMessage(_ invoke: Invoke) {
    guard Thread.isMainThread else { return DispatchQueue.main.async { self.signMessage(invoke) } }
    guard ready(invoke) else { return }
    guard (try? SignerBridge.state()["loaded"] as? Bool) == true else {
      Design.fail(invoke, "Load a seed first")
      return
    }
    let alert = UIAlertController(title: Design.tr("メッセージに署名する", "Sign a message"), message: nil, preferredStyle: .alert)
    alert.addTextField { field in field.placeholder = Design.tr("署名するメッセージ", "Message to sign"); field.autocapitalizationType = .none }
    alert.addTextField { field in field.text = "84"; field.keyboardType = .numberPad; field.placeholder = Design.tr("種類(49、84)", "Purpose: 49 or 84") }
    alert.addTextField { field in field.text = "0"; field.keyboardType = .numberPad; field.placeholder = Design.tr("アカウント", "Account") }
    alert.addTextField { field in field.text = "0"; field.keyboardType = .numberPad; field.placeholder = Design.tr("0は受け取り、1はおつり", "Chain: 0 or 1") }
    alert.addTextField { field in field.text = "0"; field.keyboardType = .numberPad; field.placeholder = Design.tr("アドレスの番号", "Address index") }
    alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { _ in Design.fail(invoke, "Message signing was cancelled") })
    alert.addAction(UIAlertAction(title: Design.tr("確認する", "Review"), style: .default) { [weak self] _ in
      guard let self,
            let message = alert.textFields?[0].text, !message.isEmpty,
            let purpose = Int(alert.textFields?[1].text ?? ""), [49, 84].contains(purpose),
            let account = Int(alert.textFields?[2].text ?? ""), account >= 0, account <= Int(Int32.max),
            let chain = Int(alert.textFields?[3].text ?? ""), (0...1).contains(chain),
            let index = Int(alert.textFields?[4].text ?? ""), index >= 0, index <= Int(Int32.max) else {
        Design.fail(invoke, "Enter a message and valid signing path")
        return
      }
      self.worker.async {
        do {
          let review = try SignerBridge.reviewMessage(message, purpose: purpose, account: account, chain: chain, index: index)
          DispatchQueue.main.async { self.showMessageReview(purpose: purpose, account: account, chain: chain, index: index, review: review, invoke: invoke) }
        } catch {
          DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
        }
      }
    })
    present(alert)
  }

  private func showMnemonic(_ phrase: String, title: String, seedQrAvailable: Bool, verify: Bool = false, invoke: Invoke) {
    let controller = WriteDownViewController(phrase: phrase, title: title, verify: verify, seedQrAvailable: seedQrAvailable)
    controller.onWrote = { [weak self] in
      if verify { self?.checkBackup(phrase, title: title, seedQrAvailable: seedQrAvailable, invoke: invoke) } else { invoke.resolve(["shown": true]) }
    }
    controller.onSeedQr = { [weak self] in self?.chooseSeedQrFormat(phrase, invoke: invoke) }
    if verify, let made = origin {
      controller.onExplain = { [weak self, weak controller] in
        guard let self, let entropy = try? SignerBridge.seedQrFromMnemonic(phrase, compact: true) else { return }
        let explain = DerivationViewController(words: phrase.split(separator: " ").map(String.init), entropy: [UInt8](entropy), dice: made.dice, rolls: self.origin?.rolls)
        explain.onForget = { [weak self] in self?.forgetOrigin(); self?.origin = (made.dice, nil) }
        Design.style(explain)
        controller?.present(explain, animated: true)
      }
    }
    present(controller)
  }

  private func checkBackup(_ phrase: String, title: String, seedQrAvailable: Bool, invoke: Invoke) {
    let words = phrase.split(separator: " ").map(String.init)
    let positions = Array(words.indices.shuffled().prefix(5))
    func ask(_ step: Int) {
      guard step < positions.count else { return backupChecked(phrase, invoke: invoke) }
      let answer = words[positions[step]]
      let options = (Array(SignerBridge.words.filter { $0 != answer }.shuffled().prefix(3)) + [answer]).shuffled()
      let alert = UIAlertController(title: Design.tr("\(positions[step] + 1)番目の単語はどれですか", "Which is word \(positions[step] + 1)?"), message: Design.tr("バックアップの確認(\(step + 1)/\(positions.count))", "Check your backup · \(step + 1)/\(positions.count)"), preferredStyle: .alert)
      for option in options {
        alert.addAction(UIAlertAction(title: option, style: .default) { [weak self] _ in
          guard option != answer else { return ask(step + 1) }
          let wrong = UIAlertController(title: Design.tr("\(positions[step] + 1)番目の単語ではありません", "That is not word \(positions[step] + 1)"), message: Design.tr("紙に書いた単語と見比べて、もう一度試してください。", "Compare your backup with the words and try again."), preferredStyle: .alert)
          wrong.addAction(UIAlertAction(title: Design.tr("単語をもう一度見る", "Show the words"), style: .default) { _ in
            self?.showMnemonic(phrase, title: title, seedQrAvailable: seedQrAvailable, verify: true, invoke: invoke)
          })
          self?.present(wrong)
        })
      }
      alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { [weak self] _ in self?.forgetOrigin(); invoke.resolve(["shown": false]) })
      present(alert)
    }
    ask(0)
  }

  private func backupChecked(_ phrase: String, invoke: Invoke) {
    let alert = UIAlertController(title: Design.tr("バックアップを確かめました", "Backup checked"), message: Design.tr("このシードフレーズを、署名に使う鍵として今読み込みますか。", "Load these words as the signing key now?"), preferredStyle: .alert)
    forgetOrigin()
    alert.addAction(UIAlertAction(title: Design.tr("完了", "Done"), style: .cancel) { _ in invoke.resolve(["shown": true]) })
    alert.addAction(UIAlertAction(title: Design.tr("読み込む", "Load it"), style: .default) { [weak self] _ in
      self?.askPassphrase(Design.tr("パスフレーズ", "Passphrase"), seed: (Data(phrase.utf8), true), seedQr: self?.seedQr(phrase: phrase), onCancel: { invoke.resolve(["shown": true]) }) { passphrase in
        self?.loadSeed(invoke, saving: self?.entropy(mnemonic: phrase)) {
          try SignerBridge.loadMnemonic(phrase, passphrase: passphrase).merging(["shown": true]) { $1 }
        }
      }
    })
    present(alert)
  }

  private func chooseSeedQrFormat(_ phrase: String, invoke: Invoke) {
    showSeedQr({ try SignerBridge.seedQrFromMnemonic(phrase, compact: $0) }, onCancel: { invoke.resolve(["shown": false]) }, onDone: { invoke.resolve(["shown": true]) }) { invoke.reject($0.localizedDescription) }
  }

  private func showInfo(_ title: String, message: String, invoke: Invoke) {
    let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: Design.tr("完了", "Done"), style: .default) { _ in invoke.resolve(["shown": true]) })
    present(alert)
  }

  private func showMessageReview(purpose: Int, account: Int, chain: Int, index: Int, review: [String: Any], invoke: Invoke) {
    let address = review["address"] as? String ?? ""
    let text = review["text"] as? String ?? ""
    let display = review["isHex"] as? Bool == true ? Design.tr("メッセージ(16進)", "Message bytes (hex)") : Design.tr("メッセージ", "Message")
    let alert = UIAlertController(title: Design.tr("メッセージの確認", "Review message"), message: Design.tr("アドレス", "Address") + "\n\(address)\n\n" + Design.tr("パス", "Path") + "\nm/\(purpose)'/0'/\(account)'/\(chain)/\(index)\n\n\(display)\n\(text)", preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel) { _ in Design.fail(invoke, "Message signing was cancelled") })
    alert.addAction(UIAlertAction(title: Design.tr("署名する", "Sign"), style: .default) { [weak self] _ in
      guard let self else { return }
      self.worker.async {
        do {
          let signature = try SignerBridge.signMessage().base64EncodedString()
          DispatchQueue.main.async {
            self.showInfo(Design.tr("署名(BIP137)", "BIP137 signature"), message: Design.tr("アドレス", "Address") + "\n\(address)\n\nBase64\n\(signature)", invoke: invoke)
          }
        } catch {
          DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
        }
      }
    })
    present(alert)
  }

  private func ready(_ invoke: Invoke) -> Bool {
    guard let engineError else { return true }
    invoke.reject(engineError)
    return false
  }

  private func requestCamera(_ invoke: Invoke, denied: (() -> Void)? = nil, proceed: @escaping () -> Void) {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      DispatchQueue.main.async(execute: proceed)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        DispatchQueue.main.async {
          granted ? proceed() : (denied ?? { Design.fail(invoke, "Camera permission was denied") })()
        }
      }
    default:
      DispatchQueue.main.async {
        (denied ?? { Design.fail(invoke, "Camera permission was denied. Enable it in Settings to scan QR codes.") })()
      }
    }
  }

  private func showReview(_ data: [String: Any], invoke: Invoke) {
    let review = TransactionReview(data: data)
    let controller = TransactionReviewViewController(review: review) { [weak self] approved in
      guard let self else { return }
      guard approved else {
        SignerBridge.cancelReview()
        Design.fail(invoke, "Signing was cancelled")
        return
      }
      self.worker.async {
        do {
          let frames = try SignerBridge.sign()
          DispatchQueue.main.async {
            self.showQr(frames, title: "", interval: 0.35) {
              invoke.resolve([
                "loaded": true,
                "fingerprint": (try? SignerBridge.state()["fingerprint"]) as? String,
                "testnet": SignerBridge.testnet,
                "signed": true,
                "shown": true,
              ])
            }
          }
        } catch {
          DispatchQueue.main.async { invoke.reject(error.localizedDescription) }
        }
      }
    }
    present(controller)
  }

  private func showQr(_ frames: [String], title: String, interval: TimeInterval, binaryPayload: Data? = nil, qrName: String? = nil, onDone: @escaping () -> Void) {
    let controller = AnimatedQRViewController(frames: frames, title: title, interval: interval, binaryPayload: binaryPayload, qrName: qrName)
    controller.onDone = onDone
    present(controller)
  }

  // The Simulator can leave the app without a key window; any window of ours can still present
  private func keyWindow() -> UIWindow? {
    let windows = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).flatMap(\.windows)
    return windows.first(where: \.isKeyWindow) ?? windows.first
  }

  private func present(_ controller: UIViewController) {
    DispatchQueue.main.async {
      guard let window = self.keyWindow() else { return }
      var presenter = window.rootViewController
      while let next = presenter?.presentedViewController { presenter = next }
      Design.style(controller)
      presenter?.present(controller, animated: true)
    }
  }
}

@_cdecl("init_plugin_signer")
func initPluginSigner() -> Plugin {
  SignerPlugin()
}

private enum ScanMode: Equatable {
  case seed
  case psbt
  case multisig
  case address

  var title: String {
    switch self {
    case .seed: return Design.tr("バックアップのQRを読み取る", "Scan your backup QR")
    case .psbt: return Design.tr("取引のQRを読み取る", "Scan the transaction QR")
    case .multisig: return Design.tr("マルチシグの設定を読み取る", "Scan a multisig setup")
    case .address: return Design.tr("アドレスのQRを読み取る", "Scan an address QR")
    }
  }
  var term: String {
    switch self {
    case .seed: return Design.tr("SeedQR・CompactSeedQR・64バイトのシード", "SeedQR, CompactSeedQR or a 64-byte seed")
    case .psbt: return "UR crypto-psbt"
    case .multisig: return Design.tr("BSMS・ディスクリプター", "BSMS or descriptor")
    case .address: return Design.tr("アドレス・bitcoin: URI", "Address or bitcoin: URI")
    }
  }
  var instruction: String {
    switch self {
    case .seed: return Design.tr("鍵はこのiPhoneの中でだけ用意します。読み取った内容は表示しません。", "The key is prepared on this iPhone only. What is scanned is never shown.")
    case .psbt: return Design.tr("ウォレットアプリのアニメーションQRをカメラに向けてください。読み取りは自動で進みます。", "Point the camera at your wallet app's animated QR. Scanning continues as frames arrive.")
    case .multisig: return Design.tr("ディスクリプター、BSMS、Coldcardの書き出し、またはur:bytesのQRを読み取ります。", "Show a descriptor, BSMS or Coldcard export, or its ur:bytes.")
    case .address: return Design.tr("ウォレットアプリの受け取り画面に出るQRを読み取ります。", "Show the QR from your wallet app's receive screen.")
    }
  }
}

private struct ScanPayload {
  let text: String?
  let data: Data
}

private func decodeQrPayload(_ descriptor: CIQRCodeDescriptor) -> Data? {
  let bytes = descriptor.errorCorrectedPayload
  let version = descriptor.symbolVersion
  var bitOffset = 0

  func readBits(_ count: Int) -> Int? {
    guard count >= 0, bitOffset + count <= bytes.count * 8 else { return nil }
    var value = 0
    for _ in 0..<count {
      let bit = (bytes[bitOffset / 8] >> (7 - bitOffset % 8)) & 1
      value = (value << 1) | Int(bit)
      bitOffset += 1
    }
    return value
  }

  let numericCountBits = version < 10 ? 10 : (version < 27 ? 12 : 14)
  let byteCountBits = version < 10 ? 8 : 16
  var payload = Data()
  while let mode = readBits(4) {
    if mode == 0 { return payload.isEmpty ? nil : payload }
    guard mode == 1 || mode == 4 else { return nil }
    guard let count = readBits(mode == 1 ? numericCountBits : byteCountBits) else { return nil }
    if mode == 4 {
      for _ in 0..<count {
        guard let value = readBits(8) else { return nil }
        payload.append(UInt8(value))
      }
    } else {
      var remaining = count
      while remaining >= 3 {
        guard let value = readBits(10), value < 1000 else { return nil }
        let digits = String(value)
        payload.append(contentsOf: String(repeating: "0", count: 3 - digits.count).utf8)
        payload.append(contentsOf: digits.utf8)
        remaining -= 3
      }
      if remaining == 2 {
        guard let value = readBits(7), value < 100 else { return nil }
        let digits = String(value)
        payload.append(contentsOf: String(repeating: "0", count: 2 - digits.count).utf8)
        payload.append(contentsOf: digits.utf8)
      } else if remaining == 1 {
        guard let value = readBits(4), value < 10 else { return nil }
        payload.append(48 + UInt8(value))
      }
    }
  }
  return payload.isEmpty ? nil : payload
}

private final class QRScannerViewController: UIViewController, AVCaptureVideoDataOutputSampleBufferDelegate {
  private let mode: ScanMode
  private let session = AVCaptureSession()
  private let sessionQueue = DispatchQueue(label: "com.diysigner.bitwasm-signer.camera")
  private let status = UILabel()
  private let progress = UIProgressView(progressViewStyle: .default)
  private let preview = AVCaptureVideoPreviewLayer()
  private let guide = CAShapeLayer()
  private let cameraArea = UIView()
  private var lastCode = ""
  private var lastVisionFrame = Date(timeIntervalSince1970: 0)
  private var isProcessing = false
  fileprivate(set) var isClosed = false
  var onCode: ((ScanPayload) -> Void)?
  var onCancel: (() -> Void)?
  var onError: ((Error) -> Void)?

  init(mode: ScanMode) {
    self.mode = mode
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
    isModalInPresentation = true
  }

  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    buildInterface()
    configureCamera()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    preview.frame = cameraArea.bounds
    guide.frame = cameraArea.bounds
    let size = min(cameraArea.bounds.width - 56, cameraArea.bounds.height - 32, 300)
    let rect = CGRect(x: (cameraArea.bounds.width - size) / 2, y: (cameraArea.bounds.height - size) / 2, width: size, height: size)
    guide.path = UIBezierPath(roundedRect: rect, cornerRadius: DesignTokens.radiusLg).cgPath
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    sessionQueue.async { self.session.stopRunning() }
  }

  func setProgress(_ value: Int) {
    status.text = value > 0 ? Design.tr("受信中・\(value)%", "Collecting frames · \(value)%") : Design.tr("QRを待っています", "Waiting for the QR")
    progress.progress = Float(value) / 100
  }

  func close(completion: @escaping () -> Void) {
    guard !isClosed else { return }
    isClosed = true
    sessionQueue.async { self.session.stopRunning() }
    dismiss(animated: true, completion: completion)
  }

  func beginProcessing() -> Bool {
    guard !isClosed, !isProcessing else { return false }
    isProcessing = true
    return true
  }

  func finishProcessing() { isProcessing = false }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    let currentFrame = Date()
    guard currentFrame.timeIntervalSince(lastVisionFrame) >= 0.1 else { return }
    lastVisionFrame = currentFrame
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    do {
      try VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .right).perform([request])
      guard let observation = request.results?.first,
            let data = qrPayload(for: observation) else { return }
      let text = observation.payloadStringValue
      let identity = text ?? data.base64EncodedString()
      guard identity != lastCode else { return }
      if mode == .psbt && !(text?.lowercased().hasPrefix("ur:crypto-psbt/") ?? false) {
        DispatchQueue.main.async { self.status.text = Design.tr("取引のQR(UR crypto-psbt)を待っています", "Waiting for UR crypto-psbt frames") }
        return
      }
      lastCode = identity
      let payload = ScanPayload(text: text, data: data)
      DispatchQueue.main.async { self.onCode?(payload) }
    } catch {
      return
    }
  }

  private func buildInterface() {
    let p = Design.palette
    view.backgroundColor = p.surface
    let bar = Design.topBar(Design.tr("読み取り", "Scan"), testnet: SignerBridge.testnet) { [weak self] in self?.cancelScan() }
    let heading = Design.stack([Design.label(mode.title, .display, p.ink), Design.label(mode.term, .caption, p.inkMuted)], spacing: DesignTokens.space1)

    status.text = mode == .seed ? Design.tr("QRを枠の中に合わせてください", "Fit the QR inside the frame") : Design.tr("QRを待っています", "Waiting for the QR")
    status.textColor = p.ink
    status.font = Design.font(.label)
    status.numberOfLines = 2
    progress.progressTintColor = p.primary
    progress.trackTintColor = p.line
    progress.isHidden = mode != .psbt

    let cancel = Design.button(Design.tr("キャンセル", "Cancel"), primary: false)
    cancel.addTarget(self, action: #selector(cancelScan), for: .touchUpInside)
    let footer = Design.stack([status, progress, Design.label(mode.instruction, .caption, p.inkMuted), cancel], spacing: DesignTokens.space2)
    footer.setCustomSpacing(DesignTokens.space4, after: footer.arrangedSubviews[2])

    cameraArea.backgroundColor = .black
    cameraArea.clipsToBounds = true
    cameraArea.layer.addSublayer(preview)
    cameraArea.layer.addSublayer(guide)
    preview.videoGravity = .resizeAspectFill
    guide.fillColor = UIColor.clear.cgColor
    guide.strokeColor = p.iconWell.cgColor
    guide.lineWidth = 3
    for item in [bar, heading, cameraArea, footer] as [UIView] {
      item.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(item)
    }
    NSLayoutConstraint.activate([
      bar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      heading.topAnchor.constraint(equalTo: bar.bottomAnchor, constant: DesignTokens.space6),
      heading.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: DesignTokens.space4),
      heading.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -DesignTokens.space4),
      cameraArea.topAnchor.constraint(equalTo: heading.bottomAnchor, constant: DesignTokens.space4),
      cameraArea.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      cameraArea.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      cameraArea.bottomAnchor.constraint(equalTo: footer.topAnchor, constant: -DesignTokens.space4),
      footer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: DesignTokens.space4),
      footer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -DesignTokens.space4),
      footer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -DesignTokens.space3),
      progress.heightAnchor.constraint(equalToConstant: 3),
    ])
  }

  private func configureCamera() {
    guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
      onError?(SignerError.cameraUnavailable)
      return
    }
    do {
      let input = try AVCaptureDeviceInput(device: camera)
      let output = AVCaptureVideoDataOutput()
      output.alwaysDiscardsLateVideoFrames = true
      guard session.canAddInput(input), session.canAddOutput(output) else {
        throw SignerError.cameraUnavailable
      }
      session.beginConfiguration()
      session.sessionPreset = .high
      session.addInput(input)
      session.addOutput(output)
      output.setSampleBufferDelegate(self, queue: sessionQueue)
      session.commitConfiguration()
      preview.session = session
      sessionQueue.async { self.session.startRunning() }
    } catch {
      onError?(error)
    }
  }

  private func qrPayload(for observation: VNBarcodeObservation) -> Data? {
    // payloadData returns the raw codewords with mode and length headers, not the decoded bytes
    if mode == .seed,
       let descriptor = observation.barcodeDescriptor as? CIQRCodeDescriptor,
       let payload = decodeQrPayload(descriptor) { return payload }
    if let text = observation.payloadStringValue { return Data(text.utf8) }
    guard let descriptor = observation.barcodeDescriptor as? CIQRCodeDescriptor else { return nil }
    return decodeQrPayload(descriptor)
  }

  @objc private func cancelScan() {
    close { self.onCancel?() }
  }
}

/// Mnemonic entry with its own A–Z keypad, so the words never pass through the system keyboard.
/// Keys that cannot continue any BIP39 word are disabled, a word commits as soon as one candidate is left,
/// and the last word is limited to the ones with a valid checksum.
private final class MnemonicEntryViewController: UIViewController {
  private static let lengths = [12, 15, 18, 21, 24]

  private let words: [String]
  private var size = 12
  private var slots = [Int](repeating: -1, count: 24)
  private var cur = 0
  private var typed = ""
  private var lastPool: [Int]?
  private let p = Design.palette
  private let lengthControl = UISegmentedControl(items: MnemonicEntryViewController.lengths.map(String.init))
  private let slotGrid = UIStackView()
  private let entry = UILabel()
  private let hint = UILabel()
  private let candidates = UIStackView()
  private var keys: [Character: UIButton] = [:]
  private let status = UILabel()
  private let continueButton = Design.button(Design.tr("続ける", "Continue"), primary: true)
  var onPhrase: ((String) -> Void)?
  var onCancel: (() -> Void)?

  init(words: [String]) {
    self.words = words
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
    isModalInPresentation = true
  }

  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = p.surface
    let bar = Design.topBar(Design.tr("シードフレーズ", "Recovery words"), testnet: SignerBridge.testnet) { [weak self] in
      self?.clear()
      self?.dismiss(animated: true) { self?.onCancel?() }
    }
    let lengthTitle = Design.label(Design.tr("単語の数", "NUMBER OF WORDS"), .overline, p.inkMuted)

    lengthControl.selectedSegmentIndex = 0
    lengthControl.backgroundColor = p.surfaceSunken
    lengthControl.selectedSegmentTintColor = p.surfaceRaised
    lengthControl.setTitleTextAttributes([.foregroundColor: p.ink, .font: Design.font(.label)], for: .selected)
    lengthControl.setTitleTextAttributes([.foregroundColor: p.inkMuted, .font: Design.font(.label)], for: .normal)
    lengthControl.heightAnchor.constraint(equalToConstant: 40).isActive = true
    lengthControl.addAction(UIAction { [weak self] _ in
      guard let self else { return }
      self.setSize(Self.lengths[self.lengthControl.selectedSegmentIndex])
    }, for: .valueChanged)

    slotGrid.axis = .vertical
    slotGrid.spacing = 6
    let slotScroll = UIScrollView()
    slotScroll.addSubview(slotGrid)
    slotGrid.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      slotGrid.topAnchor.constraint(equalTo: slotScroll.contentLayoutGuide.topAnchor),
      slotGrid.bottomAnchor.constraint(equalTo: slotScroll.contentLayoutGuide.bottomAnchor),
      slotGrid.leadingAnchor.constraint(equalTo: slotScroll.frameLayoutGuide.leadingAnchor),
      slotGrid.trailingAnchor.constraint(equalTo: slotScroll.frameLayoutGuide.trailingAnchor),
    ])

    entry.textColor = p.ink
    entry.font = Design.font(.heading)
    hint.textColor = p.inkMuted
    hint.font = Design.font(.caption)
    hint.setContentHuggingPriority(.required, for: .horizontal)
    let entryRow = UIStackView(arrangedSubviews: [entry, hint])

    candidates.axis = .horizontal
    candidates.spacing = 8
    let candidateScroll = UIScrollView()
    candidateScroll.showsHorizontalScrollIndicator = false
    candidateScroll.addSubview(candidates)
    candidates.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      candidates.leadingAnchor.constraint(equalTo: candidateScroll.contentLayoutGuide.leadingAnchor),
      candidates.trailingAnchor.constraint(equalTo: candidateScroll.contentLayoutGuide.trailingAnchor),
      candidates.topAnchor.constraint(equalTo: candidateScroll.frameLayoutGuide.topAnchor),
      candidates.bottomAnchor.constraint(equalTo: candidateScroll.frameLayoutGuide.bottomAnchor),
      candidateScroll.heightAnchor.constraint(equalToConstant: 40),
    ])

    let keyRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"].enumerated().map { row, letters -> UIStackView in
      var buttons = letters.map { ch -> UIButton in
        let button = key(String(ch)) { [weak self] in self?.press(ch) }
        keys[ch] = button
        return button
      }
      if row == 2 { buttons.append(key("⌫") { [weak self] in self?.back() }) }
      let stack = UIStackView(arrangedSubviews: buttons)
      stack.spacing = 4
      stack.distribution = .fillEqually
      stack.heightAnchor.constraint(equalToConstant: 44).isActive = true
      return stack
    }

    status.textColor = p.inkMuted
    status.font = Design.font(.caption)
    status.numberOfLines = 0
    continueButton.addAction(UIAction { [weak self] _ in self?.finish() }, for: .touchUpInside)

    let stack = UIStackView(arrangedSubviews: [lengthTitle, lengthControl, slotScroll, entryRow, candidateScroll] + keyRows + [status, continueButton])
    stack.axis = .vertical
    stack.spacing = 8
    stack.setCustomSpacing(16, after: lengthControl)
    stack.setCustomSpacing(16, after: status)
    for item in [bar, stack] as [UIView] { item.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(item) }
    NSLayoutConstraint.activate([
      bar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      stack.topAnchor.constraint(equalTo: bar.bottomAnchor, constant: 16),
      stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12),
      stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
    ])
    render()
  }


  private func matches(_ prefix: String) -> [Int] { SignerBridge.wordMatches(prefix, filter: lastPool) }

  private func setSize(_ length: Int) {
    size = length
    for i in size..<slots.count { slots[i] = -1 }
    typed = ""
    cur = nextEmpty(from: 0)
    refreshLastPool()
  }

  private func nextEmpty(from start: Int) -> Int {
    (start..<max(start, size)).first { slots[$0] < 0 } ?? (0..<size).first { slots[$0] < 0 } ?? size
  }

  private func refreshLastPool() {
    lastPool = cur == size - 1 && slots[0..<(size - 1)].allSatisfy({ $0 >= 0 })
      ? SignerBridge.finalWords(Array(slots[0..<(size - 1)])) : nil
    render()
  }

  private func commit(_ index: Int) {
    slots[cur] = index
    typed = ""
    cur = nextEmpty(from: cur + 1)
    refreshLastPool()
  }

  private func press(_ ch: Character) {
    typed.append(ch)
    let hits = matches(typed)
    if hits.count == 1 { commit(hits[0]) } else { render() }
  }

  private func back() {
    if !typed.isEmpty { typed.removeLast(); render(); return }
    let previous = min(cur, size) - 1
    guard previous >= 0 else { return }
    slots[previous] = -1
    cur = previous
    refreshLastPool()
  }

  private func edit(_ slot: Int) {
    slots[slot] = -1
    typed = ""
    cur = slot
    refreshLastPool()
  }

  private func render() {
    let done = cur >= size

    // Down each column, like the write-down screen of a new wallet: 24 words as three columns of eight
    slotGrid.arrangedSubviews.forEach { $0.removeFromSuperview() }
    let columns = size > 12 ? 3 : 2
    let per = (size + columns - 1) / columns
    for row in 0..<per {
      let cells = (0..<columns).map { row + $0 * per }.map { i -> UIButton in
        let button = UIButton(type: .custom)
        let word = i == cur ? typed : (slots[i] >= 0 ? words[slots[i]] : "")
        button.setTitle(String(format: "%2d  ", i + 1) + word, for: .normal)
        button.setTitleColor(i == cur ? p.primary : p.ink, for: .normal)
        button.backgroundColor = p.surfaceRaised
        button.titleLabel?.font = .monospacedSystemFont(ofSize: 14, weight: .medium)
        // An eight letter word does not fit a third of a small phone at 14pt, so it shrinks instead of being cut off
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.titleLabel?.minimumScaleFactor = 0.6
        button.titleLabel?.lineBreakMode = .byTruncatingTail
        button.contentHorizontalAlignment = .leading
        button.contentEdgeInsets = UIEdgeInsets(top: 7, left: 8, bottom: 7, right: 6)
        button.layer.borderWidth = 1
        button.layer.borderColor = (i == cur ? p.primary : p.line).cgColor
        button.layer.cornerRadius = DesignTokens.radiusSm
        button.addAction(UIAction { [weak self] _ in self?.edit(i) }, for: .touchUpInside)
        return button
      }
      let rowStack = UIStackView(arrangedSubviews: cells)
      rowStack.spacing = 6
      rowStack.distribution = .fillEqually
      slotGrid.addArrangedSubview(rowStack)
    }

    let hits = done ? [] : !typed.isEmpty ? matches(typed) : (lastPool ?? [])
    entry.text = done ? "" : Design.tr("\(cur + 1)番目の単語", "Word \(cur + 1)")
    hint.text = done ? "" : lastPool != nil ? Design.tr("チェックサムが合う\(hits.count)件", "\(hits.count) with a valid checksum")
      : typed.isEmpty ? "" : Design.tr("\(hits.count)件の候補", "\(hits.count) matches")
    candidates.arrangedSubviews.forEach { $0.removeFromSuperview() }
    for index in hits.prefix(24) {
      let button = UIButton(type: .system)
      button.setTitle(words[index], for: .normal)
      button.setTitleColor(p.primary, for: .normal)
      button.backgroundColor = p.primarySoft
      button.titleLabel?.font = .monospacedSystemFont(ofSize: 15, weight: .semibold)
      button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
      button.layer.borderWidth = 1
      button.layer.borderColor = p.primary.cgColor
      button.layer.cornerRadius = 20
      button.addAction(UIAction { [weak self] _ in self?.commit(index) }, for: .touchUpInside)
      candidates.addArrangedSubview(button)
    }

    let letters = done ? 0 : SignerBridge.wordLetters(typed, filter: lastPool)
    for (ch, button) in keys {
      let enabled = letters >> Int(ch.asciiValue! - 97) & 1 == 1
      button.isEnabled = enabled
      button.backgroundColor = enabled ? p.surfaceRaised : p.surfaceSunken
      button.layer.borderColor = (enabled ? p.line : p.surfaceSunken).cgColor
    }

    let valid = done && SignerBridge.finalWords(Array(slots[0..<(size - 1)])).contains(slots[size - 1])
    status.text = valid ? Design.tr("\(size)個の単語・チェックサムOK", "\(size) words · checksum OK")
      : done ? Design.tr("チェックサムが一致しません。単語をタップして直してください。", "The checksum does not match. Tap a word to fix it.")
      : Design.tr("単語をタップすると打ち直せます。紙のバックアップと同じ順番で入力してください。", "Tap a word to retype it. Enter them in the order on your paper backup.")
    status.textColor = valid ? p.positive : done ? p.danger : p.inkMuted
    continueButton.isEnabled = valid
    continueButton.alpha = valid ? 1 : 0.45
  }

  private func finish() {
    let mnemonic = slots[0..<size].map { words[$0] }.joined(separator: " ")
    clear()
    dismiss(animated: true) { self.onPhrase?(mnemonic) }
  }

  private func clear() {
    for i in slots.indices { slots[i] = -1 }
    typed = ""
    lastPool = nil
    SignerBridge.endWordEntry()
  }

  private func key(_ title: String, _ onTap: @escaping () -> Void) -> UIButton {
    let button = UIButton(type: .custom)
    button.setTitle(title, for: .normal)
    button.setTitleColor(p.ink, for: .normal)
    button.setTitleColor(p.lineStrong, for: .disabled)
    button.titleLabel?.font = .monospacedSystemFont(ofSize: 16, weight: .regular)
    button.backgroundColor = p.surfaceRaised
    button.layer.cornerRadius = DesignTokens.radiusSm
    button.layer.borderWidth = 1
    button.addAction(UIAction { _ in onTap() }, for: .touchUpInside)
    return button
  }
}

// The write-down step of a new wallet, and the result of BIP85
private final class WriteDownViewController: UIViewController {
  private let words: [String]
  private let titleText: String
  private let verify: Bool
  private let seedQrAvailable: Bool
  private var wordLabels: [UILabel] = []
  var onWrote: (() -> Void)?
  var onSeedQr: (() -> Void)?
  var onExplain: (() -> Void)?

  init(phrase: String, title: String, verify: Bool, seedQrAvailable: Bool) {
    words = phrase.split(separator: " ").map(String.init)
    titleText = title
    self.verify = verify
    self.seedQrAvailable = seedQrAvailable
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
    isModalInPresentation = true
  }

  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    let p = Design.palette
    // 24 words go in three columns so they fit a small phone without scrolling
    let count = words.count > 12 ? 3 : 2
    let per = (words.count + count - 1) / count
    let columns = (0..<count).map { column -> UIStackView in
      Design.stack((column * per..<min(words.count, column * per + per)).map { i -> UIView in
        let number = Design.label("\(i + 1)", .caption, p.inkMuted)
        number.textAlignment = .right
        number.widthAnchor.constraint(equalToConstant: 20).isActive = true
        let word = Design.label(words[i], .data, p.ink)
        word.font = .monospacedSystemFont(ofSize: count == 3 ? 14 : 17, weight: .bold)
        wordLabels.append(word)
        let row = UIStackView(arrangedSubviews: [number, word])
        row.spacing = count == 3 ? 6 : DesignTokens.space3
        row.heightAnchor.constraint(equalToConstant: count == 3 ? 32 : 36).isActive = true
        return row
      }, spacing: 0)
    }
    let grid = UIStackView(arrangedSubviews: columns)
    grid.distribution = .fillEqually
    let card = Design.card()
    Design.pad(grid, in: card, DesignTokens.space3)

    var items: [UIView] = []
    if verify { items.append(Design.steps(2)) }
    items += [
      Design.label(Design.tr("\(words.count)個の単語を書き写す", "Write down your \(words.count) words"), .display, p.ink),
      Design.label(Design.tr("紙に、この順番で書いてください。見た人はビットコインを持ち出せます。", "Write them on paper, in this order. Anyone who sees them can take your bitcoin."), .body, p.inkMuted),
      card,
    ]
    // SeedQR and the derivation are links, so the footer keeps one button and the words fit without scrolling
    func link(_ title: String, _ action: @escaping () -> Void) -> UIButton {
      let button = UIButton(type: .system)
      button.setTitle(title, for: .normal)
      button.titleLabel?.font = Design.font(.label)
      button.addAction(UIAction { _ in action() }, for: .touchUpInside)
      return button
    }
    var links: [UIView] = []
    if seedQrAvailable { links.append(link(Design.tr("SeedQRを表示", "Show SeedQR")) { [weak self] in self?.close { self?.onSeedQr?() } }) }
    if onExplain != nil { links.append(link(Design.tr("この単語のでき方", "How they were made")) { [weak self] in self?.onExplain?() }) }
    let row = UIStackView(arrangedSubviews: links + [UIView()])
    row.spacing = DesignTokens.space6
    items.append(row)
    let content = Design.stack(items, spacing: DesignTokens.space4)

    let wrote = Design.button(verify ? Design.tr("書き写しました", "I wrote them down") : Design.tr("完了", "Done"), primary: true)
    wrote.addAction(UIAction { [weak self] _ in self?.close { self?.onWrote?() } }, for: .touchUpInside)
    _ = Design.screen(self, title: titleText, testnet: SignerBridge.testnet, content: content, actions: [wrote])
  }

  private func close(_ then: @escaping () -> Void) {
    wordLabels.forEach { $0.text = "" }
    dismiss(animated: true, completion: then)
  }
}

// The screens before a new wallet's words: what is about to happen, how many words, and the dice rolls.
// Each is pushed over the last, so Back returns to the one before
private final class NewWalletController: UINavigationController {
  var onRandom: ((Int) -> Void)?
  var onDice: ((Data, Int, @escaping () -> Void) -> Void)?
  var onCancel: (() -> Void)?
  private let p = Design.palette
  private var pageWatcher: PageWatcher?

  init() {
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
    isModalInPresentation = true
    setNavigationBarHidden(true, animated: false)
    viewControllers = [intro()]
  }

  required init?(coder: NSCoder) { nil }

  private func screen(_ title: String, _ items: [UIView], actions: [UIView], onBack: @escaping () -> Void) -> UIViewController {
    let controller = UIViewController()
    controller.loadViewIfNeeded()
    _ = Design.screen(controller, title: title, testnet: SignerBridge.testnet, content: Design.stack(items, spacing: DesignTokens.space4), actions: actions, onBack: onBack)
    return controller
  }

  // A walkthrough of the steps ahead, one picture a page; the last page picks how the words are made
  private func intro() -> UIViewController {
    let pages = [
      (Design.tr("単語を作る", "Make the words"), Design.tr("安全な乱数か、自分で振ったサイコロの目から、12語か24語のシードフレーズを作ります。", "Recovery words, 12 or 24 of them, come from secure random numbers or from dice you roll yourself.")),
      (Design.tr("紙に書き写す", "Write them down"), Design.tr("単語を順番どおりに紙に書きます。この紙があれば、スマホをなくしてもビットコインを取り戻せます。", "Write the words on paper, in order. With that paper you can get your bitcoin back even if the phone is lost.")),
      (Design.tr("確かめる", "Check them"), Design.tr("書いた単語を5問のクイズで確かめます。書き間違いがあれば、ここで気づけます。", "A five-question quiz checks what you wrote, so a slip of the pen shows up now.")),
      (Design.tr("始める前に", "Before you start"), Design.tr("紙とペン、サイコロで作るならサイコロを1個用意してください。周りに人やカメラがない場所で、5〜10分ほどかかります。", "Have paper and a pen, and a die if you use dice. Find a place no one and no camera can see; it takes five to ten minutes.")),
    ]
    let controller = UIViewController()
    let view = controller.view!
    view.backgroundColor = p.surface
    let bar = Design.topBar(Design.tr("新しいウォレット", "New wallet"), testnet: SignerBridge.testnet) { [weak self] in self?.dismiss(animated: true) { self?.onCancel?() } }
    let pager = UIScrollView()
    pager.isPagingEnabled = true
    pager.showsHorizontalScrollIndicator = false
    let strip = UIStackView()
    strip.distribution = .fillEqually
    for (i, (title, body)) in pages.enumerated() {
      let art = IllustrationView(scene: i)
      art.heightAnchor.constraint(equalToConstant: 200).isActive = true
      let stack = Design.stack([art, Design.label("\(i + 1) / \(pages.count)", .overline, p.inkMuted), Design.label(title, .display, p.ink), Design.label(body, .body, p.inkMuted)], spacing: DesignTokens.space3)
      stack.setCustomSpacing(DesignTokens.space6, after: art)
      let page = UIView()
      stack.translatesAutoresizingMaskIntoConstraints = false
      page.addSubview(stack)
      NSLayoutConstraint.activate([
        stack.topAnchor.constraint(equalTo: page.topAnchor, constant: DesignTokens.space6),
        stack.leadingAnchor.constraint(equalTo: page.leadingAnchor, constant: DesignTokens.space4),
        stack.trailingAnchor.constraint(equalTo: page.trailingAnchor, constant: -DesignTokens.space4),
      ])
      strip.addArrangedSubview(page)
    }
    let dots = UIPageControl()
    dots.numberOfPages = pages.count
    dots.currentPageIndicatorTintColor = p.primary
    dots.pageIndicatorTintColor = p.lineStrong
    dots.isUserInteractionEnabled = false
    let next = Design.button(Design.tr("次へ", "Next"), primary: true)
    let random = Design.button(Design.tr("安全な乱数で作る", "Use secure random"), primary: true)
    let dice = Design.button(Design.tr("サイコロを振って作る", "Roll dice"), primary: false)
    let footer = Design.stack([next, random, dice], spacing: DesignTokens.space3)
    func show(_ page: Int) {
      dots.currentPage = page
      next.isHidden = page == pages.count - 1
      random.isHidden = !next.isHidden
      dice.isHidden = !next.isHidden
    }
    next.addAction(UIAction { _ in
      let page = min(dots.currentPage + 1, pages.count - 1)
      pager.setContentOffset(CGPoint(x: CGFloat(page) * pager.bounds.width, y: 0), animated: true)
      show(page)
    }, for: .touchUpInside)
    random.addAction(UIAction { [weak self] _ in guard let self else { return }; self.pushViewController(self.wordCount(dice: false), animated: true) }, for: .touchUpInside)
    dice.addAction(UIAction { [weak self] _ in guard let self else { return }; self.pushViewController(self.wordCount(dice: true), animated: true) }, for: .touchUpInside)
    pageWatcher = PageWatcher { show(Int((pager.contentOffset.x / max(pager.bounds.width, 1)).rounded())) }
    pager.delegate = pageWatcher
    show(0)
    for item in [bar, pager, strip, dots, footer] as [UIView] { item.translatesAutoresizingMaskIntoConstraints = false }
    pager.addSubview(strip)
    for item in [bar, pager, dots, footer] { view.addSubview(item) }
    NSLayoutConstraint.activate([
      bar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      bar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      bar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      pager.topAnchor.constraint(equalTo: bar.bottomAnchor),
      pager.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      pager.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      pager.bottomAnchor.constraint(equalTo: dots.topAnchor),
      strip.topAnchor.constraint(equalTo: pager.contentLayoutGuide.topAnchor),
      strip.bottomAnchor.constraint(equalTo: pager.contentLayoutGuide.bottomAnchor),
      strip.leadingAnchor.constraint(equalTo: pager.contentLayoutGuide.leadingAnchor),
      strip.trailingAnchor.constraint(equalTo: pager.contentLayoutGuide.trailingAnchor),
      strip.heightAnchor.constraint(equalTo: pager.frameLayoutGuide.heightAnchor),
      strip.widthAnchor.constraint(equalTo: pager.frameLayoutGuide.widthAnchor, multiplier: CGFloat(pages.count)),
      dots.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      dots.bottomAnchor.constraint(equalTo: footer.topAnchor, constant: -DesignTokens.space3),
      footer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: DesignTokens.space4),
      footer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -DesignTokens.space4),
      footer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -DesignTokens.space3),
    ])
    return controller
  }

  private func wordCount(dice: Bool) -> UIViewController {
    let options = [(12, dice ? Design.tr("サイコロを50回振る", "Roll a die 50 times") : Design.tr("いちばんよく使われる長さ", "The most common length")),
                   (24, dice ? Design.tr("サイコロを99回振る", "Roll a die 99 times") : Design.tr("より長く、より強い", "Longer and stronger"))]
      .map { words, detail -> UIView in
        let button = UIButton(type: .system)
        let text = Design.stack([Design.label(Design.tr("\(words)個の単語", "\(words) words"), .heading, p.ink), Design.label(detail, .caption, p.inkMuted)], spacing: 4)
        text.isUserInteractionEnabled = false
        let card = Design.card()
        Design.pad(text, in: card)
        card.isUserInteractionEnabled = false
        Design.pad(card, in: button, 0)
        button.addAction(UIAction { [weak self] _ in
          guard let self else { return }
          if dice { self.pushViewController(self.rolls(words), animated: true) } else { self.dismiss(animated: true) { self.onRandom?(words) } }
        }, for: .touchUpInside)
        return button
      }
    return screen(Design.tr("新しいウォレット", "New wallet"), [
      Design.steps(1),
      Design.label(Design.tr("単語の数を選ぶ", "Choose how many words"), .display, p.ink),
      Design.label(Design.tr("どちらも安全です。24個のほうが余裕がありますが、書き写す量が倍になります。", "Both are safe. 24 words leave more margin but take twice as long to write down."), .body, p.inkMuted),
    ] + options, actions: []) { [weak self] in self?.popViewController(animated: true) }
  }

  private func rolls(_ words: Int) -> UIViewController {
    let need = words == 12 ? 50 : 99
    var rolls = [UInt8]()
    let counter = Design.label("", .label, p.inkMuted)
    counter.font = .monospacedDigitSystemFont(ofSize: 15, weight: .semibold)
    counter.setContentHuggingPriority(.required, for: .horizontal)
    let history = Design.label("", .data, p.ink)
    let well = UIView()
    well.backgroundColor = p.surfaceSunken
    well.layer.cornerRadius = DesignTokens.radiusSm
    let sheet = RollSheetView(need: need)
    let header = UIStackView(arrangedSubviews: [history, counter])
    header.alignment = .firstBaseline
    Design.pad(Design.stack([header, sheet], spacing: DesignTokens.space2), in: well, DesignTokens.space3)
    let faces = (1...6).map { face -> UIButton in
      let key = Design.button("", primary: false)
      key.setImage(UIImage(systemName: "die.face.\(face)", withConfiguration: UIImage.SymbolConfiguration(pointSize: 40)), for: .normal)
      key.tintColor = p.ink
      key.accessibilityLabel = "\(face)"
      key.heightAnchor.constraint(equalToConstant: 56).isActive = true
      return key
    }
    let undo = Design.button("⌫", primary: false)
    undo.accessibilityLabel = Design.tr("1つ消す", "Undo")
    let clear = Design.button(Design.tr("全消去", "Clear"), primary: false)
    let make = Design.button(Design.tr("単語を作る", "Make the words"), primary: true)
    func update() {
      sheet.rolls = rolls
      counter.text = "\(rolls.count) / \(need)"
      counter.textColor = rolls.count == need ? p.primary : p.inkMuted
      // The last ten rolls in full and how many came before, so a mistyped one is easy to spot
      let shown = rolls.suffix(10).map { String($0 - 48) }.joined(separator: " ")
      if rolls.isEmpty { history.text = Design.tr("出た目を下で押してください。", "Tap the face that came up.") } else {
        // The roll just entered stands out, so each tap visibly lands
        let text = NSMutableAttributedString(string: rolls.count > 10 ? "… \(shown)" : shown, attributes: [.font: Design.font(.data), .foregroundColor: p.ink])
        text.addAttributes([.font: UIFont.monospacedSystemFont(ofSize: 21, weight: .bold), .foregroundColor: p.primary], range: NSRange(location: text.length - 1, length: 1))
        history.attributedText = text
      }
      faces.forEach { $0.isEnabled = rolls.count < need; $0.alpha = rolls.count < need ? 1 : 0.4 }
      undo.alpha = rolls.isEmpty ? 0.4 : 1
      clear.alpha = undo.alpha
      undo.isEnabled = !rolls.isEmpty
      clear.isEnabled = !rolls.isEmpty
      make.isEnabled = rolls.count == need
      make.alpha = rolls.count == need ? 1 : 0.5
    }
    func reset() {
      for i in rolls.indices { rolls[i] = 0 }
      rolls.removeAll()
      update()
    }
    for (i, key) in faces.enumerated() {
      key.addAction(UIAction { _ in
        guard rolls.count < need else { return }
        rolls.append(UInt8(49 + i))
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        update()
      }, for: .touchUpInside)
      let (soft, raised) = (p.primarySoft, p.surfaceRaised)
      key.addAction(UIAction { [weak key] _ in UIView.animate(withDuration: 0.08) { key?.transform = CGAffineTransform(scaleX: 0.92, y: 0.92); key?.backgroundColor = soft } }, for: .touchDown)
      key.addAction(UIAction { [weak key] _ in UIView.animate(withDuration: 0.12) { key?.transform = .identity; key?.backgroundColor = raised } }, for: [.touchUpInside, .touchUpOutside, .touchCancel])
    }
    undo.addAction(UIAction { _ in if !rolls.isEmpty { rolls[rolls.count - 1] = 0; rolls.removeLast(); update() } }, for: .touchUpInside)
    clear.addAction(UIAction { [weak self] _ in
      let alert = UIAlertController(title: Design.tr("入れた目を全部消しますか", "Clear every roll?"), message: nil, preferredStyle: .alert)
      alert.addAction(UIAlertAction(title: Design.tr("キャンセル", "Cancel"), style: .cancel))
      alert.addAction(UIAlertAction(title: Design.tr("全部消す", "Clear all"), style: .destructive) { _ in reset() })
      Design.style(alert)
      self?.present(alert, animated: true)
    }, for: .touchUpInside)
    make.addAction(UIAction { [weak self] _ in self?.onDice?(Data(rolls), words) { reset() } }, for: .touchUpInside)
    // Three faces a row, with Undo and Clear as a fourth column so the keys keep one block
    let grid = Design.stack([0, 1].map { row -> UIView in
      let line = UIStackView(arrangedSubviews: Array(faces[row * 3..<row * 3 + 3]) + [row == 0 ? undo : clear])
      line.spacing = DesignTokens.space2
      return line
    }, spacing: DesignTokens.space2)
    // Widths tie keys in both rows together, so they go on once the grid holds them all
    NSLayoutConstraint.activate(faces.dropFirst().map { $0.widthAnchor.constraint(equalTo: faces[0].widthAnchor) }
      + [undo, clear].map { $0.widthAnchor.constraint(equalTo: faces[0].widthAnchor, multiplier: 0.8) })
    update()
    return screen(Design.tr("サイコロ", "Dice"), [
      Design.steps(1),
      Design.label(Design.tr("1回振るごとに、出た目を押してください。ちょうど\(need)回で単語になります。", "After each roll, tap the face that came up. Exactly \(need) rolls make the words."), .body, p.inkMuted),
      well, grid,
    ], actions: [make]) { [weak self] in reset(); self?.popViewController(animated: true) }
  }
}

// The rolls as a mark sheet: one column a roll, one row a face, with each face's count as a bar on the right.
// Fifty columns a band, so 99 rolls take two
// How the words came from the entropy, with this wallet's own values: the rolls if any, the entropy, and each
// word's eleven bits and wordlist number, the last word's checksum bits marked
private final class DerivationViewController: UIViewController {
  private let words: [String]
  private var entropy: [UInt8]
  private let dice: Bool
  private let rolls: [UInt8]?
  private let table = UILabel()
  var onForget: (() -> Void)?

  init(words: [String], entropy: [UInt8], dice: Bool, rolls: [UInt8]?) {
    self.words = words
    self.entropy = entropy
    self.dice = dice
    self.rolls = rolls
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
  }

  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    let p = Design.palette
    let bits = entropy.count * 8, checksum = words.count / 3
    func well(_ text: String) -> UIView {
      let label = Design.label(text, .data, p.ink)
      let well = UIView()
      well.backgroundColor = p.surfaceSunken
      well.layer.cornerRadius = DesignTokens.radiusSm
      Design.pad(label, in: well, DesignTokens.space3)
      return well
    }
    func step(_ n: String, _ title: String) -> UIView { Design.label("\(n)  \(title)", .heading, p.ink) }
    func arrow(_ text: String) -> UIView { Design.label("↓  \(text)", .caption, p.accentInk) }
    let count = words.count == 12 ? 50 : 99
    var items: [UIView] = [
      Design.label(Design.tr("この単語のでき方", "How these words were made"), .display, p.ink),
      Design.label(Design.tr("あなたの単語が、どの値から、どう計算されたかを順に示します。どれも単語と同じく秘密です。", "Step by step, the values your words were computed from. Every one of them is as secret as the words."), .body, p.inkMuted),
    ]
    if dice {
      let shown = Design.label(rolls.map { r in stride(from: 0, to: r.count, by: 10).map { String(decoding: r[$0..<min($0 + 10, r.count)], as: UTF8.self) }.joined(separator: "\n") } ?? Design.tr("メモリから消しました。", "Cleared from memory."), .data, p.ink)
      let rollsWell = UIView()
      rollsWell.backgroundColor = p.surfaceSunken
      rollsWell.layer.cornerRadius = DesignTokens.radiusSm
      Design.pad(shown, in: rollsWell, DesignTokens.space3)
      let forget = Design.button(Design.tr("サイコロの目をメモリから消す", "Clear the rolls from memory"), primary: false)
      forget.isEnabled = rolls != nil
      forget.addAction(UIAction { [weak self] _ in
        self?.onForget?()
        shown.text = Design.tr("メモリから消しました。", "Cleared from memory.")
        forget.isEnabled = false
      }, for: .touchUpInside)
      items += [step("1", Design.tr("サイコロの目(\(count)回)", "The rolls (\(count))")), rollsWell, forget,
                arrow(Design.tr("目を文字として並べて SHA-256 を取り、先頭\(bits)ビットを使う。SeedSigner、Krux、bitcoiner.guide/seed と同じ方法です", "SHA-256 of the rolls as text; the first \(bits) bits are kept. SeedSigner, Krux and bitcoiner.guide/seed do the same"))]
    } else {
      items += [step("1", Design.tr("安全な乱数", "Secure random")),
                Design.label(Design.tr("スマホの OS の安全な乱数から\(bits)ビットを取りました。", "\(bits) bits from the phone's secure random number generator."), .body, p.inkMuted),
                arrow(Design.tr("そのまま使う", "Used as they are"))]
    }
    let hex = entropy.map { String(format: "%02x", $0) }.joined()
    let groups = stride(from: 0, to: hex.count, by: 4).map { String(hex.dropFirst($0).prefix(4)) }
    items += [
      step("2", Design.tr("エントロピー(\(bits)ビット、16進)", "The entropy (\(bits) bits, in hex)")),
      well(stride(from: 0, to: groups.count, by: 4).map { groups[$0..<min($0 + 4, groups.count)].joined(separator: " ") }.joined(separator: "\n")),
      arrow(Design.tr("SHA-256 の先頭\(checksum)ビットをチェックサムとして末尾に足し、11ビットずつ\(words.count)個に区切る", "The first \(checksum) bits of its SHA-256 go on the end as a checksum; then \(words.count) groups of 11 bits")),
      step("3", Design.tr("11ビットの番号と単語", "Eleven bits, a number, a word")),
      Design.label(Design.tr("番号は 2048語の単語表(BIP39)の位置です。色の付いたビットがチェックサムです。", "The number is the place in the 2048-word BIP39 list. The coloured bits are the checksum."), .caption, p.inkMuted),
    ]
    let text = NSMutableAttributedString()
    let font = Design.font(.data)
    for (i, word) in words.enumerated() {
      let index = SignerBridge.words.firstIndex(of: word) ?? 0
      let b = String(String(index, radix: 2).reversed()).padding(toLength: 11, withPad: "0", startingAt: 0).reversed()
      let bitsText = String(b)
      text.append(NSAttributedString(string: String(format: "%2d  ", i + 1), attributes: [.font: font, .foregroundColor: p.ink]))
      if i == words.count - 1 {
        text.append(NSAttributedString(string: String(bitsText.dropLast(checksum)), attributes: [.font: font, .foregroundColor: p.ink]))
        text.append(NSAttributedString(string: String(bitsText.suffix(checksum)), attributes: [.font: UIFont.monospacedSystemFont(ofSize: 15, weight: .bold), .foregroundColor: p.accentInk]))
      } else {
        text.append(NSAttributedString(string: bitsText, attributes: [.font: font, .foregroundColor: p.ink]))
      }
      text.append(NSAttributedString(string: String(format: "  %4d  ", index) + word + (i < words.count - 1 ? "\n" : ""), attributes: [.font: font, .foregroundColor: p.ink]))
    }
    table.attributedText = text
    table.numberOfLines = 0
    let tableWell = UIView()
    tableWell.backgroundColor = p.surfaceSunken
    tableWell.layer.cornerRadius = DesignTokens.radiusSm
    Design.pad(table, in: tableWell, DesignTokens.space3)
    items.append(tableWell)
    let close = Design.button(Design.tr("閉じる", "Close"), primary: true)
    close.addAction(UIAction { [weak self] _ in self?.dismiss(animated: true) }, for: .touchUpInside)
    _ = Design.screen(self, title: Design.tr("単語のでき方", "How it was made"), testnet: SignerBridge.testnet, content: Design.stack(items, spacing: DesignTokens.space3), actions: [close]) { [weak self] in self?.dismiss(animated: true) }
  }

  deinit {
    for i in entropy.indices { entropy[i] = 0 }
  }
}

private final class RollSheetView: UIView {
  var rolls: [UInt8] = [] { didSet { setNeedsDisplay() } }
  private let need: Int
  private let p = Design.palette
  private var row: CGFloat { need > 50 ? 9 : 11 }
  private let gap: CGFloat = 10

  init(need: Int) {
    self.need = need
    super.init(frame: .zero)
    backgroundColor = .clear
    contentMode = .redraw
    let bands = CGFloat((need + 49) / 50)
    heightAnchor.constraint(equalToConstant: bands * 6 * row + (bands - 1) * gap).isActive = true
  }

  required init?(coder: NSCoder) { nil }

  override func draw(_ rect: CGRect) {
    let label: CGFloat = 12, bars: CGFloat = 56
    let column = (bounds.width - label - bars - 8) / 50
    let font = UIFont.monospacedSystemFont(ofSize: 8, weight: .medium)
    for band in 0..<((need + 49) / 50) {
      let top = CGFloat(band) * (6 * row + gap)
      // Columns already rolled are filled in, so the sheet doubles as the progress bar
      let done = min(max(rolls.count - band * 50, 0), 50)
      if done > 0 {
        p.primary.setFill()
        UIBezierPath(roundedRect: CGRect(x: label, y: top, width: CGFloat(done) * column, height: 6 * row), cornerRadius: 3).fill()
      }
      for face in 0..<6 {
        let y = top + CGFloat(face) * row + row / 2
        NSString(string: "\(face + 1)").draw(at: CGPoint(x: 0, y: y - 5), withAttributes: [.font: font, .foregroundColor: p.inkMuted])
        for i in band * 50..<min(need, band * 50 + 50) {
          let x = label + CGFloat(i - band * 50) * column + column / 2
          if i < rolls.count && Int(rolls[i]) - 49 != face { continue }
          let hit = i < rolls.count
          let r = hit ? min(column, row) * 0.42 : 1
          (hit ? (i == rolls.count - 1 ? p.accent : p.onPrimary) : p.lineStrong).setFill()
          UIBezierPath(ovalIn: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r)).fill()
        }
      }
      for tens in stride(from: 10, to: min(50, need - band * 50), by: 10) {
        p.line.setFill()
        UIRectFill(CGRect(x: label + CGFloat(tens) * column - 0.5, y: top, width: 1, height: 6 * row))
      }
    }
    // Counts as bars, against the dotted line an even die would reach
    let left = bounds.width - bars + 4, span = bars - 22
    let counts = (0..<6).map { face in rolls.filter { Int($0) - 49 == face }.count }
    let scale = span / CGFloat(max(counts.max() ?? 0, need / 3))
    for face in 0..<6 {
      let y = CGFloat(face) * row
      p.iconWell.setFill()
      UIBezierPath(roundedRect: CGRect(x: left, y: y + 1.5, width: max(CGFloat(counts[face]) * scale, 1), height: row - 3), cornerRadius: 2).fill()
      NSString(string: "\(counts[face])").draw(at: CGPoint(x: left + span + 3, y: y - 1), withAttributes: [.font: font, .foregroundColor: p.inkMuted])
    }
    let even = UIBezierPath()
    even.move(to: CGPoint(x: left + CGFloat(need) / 6 * scale, y: 0))
    even.addLine(to: CGPoint(x: left + CGFloat(need) / 6 * scale, y: 6 * row))
    even.setLineDash([2, 2], count: 2, phase: 0)
    even.lineWidth = 1
    p.inkMuted.setStroke()
    even.stroke()
  }
}

private final class PageWatcher: NSObject, UIScrollViewDelegate {
  let changed: () -> Void
  init(_ changed: @escaping () -> Void) { self.changed = changed }
  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) { changed() }
}

// The walkthrough's pictures, drawn on a 240 x 160 grid in the theme's colors so they follow light and dark
private final class IllustrationView: UIView {
  private let scene: Int
  private let p = Design.palette

  init(scene: Int) {
    self.scene = scene
    super.init(frame: .zero)
    backgroundColor = .clear
    contentMode = .redraw
  }

  required init?(coder: NSCoder) { nil }

  override func draw(_ rect: CGRect) {
    guard let c = UIGraphicsGetCurrentContext() else { return }
    let k = min(bounds.width / 240, bounds.height / 160)
    rounded(bounds, 16 * k, fill: p.surfaceSunken)
    c.translateBy(x: (bounds.width - 240 * k) / 2, y: (bounds.height - 160 * k) / 2)
    c.scaleBy(x: k, y: k)
    switch scene {
    case 0:
      die(c, 34, 48, 64, -12); arrow(112, 80); for y in [46, 72, 98] as [CGFloat] { word(140, y, 72) }
    case 1:
      sheet(64, 22, 104, 120); pencil(c)
    case 2:
      rounded(CGRect(x: 48, y: 22, width: 144, height: 116), 12, fill: p.surfaceRaised, stroke: p.line, width: 2)
      rounded(CGRect(x: 62, y: 34, width: 70, height: 8), 4, fill: p.lineStrong)
      for i in 0..<4 {
        let x = 62 + CGFloat(i % 2) * 62, y = 56 + CGFloat(i / 2) * 36
        rounded(CGRect(x: x, y: y, width: 54, height: 26), 13, fill: i == 2 ? p.primary : p.surfaceSunken)
        if i == 2 { check(x + 27, y + 13, p.onPrimary) } else { rounded(CGRect(x: x + 12, y: y + 11, width: 30, height: 4), 2, fill: p.lineStrong) }
      }
    default:
      sheet(26, 40, 64, 80)
      die(c, 104, 56, 44, 8)
      circle(196, 80, 26, fill: p.surfaceRaised, stroke: p.danger, width: 3)
      let eye = UIBezierPath(ovalIn: CGRect(x: 180, y: 72, width: 32, height: 16))
      p.ink.setStroke(); eye.lineWidth = 2.5; eye.stroke()
      circle(196, 80, 4, fill: p.ink)
      line(178, 98, 214, 62, p.danger, 3)
    }
  }

  private func rounded(_ r: CGRect, _ radius: CGFloat, fill: UIColor, stroke: UIColor? = nil, width: CGFloat = 0) {
    let path = UIBezierPath(roundedRect: r, cornerRadius: radius)
    fill.setFill(); path.fill()
    if let stroke { stroke.setStroke(); path.lineWidth = width; path.stroke() }
  }

  private func circle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, fill: UIColor, stroke: UIColor? = nil, width: CGFloat = 0) {
    rounded(CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r), r, fill: fill, stroke: stroke, width: width)
  }

  private func line(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat, _ color: UIColor, _ width: CGFloat) {
    let path = UIBezierPath()
    path.move(to: CGPoint(x: x1, y: y1)); path.addLine(to: CGPoint(x: x2, y: y2))
    path.lineWidth = width; path.lineCapStyle = .round
    color.setStroke(); path.stroke()
  }

  private func die(_ c: CGContext, _ x: CGFloat, _ y: CGFloat, _ side: CGFloat, _ angle: CGFloat) {
    c.saveGState()
    c.translateBy(x: x + side / 2, y: y + side / 2); c.rotate(by: angle * .pi / 180); c.translateBy(x: -(x + side / 2), y: -(y + side / 2))
    rounded(CGRect(x: x, y: y, width: side, height: side), side / 6, fill: p.surfaceRaised, stroke: p.ink, width: 2.5)
    for (i, j) in [(0, 0), (2, 0), (1, 1), (0, 2), (2, 2)] { circle(x + side * CGFloat(i + 1) / 4, y + side * CGFloat(j + 1) / 4, side / 14, fill: p.ink) }
    c.restoreGState()
  }

  private func arrow(_ x: CGFloat, _ y: CGFloat) {
    line(x, y, x + 18, y, p.accent, 3); line(x + 12, y - 6, x + 18, y, p.accent, 3); line(x + 12, y + 6, x + 18, y, p.accent, 3)
  }

  private func word(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat) {
    rounded(CGRect(x: x, y: y, width: w, height: 18), 9, fill: p.surfaceRaised, stroke: p.line, width: 1.5)
    rounded(CGRect(x: x + 10, y: y + 7, width: w - 28, height: 4), 2, fill: p.inkMuted)
  }

  private func sheet(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
    rounded(CGRect(x: x, y: y, width: w, height: h), 6, fill: p.surfaceRaised, stroke: p.lineStrong, width: 2)
    for r in 0..<(Int(h / 20) - 1) {
      let ly = y + 16 + CGFloat(r) * 18
      circle(x + 12, ly, 3, fill: p.iconWell)
      rounded(CGRect(x: x + 20, y: ly - 2, width: w - 32 - CGFloat(r % 3) * 10, height: 4), 2, fill: p.inkMuted)
    }
  }

  private func pencil(_ c: CGContext) {
    c.saveGState()
    c.translateBy(x: 176, y: 112); c.rotate(by: -40 * .pi / 180); c.translateBy(x: -176, y: -112)
    rounded(CGRect(x: 150, y: 104, width: 56, height: 16), 3, fill: p.accent)
    let collar = UIBezierPath(rect: CGRect(x: 144, y: 104, width: 8, height: 16))
    p.surfaceRaised.setFill(); collar.fill(); p.ink.setStroke(); collar.lineWidth = 1.5; collar.stroke()
    line(136, 112, 144, 104, p.ink, 2); line(136, 112, 144, 120, p.ink, 2)
    c.restoreGState()
  }

  private func check(_ x: CGFloat, _ y: CGFloat, _ color: UIColor) {
    line(x - 7, y, x - 2, y + 5, color, 3); line(x - 2, y + 5, x + 8, y - 5, color, 3)
  }
}

private struct TransactionReview {
  let totalIn: UInt64
  let totalOut: UInt64
  let fee: UInt64
  let spend: UInt64
  let signatures: Int
  let outputs: [[String: Any]]

  init(data: [String: Any]) {
    totalIn = data["totalIn"] as? UInt64 ?? 0
    totalOut = data["totalOut"] as? UInt64 ?? 0
    fee = data["fee"] as? UInt64 ?? 0
    spend = data["spend"] as? UInt64 ?? 0
    signatures = data["signatures"] as? Int ?? 0
    outputs = data["outputs"] as? [[String: Any]] ?? []
  }
}

private final class TransactionReviewViewController: UIViewController, UIScrollViewDelegate {
  private let review: TransactionReview
  private let onDecision: (Bool) -> Void
  private var scroll = UIScrollView()
  private var checks: [UIButton] = []

  init(review: TransactionReview, onDecision: @escaping (Bool) -> Void) {
    self.review = review
    self.onDecision = onDecision
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
    isModalInPresentation = true
  }

  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    buildInterface()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    updateSignButton()
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) { updateSignButton() }

  private let signButton = Design.button(Design.tr("署名する", "Sign transaction"), primary: true)

  private func buildInterface() {
    let p = Design.palette
    let content = Design.stack([Design.label(Design.tr("この取引に署名しますか", "Sign this transaction?"), .display, p.ink), summaryCard(),
                                Design.label(Design.tr("送り先とおつり・\(review.outputs.count)件", "SEND TO AND CHANGE · \(review.outputs.count)"), .overline, p.inkMuted)])
    for (index, output) in review.outputs.enumerated() {
      content.addArrangedSubview(outputCard(output, index: index + 1))
      content.setCustomSpacing(DesignTokens.space3, after: content.arrangedSubviews[content.arrangedSubviews.count - 2])
    }
    content.addArrangedSubview(Design.label(Design.tr("署名すると、この内容で送金できるようになります。", "Once signed, this payment can be sent as shown."), .body, p.ink))
    content.addArrangedSubview(Design.label(Design.tr("すべての項目を確かめ、最後までスクロールすると署名できます。", "Check every item and scroll to the end to sign."), .caption, p.inkMuted))
    content.setCustomSpacing(DesignTokens.space2, after: content.arrangedSubviews[content.arrangedSubviews.count - 2])

    signButton.isEnabled = false
    signButton.alpha = 0.45
    signButton.addTarget(self, action: #selector(signTapped), for: .touchUpInside)
    let cancel = Design.button(Design.tr("キャンセル", "Cancel"), primary: false)
    cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
    scroll = Design.screen(self, title: Design.tr("署名の確認", "Review"), testnet: SignerBridge.testnet, content: content, actions: [cancel, signButton])
    scroll.delegate = self
  }

  private func summaryCard() -> UIView {
    let p = Design.palette
    let card = Design.card()
    Design.pad(Design.stack([
      Design.field(Design.tr("送る金額", "Amount sent"), Design.label("\(btc(review.spend)) BTC", .amount, p.accentInk)),
      Design.field(Design.tr("ネットワーク手数料", "Network fee"), Design.label("\(btc(review.fee)) BTC", .data, p.ink), note: Design.tr("受取人ではなく、マイナーに支払われます。", "Paid to miners, not to the recipient.")),
      Design.field(Design.tr("署名する入力", "Inputs to sign"), Design.label(Design.tr("\(review.signatures)件", "\(review.signatures)"), .data, p.ink),
            note: Design.tr("入力の合計 \(btc(review.totalIn)) BTC", "Total input \(btc(review.totalIn)) BTC")),
    ], spacing: DesignTokens.space4), in: card)
    return card
  }

  private func outputCard(_ output: [String: Any], index: Int) -> UIView {
    let p = Design.palette
    let owner = output["owner"] as? String ?? "Output"
    let kind = output["kind"] as? String ?? "Script"
    let text = output["text"] as? String ?? ""
    let amount = output["amount"] as? UInt64 ?? 0
    let external = owner == "Send to"
    let name = external ? Design.tr("送り先", "Send to") : owner == "Change" ? Design.tr("おつり", "Change") : Design.tr("このウォレットのアドレス", "This wallet")
    let note: String? = owner == "Change" ? Design.tr("おつり。このウォレットに戻ります。", "Your change, back to this wallet.")
      : !external ? Design.tr("このウォレットのアドレスに送ります。", "Sent to an address of this wallet.")
      : kind == "OP_RETURN" ? Design.tr("OP_RETURNのデータ(16進)", "OP_RETURN data (hex)")
      : kind != "Address" ? Design.tr("スクリプト(16進)", "Script (hex)") : nil
    var values: [UIView] = [Design.well(text.isEmpty ? Design.tr("(なし)", "(none)") : text, grouped: kind == "Address"),
                            Design.label("\(btc(amount)) BTC", external ? .amount : .data, external ? p.accentInk : p.ink)]
    if kind == "OP_RETURN" && amount > 0 {
      values.append(Design.label(Design.tr("この金額は失われます。OP_RETURNの出力は使えません。", "This amount is burned: an OP_RETURN output can never be spent."), .caption, p.danger))
    }

    let check = UIButton(type: .system)
    check.setTitle(kind == "Address" ? Design.tr("  このアドレスを確かめました", "  I checked this address") : Design.tr("  この出力を確かめました", "  I checked this output"), for: .normal)
    check.setTitleColor(p.ink, for: .normal)
    check.titleLabel?.font = Design.font(.label)
    check.contentHorizontalAlignment = .leading
    check.tag = index - 1
    check.setImage(UIImage(systemName: "square"), for: .normal)
    check.setImage(UIImage(systemName: "checkmark.square.fill"), for: .selected)
    check.tintColor = p.primary
    check.addTarget(self, action: #selector(toggleCheck(_:)), for: .touchUpInside)
    check.heightAnchor.constraint(equalToConstant: DesignTokens.controlHeight).isActive = true
    checks.append(check)

    let card = Design.card()
    Design.pad(Design.stack([Design.field("\(name) \(index)/\(review.outputs.count)", Design.stack(values, spacing: DesignTokens.space2), note: note), check],
                            spacing: DesignTokens.space2), in: card)
    return card
  }

  @objc private func toggleCheck(_ sender: UIButton) {
    sender.isSelected.toggle()
    updateSignButton()
  }

  @objc private func signTapped() {
    let alert = UIAlertController(title: Design.tr("署名してよいですか", "Sign it now?"), message: Design.tr("署名した取引は、ウォレットアプリで読み取るQRとして表示します。", "The signed transaction is shown as QR codes for your wallet app to scan."), preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: Design.tr("戻る", "Back"), style: .cancel))
    alert.addAction(UIAlertAction(title: Design.tr("署名する", "Sign"), style: .default) { [weak self] _ in
      guard let self else { return }
      self.dismiss(animated: true) { self.onDecision(true) }
    })
    Design.style(alert)
    present(alert, animated: true)
  }

  @objc private func cancelTapped() {
    dismiss(animated: true) { self.onDecision(false) }
  }

  private func updateSignButton() {
    let atBottom = scroll.contentSize.height <= scroll.bounds.height + 2 ||
      scroll.contentOffset.y + scroll.bounds.height >= scroll.contentSize.height - 2
    let checked = !checks.isEmpty && checks.allSatisfy(\.isSelected)
    signButton.isEnabled = atBottom && checked
    signButton.alpha = signButton.isEnabled ? 1 : 0.45
  }
}

private final class AnimatedQRViewController: UIViewController {
  private let frames: [String]
  private let titleText: String
  private let interval: TimeInterval
  private var binaryPayload: Data?
  private let qrName: String?
  private let image = UIImageView()
  private let qrArea = UIView()
  private let countLabel = UILabel()
  private let brightnessLabel = UILabel()
  private let progressStack = UIStackView()
  private let note = UILabel()
  private var layoutStack: UIStackView?
  private var headerHeightConstraint: NSLayoutConstraint?
  private var controlsHeightConstraint: NSLayoutConstraint?
  private var controlButtonHeightConstraints: [NSLayoutConstraint] = []
  private var doneHeightConstraint: NSLayoutConstraint?
  private var qrMaximumHeightConstraint: NSLayoutConstraint?
  private var frameIndex = 0
  private var qrLevel = 0
  private var timer: Timer?
  var onDone: (() -> Void)?

  init(frames: [String], title: String, interval: TimeInterval, binaryPayload: Data? = nil, qrName: String? = nil) {
    self.frames = frames
    self.titleText = title
    self.interval = interval
    self.binaryPayload = binaryPayload
    self.qrName = qrName
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
    isModalInPresentation = true
  }

  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    buildInterface()
    displayFrame()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let compact = view.bounds.width > view.bounds.height
    let spacing: CGFloat = compact ? 4 : 12
    let headerHeight: CGFloat = compact ? 36 : 52
    let controlsHeight: CGFloat = compact ? 36 : 42
    let doneHeight: CGFloat = compact ? 44 : 50
    let qrMaximumHeight = view.safeAreaLayoutGuide.layoutFrame.height * (compact ? 0.32 : 0.8)

    if let layoutStack, layoutStack.spacing != spacing { layoutStack.spacing = spacing }
    if let constraint = headerHeightConstraint, constraint.constant != headerHeight { constraint.constant = headerHeight }
    if let constraint = controlsHeightConstraint, constraint.constant != controlsHeight { constraint.constant = controlsHeight }
    for constraint in controlButtonHeightConstraints where constraint.constant != controlsHeight {
      constraint.constant = controlsHeight
    }
    if let constraint = doneHeightConstraint, constraint.constant != doneHeight { constraint.constant = doneHeight }
    if let constraint = qrMaximumHeightConstraint, abs(constraint.constant - qrMaximumHeight) > 0.5 {
      constraint.constant = qrMaximumHeight
    }
    note.numberOfLines = compact ? 1 : 2
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in self?.advance() }
    if let timer { RunLoop.main.add(timer, forMode: .common) }
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    timer?.invalidate()
    timer = nil
  }

  // An empty title means the signed transaction; a binary payload is a SeedQR and stays private
  private var signed: Bool { titleText.isEmpty }

  private func buildInterface() {
    let p = Design.palette
    view.backgroundColor = p.surface
    let header = Design.topBar(signed ? Design.tr("署名済み", "Signed") : titleText, testnet: SignerBridge.testnet)
    let heading = Design.label(signed ? Design.tr("ウォレットアプリで読み取ってください", "Scan this with your wallet app") : titleText, .display, p.ink)
    let description = Design.label(signed ? Design.tr("読み取りが終わったら、ウォレットアプリから送金してください。", "When it has scanned, send the payment from your wallet app.")
      : binaryPayload != nil ? Design.tr("対応するウォレットで読み取ってください。このQRは人に見せないでください。", "Scan this QR with a compatible wallet and keep it private.")
      : Design.tr("ウォレットアプリで読み取ってください。", "Scan this with your wallet app."), .body, p.inkMuted)

    qrArea.backgroundColor = .white
    qrArea.layer.cornerRadius = DesignTokens.radiusLg
    qrArea.layer.borderWidth = 1.5
    qrArea.layer.borderColor = p.line.cgColor
    qrArea.clipsToBounds = true
    qrArea.translatesAutoresizingMaskIntoConstraints = false
    image.backgroundColor = .white
    image.contentMode = .scaleAspectFit
    image.translatesAutoresizingMaskIntoConstraints = false
    qrArea.addSubview(image)
    // The area can end up taller than wide, so the square fits the shorter side instead of overflowing the sides
    let fill = image.heightAnchor.constraint(equalTo: qrArea.heightAnchor, constant: -24)
    fill.priority = .defaultHigh
    NSLayoutConstraint.activate([
      image.centerXAnchor.constraint(equalTo: qrArea.centerXAnchor),
      image.centerYAnchor.constraint(equalTo: qrArea.centerYAnchor),
      image.widthAnchor.constraint(equalTo: image.heightAnchor),
      image.heightAnchor.constraint(lessThanOrEqualTo: qrArea.heightAnchor, constant: -24),
      image.widthAnchor.constraint(lessThanOrEqualTo: qrArea.widthAnchor, constant: -24),
      fill,
    ])

    for index in 0..<min(frames.count, 6) {
      let segment = UIView()
      segment.backgroundColor = p.line
      segment.layer.cornerRadius = 2
      segment.tag = index
      progressStack.addArrangedSubview(segment)
      segment.heightAnchor.constraint(equalToConstant: 4).isActive = true
    }
    progressStack.axis = .horizontal
    progressStack.spacing = 4
    progressStack.distribution = .fillEqually

    countLabel.textColor = p.inkMuted
    countLabel.font = Design.font(.caption)
    countLabel.textAlignment = .center

    let minus = controlButton("−", action: #selector(dimQr))
    let plus = controlButton("+", action: #selector(brightenQr))
    brightnessLabel.textColor = p.ink
    brightnessLabel.font = Design.font(.data)
    brightnessLabel.textAlignment = .center
    let brightnessTitle = Design.label(Design.tr("QRの明るさ", "QR brightness"), .caption, p.inkMuted)
    let controls = UIStackView(arrangedSubviews: [brightnessTitle, minus, brightnessLabel, plus])
    controls.axis = .horizontal
    controls.alignment = .center
    controls.spacing = DesignTokens.space2
    for button in [minus, plus, brightnessLabel] as [UIView] { button.widthAnchor.constraint(equalToConstant: 48).isActive = true }
    let minusHeight = minus.heightAnchor.constraint(equalToConstant: 42)
    let plusHeight = plus.heightAnchor.constraint(equalToConstant: 42)
    minusHeight.isActive = true
    plusHeight.isActive = true
    controlButtonHeightConstraints = [minusHeight, plusHeight]

    note.text = binaryPayload != nil ? Design.tr("このQRは人に見せないでください。読み取った人は、この鍵を使えます。", "Keep this QR private. Anyone who scans it can access the seed.")
      : signed ? Design.tr("読み取れないときは、QRの明るさを下げてください。", "Lower the brightness if the QR will not scan.")
      : Design.tr("秘密鍵は含まれていません。", "No private keys are included.")
    note.textColor = binaryPayload != nil ? p.danger : p.inkMuted
    note.font = Design.font(.caption)
    note.numberOfLines = 2

    let done = Design.button(Design.tr("完了", "Done"), primary: true)
    done.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)

    let stack = UIStackView(arrangedSubviews: [heading, description, qrArea, progressStack, countLabel, controls, note, done])
    stack.axis = .vertical
    stack.alignment = .fill
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false
    header.translatesAutoresizingMaskIntoConstraints = false
    layoutStack = stack
    view.addSubview(header)
    view.addSubview(stack)
    let controlsHeight = controls.heightAnchor.constraint(equalToConstant: 42)
    let doneHeight = done.heightAnchor.constraint(equalToConstant: 52)
    doneHeight.priority = .defaultHigh
    let qrHeight = qrArea.heightAnchor.constraint(equalTo: stack.widthAnchor, multiplier: 0.9)
    qrHeight.priority = .defaultHigh
    let qrMaximumHeight = qrArea.heightAnchor.constraint(lessThanOrEqualToConstant: 0)
    controlsHeightConstraint = controlsHeight
    doneHeightConstraint = doneHeight
    qrMaximumHeightConstraint = qrMaximumHeight
    NSLayoutConstraint.activate([
      header.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      header.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      header.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: DesignTokens.space4),
      stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -DesignTokens.space4),
      stack.topAnchor.constraint(equalTo: header.bottomAnchor, constant: DesignTokens.space4),
      stack.bottomAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
      controlsHeight,
      doneHeight,
      qrHeight,
      qrMaximumHeight,
    ])
  }

  private func displayFrame() {
    guard !frames.isEmpty else { return }
    image.image = binaryPayload.map { qrImage($0, level: qrLevel) } ?? qrImage(frames[frameIndex], level: qrLevel)
    let label = qrName ?? (signed ? "UR crypto-psbt" : frames.count == 2 ? (frameIndex == 0 ? "xpub" : "descriptor") : "UR")
    countLabel.text = Design.tr("\(label)・\(frameIndex + 1) / \(frames.count)・自動で切り替え", "\(label) · \(frameIndex + 1) / \(frames.count) · auto")
    brightnessLabel.text = "\(4 - qrLevel)/4"
    let activeSegment = frameIndex * max(progressStack.arrangedSubviews.count, 1) / frames.count
    for (index, segment) in progressStack.arrangedSubviews.enumerated() {
      segment.backgroundColor = index <= activeSegment ? Design.palette.primary : Design.palette.line
    }
  }

  private func advance() {
    frameIndex = (frameIndex + 1) % frames.count
    displayFrame()
  }

  private func qrImage(_ text: String, level: Int) -> UIImage? {
    qrImage(Data(text.utf8), level: level)
  }

  private func qrImage(_ payload: Data, level: Int) -> UIImage? {
    let generator = CIFilter.qrCodeGenerator()
    generator.message = payload
    generator.correctionLevel = "M"
    guard let generated = generator.outputImage else { return nil }
    let colors = [1.0, 0.75, 0.52, 0.3]
    let color = CIFilter.falseColor()
    color.inputImage = generated
    color.color0 = CIColor(red: 0.04, green: 0.04, blue: 0.04)
    let white = colors[level]
    color.color1 = CIColor(red: white, green: white, blue: white)
    guard let output = color.outputImage else { return nil }
    let scale = 512 / max(output.extent.width, output.extent.height)
    let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    guard let cgImage = CIContext().createCGImage(scaled, from: scaled.extent) else { return nil }
    return UIImage(cgImage: cgImage)
  }

  private func controlButton(_ title: String, action: Selector) -> UIButton {
    let p = Design.palette
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.setTitleColor(p.ink, for: .normal)
    button.titleLabel?.font = .systemFont(ofSize: 18, weight: .medium)
    button.backgroundColor = p.surfaceRaised
    button.layer.cornerRadius = DesignTokens.radiusMd
    button.layer.borderWidth = 1
    button.layer.borderColor = p.lineStrong.cgColor
    button.addTarget(self, action: action, for: .touchUpInside)
    return button
  }

  @objc private func dimQr() {
    qrLevel = min(qrLevel + 1, 3)
    displayFrame()
  }

  @objc private func brightenQr() {
    qrLevel = max(qrLevel - 1, 0)
    displayFrame()
  }

  @objc private func doneTapped() {
    if let binaryPayload { self.binaryPayload?.resetBytes(in: 0..<binaryPayload.count) }
    binaryPayload = nil
    image.image = nil
    dismiss(animated: true) { self.onDone?() }
  }
}

private func btc(_ sats: UInt64) -> String {
  let whole = sats / 100_000_000
  let fraction = sats % 100_000_000
  return String(format: "%llu.%08llu BTC", whole, fraction)
}
