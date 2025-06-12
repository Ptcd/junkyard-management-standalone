import { sendMV2459ViaBevo } from "./brevoEmailService";

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
  driverName: string;
  timestamp: string;
  userId: string;
  yardId: string;
}

interface VehicleSale {
  id: string;
  originalTransactionId: string;
  originalVehicle: VehicleTransaction;
  buyerName: string;
  buyerAddress: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerPhone: string;
  buyerLicenseNumber: string;
  salePrice: string;
  saleDate: string;
  disposition: string;
  notes: string;
  soldBy: string;
  yardId: string;
}

interface YardInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  licenseNumber: string;
}

// Generate MV2459 form HTML content
export const generateMV2459HTML = (saleRecord: VehicleSale, yardInfo: YardInfo): string => {
  const vehicle = saleRecord.originalVehicle;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Wisconsin MV2459 - Junked Vehicle Bill of Sale</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.4;
        }
        .form-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .form-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .form-subtitle {
            font-size: 14px;
            color: #666;
        }
        .section {
            margin-bottom: 20px;
            border: 1px solid #ccc;
            padding: 15px;
        }
        .section-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            background-color: #f5f5f5;
            padding: 5px;
        }
        .field-row {
            display: flex;
            margin-bottom: 8px;
            align-items: center;
        }
        .field-label {
            font-weight: bold;
            margin-right: 10px;
            min-width: 120px;
        }
        .field-value {
            border-bottom: 1px solid #000;
            padding: 2px 5px;
            min-width: 200px;
            display: inline-block;
        }
        .signature-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            border: 1px solid #000;
            width: 250px;
            height: 60px;
            display: flex;
            align-items: end;
            padding: 5px;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="form-header">
        <div class="form-title">STATE OF WISCONSIN</div>
        <div class="form-title">DEPARTMENT OF TRANSPORTATION</div>
        <div class="form-title">JUNKED VEHICLE BILL OF SALE</div>
        <div class="form-subtitle">MV2459 (Rev. 7/2023)</div>
    </div>

    <div class="section">
        <div class="section-title">SELLER INFORMATION (Original Owner)</div>
        <div class="field-row">
            <span class="field-label">Name:</span>
            <span class="field-value">${vehicle.sellerName}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Address:</span>
            <span class="field-value">${vehicle.sellerAddress}</span>
        </div>
        <div class="field-row">
            <span class="field-label">City, State, ZIP:</span>
            <span class="field-value">${vehicle.sellerCity}, ${vehicle.sellerState} ${vehicle.sellerZip}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Phone:</span>
            <span class="field-value">${vehicle.sellerPhone}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">VEHICLE INFORMATION</div>
        <div class="field-row">
            <span class="field-label">Year:</span>
            <span class="field-value">${vehicle.vehicleYear}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Make:</span>
            <span class="field-value">${vehicle.vehicleMake}</span>
        </div>
        <div class="field-row">
            <span class="field-label">VIN:</span>
            <span class="field-value" style="font-family: monospace;">${vehicle.vehicleVIN}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Original Sale Price:</span>
            <span class="field-value">$${vehicle.salePrice}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Original Sale Date:</span>
            <span class="field-value">${new Date(vehicle.saleDate).toLocaleDateString()}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">JUNKYARD/DISMANTLER INFORMATION (Current Seller)</div>
        <div class="field-row">
            <span class="field-label">Business Name:</span>
            <span class="field-value">${yardInfo.name}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Address:</span>
            <span class="field-value">${yardInfo.address}</span>
        </div>
        <div class="field-row">
            <span class="field-label">City, State, ZIP:</span>
            <span class="field-value">${yardInfo.city}, ${yardInfo.state} ${yardInfo.zip}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Phone:</span>
            <span class="field-value">${yardInfo.phone}</span>
        </div>
        <div class="field-row">
            <span class="field-label">License Number:</span>
            <span class="field-value">${yardInfo.licenseNumber}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">BUYER INFORMATION (Current Purchaser)</div>
        <div class="field-row">
            <span class="field-label">Name/Company:</span>
            <span class="field-value">${saleRecord.buyerName}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Address:</span>
            <span class="field-value">${saleRecord.buyerAddress}</span>
        </div>
        <div class="field-row">
            <span class="field-label">City, State, ZIP:</span>
            <span class="field-value">${saleRecord.buyerCity}, ${saleRecord.buyerState} ${saleRecord.buyerZip}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Phone:</span>
            <span class="field-value">${saleRecord.buyerPhone}</span>
        </div>
        <div class="field-row">
            <span class="field-label">License Number:</span>
            <span class="field-value">${saleRecord.buyerLicenseNumber}</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">SALE TRANSACTION</div>
        <div class="field-row">
            <span class="field-label">Sale Price:</span>
            <span class="field-value">$${saleRecord.salePrice}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Sale Date:</span>
            <span class="field-value">${new Date(saleRecord.saleDate).toLocaleDateString()}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Disposition:</span>
            <span class="field-value">${saleRecord.disposition}</span>
        </div>
        <div class="field-row">
            <span class="field-label">Sold By:</span>
            <span class="field-value">${saleRecord.soldBy}</span>
        </div>
        ${saleRecord.notes ? `
        <div class="field-row">
            <span class="field-label">Notes:</span>
            <span class="field-value">${saleRecord.notes}</span>
        </div>
        ` : ''}
    </div>

    <div class="signature-section">
        <div>
            <div style="margin-bottom: 10px;"><strong>Seller Signature:</strong></div>
            <div class="signature-box"></div>
            <div style="margin-top: 5px; font-size: 12px;">Date: _______________</div>
        </div>
        <div>
            <div style="margin-bottom: 10px;"><strong>Buyer Signature:</strong></div>
            <div class="signature-box"></div>
            <div style="margin-top: 5px; font-size: 12px;">Date: _______________</div>
        </div>
    </div>

    <div class="footer">
        <p><strong>IMPORTANT:</strong> This form must be completed for all junked vehicle transactions in Wisconsin.</p>
        <p>Both parties must retain copies of this completed form for their records.</p>
        <p>Generated electronically by ${yardInfo.name} - ${new Date().toLocaleString()}</p>
    </div>

    <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print Form
        </button>
    </div>
