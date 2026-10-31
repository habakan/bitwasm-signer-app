// The installed app: the build it runs and the one waiting for the next launch, as named by their caches
export const versions = { current: "", next: "" };

const ask = (worker: ServiceWorker) => new Promise<string>((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = (event) => resolve(String(event.data).replace(/^signer-/, ""));
  worker.postMessage("version", [channel.port2]);
});

export async function startPwa(render: () => void) {
  let registration: ServiceWorkerRegistration | undefined;
  // Typed words and passphrases are JS strings that cannot be wiped, so leaving the app reloads the page.
  // iOS seldom ends a home screen app, so that reload is the next launch: a waiting build takes over first
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return document.documentElement.classList.add("covered");
    if (!registration?.waiting) return location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
    registration.waiting.postMessage("activate");
  });
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  void navigator.storage?.persist?.();
  registration = await navigator.serviceWorker.register("./sw.js");
  const update = async () => {
    const { controller } = navigator.serviceWorker;
    versions.current = controller ? await ask(controller) : "";
    versions.next = registration.waiting ? await ask(registration.waiting) : "";
    render();
  };
  navigator.serviceWorker.addEventListener("controllerchange", update);
  registration.addEventListener("updatefound", () => registration?.installing?.addEventListener("statechange", update));
  await update();
}
