interface NMVTISSettings {
  nmvtisId: string;
  nmvtisPin: string;
  entityName: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  businessEmail: string;
}

interface VehicleTransaction {
  id: string;
  sellerName: string;
  sellerAddress: string;
  sellerCity: string;
  sellerState: string;
  sellerZip: string;
  sellerPhone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleVIN: string;
  salePrice: string;
  saleDate: string;
  isImpoundOrLien: boolean;
  driverName: string;
  timestamp: string;
  userId: string;
  yardId: string;
  status: string;
  vehicleDisposition: string;
  purchaserName: string;
}

interface NMVTISRecord {
  referenceId: string;
  nmvtisId: string;
  pin: string;
  reportingEntityName: string;
  isInsuranceEntity: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  vin: string;
  confirmVin: string;
  vehicleMake: string;
  vehicleModelYear: string;
  vehicleModelName: string;
  vehicleStyle: string;
  mileage: string;
  vehicleSalvageObtainDate: string;
  vehicleDisposition: string;
  reasonForDisposition: string;
  vehicleIntendedForExport: string;
  reserved: string;
  insuranceOwnerBusinessName: string;
  insuranceOwnerFirstName: string;
  insuranceOwnerLastName: string;
  insuranceOwnerMI: string;
  insuranceOwnerAddr: string;
  insuranceOwnerCity: string;
  insuranceOwnerState: string;
  insuranceOwnerZip: string;
  vehicleTransferredToCompany: string;
  vehicleTransferredToFirstName: string;
  vehicleTransferredToLastName: string;
  vehicleTransferredToMI: string;
  vehicleObtainedFromCompany: string;
  vehicleObtainedFromFirstName: string;
  vehicleObtainedFromLastName: string;
  vehicleObtainedFromMI: string;
  dismantlerLocation: string;
  dismantlerLicNumber: string;
}

export const convertToNMVTISRecord = (
  transaction: VehicleTransaction,
  settings: NMVTISSettings,
  saleRecord?: any,
): NMVTISRecord => {
  // Parse seller name into first and last name
  const sellerNameParts = transaction.sellerName.trim().split(" ");
  const sellerFirstName = sellerNameParts[0] || "";
  const sellerLastName = sellerNameParts.slice(1).join(" ") || "";

  // Parse buyer name if sale record exists
  let buyerFirstName = "";
  let buyerLastName = "";
  let buyerCompanyName = "";

  if (saleRecord) {
    const buyerNameParts = saleRecord.buyerName.trim().split(" ");
    if (buyerNameParts.length === 1) {
      // Assume it's a company name
      buyerCompanyName = saleRecord.buyerName;
    } else {
      buyerFirstName = buyerNameParts[0] || "";
      buyerLastName = buyerNameParts.slice(1).join(" ") || "";
    }
  }

  return {
    referenceId: "", // User specified to leave blank
    nmvtisId: settings.nmvtisId,
    pin: settings.nmvtisPin,
    reportingEntityName: settings.entityName,
    isInsuranceEntity: "N",
    address: settings.businessAddress,
    city: settings.businessCity,
    state: settings.businessState,
    zip: settings.businessZip,
    phone: settings.businessPhone,
    email: settings.businessEmail,
    vin: transaction.vehicleVIN,
    confirmVin: transaction.vehicleVIN,
    vehicleMake: transaction.vehicleMake,
    vehicleModelYear: transaction.vehicleYear,
    vehicleModelName: "", // Not collected in simplified form
    vehicleStyle: "", // Not collected in simplified form
    mileage: "", // Not collected in simplified form
    vehicleSalvageObtainDate: transaction.saleDate,
    vehicleDisposition: transaction.vehicleDisposition, // Now reflects actual disposition
    reasonForDisposition: saleRecord?.notes || "", // Use sale notes if available
    vehicleIntendedForExport:
      transaction.vehicleDisposition === "EXPORTED" ? "Y" : "N",
    reserved: "",
    insuranceOwnerBusinessName: "",
    insuranceOwnerFirstName: "",
    insuranceOwnerLastName: "",
    insuranceOwnerMI: "",
    insuranceOwnerAddr: "",
    insuranceOwnerCity: "",
    insuranceOwnerState: "",
    insuranceOwnerZip: "",
    vehicleTransferredToCompany: saleRecord
      ? buyerCompanyName || settings.entityName
      : settings.entityName,
    vehicleTransferredToFirstName: saleRecord ? buyerFirstName : "",
    vehicleTransferredToLastName: saleRecord ? buyerLastName : "",
    vehicleTransferredToMI: "",
    vehicleObtainedFromCompany: "",
    vehicleObtainedFromFirstName: sellerFirstName,
    vehicleObtainedFromLastName: sellerLastName,
    vehicleObtainedFromMI: "",
    dismantlerLocation: settings.businessAddress,
    dismantlerLicNumber: saleRecord?.buyerLicenseNumber || "", // Include buyer's license if available
  };
};