</body>
</html>
  `;
};

// Generate simplified email-friendly version
export const generateEmailHTML = (saleRecord: VehicleSale, yardInfo: YardInfo): string => {
  const vehicle = saleRecord.originalVehicle;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Wisconsin MV2459 - Vehicle Sale Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .section { background: #f5f5f5; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .field { margin: 5px 0; }
        .label { font-weight: bold; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Wisconsin MV2459 - Junked Vehicle Bill of Sale</h2>
            <p>Vehicle Purchase Documentation</p>
        </div>

        <div class="section">
            <h3>Vehicle Information</h3>
            <div class="field"><span class="label">VIN:</span> ${vehicle.vehicleVIN}</div>
            <div class="field"><span class="label">Year:</span> ${vehicle.vehicleYear}</div>
            <div class="field"><span class="label">Make:</span> ${vehicle.vehicleMake}</div>
            <div class="field"><span class="label">Sale Price:</span> $${saleRecord.salePrice}</div>
            <div class="field"><span class="label">Sale Date:</span> ${new Date(saleRecord.saleDate).toLocaleDateString()}</div>
        </div>

        <div class="section">
            <h3>Seller (${yardInfo.name})</h3>
            <div class="field">${yardInfo.address}</div>
            <div class="field">${yardInfo.city}, ${yardInfo.state} ${yardInfo.zip}</div>
            <div class="field">Phone: ${yardInfo.phone}</div>
            <div class="field">License: ${yardInfo.licenseNumber}</div>
        </div>

        <div class="section">
            <h3>Buyer Information</h3>
            <div class="field"><span class="label">Name:</span> ${saleRecord.buyerName}</div>
            <div class="field"><span class="label">Address:</span> ${saleRecord.buyerAddress}</div>
            <div class="field"><span class="label">City:</span> ${saleRecord.buyerCity}, ${saleRecord.buyerState} ${saleRecord.buyerZip}</div>
            <div class="field"><span class="label">Phone:</span> ${saleRecord.buyerPhone}</div>
        </div>

        <div class="footer">
            <p><strong>Next Steps:</strong></p>
            <p>1. Complete physical vehicle inspection</p>
            <p>2. Arrange payment and pickup</p>
            <p>3. Complete and sign MV2459 form at time of transaction</p>
            <p><em>Generated by ${yardInfo.name} on ${new Date().toLocaleString()}</em></p>
        </div>
    </div>
</body>
</html>
  `;
};

// Replace the mock email sender with Brevo integration
export const sendMV2459Email = async (
  saleRecord: VehicleSale, 
  yardInfo: YardInfo, 
  recipientEmail: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Use the new Brevo email service
    return await sendMV2459ViaBevo(saleRecord, yardInfo, recipientEmail);
  } catch (error) {
    console.error('Failed to send MV2459 email via Brevo:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send MV2459 email'
    };
  }
};

// Download MV2459 as PDF-ready HTML
export const downloadMV2459 = (saleRecord: VehicleSale, yardInfo: YardInfo) => {
  const htmlContent = generateMV2459HTML(saleRecord, yardInfo);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `MV2459_${saleRecord.originalVehicle.vehicleVIN}_${saleRecord.saleDate}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}; 