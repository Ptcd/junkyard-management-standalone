// Brevo Email Service Integration
// Replace EmailJS with Brevo for sending emails

interface BrevoEmailConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailAttachment {
  content: string; // Base64 encoded content
  name: string;
  type?: string;
}

interface BrevoEmailRequest {
  sender: {
    name: string;
    email: string;
  };
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: EmailAttachment[];
}

// Get Brevo configuration from environment variables
const getBrevoConfig = (): BrevoEmailConfig => {
  const apiKey = process.env.REACT_APP_BREVO_API_KEY || "";
  const senderEmail = process.env.REACT_APP_BREVO_SENDER_EMAIL || "";
  const senderName =
    process.env.REACT_APP_BREVO_SENDER_NAME || "Junkyard Management System";

  if (!apiKey || !senderEmail) {
    throw new Error(
      "Brevo API key and sender email are required. Please check your environment variables.",
    );
  }

  return { apiKey, senderEmail, senderName };
};

// Send email via Brevo API
export const sendBrevoEmail = async (
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
  attachments?: EmailAttachment[],
): Promise<{ success: boolean; message: string; messageId?: string }> => {
  try {
    const config = getBrevoConfig();

    const emailData: BrevoEmailRequest = {
      sender: {
        name: config.senderName,
        email: config.senderEmail,
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName,
        },
      ],
      subject,
      htmlContent,
      textContent,
      attachment: attachments,
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Brevo API error: ${errorData.message || response.statusText}`,
      );
    }

    const result = await response.json();

    // Store email record for tracking
    const emailRecord = {
      id: `BREVO-${Date.now()}`,
      recipientEmail,
      recipientName,
      subject,
      sentAt: new Date().toISOString(),
      status: "sent",
      messageId: result.messageId,
      service: "brevo",
    };

    const existingEmails = JSON.parse(
      localStorage.getItem("sentEmails") || "[]",
    );
    existingEmails.push(emailRecord);
    localStorage.setItem("sentEmails", JSON.stringify(existingEmails));

    return {
      success: true,
      message: `Email sent successfully to ${recipientEmail}`,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("Brevo email error:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to send email via Brevo",
    };
  }
};

// Send MV2459 form via Brevo
export const sendMV2459ViaBevo = async (
  saleRecord: any,
  yardInfo: any,
  recipientEmail: string,
  recipientName?: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const vehicle = saleRecord.originalVehicle;
    const subject = `MV2459 Vehicle Sale Documentation - VIN: ${vehicle.vehicleVIN}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Wisconsin MV2459 - Vehicle Sale Documentation</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: #1976d2; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
        }
        .section { 
            background: #f8f9fa; 
            margin: 10px 0; 
            padding: 20px; 
            border-radius: 5px; 
            border-left: 4px solid #1976d2;
        }
        .field { 
            margin: 8px 0; 
            padding: 5px 0;
        }
        .label { 
            font-weight: bold; 
            color: #1976d2;
        }
        .footer { 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            margin-top: 30px; 
            padding: 20px;
            background: #f1f1f1;
            border-radius: 5px;
        }
        .important {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Wisconsin MV2459 - Junked Vehicle Bill of Sale</h2>
            <p>Official Vehicle Purchase Documentation</p>
        </div>

        <div class="important">
            <strong>Important:</strong> This document serves as your official receipt for the vehicle purchase. 
            Please retain this for your records and any future DMV transactions.
        </div>

        <div class="section">
            <h3>🚗 Vehicle Information</h3>
            <div class="field"><span class="label">VIN:</span> ${vehicle.vehicleVIN}</div>
            <div class="field"><span class="label">Year:</span> ${vehicle.vehicleYear}</div>
            <div class="field"><span class="label">Make:</span> ${vehicle.vehicleMake}</div>
            <div class="field"><span class="label">Sale Price:</span> $${saleRecord.salePrice}</div>
            <div class="field"><span class="label">Sale Date:</span> ${new Date(saleRecord.saleDate).toLocaleDateString()}</div>
            <div class="field"><span class="label">Disposition:</span> ${saleRecord.disposition}</div>
        </div>

        <div class="section">
            <h3>🏢 Seller Information (${yardInfo.name})</h3>
            <div class="field"><span class="label">Business Name:</span> ${yardInfo.name}</div>
            <div class="field"><span class="label">Address:</span> ${yardInfo.address}</div>
            <div class="field"><span class="label">City, State ZIP:</span> ${yardInfo.city}, ${yardInfo.state} ${yardInfo.zip}</div>
            <div class="field"><span class="label">Phone:</span> ${yardInfo.phone}</div>
            <div class="field"><span class="label">Email:</span> ${yardInfo.email}</div>
            <div class="field"><span class="label">License Number:</span> ${yardInfo.licenseNumber}</div>
        </div>

        <div class="section">
            <h3>👤 Buyer Information</h3>
            <div class="field"><span class="label">Name:</span> ${saleRecord.buyerName}</div>
            <div class="field"><span class="label">Address:</span> ${saleRecord.buyerAddress}</div>
            <div class="field"><span class="label">City, State ZIP:</span> ${saleRecord.buyerCity}, ${saleRecord.buyerState} ${saleRecord.buyerZip}</div>
            <div class="field"><span class="label">Phone:</span> ${saleRecord.buyerPhone}</div>
            ${saleRecord.buyerLicenseNumber ? `<div class="field"><span class="label">License Number:</span> ${saleRecord.buyerLicenseNumber}</div>` : ""}
        </div>

        <div class="section">
            <h3>📋 Transaction Details</h3>
            <div class="field"><span class="label">Transaction ID:</span> ${saleRecord.id}</div>
            <div class="field"><span class="label">Sold By:</span> ${saleRecord.soldBy}</div>
            <div class="field"><span class="label">Payment Status:</span> ${saleRecord.paymentStatus}</div>
            <div class="field"><span class="label">Date Processed:</span> ${new Date(saleRecord.timestamp).toLocaleString()}</div>
            ${saleRecord.notes ? `<div class="field"><span class="label">Notes:</span> ${saleRecord.notes}</div>` : ""}
        </div>

        <div class="footer">
            <p><strong>Wisconsin Department of Transportation - MV2459 Compliance</strong></p>
            <p>This document was generated automatically by the Junkyard Management System</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>For questions about this transaction, please contact ${yardInfo.name} at ${yardInfo.phone}</p>
        </div>
    </div>
</body>
</html>`;

    const textContent = `
Wisconsin MV2459 - Vehicle Sale Documentation

Vehicle Information:
- VIN: ${vehicle.vehicleVIN}
- Year: ${vehicle.vehicleYear}
- Make: ${vehicle.vehicleMake}
- Sale Price: $${saleRecord.salePrice}
- Sale Date: ${new Date(saleRecord.saleDate).toLocaleDateString()}

Seller: ${yardInfo.name}
Address: ${yardInfo.address}, ${yardInfo.city}, ${yardInfo.state} ${yardInfo.zip}
Phone: ${yardInfo.phone}

Buyer: ${saleRecord.buyerName}
Address: ${saleRecord.buyerAddress}, ${saleRecord.buyerCity}, ${saleRecord.buyerState} ${saleRecord.buyerZip}

Transaction ID: ${saleRecord.id}
Generated: ${new Date().toLocaleString()}
`;

    return await sendBrevoEmail(
      recipientEmail,
      recipientName || saleRecord.buyerName,
      subject,
      htmlContent,
      textContent,
    );
  } catch (error) {
    console.error("Failed to send MV2459 via Brevo:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to send MV2459 form",
    };
  }
};

// Send backup files via Brevo
export const sendBackupViaBevo = async (
  recipientEmail: string,
  recipientName: string,
  backupData: any,
): Promise<{ success: boolean; message: string }> => {
  try {
    const timestamp = new Date().toISOString().split("T")[0];
    const subject = `Junkyard Management Backup - ${timestamp}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Monthly Junkyard Management Backup</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .section { background: #f8f9fa; margin: 10px 0; padding: 20px; border-radius: 5px; }
        .stats { display: flex; justify-content: space-between; flex-wrap: wrap; }
        .stat-item { background: white; padding: 15px; margin: 5px; border-radius: 5px; text-align: center; flex: 1; min-width: 120px; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📊 Monthly Junkyard Management Backup</h2>
            <p>Automated Data Backup - ${timestamp}</p>
        </div>

        <div class="section">
            <h3>Backup Summary</h3>
            <div class="stats">
                <div class="stat-item">
                    <strong>${backupData.vehicleTransactions?.length || 0}</strong>
                    <br>Vehicle Purchases
                </div>
                <div class="stat-item">
                    <strong>${backupData.vehicleSales?.length || 0}</strong>
                    <br>Vehicle Sales
                </div>
                <div class="stat-item">
                    <strong>${backupData.cashTransactions?.length || 0}</strong>
                    <br>Cash Transactions
                </div>
                <div class="stat-item">
                    <strong>${backupData.users?.length || 0}</strong>
                    <br>Active Users
                </div>
            </div>
        </div>

        <div class="section">
            <h3>📁 Backup Contents</h3>
            <ul>
                <li><strong>Vehicle Transactions:</strong> All vehicle purchase records with seller information</li>
                <li><strong>Vehicle Sales:</strong> All vehicle sales and disposition records</li>
                <li><strong>Cash Tracking:</strong> Driver cash balances and transaction history</li>
                <li><strong>NMVTIS Reports:</strong> Compliance reporting data</li>
                <li><strong>User Management:</strong> User accounts and permissions</li>
                <li><strong>System Settings:</strong> Configuration and preferences</li>
            </ul>
        </div>

        <div class="section">
            <h3>💾 Data Formats</h3>
            <p>Your backup includes data in multiple formats:</p>
            <ul>
                <li><strong>JSON:</strong> Complete data with all fields for system restore</li>
                <li><strong>CSV:</strong> Spreadsheet-compatible format for analysis</li>
                <li><strong>NMVTIS:</strong> State-compliant reporting format</li>
            </ul>
        </div>

        <div class="footer">
            <p><strong>Important:</strong> Store these backup files securely for compliance and disaster recovery.</p>
            <p>This automated backup ensures your junkyard records are safely preserved.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

    // Convert backup data to base64 for attachment
    const jsonAttachment: EmailAttachment = {
      content: btoa(JSON.stringify(backupData, null, 2)),
      name: `junkyard-backup-${timestamp}.json`,
      type: "application/json",
    };

    return await sendBrevoEmail(
      recipientEmail,
      recipientName,
      subject,
      htmlContent,
      undefined,
      [jsonAttachment],
    );
  } catch (error) {
    console.error("Failed to send backup via Brevo:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to send backup email",
    };
  }
};

export default {
  sendBrevoEmail,
  sendMV2459ViaBevo,
  sendBackupViaBevo,
};
