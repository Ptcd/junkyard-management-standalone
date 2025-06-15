// NMVTIS Reporting Utility
// Integrates with free AAMVA SVRS and Auto Data Direct APIs

interface NMVTISReport {
  reportingEntityId: string;
  vin: string;
  obtainDate: string;
  obtainedFrom: string;
  disposition: "TBD" | "SOLD" | "CRUSH" | "SCRAP" | "PARTS";
  exportIntended: boolean;
  vehicleType: string;
  odometer?: number;
  // Contact info (required)
  entityName: string;
  entityAddress: string;
  entityCity: string;
  entityState: string;
  entityZip: string;
  entityPhone: string;
}

interface NMVTISConfig {
  reportingEntityId: string;
  entityName: string;
  entityAddress: string;
  entityCity: string;
  entityState: string;
  entityZip: string;
  entityPhone: string;
  apiProvider: "aamva_svrs" | "auto_data_direct";
  apiKey?: string; // For Auto Data Direct
}

class NMVTISReporter {
  private config: NMVTISConfig;

  constructor(config: NMVTISConfig) {
    this.config = config;
  }

  // Main reporting function
  async reportVehicle(vehicleData: {
    vin: string;
    obtainDate: string;
    obtainedFrom: string;
    disposition: "TBD" | "SOLD" | "CRUSH" | "SCRAP" | "PARTS";
    exportIntended?: boolean;
    odometer?: number;
  }): Promise<{ success: boolean; message: string; reportId?: string }> {
    const report: NMVTISReport = {
      reportingEntityId: this.config.reportingEntityId,
      ...vehicleData,
      exportIntended: vehicleData.exportIntended || false,
      vehicleType: "AUTOMOBILE",
      entityName: this.config.entityName,
      entityAddress: this.config.entityAddress,
      entityCity: this.config.entityCity,
      entityState: this.config.entityState,
      entityZip: this.config.entityZip,
      entityPhone: this.config.entityPhone,
    };

    if (this.config.apiProvider === "auto_data_direct") {
      return this.reportToAutoDataDirect(report);
    } else {
      return this.reportToAAMVA(report);
    }
  }

  // Auto Data Direct API Integration (they offer free API)
  private async reportToAutoDataDirect(
    report: NMVTISReport,
  ): Promise<{ success: boolean; message: string; reportId?: string }> {
    try {
      // Auto Data Direct API endpoint (example)
      const response = await fetch("https://api.add123.com/nmvtis/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          reporting_entity_id: report.reportingEntityId,
          vin: report.vin,
          obtain_date: report.obtainDate,
          obtained_from: report.obtainedFrom,
          disposition: report.disposition,
          export_intended: report.exportIntended,
          vehicle_type: report.vehicleType,
          odometer: report.odometer,
          entity_info: {
            name: report.entityName,
            address: report.entityAddress,
            city: report.entityCity,
            state: report.entityState,
            zip: report.entityZip,
            phone: report.entityPhone,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          message: "Vehicle successfully reported to NMVTIS",
          reportId: result.report_id,
        };
      } else {
        return {
          success: false,
          message: `NMVTIS reporting failed: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `NMVTIS reporting error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // AAMVA SVRS Integration (manual redirect for now, could be automated)
  private async reportToAAMVA(
    report: NMVTISReport,
  ): Promise<{ success: boolean; message: string; reportId?: string }> {
    // For AAMVA SVRS, we'll store locally and provide manual reporting option
    // This is because AAMVA SVRS is web-based, not API-based

    const pendingReports = JSON.parse(
      localStorage.getItem("nmvtisPendingReports") || "[]",
    );
    const reportWithId = {
      ...report,
      id: `NMVTIS-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    pendingReports.push(reportWithId);
    localStorage.setItem(
      "nmvtisPendingReports",
      JSON.stringify(pendingReports),
    );

    return {
      success: true,
      message:
        "Vehicle queued for NMVTIS reporting. Use 'Report to NMVTIS' button to submit via AAMVA SVRS.",
      reportId: reportWithId.id,
    };
  }

  // Get pending reports for manual submission
  getPendingReports(): any[] {
    return JSON.parse(localStorage.getItem("nmvtisPendingReports") || "[]");
  }

  // Mark report as submitted manually
  markReportSubmitted(reportId: string): void {
    const pendingReports = JSON.parse(
      localStorage.getItem("nmvtisPendingReports") || "[]",
    );
    const updatedReports = pendingReports.map((report: any) =>
      report.id === reportId
        ? {
            ...report,
            status: "submitted",
            submittedDate: new Date().toISOString(),
          }
        : report,
    );
    localStorage.setItem(
      "nmvtisPendingReports",
      JSON.stringify(updatedReports),
    );
  }

  // Open AAMVA SVRS in new tab with pre-filled data
  openAAMVAReporting(reportId?: string): void {
    const url = "https://nmvtisreporting.aamva.org/";
    const reportWindow = window.open(url, "_blank");

    if (reportId) {
      const reports = this.getPendingReports();
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        // Show alert with data to copy/paste
        setTimeout(() => {
          alert(`NMVTIS Report Data for ${report.vin}:
          
VIN: ${report.vin}
Obtain Date: ${report.obtainDate}
Obtained From: ${report.obtainedFrom}
Disposition: ${report.disposition}
Export Intended: ${report.exportIntended ? "Yes" : "No"}
Odometer: ${report.odometer || "N/A"}

Copy this information to the AAMVA SVRS form.`);
        }, 2000);
      }
    }
  }
}

// Export singleton instance
let nmvtisReporter: NMVTISReporter | null = null;

export const initializeNMVTIS = (config: NMVTISConfig) => {
  nmvtisReporter = new NMVTISReporter(config);
};

export const getNMVTISReporter = (): NMVTISReporter => {
  if (!nmvtisReporter) {
    throw new Error(
      "NMVTIS Reporter not initialized. Call initializeNMVTIS first.",
    );
  }
  return nmvtisReporter;
};

// Utility functions for common reporting scenarios
export const reportJunkVehicle = async (vehicleData: {
  vin: string;
  obtainDate: string;
  sellerName: string;
  odometer?: number;
}) => {
  const reporter = getNMVTISReporter();
  return reporter.reportVehicle({
    vin: vehicleData.vin,
    obtainDate: vehicleData.obtainDate,
    obtainedFrom: vehicleData.sellerName,
    disposition: "TBD",
    odometer: vehicleData.odometer,
  });
};

export const reportVehicleSold = async (vehicleData: {
  vin: string;
  obtainDate: string;
  sellerName: string;
  buyerName: string;
}) => {
  const reporter = getNMVTISReporter();
  return reporter.reportVehicle({
    vin: vehicleData.vin,
    obtainDate: vehicleData.obtainDate,
    obtainedFrom: vehicleData.sellerName,
    disposition: "SOLD",
  });
};

export const reportVehicleCrushed = async (vehicleData: {
  vin: string;
  obtainDate: string;
  sellerName: string;
}) => {
  const reporter = getNMVTISReporter();
  return reporter.reportVehicle({
    vin: vehicleData.vin,
    obtainDate: vehicleData.obtainDate,
    obtainedFrom: vehicleData.sellerName,
    disposition: "CRUSH",
  });
};
