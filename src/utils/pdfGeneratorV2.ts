import jsPDF from 'jspdf';

interface VehiclePurchaseData {
  // Transaction info
  transactionId: string;
  purchaseDate: string;
  purchasePrice: number;
  
  // Vehicle info
  vin: string;
  year: string;
  make: string;
  
  // Seller info
  sellerFirstName: string;
  sellerLastName: string;
  sellerAddress: string;
  sellerCity: string;
  sellerState: string;
  sellerZip: string;
  sellerPhone: string;
  
  // Purchaser info
  purchaserName: string;
  yardName: string;
  yardAddress: string;
  yardCity: string;
  yardState: string;
  yardZip: string;
  yardPhone: string;
  
  // Documents
  signatureDataUrl: string;
  idPhotoDataUrl: string;
}

export const generateMV2459PDF = async (data: VehiclePurchaseData): Promise<Blob> => {
  // NEW FILE - PDF Generator v3.0 - Side-by-side layout
  console.log('🆕 NEW PDF Generator v3.0 - Fresh file with side-by-side layout');
  const pdf = new jsPDF('p', 'mm', 'letter');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Set up fonts and colors
  pdf.setFont('helvetica');
  
  // Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('WISCONSIN JUNKED VEHICLE BILL OF SALE', pageWidth / 2, 20, { align: 'center' });
  pdf.text('(MV2459)', pageWidth / 2, 28, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Wisconsin Department of Transportation', pageWidth / 2, 35, { align: 'center' });
  
  // Transaction ID and Date
  pdf.setFontSize(9);
  pdf.text(`Transaction ID: ${data.transactionId}`, 20, 45);
  pdf.text(`Date: ${new Date(data.purchaseDate).toLocaleDateString()}`, pageWidth - 60, 45);
  
  let yPos = 55;
  
  // Vehicle Information Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('VEHICLE INFORMATION', 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // VIN
  pdf.text('Vehicle Identification Number (VIN):', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.vin, 80, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Year:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.year, 35, yPos);
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Make:', 80, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.make, 95, yPos);
  yPos += 15;
  
  // *** SIDE-BY-SIDE SELLER AND PURCHASER INFORMATION ***
  const leftColumnX = 20;
  const rightColumnX = pageWidth / 2 + 10;
  const startYPos = yPos;
  
  // SELLER INFORMATION (LEFT COLUMN)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SELLER INFORMATION', leftColumnX, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Name:', leftColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.sellerFirstName} ${data.sellerLastName}`, leftColumnX + 15, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Address:', leftColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.sellerAddress, leftColumnX + 20, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('City, State, ZIP:', leftColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.sellerCity}, ${data.sellerState} ${data.sellerZip}`, leftColumnX + 35, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Phone:', leftColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.sellerPhone, leftColumnX + 20, yPos);
  
  // PURCHASER INFORMATION (RIGHT COLUMN)
  let rightYPos = startYPos;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PURCHASER INFORMATION', rightColumnX, rightYPos);
  rightYPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Business Name:', rightColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardName, rightColumnX + 35, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Purchaser:', rightColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.purchaserName, rightColumnX + 25, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Address:', rightColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardAddress, rightColumnX + 20, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('City, State, ZIP:', rightColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.yardCity}, ${data.yardState} ${data.yardZip}`, rightColumnX + 35, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Phone:', rightColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardPhone, rightColumnX + 20, rightYPos);
  
  // Set yPos to the maximum of both columns plus spacing
  yPos = Math.max(yPos, rightYPos) + 15;
  
  // Sale Information
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SALE INFORMATION', 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Purchase Price:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`$${data.purchasePrice.toFixed(2)}`, 55, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Vehicle Disposition:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SCRAP', 65, yPos);
  yPos += 15;
  
  // Legal Text
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const legalText = [
    'I certify that the above vehicle is being sold for scrap/salvage purposes only.',
    'The seller warrants that they have legal title to this vehicle and the right to sell it.',
    'This vehicle will be processed in accordance with Wisconsin salvage laws.',
  ];
  
  legalText.forEach(line => {
    pdf.text(line, 20, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // Signature Section - Now with plenty of space
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SELLER SIGNATURE & ID VERIFICATION', 20, yPos);
  yPos += 15;
  
  // Signature and ID photo layout
  const sigLeftX = 20;
  const sigRightX = pageWidth / 2 + 15;
  
  // Add signature image if available
  if (data.signatureDataUrl) {
    try {
      const signatureWidth = 65;
      const signatureHeight = 25;
      
      pdf.addImage(data.signatureDataUrl, 'PNG', sigLeftX, yPos, signatureWidth, signatureHeight);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Seller Signature', sigLeftX, yPos + signatureHeight + 8);
      pdf.text(`Date: ${new Date(data.purchaseDate).toLocaleDateString()}`, sigLeftX, yPos + signatureHeight + 16);
    } catch (error) {
      console.error('Error adding signature:', error);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Signature: [Digital signature on file]', sigLeftX, yPos);
      pdf.text(`Date: ${new Date(data.purchaseDate).toLocaleDateString()}`, sigLeftX, yPos + 8);
    }
  }
  
  // Add ID photo if available
  if (data.idPhotoDataUrl) {
    try {
      const idWidth = 45;
      const idHeight = 28;
      
      pdf.addImage(data.idPhotoDataUrl, 'JPEG', sigRightX, yPos, idWidth, idHeight);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Driver License Photo', sigRightX, yPos + idHeight + 8);
    } catch (error) {
      console.error('Error adding ID photo:', error);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('ID Photo: [On file]', sigRightX, yPos);
    }
  }
  
  // Footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  const footerY = pageHeight - 15;
  pdf.text('This document was electronically generated and is legally binding.', pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleString()} | Layout v3.0 NEW FILE`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  // Return PDF as blob
  return pdf.output('blob');
};

// Helper function to convert File or Blob to data URL
export const fileToDataURL = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}; 