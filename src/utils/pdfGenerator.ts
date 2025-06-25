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
  // Force rebuild - Updated layout with side-by-side seller/purchaser info
  // PDF Layout Version: 2.0 - Side-by-side seller/purchaser layout
  console.log('🔄 PDF Generator v2.0 - Side-by-side layout active');
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
  
  // Seller and Purchaser Information Side by Side
  const sellerColumnX = 20;
  const purchaserColumnX = pageWidth / 2 + 10;
  const startYPos = yPos;
  
  // Seller Information Section (Left Column)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SELLER INFORMATION', sellerColumnX, yPos);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Name:', sellerColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.sellerFirstName} ${data.sellerLastName}`, sellerColumnX + 15, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Address:', sellerColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.sellerAddress, sellerColumnX + 20, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('City, State, ZIP:', sellerColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.sellerCity}, ${data.sellerState} ${data.sellerZip}`, sellerColumnX + 35, yPos);
  yPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Phone:', sellerColumnX, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.sellerPhone, sellerColumnX + 20, yPos);
  
  // Purchaser Information Section (Right Column)
  let rightYPos = startYPos;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PURCHASER INFORMATION', purchaserColumnX, rightYPos);
  rightYPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Business Name:', purchaserColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardName, purchaserColumnX + 35, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Purchaser:', purchaserColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.purchaserName, purchaserColumnX + 25, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Address:', purchaserColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardAddress, purchaserColumnX + 20, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('City, State, ZIP:', purchaserColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.yardCity}, ${data.yardState} ${data.yardZip}`, purchaserColumnX + 35, rightYPos);
  rightYPos += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.text('Phone:', purchaserColumnX, rightYPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.yardPhone, purchaserColumnX + 20, rightYPos);
  
  // Set yPos to the maximum of both columns plus some spacing
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
  
  // Signature Section - Now with plenty of space from side-by-side layout above
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SELLER SIGNATURE & ID VERIFICATION', 20, yPos);
  yPos += 15;
  
  // Create a two-column layout for signature and ID photo
  const leftColumnX = 20;
  const rightColumnX = pageWidth / 2 + 15;
  const maxImageWidth = (pageWidth / 2) - 50;
  
  // Add signature image if available (left column)
  if (data.signatureDataUrl) {
    try {
      const signatureWidth = Math.min(maxImageWidth, 65);
      const signatureHeight = 25;
      
      pdf.addImage(data.signatureDataUrl, 'PNG', leftColumnX, yPos, signatureWidth, signatureHeight);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Seller Signature', leftColumnX, yPos + signatureHeight + 8);
      pdf.text(`Date: ${new Date(data.purchaseDate).toLocaleDateString()}`, leftColumnX, yPos + signatureHeight + 16);
    } catch (error) {
      console.error('Error adding signature:', error);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Signature: [Digital signature on file]', leftColumnX, yPos);
      pdf.text(`Date: ${new Date(data.purchaseDate).toLocaleDateString()}`, leftColumnX, yPos + 8);
    }
  }
  
  // Add ID photo if available (right column)
  if (data.idPhotoDataUrl) {
    try {
      const idWidth = Math.min(maxImageWidth, 45);
      const idHeight = 28;
      
      const idPhotoX = Math.min(rightColumnX, pageWidth - idWidth - 25);
      
      pdf.addImage(data.idPhotoDataUrl, 'JPEG', idPhotoX, yPos, idWidth, idHeight);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Driver License Photo', idPhotoX, yPos + idHeight + 8);
    } catch (error) {
      console.error('Error adding ID photo:', error);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('ID Photo: [On file]', rightColumnX, yPos);
    }
  }
  
  // Footer - ensure it's at the bottom of the page with proper margin
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  const footerY = pageHeight - 15; // Moved footer up slightly for better visibility
  pdf.text('This document was electronically generated and is legally binding.', pageWidth / 2, footerY, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleString()} | Layout v2.0`, pageWidth / 2, footerY + 5, { align: 'center' });
  
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