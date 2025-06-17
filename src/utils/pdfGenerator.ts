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
  
  // Seller Information Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SELLER INFORMATION', 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Name:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.sellerFirstName} ${data.sellerLastName}`, 35, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Address:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.sellerAddress, 40, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('City, State, ZIP:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.sellerCity}, ${data.sellerState} ${data.sellerZip}`, 55, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Phone:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.sellerPhone, 40, yPos);
  yPos += 15;
  
  // Purchaser Information Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PURCHASER INFORMATION', 20, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Business Name:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardName, 55, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Purchaser:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.purchaserName, 45, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Address:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardAddress, 40, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('City, State, ZIP:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.yardCity}, ${data.yardState} ${data.yardZip}`, 55, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Phone:', 20, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardPhone, 40, yPos);
  yPos += 15;
  
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
  
  // Signature Section
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SELLER SIGNATURE & ID VERIFICATION', 20, yPos);
  yPos += 10;
  
  // Add signature image if available
  if (data.signatureDataUrl) {
    try {
      pdf.addImage(data.signatureDataUrl, 'PNG', 20, yPos, 60, 20);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Seller Signature', 20, yPos + 25);
      pdf.text(`Date: ${new Date(data.purchaseDate).toLocaleDateString()}`, 20, yPos + 30);
    } catch (error) {
      console.error('Error adding signature:', error);
      pdf.setFontSize(9);
      pdf.text('Signature: [Digital signature on file]', 20, yPos);
      yPos += 10;
    }
  }
  
  // Add ID photo if available
  if (data.idPhotoDataUrl) {
    try {
      pdf.addImage(data.idPhotoDataUrl, 'JPEG', 120, yPos, 40, 25);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Driver License Photo', 120, yPos + 30);
    } catch (error) {
      console.error('Error adding ID photo:', error);
      pdf.setFontSize(9);
      pdf.text('ID Photo: [On file]', 120, yPos);
    }
  }
  
  // Footer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  const footerY = pageHeight - 20;
  pdf.text('This document was electronically generated and is legally binding.', pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 5, { align: 'center' });
  
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