<script setup lang="ts">
import { useData } from "vitepress";

const ja = useData().lang.value === "ja";
const t = ja
  ? { wallet: "ウォレットアプリ", online: "ネットにつながる", signer: "署名アプリ", offline: "ネットにつながない", keys: "公開鍵", tx: "署名する取引", signed: "署名済みの取引", note: "秘密鍵は署名アプリから出ません", title: "ウォレットアプリと署名アプリのやり取り" }
  : { wallet: "Wallet app", online: "Online", signer: "Signer", offline: "Offline", keys: "Public keys", tx: "Transaction to sign", signed: "Signed transaction", note: "Private keys never leave the signer", title: "How the wallet app and the signer talk" };
</script>

<template>
  <figure class="flow">
    <svg viewBox="0 0 640 260" role="img" :aria-label="t.title">
      <defs><marker id="flow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" class="head" /></marker></defs>
      <g v-for="(phone, i) in [{ x: 20, name: t.wallet, sub: t.online }, { x: 450, name: t.signer, sub: t.offline }]" :key="i">
        <rect :x="phone.x" y="20" width="170" height="200" rx="20" class="body" />
        <text :x="phone.x + 85" y="112" class="name">{{ phone.name }}</text>
        <text :x="phone.x + 85" y="138" class="sub">{{ phone.sub }}</text>
      </g>
      <path d="M 440 64 H 196" class="arrow" />
      <path d="M 196 120 H 440" class="arrow" />
      <path d="M 440 176 H 196" class="arrow" />
      <text x="318" y="54" class="label">① {{ t.keys }}</text>
      <text x="318" y="110" class="label">② {{ t.tx }}</text>
      <text x="318" y="166" class="label">③ {{ t.signed }}</text>
      <text x="320" y="250" class="sub">{{ t.note }}</text>
    </svg>
    <figcaption>{{ ja ? "やり取りはすべてQRコード" : "Everything passes as QR codes" }}</figcaption>
  </figure>
</template>

<style scoped>
.flow { margin: 24px 0; }
.flow svg { display: block; width: 100%; height: auto; }
.body { fill: var(--vp-c-bg-soft); stroke: var(--vp-c-divider); stroke-width: 2; }
.name { fill: var(--vp-c-text-1); font-size: 17px; font-weight: 600; text-anchor: middle; }
.sub { fill: var(--vp-c-text-2); font-size: 13px; text-anchor: middle; }
.label { fill: var(--vp-c-text-1); font-size: 14px; text-anchor: middle; }
.arrow { fill: none; stroke: var(--vp-c-brand-1); stroke-width: 2.5; marker-end: url(#flow-head); }
.head { fill: var(--vp-c-brand-1); }
.flow figcaption { color: var(--vp-c-text-2); font-size: 14px; text-align: center; }
</style>
