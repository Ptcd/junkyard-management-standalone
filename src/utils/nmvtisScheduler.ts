// NMVTIS Scheduled Reporting System
// Handles automatic reporting of purchases (1 week delay) and sales (immediate)

import {
  getNMVTISReporter,
  reportJunkVehicle,
  reportVehicleSold,
} from "./nmvtisReporting";

interface ScheduledNMVTISReport {
  id: string;
  vin: string;
  reportType: "PURCHASE" | "SALE";
  scheduleDate: string; // ISO string
  vehicleData: {
    vin: string;
    obtainDate: string;
    sellerName: string;
    buyerName?: string;
    odometer?: number;
  };
  originalTransactionId: string;
  status: "scheduled" | "sent" | "failed";
  attempts: number;
  lastAttempt?: string;
  errorMessage?: string;
}

// Schedule NMVTIS report for purchase (40 hours delay)
export const scheduleVehiclePurchaseReport = (
  transactionId: string,
  vin: string,
  obtainDate: string,
  sellerName: string,
  odometer?: number,
): void => {
  try {
    const scheduleDate = new Date();
    scheduleDate.setHours(scheduleDate.getHours() + 40); // 40 hours from now

    const scheduledReport: ScheduledNMVTISReport = {
      id: `NMVTIS-PURCHASE-${Date.now()}`,
      vin,
      reportType: "PURCHASE",
      scheduleDate: scheduleDate.toISOString(),
      vehicleData: {
        vin,
        obtainDate,
        sellerName,
        odometer,
      },
      originalTransactionId: transactionId,
      status: "scheduled",
      attempts: 0,
    };

    const scheduledReports = JSON.parse(
      localStorage.getItem("scheduledNMVTISReports") || "[]",
    );
    scheduledReports.push(scheduledReport);
    localStorage.setItem(
      "scheduledNMVTISReports",
      JSON.stringify(scheduledReports),
    );

    console.log(
      `Scheduled NMVTIS purchase report for VIN ${vin} on ${scheduleDate.toLocaleString()}`,
    );
  } catch (error) {
    console.error("Error scheduling NMVTIS purchase report:", error);
  }
};

// Immediately report vehicle sale to NMVTIS
export const reportVehicleSaleImmediate = async (
  transactionId: string,
  vin: string,
  obtainDate: string,
  sellerName: string,
  buyerName: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const result = await reportVehicleSold({
      vin,
      obtainDate,
      sellerName,
      buyerName,
    });

    // Log the immediate sale report
    const immediateReport: ScheduledNMVTISReport = {
      id: `NMVTIS-SALE-${Date.now()}`,
      vin,
      reportType: "SALE",
      scheduleDate: new Date().toISOString(),
      vehicleData: {
        vin,
        obtainDate,
        sellerName,
        buyerName,
      },
      originalTransactionId: transactionId,
      status: result.success ? "sent" : "failed",
      attempts: 1,
      lastAttempt: new Date().toISOString(),
      errorMessage: result.success ? undefined : result.message,
    };

    const scheduledReports = JSON.parse(
      localStorage.getItem("scheduledNMVTISReports") || "[]",
    );
    scheduledReports.push(immediateReport);
    localStorage.setItem(
      "scheduledNMVTISReports",
      JSON.stringify(scheduledReports),
    );

    return result;
  } catch (error) {
    console.error("Error reporting vehicle sale to NMVTIS:", error);
    return {
      success: false,
      message: `Failed to report sale: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

// Process pending scheduled reports (call this on app startup or periodically)
export const processPendingNMVTISReports = async (): Promise<void> => {
  try {
    const scheduledReports = JSON.parse(
      localStorage.getItem("scheduledNMVTISReports") || "[]",
    );
    const now = new Date();
    const updatedReports = [];

    for (const report of scheduledReports) {
      if (
        report.status === "scheduled" &&
        new Date(report.scheduleDate) <= now
      ) {
        // Time to process this report
        try {
          let result;
          if (report.reportType === "PURCHASE") {
            result = await reportJunkVehicle(report.vehicleData);
          } else if (report.reportType === "SALE") {
            result = await reportVehicleSold(report.vehicleData);
          }

          if (result) {
            report.status = result.success ? "sent" : "failed";
            report.attempts += 1;
            report.lastAttempt = new Date().toISOString();
            if (!result.success) {
              report.errorMessage = result.message;
            }
          }
        } catch (error) {
          report.status = "failed";
          report.attempts += 1;
          report.lastAttempt = new Date().toISOString();
          report.errorMessage =
            error instanceof Error ? error.message : "Processing error";
        }
      }
      updatedReports.push(report);
    }

    localStorage.setItem(
      "scheduledNMVTISReports",
      JSON.stringify(updatedReports),
    );

    const processed = updatedReports.filter(
      (r) =>
        r.lastAttempt &&
        new Date(r.lastAttempt).toDateString() === now.toDateString(),
    ).length;

    if (processed > 0) {
      console.log(`Processed ${processed} pending NMVTIS reports`);
    }
  } catch (error) {
    console.error("Error processing pending NMVTIS reports:", error);
  }
};

// Get all scheduled reports (for admin dashboard)
export const getScheduledNMVTISReports = (): ScheduledNMVTISReport[] => {
  try {
    return JSON.parse(localStorage.getItem("scheduledNMVTISReports") || "[]");
  } catch (error) {
    console.error("Error getting scheduled NMVTIS reports:", error);
    return [];
  }
};

// Get pending reports count
export const getPendingNMVTISReportsCount = (): number => {
  try {
    const reports = JSON.parse(
      localStorage.getItem("scheduledNMVTISReports") || "[]",
    );
    return reports.filter(
      (r: ScheduledNMVTISReport) => r.status === "scheduled",
    ).length;
  } catch (error) {
    console.error("Error getting pending reports count:", error);
    return 0;
  }
};

// Retry failed reports
export const retryFailedNMVTISReport = async (
  reportId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const scheduledReports = JSON.parse(
      localStorage.getItem("scheduledNMVTISReports") || "[]",
    );
    const reportIndex = scheduledReports.findIndex(
      (r: ScheduledNMVTISReport) => r.id === reportId,
    );

    if (reportIndex === -1) {
      return { success: false, message: "Report not found" };
    }

    const report = scheduledReports[reportIndex];

    let result;
    if (report.reportType === "PURCHASE") {
      result = await reportJunkVehicle(report.vehicleData);
    } else if (report.reportType === "SALE") {
      result = await reportVehicleSold(report.vehicleData);
    } else {
      return { success: false, message: "Invalid report type" };
    }

    // Update report status
    report.status = result.success ? "sent" : "failed";
    report.attempts += 1;
    report.lastAttempt = new Date().toISOString();
    if (!result.success) {
      report.errorMessage = result.message;
    } else {
      delete report.errorMessage;
    }

    scheduledReports[reportIndex] = report;
    localStorage.setItem(
      "scheduledNMVTISReports",
      JSON.stringify(scheduledReports),
    );

    return result;
  } catch (error) {
    console.error("Error retrying NMVTIS report:", error);
    return {
      success: false,
      message: `Retry failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

// Initialize scheduler (call on app startup)
export const initializeNMVTISScheduler = (): void => {
  // Process pending reports on startup
  processPendingNMVTISReports();

  // Set up periodic processing (every 30 minutes)
  setInterval(
    () => {
      processPendingNMVTISReports();
    },
    30 * 60 * 1000,
  ); // 30 minutes

  console.log("NMVTIS Scheduler initialized");
};
