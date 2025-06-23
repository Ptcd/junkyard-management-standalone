import { supabase } from "./supabaseAuth";

interface DriverCashRecord {
  driverId: string;
  driverName: string;
  yardId: string;
  currentCash: number;
  lastUpdated: string;
}

interface CashTransaction {
  id: string;
  driverId: string;
  driverName: string;
  yardId: string;
  type: "buy" | "sell" | "adjustment" | "deposit" | "withdrawal";
  amount: number; // Positive for money in, negative for money out
  balance: number; // Running balance after transaction
  relatedTransactionId?: string; // Link to vehicle transaction
  relatedVehicleVIN?: string;
  description: string;
  timestamp: string;
  recordedBy: string;
}

// Get driver's current cash balance
export const getDriverCashBalance = (driverId: string): number => {
  try {
    // Check if this is an admin user - admins don't have cash balances
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u: any) => u.id === driverId);
    if (user && user.role === "admin") {
      return 0; // Admins don't have cash drawers
    }

    const cashRecords = JSON.parse(
      localStorage.getItem("driverCashRecords") || "[]",
    );
    const driverRecord = cashRecords.find(
      (record: DriverCashRecord) => record.driverId === driverId,
    );
    return driverRecord ? driverRecord.currentCash : 0;
  } catch (error) {
    console.error("Error getting driver cash balance:", error);
    return 0;
  }
};

// Update driver's cash balance
export const updateDriverCash = (
  driverId: string,
  driverName: string,
  yardId: string,
  amount: number,
  type: "buy" | "sell" | "adjustment" | "deposit" | "withdrawal",
  description: string,
  relatedTransactionId?: string,
  relatedVehicleVIN?: string,
  recordedBy?: string,
): CashTransaction => {
  try {
    // Get current records
    const cashRecords = JSON.parse(
      localStorage.getItem("driverCashRecords") || "[]",
    );
    const cashTransactions = JSON.parse(
      localStorage.getItem("cashTransactions") || "[]",
    );

    // Find or create driver record
    let driverRecord = cashRecords.find(
      (record: DriverCashRecord) => record.driverId === driverId,
    );

    if (!driverRecord) {
      driverRecord = {
        driverId,
        driverName,
        yardId,
        currentCash: 0,
        lastUpdated: new Date().toISOString(),
      };
      cashRecords.push(driverRecord);
    }

    // Calculate new balance
    const previousBalance = driverRecord.currentCash;
    const newBalance = previousBalance + amount;

    // Create cash transaction record
    const cashTransaction: CashTransaction = {
      id: `CASH-${Date.now()}`,
      driverId,
      driverName,
      yardId,
      type,
      amount,
      balance: newBalance,
      relatedTransactionId,
      relatedVehicleVIN,
      description,
      timestamp: new Date().toISOString(),
      recordedBy: recordedBy || driverName,
    };

    // Update driver record
    driverRecord.currentCash = newBalance;
    driverRecord.lastUpdated = new Date().toISOString();

    // Save records
    const updatedCashRecords = cashRecords.map((record: DriverCashRecord) =>
      record.driverId === driverId ? driverRecord : record,
    );

    if (
      !cashRecords.find(
        (record: DriverCashRecord) => record.driverId === driverId,
      )
    ) {
      updatedCashRecords.push(driverRecord);
    }

    cashTransactions.push(cashTransaction);

    localStorage.setItem(
      "driverCashRecords",
      JSON.stringify(updatedCashRecords),
    );
    localStorage.setItem("cashTransactions", JSON.stringify(cashTransactions));

    return cashTransaction;
  } catch (error) {
    console.error("Error updating driver cash:", error);
    throw error;
  }
};

// Record vehicle purchase cash out
export const recordVehiclePurchase = (
  driverId: string,
  driverName: string,
  yardId: string,
  purchaseAmount: number,
  vehicleVIN: string,
  transactionId: string,
): CashTransaction => {
  const description = `Vehicle purchase - VIN: ${vehicleVIN}`;
  return updateDriverCash(
    driverId,
    driverName,
    yardId,
    -purchaseAmount, // Negative amount for cash out
    "buy",
    description,
    transactionId,
    vehicleVIN,
    driverName,
  );
};

// Record vehicle sale cash in (actual amount)
export const recordVehicleSale = (
  driverId: string,
  driverName: string,
  yardId: string,
  actualAmount: number,
  vehicleVIN: string,
  saleId: string,
): CashTransaction => {
  const description = `Vehicle sale - VIN: ${vehicleVIN}`;
  return updateDriverCash(
    driverId,
    driverName,
    yardId,
    actualAmount, // Positive amount for cash in
    "sell",
    description,
    saleId,
    vehicleVIN,
    driverName,
  );
};

