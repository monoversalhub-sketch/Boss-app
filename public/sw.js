self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "BOSS", {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: { url: data.url || "/" },
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
