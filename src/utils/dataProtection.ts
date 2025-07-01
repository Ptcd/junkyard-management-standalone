// Data Protection Utility
// Comprehensive data protection for junkyard management system

import { supabase } from "./supabaseAuth";
import { sendBackupEmail } from "./backupManager";

export interface DataProtectionConfig {
  autoBackupEnabled: boolean;
  backupFrequencyHours: number;
  maxLocalBackups: number;
  cloudSyncEnabled: boolean;
  validationEnabled: boolean;
  lastBackup: string;
  backupEmail: string;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checkedTables: string[];
}

// Critical data tables that need protection
const PROTECTED_TABLES = [
  "vehicleTransactions",
  "vehicleSales", 
  "driverCashRecords",
  "cashTransactions",
  "expenseReports",
  "buyerProfiles",
  "scheduledNMVTISReports",
  "impoundLienVehicles"
];

// Settings tables that are objects, not arrays
const SETTINGS_TABLES = [
  "yardSettings",
  "nmvtisSettings"
];

// Get data protection configuration
export const getDataProtectionConfig = (): DataProtectionConfig => {
  const config = localStorage.getItem("dataProtectionConfig");
  return config ? JSON.parse(config) : {
    autoBackupEnabled: true,
    backupFrequencyHours: 24, // Daily backups
    maxLocalBackups: 7, // Keep 7 days
    cloudSyncEnabled: true,
    validationEnabled: true,
    lastBackup: new Date().toISOString(),
    backupEmail: ""
  };
};

// Save data protection configuration
export const saveDataProtectionConfig = (config: DataProtectionConfig): void => {
  localStorage.setItem("dataProtectionConfig", JSON.stringify(config));
};

// Create local backup with timestamp
export const createLocalBackup = async (label?: string): Promise<{ success: boolean; message: string; backupId?: string }> => {
  try {
    const backupId = `backup_${Date.now()}_${label || 'auto'}`;
    const backupData: any = {
      id: backupId,
      timestamp: new Date().toISOString(),
      label: label || "Automatic Backup",
      version: "1.0",
      tables: {}
    };

    // Collect all protected data
    for (const table of PROTECTED_TABLES) {
      const data = localStorage.getItem(table);
      if (data) {
        try {
          backupData.tables[table] = JSON.parse(data);
        } catch (error) {
          console.warn(`Failed to backup table ${table}:`, error);
          backupData.tables[table] = [];
        }
      } else {
        backupData.tables[table] = [];
      }
    }

    // Store local backup
    const existingBackups = JSON.parse(localStorage.getItem("localBackups") || "[]");
    existingBackups.push(backupData);

    // Keep only the most recent backups
    const config = getDataProtectionConfig();
    const trimmedBackups = existingBackups
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, config.maxLocalBackups);

    localStorage.setItem("localBackups", JSON.stringify(trimmedBackups));

    // Update last backup time
    const updatedConfig = { ...config, lastBackup: new Date().toISOString() };
    saveDataProtectionConfig(updatedConfig);

    return { 
      success: true, 
      message: `Local backup created successfully (${backupId})`,
      backupId
    };
  } catch (error) {
    console.error("Local backup failed:", error);
    return { success: false, message: "Failed to create local backup" };
  }
};

// Validate data integrity
export const validateDataIntegrity = (): DataValidationResult => {
  const result: DataValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    checkedTables: []
  };

  // Check array-based tables
  for (const table of PROTECTED_TABLES) {
    result.checkedTables.push(table);
    
    try {
      const data = localStorage.getItem(table);
      if (!data) {
        result.warnings.push(`Table ${table} is empty`);
        continue;
      }

      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        result.errors.push(`Table ${table} is not a valid array`);
        result.isValid = false;
        continue;
      }

      // Specific validations for critical tables
      if (table === "vehicleTransactions") {
        for (let index = 0; index < parsed.length; index++) {
          const transaction = parsed[index];
          if (!transaction.vin && !transaction.vehicleVIN) {
            result.errors.push(`Vehicle transaction at index ${index} missing VIN`);
            result.isValid = false;
          }
          if (!transaction.purchase_price && !transaction.salePrice) {
            result.warnings.push(`Vehicle transaction at index ${index} missing price`);
          }
        }
      }

      if (table === "driverCashRecords") {
        for (let index = 0; index < parsed.length; index++) {
          const record = parsed[index];
          if (typeof record.currentCash !== 'number') {
            result.errors.push(`Cash record at index ${index} has invalid cash amount`);
            result.isValid = false;
          }
        }
      }

    } catch (error) {
      result.errors.push(`Table ${table} contains invalid JSON`);
      result.isValid = false;
    }
  }

  // Check settings tables (objects, not arrays)
  for (const table of SETTINGS_TABLES) {
    result.checkedTables.push(table);
    
    try {
      const data = localStorage.getItem(table);
      if (!data) {
        result.warnings.push(`Settings ${table} is empty`);
        continue;
      }

      const parsed = JSON.parse(data);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        result.errors.push(`Settings ${table} is not a valid object`);
        result.isValid = false;
        continue;
      }

      // Settings are valid if they're objects
      // You can add specific validation rules here if needed

    } catch (error) {
      result.errors.push(`Settings ${table} contains invalid JSON`);
      result.isValid = false;
    }
  }

  return result;
};

