const CACHE_NAME = "junkyard-mgmt-v1";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/manifest.json",
  // Add other static assets
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    }),
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  // Claim clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  // Bypass non-GET or cross-origin requests (including CORS preflights)
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return; // Let the browser handle these
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response;
      }

      // Clone the request because it's a stream
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response because it's a stream
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If both cache and network fail, return a custom offline page for navigation requests
          if (event.request.destination === "document") {
            return caches.match("/");
          }
        });
    }),
  );
});

// Background sync for queued transactions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync-transactions") {
    event.waitUntil(syncQueuedTransactions());
  }
});

async function syncQueuedTransactions() {
  try {
    // Get queued transactions from IndexedDB or localStorage
    const queuedTransactions = JSON.parse(
      localStorage.getItem("queuedTransactions") || "[]",
    );

    if (queuedTransactions.length === 0) {
      return;
    }

    console.log("Syncing", queuedTransactions.length, "queued transactions");

    // Process each queued transaction
    for (const transaction of queuedTransactions) {
      try {
        // In a real app, you would send this to your server
        // For now, we'll just move it to the main transactions
        const existingTransactions = JSON.parse(
          localStorage.getItem("vehicleTransactions") || "[]",
        );
        existingTransactions.push(transaction);
        localStorage.setItem(
          "vehicleTransactions",
          JSON.stringify(existingTransactions),
        );

        console.log("Synced transaction:", transaction.id);
      } catch (error) {
        console.error("Failed to sync transaction:", transaction.id, error);
      }
    }

    // Clear the queue after successful sync
    localStorage.removeItem("queuedTransactions");

    // Notify the main app that sync is complete
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_COMPLETE",
          message: `Synced ${queuedTransactions.length} transactions`,
        });
      });
    });
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}
