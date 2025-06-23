import { supabase } from "./supabaseAuth";

interface VehicleSale {
  id: string;
  originalTransactionId: string;
  originalVehicle: any;
  buyerName: string;
  buyerAddress: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerLicenseNumber: string;
  salePrice: number;
  saleDate: string;
  disposition: string;
  notes: string;
  paymentStatus: string;
  actualReceivedAmount: number;
  timestamp: string;
  soldBy: string;
  userId: string;
  yardId: string;
}

// Get vehicle sales with Supabase sync - New async version
export const getVehicleSalesSync = async (yardId?: string): Promise<VehicleSale[]> => {
  try {
    // First try to get from Supabase if available
    if (supabase) {
      let query = supabase
        .from("vehicle_sales")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (yardId) {
        query = query.eq("yard_id", yardId);
      }
      
      const { data, error } = await query;
      
      if (!error && data) {
        console.log("Loaded vehicle sales from Supabase:", data.length);
        // Convert Supabase format to expected format
        const formattedSales = data.map((sale: any) => ({
          id: sale.id,
          originalTransactionId: sale.original_transaction_id || sale.originalTransactionId,
          originalVehicle: sale.original_vehicle || sale.originalVehicle,
          buyerName: sale.buyer_name || sale.buyerName,
          buyerAddress: sale.buyer_address || sale.buyerAddress,
          buyerCity: sale.buyer_city || sale.buyerCity,
          buyerState: sale.buyer_state || sale.buyerState,
          buyerZip: sale.buyer_zip || sale.buyerZip,
          buyerPhone: sale.buyer_phone || sale.buyerPhone,
          buyerEmail: sale.buyer_email || sale.buyerEmail,
          buyerLicenseNumber: sale.buyer_license_number || sale.buyerLicenseNumber,
          salePrice: sale.sale_price || sale.salePrice,
          saleDate: sale.sale_date || sale.saleDate,
          disposition: sale.disposition,
          notes: sale.notes,
          paymentStatus: sale.payment_status || sale.paymentStatus,
          actualReceivedAmount: sale.actual_received_amount || sale.actualReceivedAmount,
          timestamp: sale.timestamp,
          soldBy: sale.sold_by || sale.soldBy,
          userId: sale.user_id || sale.userId,
          yardId: sale.yard_id || sale.yardId,
        }));
        
        // Update localStorage with fresh data
        localStorage.setItem("vehicleSales", JSON.stringify(formattedSales));
        
        return yardId 
          ? formattedSales.filter((sale: VehicleSale) => sale.yardId === yardId)
          : formattedSales;
      } else {
        console.log("Supabase vehicle sales query failed, using localStorage fallback");
      }
    }
    
    // Fallback to localStorage
    const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
    console.log("Using localStorage for vehicle sales:", sales.length);
    return yardId 
      ? sales.filter((sale: VehicleSale) => sale.yardId === yardId)
      : sales;
  } catch (error) {
    console.error("Error getting vehicle sales:", error);
    // Final fallback to localStorage on any error
    const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
    return yardId 
      ? sales.filter((sale: VehicleSale) => sale.yardId === yardId)
      : sales;
  }
};

// Get vehicle sales (original localStorage version for backward compatibility)
export const getVehicleSales = (yardId?: string): VehicleSale[] => {
  const sales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
  return yardId 
    ? sales.filter((sale: VehicleSale) => sale.yardId === yardId)
    : sales;
}; 