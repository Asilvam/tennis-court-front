self.addEventListener('push', (event) => {
    const data = event.data.json();
    console.log('Push received:', data);

    const options = {
        body: data.body,
        icon: data.icon || '/icon.png',
        badge: '/badge.png',
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('push', function (event) {
    console.log('Push event received:', event);
    const data = event.data ? event.data.json() : {};
    console.log('Push data:', data);

    const title = data.title || 'Default Title';
    const options = {
        body: data.body || 'Default Body',
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

