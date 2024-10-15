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

// self.addEventListener('notificationclick', (event) => {
//     event.notification.close();
//     event.waitUntil(
//         clients.openWindow('/')
//     );
// });

self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : 'Default message',
        icon: 'icon.png',
        badge: 'badge.png'
    };
    event.waitUntil(
        self.registration.showNotification('Notification Title', options)
    );
});

