import type { SignerState } from "../signer";
import { tr } from "../views";
import { showMnemonic } from "./create";
import { dialog, escape, receiving, scan, showFrames } from "./demo";
import { call } from "./engine";

// The Advanced screen's tools, as the Android app's dialogs
type Multisig = { threshold: number; ours: number; fingerprints: string[]; receive: string };

const formError = (box: HTMLElement, id: string, message: string) => {
  const problem = box.querySelector<HTMLElement>(`#${id}`)!;
  problem.textContent = message;
  problem.hidden = false;
  return false;
};
const number = (box: HTMLElement, id: string) => {
  const value = box.querySelector<HTMLInputElement>(`#${id}`)!.value.trim();
  return /^\d{1,9}$/.test(value) ? Number(value) : -1;
};

// The engine registers the setup as it reads it, so a cancelled review forgets it again
export async function registerMultisig() {
  call("reset_ur");
  const wallet = await scan<Multisig>("multisig", (text) => {
    if (!/^ur:/i.test(text)) return { done: call<Multisig>("multisig_load", new TextEncoder().encode(text)) };
    try {
      const result = call<{ complete: boolean; progress: number; multisig?: Multisig }>("receive_multisig_ur", text.toLowerCase());
      return result.complete ? { done: result.multisig! } : receiving(result.progress);
    } catch (error) {
      // A frame that does not read is shown and scanning goes on; a setup that does not hold this key ends it
      if (/^(UR|This UR)/.test(String(error))) return String(error);
      throw error;
    }
  }).catch((error) => {
    throw String(error).startsWith("This wallet does not hold")
      ? tr("このマルチシグにこの鍵が含まれていないか、最初のアドレスが一致しません。パスフレーズを確かめてください。", "This wallet does not hold this seed's key, or its first address is not the one stated. Check the passphrase.")
      : error;
  });
  const keys = wallet.fingerprints.map((fp, i) => `  ${fp}${i === wallet.ours ? tr("  ← この鍵", "  ← this seed") : ""}`).join("\n");
  const n = wallet.fingerprints.length;
  const choice = await dialog(tr(`マルチシグ ${wallet.threshold}/${n} を登録しますか`, `Register ${wallet.threshold} of ${n} multisig?`),
    tr(`鍵\n${keys}\n\n最初の受け取りアドレス\n${wallet.receive}\n\nコーディネーターに同じ最初の受け取りアドレスが表示されているか確かめてください。`,
      `Keys\n${keys}\n\nFirst receive address\n${wallet.receive}\n\nCheck that your coordinator shows the same first receive address.`),
    [["multisig-cancel", tr("キャンセル", "Cancel")], ["multisig-register", tr("登録する", "Register"), true]]);
  if (choice !== "multisig-register") {
    call("multisig_forget");
    throw tr("マルチシグの登録をやめました。", "Registration was cancelled");
  }
}

export function exportMultisig() {
  const [m, n] = (call<SignerState>("state").multisig ?? "").split(" of ");
  const { frames } = call<{ frames: string[] }>("multisig_ur");
  return showFrames(frames, { kind: "account", heading: tr(`マルチシグ ${m}/${n}`, `Multisig ${m} of ${n}`), name: "crypto-output",
    description: tr("見るだけのウォレットで読み取ると、マルチシグを取り込めます。", "Scan with a watch-only wallet to import the multisig.") });
}

