import { readFileSync } from "node:fs";
import { defineConfig, type DefaultTheme } from "vitepress";

const repo = "https://github.com/habakan/bitwasm-signer-app";

// The guide's sections for the sidebar, read from its headings so the two stay the same
function chapters(file: string, page: string) {
  const items: DefaultTheme.SidebarItem[] = [];
  for (const [, level, text, id] of readFileSync(new URL(file, import.meta.url), "utf8").matchAll(/^(##|###) (.+) \{#([\w-]+)\}$/gm)) {
    const item = { text, link: `${page}#${id}` };
    if (level === "##") items.push(item);
    else (items.at(-1)!.items ??= []).push(item);
  }
  return items;
}

// Published at <pages>/docs/, next to the browser demo and the installer
export default defineConfig({
  title: "bitwasm-signer",
  base: "/bitwasm-signer-app/docs/",
  outDir: "../dist-web/docs",
  srcExclude: ["ja/README.md"],
  themeConfig: {
    socialLinks: [{ icon: "github", link: repo }],
    search: { provider: "local" },
  },
  locales: {
    root: {
      label: "English",
      lang: "en",
      description: "An offline Bitcoin signer for old phones",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/" },
          { text: "Web app", link: "https://habakan.github.io/bitwasm-signer-app/app/" },
          { text: "Demo (testnet)", link: "https://habakan.github.io/bitwasm-signer-app/" },
          { text: "Install", link: "https://habakan.github.io/bitwasm-signer-app/install/" },
        ],
        sidebar: [
          { text: "Setup", items: [{ text: "Overview", link: "/setup" }, { text: "Installing the app", link: "/install" }, { text: "Using the app", link: "/use" }, { text: "Device restrictions", link: "/use#device" }, { text: "Quick start", link: "/quickstart/", items: [{ text: "iPhone, quick start", link: "/quickstart/ios-pages" }, { text: "Android, easy", link: "/quickstart/android-apk" }, { text: "Android, dedicated phone", link: "/quickstart/android-lockdown" }, { text: "Build it yourself", link: "/quickstart/build" }] }, { text: "Security", link: "/security" }] },
          { text: "Use", items: [{ text: "Using the signer", link: "/", items: chapters("../index.md", "/") }, { text: "Signer Lockdown", link: "/lockdown" }, { text: "FAQ", link: "/faq" }] },
          { text: "Develop", items: [{ text: "Roadmap", link: "/roadmap" }] },
        ],
        editLink: { pattern: `${repo}/edit/main/docs/:path`, text: "Edit this page on GitHub" },
      },
    },
    ja: {
      label: "日本語",
      lang: "ja",
      description: "古いスマホで使う、オフラインのビットコイン署名アプリ",
      themeConfig: {
        nav: [
          { text: "使い方", link: "/ja/" },
          { text: "Webアプリ", link: "https://habakan.github.io/bitwasm-signer-app/app/" },
          { text: "デモ(テストネット)", link: "https://habakan.github.io/bitwasm-signer-app/" },
          { text: "USBで入れる", link: "https://habakan.github.io/bitwasm-signer-app/install/" },
        ],
        sidebar: [
          { text: "セットアップ", items: [{ text: "セットアップ方法", link: "/ja/setup" }, { text: "アプリのインストール方法", link: "/ja/install" }, { text: "アプリの設定方法", link: "/ja/use" }, { text: "端末の機能制限", link: "/ja/use#device" }, { text: "クイックスタート", link: "/ja/quickstart/", items: [{ text: "iPhone(PWA)", link: "/ja/quickstart/ios-pages" }, { text: "Android(WebUSB build)", link: "/ja/quickstart/android-apk" }, { text: "Android(lockdown build)", link: "/ja/quickstart/android-lockdown" }, { text: "自分でビルド", link: "/ja/quickstart/build" }] }, { text: "セキュリティ仕様", link: "/ja/security" }] },
          { text: "使う", items: [{ text: "署名アプリの使い方", link: "/ja/", items: chapters("../ja/index.md", "/ja/") }, { text: "Signer Lockdown", link: "/ja/lockdown" }, { text: "FAQ", link: "/ja/faq" }] },
          { text: "開発", items: [{ text: "ロードマップ", link: "/ja/roadmap" }] },
        ],
        editLink: { pattern: `${repo}/edit/main/docs/:path`, text: "GitHubでこのページを編集" },
        outline: { label: "このページの内容" },
        docFooter: { prev: "前のページ", next: "次のページ" },
      },
    },
  },
});
