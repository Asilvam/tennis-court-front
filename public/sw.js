self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

self.addEventListener('push', function (event) {
    // console.log('Push event received:', event);
    const data = event.data ? event.data.json() : {};
    // console.log('Push data:', data);

    const title = data.title || 'Default Title';
    const options = {
        body: data.body || 'Default Body',
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

