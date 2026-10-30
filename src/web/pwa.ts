// The installed app: the build it runs and the one waiting for the next launch, as named by their caches
export const versions = { current: "", next: "" };

const ask = (worker: ServiceWorker) => new Promise<string>((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = (event) => resolve(String(event.data).replace(/^signer-/, ""));
  worker.postMessage("version", [channel.port2]);
});

export async function startPwa(render: () => void) {
  // Typed words and passphrases are JS strings that cannot be wiped, so leaving the app reloads the page.
  // Covering it first keeps the screen out of the app switcher where the browser allows
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) document.documentElement.classList.add("covered");
    else location.reload();
  });
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  void navigator.storage?.persist?.();
  const registration = await navigator.serviceWorker.register("./sw.js");
  const update = async () => {
    const { controller } = navigator.serviceWorker;
    versions.current = controller ? await ask(controller) : "";
    versions.next = registration.waiting ? await ask(registration.waiting) : "";
    render();
  };
  navigator.serviceWorker.addEventListener("controllerchange", update);
  registration.addEventListener("updatefound", () => registration.installing?.addEventListener("statechange", update));
  await update();
}