export const exportNMVTISCSV = (
  transactions: VehicleTransaction[],
  settings: NMVTISSettings,
): string => {
  const headers = [
    "Reference ID",
    "NMVTIS ID",
    "PIN",
    "REPORTING ENTITY NAME",
    "IS AN INSURANCE ENTITY?",
    "ADDRESS",
    "CITY",
    "ST",
    "ZIP",
    "PHONE",
    "EMAIL",
    "VIN",
    "Confirm VIN",
    "VEHICLE / VESSEL MAKE",
    "VEHICLE MODEL YEAR",
    "VEHICLE MODEL NAME",
    "VEHICLE STYLE",
    "MILEAGE",
    "VEHICLE SALVAGE OBTAIN DATE",
    "VEHICLE DISPOSITION",
    "REASON FOR DISPOSITION",
    "VEHICLE INTENDED FOR EXPORT",
    "Reserved",
    "INSURANCE OWNER BUSINESS NAME",
    "INSURANCE OWNER FIRSTNM",
    "INSURANCE OWNER LASTNM",
    "INSURANCE OWNER MI",
    "INSURANCE OWNER ADDR",
    "INSURANCE OWNER CITY",
    "INSURANCE OWNER STATE",
    "INSURANCE OWNER ZIP",
    "VEHICLE TRANSFERRED TO COMPANY",
    "VEHICLE TRANSFERRED TO FIRSTNM",
    "VEHICLE TRANSFERRED TO LASTNM",
    "VEHICLE TRANSFERRED TO MI",
    "VEHICLE OBTAINED FROM COMPANY",
    "VEHICLE OBTAINED FROM FIRSTNM",
    "VEHICLE OBTAINED FROM LASTNM",
    "VEHICLE OBTAINED FROM MI",
    "DISMANTLER LOCATION",
    "DISMANTLER LIC NUMBER",
  ];

  // Load sale records to match with transactions
  const saleRecords = JSON.parse(localStorage.getItem("vehicleSales") || "[]");

  const records = transactions
    .filter((t) => !t.isImpoundOrLien) // Only include non-impound/lien transactions
    .map((transaction) => {
      // Find matching sale record for this transaction
      const matchingSale = saleRecords.find(
        (sale: any) => sale.originalTransactionId === transaction.id,
      );

      return convertToNMVTISRecord(transaction, settings, matchingSale);
    });

  const csvRows = [
    headers.join(","),
    ...records.map((record) =>
      [
        record.referenceId,
        record.nmvtisId,
        record.pin,
        `"${record.reportingEntityName}"`,
        record.isInsuranceEntity,
        `"${record.address}"`,
        `"${record.city}"`,
        record.state,
        record.zip,
        record.phone,
        record.email,
        record.vin,
        record.confirmVin,
        `"${record.vehicleMake}"`,
        record.vehicleModelYear,
        `"${record.vehicleModelName}"`,
        `"${record.vehicleStyle}"`,
        record.mileage,
        record.vehicleSalvageObtainDate,
        record.vehicleDisposition,
        `"${record.reasonForDisposition}"`,
        record.vehicleIntendedForExport,
        record.reserved,
        `"${record.insuranceOwnerBusinessName}"`,
        `"${record.insuranceOwnerFirstName}"`,
        `"${record.insuranceOwnerLastName}"`,
        record.insuranceOwnerMI,
        `"${record.insuranceOwnerAddr}"`,
        `"${record.insuranceOwnerCity}"`,
        record.insuranceOwnerState,
        record.insuranceOwnerZip,
        `"${record.vehicleTransferredToCompany}"`,
        `"${record.vehicleTransferredToFirstName}"`,
        `"${record.vehicleTransferredToLastName}"`,
        record.vehicleTransferredToMI,
        `"${record.vehicleObtainedFromCompany}"`,
        `"${record.vehicleObtainedFromFirstName}"`,
        `"${record.vehicleObtainedFromLastName}"`,
        record.vehicleObtainedFromMI,
        `"${record.dismantlerLocation}"`,
        record.dismantlerLicNumber,
      ].join(","),
    ),
  ];

  return csvRows.join("\n");
};

export const downloadCSV = (
  csvContent: string,
  filename: string = "nmvtis-report.csv",
) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