// Sync critical data to Supabase
export const syncCriticalDataToCloud = async (): Promise<{ success: boolean; message: string }> => {
  try {
    if (!supabase) {
      return { success: false, message: "Supabase not available" };
    }

    const yardId = localStorage.getItem('currentYardId') || 'default';
    let syncedTables = 0;

    // Sync vehicle transactions
    const transactions = JSON.parse(localStorage.getItem("vehicleTransactions") || "[]");
    if (transactions.length > 0) {
      const formattedTransactions = transactions.map((t: any) => ({
        id: t.id || crypto.randomUUID(),
        user_id: t.userId || t.user_id,
        yard_id: yardId,
        vin: t.vin || t.vehicleVIN,
        year: parseInt(t.year || t.vehicleYear || "0"),
        make: t.make || t.vehicleMake || "",
        seller_first_name: t.seller_first_name || t.sellerFirstName || "",
        seller_last_name: t.seller_last_name || t.sellerLastName || "",
        seller_address: t.seller_address || t.sellerAddress || "",
        purchase_price: parseFloat(t.purchase_price || t.salePrice || "0"),
        purchase_date: t.purchase_date || t.saleDate,
        bill_of_sale_pdf_url: t.bill_of_sale_pdf_url || null,
        created_at: t.created_at || new Date().toISOString(),
        last_synced: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("vehicle_transactions")
        .upsert(formattedTransactions, { onConflict: 'id' });

      if (!error) syncedTables++;
    }

    // Sync cash records
    const cashRecords = JSON.parse(localStorage.getItem("driverCashRecords") || "[]");
    if (cashRecords.length > 0) {
      const formattedCash = cashRecords.map((c: any) => ({
        driver_id: c.driverId,
        driver_name: c.driverName,
        yard_id: yardId,
        current_cash: c.currentCash || 0,
        last_updated: c.lastUpdated || new Date().toISOString()
      }));

      const { error } = await supabase
        .from("driver_cash_records")
        .upsert(formattedCash, { onConflict: 'driver_id' });

      if (!error) syncedTables++;
    }

    return { 
      success: true, 
      message: `Successfully synced ${syncedTables} critical data tables to cloud` 
    };
  } catch (error) {
    console.error("Cloud sync failed:", error);
    return { success: false, message: "Failed to sync data to cloud" };
  }
};

// Auto backup check - run this periodically
export const checkAndRunAutoBackup = async (): Promise<void> => {
  const config = getDataProtectionConfig();
  
  if (!config.autoBackupEnabled) {
    return;
  }

  const lastBackup = new Date(config.lastBackup);
  const now = new Date();
  const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastBackup >= config.backupFrequencyHours) {
    console.log("Running automatic backup...");
    
    // Create local backup
    const localResult = await createLocalBackup("scheduled");
    
    // Sync to cloud if enabled
    if (config.cloudSyncEnabled) {
      await syncCriticalDataToCloud();
    }

    // Send email backup if configured
    if (config.backupEmail && localResult.success) {
      try {
        await sendBackupEmail(config.backupEmail);
      } catch (error) {
        console.error("Email backup failed:", error);
      }
    }
  }
};

// Restore from backup
export const restoreFromBackup = (backupId: string): { success: boolean; message: string } => {
  try {
    const backups = JSON.parse(localStorage.getItem("localBackups") || "[]");
    const backup = backups.find((b: any) => b.id === backupId);
    
    if (!backup) {
      return { success: false, message: "Backup not found" };
    }

    // Restore all tables
    for (const [table, data] of Object.entries(backup.tables)) {
      localStorage.setItem(table, JSON.stringify(data));
    }

    return { success: true, message: `Successfully restored from backup: ${backup.label}` };
  } catch (error) {
    console.error("Backup restoration failed:", error);
    return { success: false, message: "Failed to restore from backup" };
  }
};

// Get available local backups
export const getLocalBackups = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem("localBackups") || "[]");
  } catch (error) {
    console.error("Failed to load backups:", error);
    return [];
  }
};

// Initialize data protection (call on app startup)
export const initializeDataProtection = (): void => {
  // Run validation check
  const validation = validateDataIntegrity();
  if (!validation.isValid) {
    console.warn("Data integrity issues detected:", validation.errors);
  }

  // Set up periodic backup check (every hour)
  setInterval(checkAndRunAutoBackup, 60 * 60 * 1000);

  // Run initial backup check
  checkAndRunAutoBackup();
  
  console.log("Data protection initialized");
};

// Emergency data recovery
export const emergencyDataRecovery = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("Starting emergency data recovery...");
    
    // Step 1: Try to restore from latest local backup
    const backups = getLocalBackups();
    if (backups.length > 0) {
      const latestBackup = backups[0];
      const restoreResult = restoreFromBackup(latestBackup.id);
      if (restoreResult.success) {
        return { success: true, message: "Data recovered from local backup" };
      }
    }

    // Step 2: Try to pull from Supabase
    if (supabase) {
      const syncResult = await syncCriticalDataToCloud();
      if (syncResult.success) {
        return { success: true, message: "Data recovered from cloud" };
      }
    }

    return { success: false, message: "No recovery options available" };
  } catch (error) {
    console.error("Emergency recovery failed:", error);
    return { success: false, message: "Emergency recovery failed" };
  }
}; 