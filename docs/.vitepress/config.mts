import { defineConfig } from "vitepress";

const repo = "https://github.com/habakan/bitwasm-signer-app";

// Published at <pages>/docs/, next to the browser demo and the installer
export default defineConfig({
  title: "bitwasm-signer",
  base: "/bitwasm-signer-app/docs/",
  outDir: "../dist-web/docs",
  srcExclude: ["ja/README.md"],
  cleanUrls: true,
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
          { text: "Guide", link: "/guide" },
          { text: "Demo", link: "https://habakan.github.io/bitwasm-signer-app/" },
          { text: "Install", link: "https://habakan.github.io/bitwasm-signer-app/install/" },
        ],
        sidebar: [
          { text: "Use", items: [{ text: "Try the signer", link: "/guide" }, { text: "Signer Lockdown", link: "/lockdown" }, { text: "FAQ", link: "/faq" }] },
          { text: "Develop", items: [{ text: "Design", link: "/design" }, { text: "Roadmap", link: "/roadmap" }] },
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
          { text: "使い方", link: "/ja/guide" },
          { text: "デモ", link: "https://habakan.github.io/bitwasm-signer-app/" },
          { text: "USBで入れる", link: "https://habakan.github.io/bitwasm-signer-app/install/" },
        ],
        sidebar: [
          { text: "使う", items: [{ text: "署名アプリを試す", link: "/ja/guide" }, { text: "Signer Lockdown", link: "/ja/lockdown" }, { text: "FAQ", link: "/ja/faq" }] },
          { text: "開発", items: [{ text: "デザイン", link: "/ja/design" }, { text: "ロードマップ", link: "/ja/roadmap" }] },
        ],
        editLink: { pattern: `${repo}/edit/main/docs/:path`, text: "GitHubでこのページを編集" },
        outline: { label: "このページの内容" },
        docFooter: { prev: "前のページ", next: "次のページ" },
      },
    },
  },
});