export async function signMessage() {
  const cancelled = tr("メッセージへの署名をやめました。", "Message signing was cancelled");
  const fields: [string, string, string][] = [["message-purpose", tr("種類(49、84)", "Purpose: 49 or 84"), "84"], ["message-account", tr("アカウント", "Account"), "0"],
    ["message-chain", tr("0は受け取り、1はおつり", "Chain: 0 receive, 1 change"), "0"], ["message-index", tr("アドレスの番号", "Address index"), "0"]];
  let text = "", path: number[] = [];
  const choice = await dialog(tr("メッセージに署名する", "Sign a message"), "", [["message-cancel", tr("キャンセル", "Cancel")], ["message-review", tr("確認する", "Review"), true]], {
    body: `<textarea class="input" id="message-text" rows="3" spellcheck="false" placeholder="${tr("署名するメッセージ", "Message to sign")}"></textarea>
      ${fields.map(([id, hint, value]) => `<input class="input" id="${id}" inputmode="numeric" placeholder="${hint}" value="${value}">`).join("")}
      <p class="problem" id="message-problem" hidden></p>`,
    check: (id, box) => {
      if (id !== "message-review") return true;
      text = box.querySelector<HTMLTextAreaElement>("#message-text")!.value;
      path = fields.map(([field]) => number(box, field));
      const [purpose, account, chain, index] = path;
      return text && (purpose === 49 || purpose === 84) && account >= 0 && (chain === 0 || chain === 1) && index >= 0 ? true
        : formError(box, "message-problem", tr("メッセージと、正しい番号を入れてください", "Enter a message and valid signing path"));
    },
  });
  if (choice !== "message-review") throw cancelled;
  const [purpose, account, chain, index] = path;
  const review = call<{ address: string; isHex: boolean; text: string }>("message_review", new TextEncoder().encode(text), purpose, account, chain, index);
  const detail = `${tr("アドレス", "Address")}\n${review.address}\n\n${tr("パス", "Path")}\nm/${purpose}'/0'/${account}'/${chain}/${index}\n\n`
    + `${review.isHex ? tr("メッセージ(16進)", "Message bytes (hex)") : tr("メッセージ", "Message")}\n${review.text}`;
  if (await dialog(tr("メッセージの確認", "Review message"), detail, [["sign-cancel", tr("キャンセル", "Cancel")], ["sign-confirm", tr("署名する", "Sign"), true]]) !== "sign-confirm") throw cancelled;
  const { signature } = call<{ signature: number[] }>("message_sign");
  const encoded = btoa(String.fromCharCode(...signature));
  signature.fill(0);
  await dialog(tr("署名(BIP137)", "BIP137 signature"), "", [["signature-done", tr("完了", "Done"), true]],
    { body: `<pre class="dialog-info">${escape(`${tr("アドレス", "Address")}\n${review.address}\n\nBase64\n${encoded}`)}</pre>` });
}

export async function bip85() {
  let words = 0, index = 0;
  const choice = await dialog(tr("子ニーモニックを作る", "Derive a child mnemonic"),
    tr("この鍵から、別のシードフレーズを作ります(m/83696968'/39'/0'/単語数'/番号')。", "Derived at m/83696968'/39'/0'/words'/index'."),
    [["bip85-cancel", tr("キャンセル", "Cancel")], ["bip85-make", tr("作る", "Show phrase"), true]], {
      body: `<input class="input" id="bip85-words" inputmode="numeric" placeholder="${tr("単語の数(12、18、24)", "Words: 12, 18, or 24")}" value="24">
        <input class="input" id="bip85-index" inputmode="numeric" placeholder="${tr("番号(BIP85のインデックス)", "BIP85 index")}" value="0">
        <p class="problem" id="bip85-problem" hidden></p>`,
      check: (id, box) => {
        if (id !== "bip85-make") return true;
        [words, index] = [number(box, "bip85-words"), number(box, "bip85-index")];
        return [12, 18, 24].includes(words) && index >= 0 ? true
          : formError(box, "bip85-problem", tr("単語の数は12、18、24、番号は0以上にしてください", "Use 12, 18, or 24 words and a valid index"));
      },
    });
  if (choice !== "bip85-make") throw tr("子ニーモニックの作成をやめました。", "BIP85 derivation was cancelled");
  const phrase = call<{ mnemonic: string }>("bip85_mnemonic", words, index).mnemonic.split(" ");
  await showMnemonic(phrase, tr("子ニーモニック", "Child mnemonic"), words !== 18);
  phrase.fill("");
}
