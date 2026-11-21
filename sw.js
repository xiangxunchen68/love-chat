// 勳貝的家：在背景接收通知
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visible = wins.some(c => c.visibilityState === "visible");
    const ios = /iPhone|iPad|iPod/.test(self.navigator.userAgent);
    if (visible && !ios) return;   // App 正開著就不跳（iPhone 規定一定要顯示）
    await self.registration.showNotification(d.title || "勳貝的家 💕", {
      body: d.body || "有新訊息",
      tag: d.tag || "msg",
      renotify: true,
      data: { url: "./" }
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of wins) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow("./");
  })());
});