// Update vehicle sale with actual received amount
export const updateVehicleSaleActual = (
  driverId: string,
  driverName: string,
  yardId: string,
  estimatedAmount: number,
  actualAmount: number,
  vehicleVIN: string,
  saleId: string,
): CashTransaction | null => {
  const difference = actualAmount - estimatedAmount;

  if (difference === 0) {
    return null; // No adjustment needed
  }

  const description =
    difference > 0
      ? `Vehicle sale adjustment - VIN: ${vehicleVIN} (received $${difference.toFixed(2)} more than estimated)`
      : `Vehicle sale adjustment - VIN: ${vehicleVIN} (received $${Math.abs(difference).toFixed(2)} less than estimated)`;

  return updateDriverCash(
    driverId,
    driverName,
    yardId,
    difference,
    "adjustment",
    description,
    saleId,
    vehicleVIN,
    driverName,
  );
};

// Get driver's cash transaction history
export const getDriverCashHistory = (
  driverId: string,
  limit?: number,
): CashTransaction[] => {
  try {
    const cashTransactions = JSON.parse(
      localStorage.getItem("cashTransactions") || "[]",
    );
    const driverTransactions = cashTransactions
      .filter(
        (transaction: CashTransaction) => transaction.driverId === driverId,
      )
      .sort(
        (a: CashTransaction, b: CashTransaction) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

    return limit ? driverTransactions.slice(0, limit) : driverTransactions;
  } catch (error) {
    console.error("Error getting driver cash history:", error);
    return [];
  }
};

// Get all drivers' cash records (for admin) - Original localStorage version
export const getAllDriversCash = (yardId?: string): DriverCashRecord[] => {
  try {
    const cashRecords = JSON.parse(
      localStorage.getItem("driverCashRecords") || "[]",
    );
    return yardId
      ? cashRecords.filter(
          (record: DriverCashRecord) => record.yardId === yardId,
        )
      : cashRecords;
  } catch (error) {
    console.error("Error getting all drivers cash:", error);
    return [];
  }
};

// Get all drivers' cash records with Supabase sync (for admin) - New async version
export const getAllDriversCashSync = async (yardId?: string): Promise<DriverCashRecord[]> => {
  try {
    // First try to get from Supabase if available
    if (supabase) {
      const { data, error } = await supabase
        .from("driver_cash_records")
        .select("*")
        .order("last_updated", { ascending: false });
      
      if (!error && data) {
        console.log("Loaded cash records from Supabase:", data.length);
        // Convert Supabase format to expected format
        const formattedRecords = data.map((record: any) => ({
          driverId: record.driver_id || record.driverId,
          driverName: record.driver_name || record.driverName,
          yardId: record.yard_id || record.yardId,
          currentCash: record.current_cash || record.currentCash || 0,
          lastUpdated: record.last_updated || record.lastUpdated,
        }));
        
        // Update localStorage with fresh data
        localStorage.setItem("driverCashRecords", JSON.stringify(formattedRecords));
        
        return yardId
          ? formattedRecords.filter((record: DriverCashRecord) => record.yardId === yardId)
          : formattedRecords;
      } else {
        console.log("Supabase cash records query failed, using localStorage fallback");
      }
    }
    
    // Fallback to localStorage
    const cashRecords = JSON.parse(
      localStorage.getItem("driverCashRecords") || "[]",
    );
    console.log("Using localStorage for cash records:", cashRecords.length);
    return yardId
      ? cashRecords.filter(
          (record: DriverCashRecord) => record.yardId === yardId,
        )
      : cashRecords;
  } catch (error) {
    console.error("Error getting all drivers cash:", error);
    // Final fallback to localStorage on any error
    const cashRecords = JSON.parse(
      localStorage.getItem("driverCashRecords") || "[]",
    );
    return yardId
      ? cashRecords.filter(
          (record: DriverCashRecord) => record.yardId === yardId,
        )
      : cashRecords;
  }
};

// Manual cash adjustment (for admin)
export const adjustDriverCash = (
  driverId: string,
  driverName: string,
  yardId: string,
  amount: number,
  reason: string,
  adjustedBy: string,
): CashTransaction => {
  const description = `Manual adjustment: ${reason}`;
  return updateDriverCash(
    driverId,
    driverName,
    yardId,
    amount,
    "adjustment",
    description,
    undefined,
    undefined,
    adjustedBy,
  );
};

// Cash deposit (adding money to driver's account)
export const recordCashDeposit = (
  driverId: string,
  driverName: string,
  yardId: string,
  amount: number,
  depositedBy: string,
): CashTransaction => {
  const description = `Cash deposit of $${amount.toFixed(2)}`;
  return updateDriverCash(
    driverId,
    driverName,
    yardId,
    amount,
    "deposit",
    description,
    undefined,
    undefined,
    depositedBy,
  );
};

// Cash withdrawal (removing money from driver's account)
export const recordCashWithdrawal = (
  driverId: string,
  driverName: string,
  yardId: string,
  amount: number,
  withdrawnBy: string,
): CashTransaction => {
  const description = `Cash withdrawal of $${amount.toFixed(2)}`;
  return updateDriverCash(
    driverId,
    driverName,
    yardId,
    -amount, // Negative for withdrawal
    "withdrawal",
    description,
    undefined,
    undefined,
    withdrawnBy,
  );
};

// Get cash summary for yard
export const getYardCashSummary = (yardId: string) => {
  try {
    const cashRecords = JSON.parse(
      localStorage.getItem("driverCashRecords") || "[]",
    );
    const yardRecords = cashRecords.filter(
      (record: DriverCashRecord) => record.yardId === yardId,
    );

    const totalCash = yardRecords.reduce(
      (sum: number, record: DriverCashRecord) => sum + record.currentCash,
      0,
    );
    const driverCount = yardRecords.length;
    const averageCash = driverCount > 0 ? totalCash / driverCount : 0;

    return {
      totalCash,
      driverCount,
      averageCash,
      drivers: yardRecords,
    };
  } catch (error) {
    console.error("Error getting yard cash summary:", error);
    return {
      totalCash: 0,
      driverCount: 0,
      averageCash: 0,
      drivers: [],
    };
  }
};

// Record expense deduction from driver's cash
export const recordExpenseDeduction = (
  driverId: string,
  driverName: string,
  yardId: string,
  expenseAmount: number,
  expenseDescription: string,
  expenseId: string,
): CashTransaction => {
  const description = `Expense: ${expenseDescription}`;
  return updateDriverCash(
    driverId,
    driverName,
    yardId,
    -expenseAmount, // Negative amount for cash out
    "withdrawal",
    description,
    expenseId,
    undefined,
    "System",
  );
};

// Set driver cash balance directly (for admin use)
export const setDriverCashBalance = (
  driverId: string,
  driverName: string,
  yardId: string,
  newBalance: number,
  reason: string,
  setBy: string,
): CashTransaction => {
  try {
    // Get current records
    const cashRecords = JSON.parse(
      localStorage.getItem("driverCashRecords") || "[]",
    );
    const cashTransactions = JSON.parse(
      localStorage.getItem("cashTransactions") || "[]",
    );

    // Find or create driver record
    let driverRecord = cashRecords.find(
      (record: DriverCashRecord) => record.driverId === driverId,
    );
    const previousBalance = driverRecord ? driverRecord.currentCash : 0;

    if (!driverRecord) {
      driverRecord = {
        driverId,
        driverName,
        yardId,
        currentCash: newBalance,
        lastUpdated: new Date().toISOString(),
      };
      cashRecords.push(driverRecord);
    } else {
      driverRecord.currentCash = newBalance;
      driverRecord.lastUpdated = new Date().toISOString();
    }

    // Calculate the adjustment amount
    const adjustmentAmount = newBalance - previousBalance;

    // Create cash transaction record
    const cashTransaction: CashTransaction = {
      id: `CASH-${Date.now()}`,
      driverId,
      driverName,
      yardId,
      type: "adjustment",
      amount: adjustmentAmount,
      balance: newBalance,
      description: `Balance set to $${newBalance.toFixed(2)}: ${reason}`,
      timestamp: new Date().toISOString(),
      recordedBy: setBy,
    };

    // Save records
    const updatedCashRecords = cashRecords.map((record: DriverCashRecord) =>
      record.driverId === driverId ? driverRecord : record,
    );

    if (
      !cashRecords.find(
        (record: DriverCashRecord) => record.driverId === driverId,
      )
    ) {
      updatedCashRecords.push(driverRecord);
    }

    cashTransactions.push(cashTransaction);

    localStorage.setItem(
      "driverCashRecords",
      JSON.stringify(updatedCashRecords),
    );
    localStorage.setItem("cashTransactions", JSON.stringify(cashTransactions));

    return cashTransaction;
  } catch (error) {
    console.error("Error setting driver cash balance:", error);
    throw error;
  }
};
