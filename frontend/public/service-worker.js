import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// Cache all HTML pages
registerRoute(
    ({ request }) => request.destination === 'document',
    new StaleWhileRevalidate({
        cacheName: 'html-cache',
    })
);