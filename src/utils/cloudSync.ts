import { createClient } from '@supabase/supabase-js';

// Cloud Sync Configuration
interface CloudSyncConfig {
  enabled: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  syncInterval: number; // minutes
  lastSync: string;
}

// Data tables that need to be synced
const SYNC_TABLES = [
  "vehicleTransactions",
  "vehicleSales",
  "driverCashRecords",
  "cashTransactions",
  "impoundLienVehicles",
  "users",
];

// Get cloud sync configuration
export const getCloudSyncConfig = (): CloudSyncConfig => {
  const config = localStorage.getItem("cloudSyncConfig");
  return config
    ? JSON.parse(config)
    : {
        enabled: false,
        syncInterval: 15, // sync every 15 minutes
        lastSync: new Date().toISOString(),
      };
};

// Save cloud sync configuration
export const saveCloudSyncConfig = (config: CloudSyncConfig): void => {
  localStorage.setItem("cloudSyncConfig", JSON.stringify(config));
};

// Check if data needs to be synced
export const needsSync = (): boolean => {
  const config = getCloudSyncConfig();
  if (!config.enabled) return false;

  const lastSync = new Date(config.lastSync);
  const now = new Date();
  const minutesSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);

  return minutesSinceSync >= config.syncInterval;
};

// Sync data to cloud
export const syncToCloud = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const config = getCloudSyncConfig();

    if (!config.enabled || !config.supabaseUrl || !config.supabaseKey) {
      return { success: false, message: "Cloud sync not properly configured" };
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    const syncData: any = {};

    // Collect all data to sync
    for (const table of SYNC_TABLES) {
      const data = localStorage.getItem(table);
      if (data) {
        syncData[table] = JSON.parse(data);
      }
    }

    // Get the current yard ID
    const yardId = localStorage.getItem('currentYardId');
    if (!yardId) {
      return { success: false, message: "No yard ID found" };
    }

    // Sync each table to Supabase
    for (const [table, data] of Object.entries(syncData)) {
      if (Array.isArray(data)) {
        for (const record of data) {
          // Add yard_id and device_id to each record
          const recordWithMetadata = {
            ...record,
            yard_id: yardId,
            device_id: localStorage.getItem('deviceId') || 'unknown',
            last_synced: new Date().toISOString()
          };

          // Upsert the record
          const { error } = await supabase
            .from(table)
            .upsert(recordWithMetadata, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (error) {
            console.error(`Error syncing ${table}:`, error);
            return { success: false, message: `Failed to sync ${table}` };
          }
        }
      }
    }

    // Update last sync time
    const updatedConfig = { ...config, lastSync: new Date().toISOString() };
    saveCloudSyncConfig(updatedConfig);

    return { success: true, message: "Data synced to cloud successfully" };
  } catch (error) {
    console.error("Cloud sync failed:", error);
    return { success: false, message: "Failed to sync to cloud" };
  }
};

// Sync data from cloud
export const syncFromCloud = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const config = getCloudSyncConfig();

    if (!config.enabled || !config.supabaseUrl || !config.supabaseKey) {
      return { success: false, message: "Cloud sync not properly configured" };
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    const yardId = localStorage.getItem('currentYardId');
    
    if (!yardId) {
      return { success: false, message: "No yard ID found" };
    }

    // Get last sync time
    const lastSync = new Date(config.lastSync);

    // Sync each table from Supabase
    for (const table of SYNC_TABLES) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('yard_id', yardId)
        .gte('last_synced', lastSync.toISOString());

      if (error) {
        console.error(`Error fetching ${table}:`, error);
        return { success: false, message: `Failed to fetch ${table}` };
      }

      if (data && data.length > 0) {
        // Merge with local data
        const localData = JSON.parse(localStorage.getItem(table) || '[]');
        const mergedData = [...localData];
        
        for (const record of data) {
          const existingIndex = mergedData.findIndex((r: any) => r.id === record.id);
          if (existingIndex >= 0) {
            mergedData[existingIndex] = record;
          } else {
            mergedData.push(record);
          }
        }

        // Save merged data
        localStorage.setItem(table, JSON.stringify(mergedData));
      }
    }

    // Update last sync time
    const updatedConfig = { ...config, lastSync: new Date().toISOString() };
    saveCloudSyncConfig(updatedConfig);

    return { success: true, message: "Data synced from cloud successfully" };
  } catch (error) {
    console.error("Cloud restore failed:", error);
    return { success: false, message: "Failed to restore from cloud" };
  }
};

// Auto-sync when online
export const autoSync = async (): Promise<void> => {
  if (navigator.onLine && needsSync()) {
    await syncToCloud();
    await syncFromCloud();
  }
};

// Setup cloud sync with Supabase
export const setupCloudSync = (
  supabaseUrl: string,
  supabaseKey: string,
): CloudSyncConfig => {
  // Generate a unique device ID if not exists
  if (!localStorage.getItem('deviceId')) {
    localStorage.setItem('deviceId', crypto.randomUUID());
  }

  const config: CloudSyncConfig = {
    enabled: true,
    supabaseUrl,
    supabaseKey,
    syncInterval: 15,
    lastSync: new Date().toISOString(),
  };

  saveCloudSyncConfig(config);
  return config;
};

// Disable cloud sync
export const disableCloudSync = (): void => {
  const config = getCloudSyncConfig();
  config.enabled = false;
  saveCloudSyncConfig(config);
};

/*
IMPLEMENTATION GUIDE FOR VERCEL + SUPABASE:

1. Install Supabase client:
   npm install @supabase/supabase-js

2. Create Supabase project and get URL + anon key

3. Create tables in Supabase:
   - sync_data (id, yard_id, data jsonb, updated_at timestamp)
   - vehicle_transactions (mirror of local structure)
   - vehicle_sales (mirror of local structure)
   - etc.

4. Deploy to Vercel:
   - Connect GitHub repo to Vercel
   - Set environment variables for Supabase
   - Auto-deploy on push

5. Enable real-time subscriptions for multi-device sync:
   const subscription = supabase
     .from('sync_data')
     .on('*', payload => {
       // Update local data when cloud changes
     })
     .subscribe();

6. Add conflict resolution for offline edits
7. Add incremental sync for large datasets
*/
