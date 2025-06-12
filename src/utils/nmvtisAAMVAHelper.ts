// AAMVA SVRS Helper - Optimized Manual Workflow
// Makes AAMVA Single VIN Reporting Service as efficient as possible

import { getScheduledNMVTISReports } from './nmvtisScheduler';

interface AAMVAReportData {
  id: string;
  vin: string;
  reportType: 'PURCHASE' | 'SALE';
  vehicleData: {
    vin: string;
    obtainDate: string;
    sellerName: string;
    buyerName?: string;
    odometer?: number;
  };
  status: 'scheduled' | 'sent' | 'failed';
  scheduleDate: string;
  attempts: number;
}

// Generate AAMVA-compatible CSV export for batch submission
export const generateAAMVABatchCSV = (): string => {
  const reports = getScheduledNMVTISReports();
  const pendingReports = reports.filter(r => r.status === 'scheduled' && new Date(r.scheduleDate) <= new Date());

  // AAMVA SVRS CSV Headers (based on their web form fields)
  const headers = [
    'VIN',
    'Report_Type',
    'Obtain_Date', 
    'Obtained_From',
    'Disposition',
    'Buyer_Name',
    'Export_Intended',
    'Odometer',
    'Entity_Name',
    'Entity_Address',
    'Entity_City',
    'Entity_State',
    'Entity_ZIP',
    'Entity_Phone'
  ];

  let csvContent = headers.join(',') + '\n';

  pendingReports.forEach(report => {
    const row = [
      `"${report.vehicleData.vin}"`,
      `"${report.reportType === 'PURCHASE' ? 'JUNK' : 'SALE'}"`,
      `"${report.vehicleData.obtainDate}"`,
      `"${report.vehicleData.sellerName}"`,
      `"${report.reportType === 'PURCHASE' ? 'TBD' : 'SOLD'}"`,
      `"${report.vehicleData.buyerName || ''}"`,
      `"N"`, // Export intended
      `"${report.vehicleData.odometer || ''}"`,
      `"Demo Junkyard & Auto Parts"`,
      `"123 Salvage Road"`,
      `"Milwaukee"`,
      `"WI"`,
      `"53201"`,
      `"(414) 555-0123"`
    ];
    csvContent += row.join(',') + '\n';
  });

  return csvContent;
};

// Generate individual report summary for copy/paste
export const generateAAMVAReportSummary = (reportId: string): string => {
  const reports = getScheduledNMVTISReports();
  const report = reports.find(r => r.id === reportId);
  
  if (!report) return 'Report not found';

  return `
NMVTIS Report Data (Copy this to AAMVA SVRS):

VIN: ${report.vehicleData.vin}
Report Type: ${report.reportType === 'PURCHASE' ? 'Junk Vehicle Report' : 'Vehicle Sale Report'}
Obtain Date: ${report.vehicleData.obtainDate}
Obtained From: ${report.vehicleData.sellerName}
${report.vehicleData.buyerName ? `Sold To: ${report.vehicleData.buyerName}` : ''}
Disposition: ${report.reportType === 'PURCHASE' ? 'TBD' : 'SOLD'}
Export Intended: No
${report.vehicleData.odometer ? `Odometer: ${report.vehicleData.odometer}` : ''}

Entity Information:
Name: Demo Junkyard & Auto Parts
Address: 123 Salvage Road
City: Milwaukee
State: WI
ZIP: 53201
Phone: (414) 555-0123
`;
};

// Get pending reports ready for submission
export const getPendingAAMVAReports = (): AAMVAReportData[] => {
  const reports = getScheduledNMVTISReports();
  const now = new Date();
  
  return reports.filter(r => 
    r.status === 'scheduled' && 
    new Date(r.scheduleDate) <= now
  ).map(r => ({
    id: r.id,
    vin: r.vin,
    reportType: r.reportType,
    vehicleData: r.vehicleData,
    status: r.status,
    scheduleDate: r.scheduleDate,
    attempts: r.attempts
  }));
};

// Mark reports as submitted after manual submission
export const markAAMVAReportsSubmitted = (reportIds: string[]): void => {
  const reports = JSON.parse(localStorage.getItem('scheduledNMVTISReports') || '[]');
  const now = new Date().toISOString();
  
  const updatedReports = reports.map((report: any) => {
    if (reportIds.includes(report.id)) {
      return {
        ...report,
        status: 'sent',
        lastAttempt: now,
        attempts: report.attempts + 1
      };
    }
    return report;
  });
  
  localStorage.setItem('scheduledNMVTISReports', JSON.stringify(updatedReports));
};

// Download CSV file for batch upload to AAMVA
export const downloadAAMVABatchCSV = (): void => {
  const csvContent = generateAAMVABatchCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `NMVTIS_Batch_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Open AAMVA SVRS with instructions
export const openAAMVAWithInstructions = (): void => {
  const pendingCount = getPendingAAMVAReports().length;
  
  // Open AAMVA SVRS
  const aamvaWindow = window.open('https://nmvtisreporting.aamva.org/', '_blank');
  
  // Show detailed instructions
  setTimeout(() => {
    const instructions = `
AAMVA SVRS Submission Instructions:

1. Log into AAMVA SVRS (opened in new tab)
2. You have ${pendingCount} pending reports to submit
3. Options:
   • Individual Submission: Use "View Report Details" for each VIN
   • Batch Upload: Download CSV file and upload to AAMVA
   • Copy/Paste: Use the formatted data provided

After submission:
• Return to this system
• Mark reports as "Submitted" to update tracking

The system has prepared all required data for you.
    `;
    
    alert(instructions);
  }, 2000);
};

// Get submission statistics
export const getAAMVASubmissionStats = () => {
  const reports = getScheduledNMVTISReports();
  const now = new Date();
  
  const pending = reports.filter(r => 
    r.status === 'scheduled' && new Date(r.scheduleDate) <= now
  ).length;
  
  const submitted = reports.filter(r => r.status === 'sent').length;
  const failed = reports.filter(r => r.status === 'failed').length;
  const scheduled = reports.filter(r => 
    r.status === 'scheduled' && new Date(r.scheduleDate) > now
  ).length;
  
  return {
    pending,
    submitted,
    failed,
    scheduled,
    total: reports.length
  };
};

// Format date for AAMVA (MM/DD/YYYY format)
export const formatAAMVADate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
};

// Validate VIN for AAMVA submission
export const validateVINForAAMVA = (vin: string): { valid: boolean; message: string } => {
  if (!vin || vin.length !== 17) {
    return { valid: false, message: 'VIN must be exactly 17 characters' };
  }
  
  // Basic VIN validation (no I, O, Q characters)
  if (/[IOQ]/.test(vin.toUpperCase())) {
    return { valid: false, message: 'VIN cannot contain letters I, O, or Q' };
  }
  
  return { valid: true, message: 'VIN is valid for NMVTIS reporting' };
}; 