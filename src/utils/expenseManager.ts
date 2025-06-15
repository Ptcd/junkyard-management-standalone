import { recordExpenseDeduction } from "./cashTracker";

interface ExpenseReport {
  id: string;
  driverId: string;
  driverName: string;
  yardId: string;
  category: "fuel" | "maintenance" | "supplies" | "equipment" | "other";
  amount: number;
  description: string;
  receiptPhoto: string | null; // base64 image data
  expenseDate: string;
  submittedAt: string;
  status: "approved"; // Always approved now
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  requiresReceipt: boolean;
  maxAmount?: number;
}

// Default expense categories
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: "fuel",
    name: "Fuel & Gas",
    icon: "⛽",
    requiresReceipt: true,
    maxAmount: 200,
  },
  {
    id: "maintenance",
    name: "Vehicle Maintenance",
    icon: "🔧",
    requiresReceipt: true,
  },
  { id: "supplies", name: "Yard Supplies", icon: "📦", requiresReceipt: true },
  {
    id: "equipment",
    name: "Equipment & Tools",
    icon: "🛠️",
    requiresReceipt: true,
  },
  { id: "other", name: "Other Expenses", icon: "📄", requiresReceipt: true },
];

// Submit expense report (now auto-approved and deducted from cash)
export const submitExpenseReport = (
  driverId: string,
  driverName: string,
  yardId: string,
  category: string,
  amount: number,
  description: string,
  receiptPhoto: string | null,
  expenseDate: string,
  notes?: string,
): ExpenseReport => {
  const expense: ExpenseReport = {
    id: `EXP-${Date.now()}`,
    driverId,
    driverName,
    yardId,
    category: category as any,
    amount,
    description,
    receiptPhoto,
    expenseDate,
    submittedAt: new Date().toISOString(),
    status: "approved",
    approvedBy: "System", // Auto-approved
    approvedAt: new Date().toISOString(),
    notes,
  };

  // Save expense to localStorage
  const existingExpenses = JSON.parse(
    localStorage.getItem("expenseReports") || "[]",
  );
  existingExpenses.push(expense);
  localStorage.setItem("expenseReports", JSON.stringify(existingExpenses));

  // Automatically deduct expense from driver's cash balance
  recordExpenseDeduction(
    driverId,
    driverName,
    yardId,
    amount,
    description,
    expense.id,
  );

  return expense;
};

// Get expense reports for a driver
export const getDriverExpenses = (
  driverId: string,
  limit?: number,
): ExpenseReport[] => {
  try {
    const expenses = JSON.parse(localStorage.getItem("expenseReports") || "[]");
    const driverExpenses = expenses
      .filter((expense: ExpenseReport) => expense.driverId === driverId)
      .sort(
        (a: ExpenseReport, b: ExpenseReport) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );

    return limit ? driverExpenses.slice(0, limit) : driverExpenses;
  } catch (error) {
    console.error("Error getting driver expenses:", error);
    return [];
  }
};

// Get all expenses for admin view
export const getAllExpenses = (yardId?: string): ExpenseReport[] => {
  try {
    const expenses = JSON.parse(localStorage.getItem("expenseReports") || "[]");
    return expenses
      .filter((expense: ExpenseReport) =>
        yardId ? expense.yardId === yardId : true,
      )
      .sort(
        (a: ExpenseReport, b: ExpenseReport) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
  } catch (error) {
    console.error("Error getting all expenses:", error);
    return [];
  }
};

// Get expense statistics
export const getExpenseStats = (driverId?: string, yardId?: string) => {
  try {
    const expenses = JSON.parse(localStorage.getItem("expenseReports") || "[]");

    const filteredExpenses = expenses.filter((expense: ExpenseReport) => {
      if (driverId && expense.driverId !== driverId) return false;
      if (yardId && expense.yardId !== yardId) return false;
      return true;
    });

    const totalExpenses = filteredExpenses.reduce(
      (sum: number, expense: ExpenseReport) => sum + expense.amount,
      0,
    );

    const categoryBreakdown = EXPENSE_CATEGORIES.map((category) => ({
      category: category.name,
      amount: filteredExpenses
        .filter((expense: ExpenseReport) => expense.category === category.id)
        .reduce(
          (sum: number, expense: ExpenseReport) => sum + expense.amount,
          0,
        ),
    }));

    return {
      totalExpenses,
      totalCount: filteredExpenses.length,
      categoryBreakdown,
    };
  } catch (error) {
    console.error("Error getting expense stats:", error);
    return {
      totalExpenses: 0,
      totalCount: 0,
      categoryBreakdown: [],
    };
  }
};
