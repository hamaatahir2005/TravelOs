// No operational responses, documents, or authentication pages are cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate')
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            '<html><meta name="viewport" content="width=device-width"><body style="font:16px system-ui;padding:40px"><h1>You’re offline</h1><p>Connect to the internet to access your private Travel OS workspace.</p><button onclick="location.reload()">Try again</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
      ),
    );
});
