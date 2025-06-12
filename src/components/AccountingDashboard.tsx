import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  PendingActions,
  AttachMoney,
  Receipt,
  Edit,
  Email,
} from "@mui/icons-material";
import {
  getAllDriversCash,
  getDriverCashHistory,
  adjustDriverCash,
  recordCashDeposit,
  recordCashWithdrawal,
  getYardCashSummary,
  setDriverCashBalance,
} from "../utils/cashTracker";
import {
  getAllExpenses,
  getExpenseStats,
  EXPENSE_CATEGORIES,
} from "../utils/expenseManager";
import { sendMV2459Email, downloadMV2459 } from "../utils/mv2459Generator";

interface User {
  id: string;
  username: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
}

interface AccountingDashboardProps {
  user: User;
}

const AccountingDashboard: React.FC<AccountingDashboardProps> = ({ user }) => {
  const [tabValue, setTabValue] = useState(0);
  const [driverCashRecords, setDriverCashRecords] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [expenseStats, setExpenseStats] = useState<any>({});
  const [cashSummary, setCashSummary] = useState<any>({});
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashAdjustment, setCashAdjustment] = useState({
    amount: "",
    reason: "",
    type: "adjustment" as "adjustment" | "deposit" | "withdrawal" | "setBalance",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, [user.yardId]);

  const loadData = () => {
    // Load driver cash records
    const cashRecords = getAllDriversCash(user.role === "admin" ? undefined : user.yardId);
    setDriverCashRecords(cashRecords);

    // Load expense data
    const expenses = getAllExpenses(user.role === "admin" ? undefined : user.yardId);
    const stats = getExpenseStats(undefined, user.role === "admin" ? undefined : user.yardId);
    
    setAllExpenses(expenses);
    setExpenseStats(stats);

    // Load cash summary
    const summary = getYardCashSummary(user.yardId);
    setCashSummary(summary);
  };

  const handleCashAdjustment = () => {
    if (!selectedDriver || !cashAdjustment.amount || !cashAdjustment.reason) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const amount = parseFloat(cashAdjustment.amount);
      
      if (cashAdjustment.type === "setBalance") {
        setDriverCashBalance(
          selectedDriver.driverId,
          selectedDriver.driverName,
          selectedDriver.yardId,
          amount,
          cashAdjustment.reason,
          `${user.firstName} ${user.lastName}`
        );
      } else if (cashAdjustment.type === "adjustment") {
        adjustDriverCash(
          selectedDriver.driverId,
          selectedDriver.driverName,
          selectedDriver.yardId,
          amount,
          cashAdjustment.reason,
          `${user.firstName} ${user.lastName}`
        );
      } else if (cashAdjustment.type === "deposit") {
        recordCashDeposit(
          selectedDriver.driverId,
          selectedDriver.driverName,
          selectedDriver.yardId,
          amount,
          `${user.firstName} ${user.lastName}`
        );
      } else if (cashAdjustment.type === "withdrawal") {
        recordCashWithdrawal(
          selectedDriver.driverId,
          selectedDriver.driverName,
          selectedDriver.yardId,
          amount,
          `${user.firstName} ${user.lastName}`
        );
      }

      setSuccess("Cash adjustment recorded successfully");
      setShowCashDialog(false);
      setCashAdjustment({ amount: "", reason: "", type: "adjustment" });
      loadData();
    } catch (error) {
      setError("Failed to record cash adjustment");
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Accounting Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Financial tracking, cash management, and payment processing
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Financial Summary Cards */}
      <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: "wrap" }}>
        <Card sx={{ minWidth: 280 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <AccountBalance color="primary" />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Cash on Hand
                </Typography>
                <Typography variant="h4">
                  ${cashSummary.totalCash?.toFixed(2) || "0.00"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 280 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <TrendingUp color="success" />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Active Drivers
                </Typography>
                <Typography variant="h4">{driverCashRecords.length}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 280 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Receipt color="info" />
              <Box>
                <Typography color="textSecendary" gutterBottom>
                  Average Balance
                </Typography>
                <Typography variant="h4">
                  ${cashSummary.averageCash?.toFixed(2) || "0.00"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Driver Cash Management" />
          <Tab label="Expense Reports" />
          <Tab label="Cash Transaction History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Driver Cash Balances
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Driver</TableCell>
                  <TableCell>Current Balance</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {driverCashRecords.map((driver) => (
                  <TableRow key={driver.driverId}>
                    <TableCell>{driver.driverName}</TableCell>
                    <TableCell>
                      <Chip
                        label={`$${driver.currentCash.toFixed(2)}`}
                        color={driver.currentCash >= 0 ? "success" : "error"}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(driver.lastUpdated).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => {
                          setSelectedDriver(driver);
                          setShowCashDialog(true);
                        }}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            All Expense Reports ({allExpenses.length})
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Receipt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No expense reports submitted yet
                    </TableCell>
                  </TableRow>
                ) : (
                  allExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{expense.driverName}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <span>
                            {EXPENSE_CATEGORIES.find(cat => cat.id === expense.category)?.icon}
                          </span>
                          <span>
                            {EXPENSE_CATEGORIES.find(cat => cat.id === expense.category)?.name}
                          </span>
                        </Stack>
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>${expense.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {expense.receiptPhoto ? (
                          <Button
                            size="small"
                            startIcon={<Receipt />}
                            onClick={() => {
                              window.open(expense.receiptPhoto, '_blank');
                            }}
                          >
                            View
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No receipt
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Cash Transactions
          </Typography>
          {/* Cash transaction history would go here */}
          <Typography variant="body2" color="text.secondary">
            Transaction history coming soon...
          </Typography>
        </Paper>
      )}

      {/* Cash Adjustment Dialog */}
      <Dialog open={showCashDialog} onClose={() => setShowCashDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Driver Cash</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Driver: <strong>{selectedDriver?.driverName}</strong>
              <br />
              Current Balance: <strong>${selectedDriver?.currentCash?.toFixed(2)}</strong>
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={cashAdjustment.type}
                onChange={(e) => setCashAdjustment(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <MenuItem value="setBalance">Set Balance (Direct)</MenuItem>
                <MenuItem value="adjustment">Manual Adjustment</MenuItem>
                <MenuItem value="deposit">Cash Deposit</MenuItem>
                <MenuItem value="withdrawal">Cash Withdrawal</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={cashAdjustment.type === "setBalance" ? "New Balance" : "Amount"}
              value={cashAdjustment.amount}
              onChange={(e) => setCashAdjustment(prev => ({ ...prev, amount: e.target.value }))}
              type="number"
              InputProps={{ startAdornment: "$" }}
              helperText={
                cashAdjustment.type === "setBalance" 
                  ? "Enter the exact amount the driver should have in their cash drawer"
                  : ""
              }
            />

            <TextField
              fullWidth
              label="Reason"
              value={cashAdjustment.reason}
              onChange={(e) => setCashAdjustment(prev => ({ ...prev, reason: e.target.value }))}
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCashDialog(false)}>Cancel</Button>
          <Button onClick={handleCashAdjustment} variant="contained">
            Record Transaction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountingDashboard; 