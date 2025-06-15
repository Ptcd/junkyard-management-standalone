// Type declarations for Background Sync API
declare global {
  interface ServiceWorkerRegistration {
    sync?: SyncManager;
  }

  interface SyncManager {
    register(tag: string): Promise<void>;
  }

  interface Window {
    ServiceWorkerRegistration: {
      prototype: ServiceWorkerRegistration;
    };
  }
}

// Offline Manager for handling offline functionality
class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = navigator.onLine;
  private onlineListeners: ((isOnline: boolean) => void)[] = [];
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.setupEventListeners();
    this.registerServiceWorker();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.notifyListeners(true);
      this.syncQueuedTransactions();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });

    // Listen for messages from service worker
    navigator.serviceWorker?.addEventListener("message", (event) => {
      if (event.data.type === "SYNC_COMPLETE") {
        console.log("Background sync completed:", event.data.message);
        // Trigger a refresh of the UI if needed
        window.dispatchEvent(
          new CustomEvent("syncComplete", {
            detail: event.data.message,
          }),
        );
      }
    });
  }

  private async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered successfully");

        // Update the service worker if needed
        this.registration.addEventListener("updatefound", () => {
          console.log("New Service Worker version available");
        });
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  public addOnlineStatusListener(callback: (isOnline: boolean) => void) {
    this.onlineListeners.push(callback);
    // Immediately call with current status
    callback(this.isOnline);
  }

  public removeOnlineStatusListener(callback: (isOnline: boolean) => void) {
    const index = this.onlineListeners.indexOf(callback);
    if (index > -1) {
      this.onlineListeners.splice(index, 1);
    }
  }

  private notifyListeners(isOnline: boolean) {
    this.onlineListeners.forEach((callback) => callback(isOnline));
  }

  public isOffline(): boolean {
    return !this.isOnline;
  }

  // Queue transaction for later sync when offline
  public queueTransaction(transaction: any): void {
    try {
      const queuedTransactions = JSON.parse(
        localStorage.getItem("queuedTransactions") || "[]",
      );

      // Add timestamp for queuing
      transaction.queuedAt = new Date().toISOString();
      transaction.needsSync = true;

      queuedTransactions.push(transaction);
      localStorage.setItem(
        "queuedTransactions",
        JSON.stringify(queuedTransactions),
      );

      console.log("Transaction queued for sync:", transaction.id);

      // Try to register for background sync if supported
      this.registerBackgroundSync();
    } catch (error) {
      console.error("Failed to queue transaction:", error);
      throw error;
    }
  }

  // Save transaction immediately (when online) or queue it (when offline)
  public saveTransaction(
    transaction: any,
    storageKey: string = "vehicleTransactions",
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.isOffline()) {
          // Queue for later sync
          this.queueTransaction(transaction);
          resolve();
        } else {
          // Save immediately
          const existingTransactions = JSON.parse(
            localStorage.getItem(storageKey) || "[]",
          );
          existingTransactions.push(transaction);
          localStorage.setItem(
            storageKey,
            JSON.stringify(existingTransactions),
          );
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private async registerBackgroundSync() {
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.sync) {
          await registration.sync.register("background-sync-transactions");
          console.log("Background sync registered");
        }
      } catch (error) {
        console.error("Background sync registration failed:", error);
      }
    }
  }

  // Manual sync of queued transactions
  public async syncQueuedTransactions(): Promise<void> {
    if (this.isOffline()) {
      console.log("Cannot sync while offline");
      return;
    }

    try {
      const queuedTransactions = JSON.parse(
        localStorage.getItem("queuedTransactions") || "[]",
      );

      if (queuedTransactions.length === 0) {
        return;
      }

      console.log("Syncing", queuedTransactions.length, "queued transactions");

      // Move queued transactions to main storage
      const existingTransactions = JSON.parse(
        localStorage.getItem("vehicleTransactions") || "[]",
      );

      // Process each queued transaction
      queuedTransactions.forEach((transaction: any) => {
        // Remove sync metadata
        delete transaction.queuedAt;
        delete transaction.needsSync;

        existingTransactions.push(transaction);
      });

      // Save updated transactions
      localStorage.setItem(
        "vehicleTransactions",
        JSON.stringify(existingTransactions),
      );

      // Clear the queue
      localStorage.removeItem("queuedTransactions");

      console.log("Sync completed successfully");

      // Notify UI components
      window.dispatchEvent(
        new CustomEvent("syncComplete", {
          detail: `Synced ${queuedTransactions.length} transactions`,
        }),
      );
    } catch (error) {
      console.error("Manual sync failed:", error);
      throw error;
    }
  }

  // Get number of queued transactions
  public getQueuedTransactionCount(): number {
    try {
      const queuedTransactions = JSON.parse(
        localStorage.getItem("queuedTransactions") || "[]",
      );
      return queuedTransactions.length;
    } catch (error) {
      console.error("Failed to get queued transaction count:", error);
      return 0;
    }
  }

  // Check if app can work offline
  public canWorkOffline(): boolean {
    return "serviceWorker" in navigator && "caches" in window;
  }

  // Prefetch critical data for offline use
  public async prefetchOfflineData(): Promise<void> {
    try {
      // Prefetch any critical data that might be needed offline
      // For now, we mainly use localStorage which works offline by default
      console.log("Offline data prefetch completed");
    } catch (error) {
      console.error("Failed to prefetch offline data:", error);
    }
  }
}

export default OfflineManager;
