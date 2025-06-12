import { sendBackupViaBevo } from "./brevoEmailService";

interface BackupData {
  vehicleTransactions: any[];
  vehicleSales: any[];
  driverCashRecords: any[];
  cashTransactions: any[];
  impoundLienVehicles: any[];
  sentEmails: any[];
  nmvtisReports: any[];
  users: any[];
}

interface BackupFile {
  filename: string;
  data: string;
  type: 'json' | 'csv';
}

// Get all data for backup
export const getAllBackupData = (): BackupData => {
  return {
    vehicleTransactions: JSON.parse(localStorage.getItem('vehicleTransactions') || '[]'),
    vehicleSales: JSON.parse(localStorage.getItem('vehicleSales') || '[]'),
    driverCashRecords: JSON.parse(localStorage.getItem('driverCashRecords') || '[]'),
    cashTransactions: JSON.parse(localStorage.getItem('cashTransactions') || '[]'),
    impoundLienVehicles: JSON.parse(localStorage.getItem('impoundLienVehicles') || '[]'),
    sentEmails: JSON.parse(localStorage.getItem('sentEmails') || '[]'),
    nmvtisReports: JSON.parse(localStorage.getItem('nmvtisReports') || '[]'),
    users: JSON.parse(localStorage.getItem('users') || '[]'),
  };
};

// Convert JSON to CSV format
const jsonToCsv = (data: any[], filename: string): string => {
  if (data.length === 0) return 'No data available';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Handle nested objects and escape commas/quotes
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value || '').replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

// Generate backup files
export const generateBackupFiles = (): BackupFile[] => {
  const data = getAllBackupData();
  const timestamp = new Date().toISOString().split('T')[0];
  
  const files: BackupFile[] = [];
  
  // Vehicle Purchases (JSON and CSV)
  files.push({
    filename: `vehicle-purchases-${timestamp}.json`,
    data: JSON.stringify(data.vehicleTransactions, null, 2),
    type: 'json'
  });
  
  files.push({
    filename: `vehicle-purchases-${timestamp}.csv`,
    data: jsonToCsv(data.vehicleTransactions, 'Vehicle Purchases'),
    type: 'csv'
  });
  
  // Vehicle Sales (JSON and CSV)
  files.push({
    filename: `vehicle-sales-${timestamp}.json`,
    data: JSON.stringify(data.vehicleSales, null, 2),
    type: 'json'
  });
  
  files.push({
    filename: `vehicle-sales-${timestamp}.csv`,
    data: jsonToCsv(data.vehicleSales, 'Vehicle Sales'),
    type: 'csv'
  });
  
  // NMVTIS Logbook (CSV format for state reporting)
  const nmvtisData = data.vehicleTransactions.map(transaction => ({
    date: transaction.saleDate,
    vin: transaction.vehicleVIN,
    year: transaction.vehicleYear,
    make: transaction.vehicleMake,
    seller_name: transaction.sellerName,
    seller_address: `${transaction.sellerAddress}, ${transaction.sellerCity}, ${transaction.sellerState} ${transaction.sellerZip}`,
    purchase_price: transaction.salePrice,
    disposition: data.vehicleSales.find(sale => sale.originalTransactionId === transaction.id)?.disposition || 'IN_INVENTORY',
    disposition_date: data.vehicleSales.find(sale => sale.originalTransactionId === transaction.id)?.saleDate || '',
    buyer_name: data.vehicleSales.find(sale => sale.originalTransactionId === transaction.id)?.buyerName || '',
    sale_price: data.vehicleSales.find(sale => sale.originalTransactionId === transaction.id)?.salePrice || ''
  }));
  
  files.push({
    filename: `nmvtis-logbook-${timestamp}.csv`,
    data: jsonToCsv(nmvtisData, 'NMVTIS Logbook'),
    type: 'csv'
  });
  
  // Cash Transactions
  files.push({
    filename: `cash-transactions-${timestamp}.csv`,
    data: jsonToCsv(data.cashTransactions, 'Cash Transactions'),
    type: 'csv'
  });
  
  // Complete Backup (all data in one file)
  files.push({
    filename: `complete-backup-${timestamp}.json`,
    data: JSON.stringify(data, null, 2),
    type: 'json'
  });
  
  return files;
};

// Download backup files locally
export const downloadBackupFiles = () => {
  const files = generateBackupFiles();
  
  files.forEach(file => {
    const blob = new Blob([file.data], { 
      type: file.type === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  });
};

// Send backup via email using Brevo
export const sendBackupEmail = async (recipientEmail: string): Promise<{ success: boolean; message: string }> => {
  try {
    const backupData = getAllBackupData();
    
    // Use Brevo to send the backup email with attachment
    return await sendBackupViaBevo(recipientEmail, "Backup Recipient", backupData);
    
  } catch (error) {
    console.error('Failed to send backup email:', error);
    return {
      success: false,
      message: 'Failed to send backup email. Please check your Brevo configuration.'
    };
  }
};

// Schedule monthly backups
export const scheduleMonthlyBackup = (recipientEmail: string) => {
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  
  const lastBackup = localStorage.getItem('lastBackupDate');
  const now = new Date().getTime();
  
  if (!lastBackup || (now - new Date(lastBackup).getTime()) >= THIRTY_DAYS) {
    // Time for backup
    sendBackupEmail(recipientEmail).then(result => {
      if (result.success) {
        localStorage.setItem('lastBackupDate', new Date().toISOString());
        console.log('Monthly backup completed successfully');
      }
    });
  }
};

// Check if backup is due
export const isBackupDue = (): { isDue: boolean; daysUntilNext: number } => {
  const lastBackup = localStorage.getItem('lastBackupDate');
  const now = new Date().getTime();
  
  if (!lastBackup) {
    return { isDue: true, daysUntilNext: 0 };
  }
  
  const lastBackupTime = new Date(lastBackup).getTime();
  const daysSinceBackup = Math.floor((now - lastBackupTime) / (24 * 60 * 60 * 1000));
  const daysUntilNext = Math.max(0, 30 - daysSinceBackup);
  
  return {
    isDue: daysSinceBackup >= 30,
    daysUntilNext
  };
};

// Restore from backup file
export const restoreFromBackup = (backupData: BackupData): boolean => {
  try {
    Object.entries(backupData).forEach(([key, value]) => {
      if (value && Array.isArray(value)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    
    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
}; 