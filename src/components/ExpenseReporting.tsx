import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Avatar,
} from "@mui/material";
import {
  Receipt,
  PhotoCamera,
  AttachMoney,
  CheckCircle,
  Visibility,
} from "@mui/icons-material";
import {
  submitExpenseReport,
  getDriverExpenses,
  getExpenseStats,
  EXPENSE_CATEGORIES,
} from "../utils/expenseManager";
import { getDriverCashBalance } from "../utils/cashTracker";

interface User {
  id: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
}

interface ExpenseReportingProps {
  user: User;
}

const ExpenseReporting: React.FC<ExpenseReportingProps> = ({ user }) => {
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    notes: "",
  });
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseStats, setExpenseStats] = useState<any>({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cashBalance, setCashBalance] = useState(0);

  useEffect(() => {
    loadExpenses();
    // Only load cash balance for drivers, not admins
    if (user.role === "driver") {
      const balance = getDriverCashBalance(user.id);
      setCashBalance(balance);
    }
  }, [user.id, user.role]);

  const loadExpenses = () => {
    const driverExpenses = getDriverExpenses(user.id);
    const stats = getExpenseStats(user.id, user.yardId);
    setExpenses(driverExpenses);
    setExpenseStats(stats);
  };

  const handleInputChange =
    (field: string) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any,
    ) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleReceiptPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Receipt photo must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.category || !formData.amount || !formData.description) {
      setError("Please fill in all required fields");
      return;
    }

    const expenseAmount = parseFloat(formData.amount);

    // Check if driver has sufficient cash
    if (cashBalance < expenseAmount) {
      setError(
        `Insufficient cash! You have $${cashBalance.toFixed(2)} but expense is $${expenseAmount.toFixed(2)}`,
      );
      return;
    }

    const selectedCategory = EXPENSE_CATEGORIES.find(
      (cat) => cat.id === formData.category,
    );

    // Check max amount if specified
    if (
      selectedCategory?.maxAmount &&
      expenseAmount > selectedCategory.maxAmount
    ) {
      setError(
        `Maximum amount for ${selectedCategory.name} is $${selectedCategory.maxAmount}`,
      );
      return;
    }

    // Check if receipt is required
    if (selectedCategory?.requiresReceipt && !receiptPhoto) {
      setError("Receipt photo is required for this expense category");
      return;
    }

    try {
      submitExpenseReport(
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.yardId,
        formData.category,
        expenseAmount,
        formData.description,
        receiptPhoto,
        new Date().toISOString().split("T")[0],
        formData.notes,
      );

      setSuccess(
        `Expense approved! $${expenseAmount.toFixed(2)} deducted from your cash drawer.`,
      );

      // Reset form
      setFormData({
        category: "",
        amount: "",
        description: "",
        notes: "",
      });
      setReceiptPhoto(null);

      // Reload data and cash balance
      loadExpenses();
      if (user.role === "driver") {
        const balance = getDriverCashBalance(user.id);
        setCashBalance(balance);
      }
    } catch (err) {
      setError("Failed to submit expense report");
    }

    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 5000);
  };

  // Admin users should see a different view
  if (user.role === "admin") {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Expense Reporting
        </Typography>
        <Typography variant="subtitle1" gutterBottom color="text.secondary">
          Admin view - Use the Accounting Dashboard to review driver expenses
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          As an admin, you don't have a cash drawer and cannot submit expenses.
          Use the Accounting Dashboard to view and manage all driver expenses.
        </Alert>

        {/* Show overall expense statistics for all drivers */}
        <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
          <Card sx={{ minWidth: 200 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Receipt color="primary" />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    All Driver Expenses
                  </Typography>
                  <Typography variant="h5">
                    ${expenseStats.totalExpenses?.toFixed(2) || "0.00"}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CheckCircle color="success" />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Reports
                  </Typography>
                  <Typography variant="h5">
                    {expenseStats.totalCount || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        {/* Recent expense reports from all drivers */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Expense Reports (All Drivers)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Receipt</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {new Date(expense.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{expense.driverName}</TableCell>
                    <TableCell>
                      <Chip label={expense.category} size="small" />
                    </TableCell>
                    <TableCell>${expense.amount.toFixed(2)}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      <Chip label="APPROVED" color="success" size="small" />
                    </TableCell>
                    <TableCell>
                      {expense.receiptPhoto && (
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => {
                            setSelectedPhoto(expense.receiptPhoto);
                            setShowPhotoDialog(true);
                          }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Photo dialog */}
        <Dialog
          open={showPhotoDialog}
          onClose={() => setShowPhotoDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Receipt Photo</DialogTitle>
          <DialogContent>
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="Receipt"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "70vh",
                  objectFit: "contain",
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPhotoDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Expense Reporting
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Submit expense reports with receipt photos - amounts are automatically
        deducted from your cash drawer
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Expense Statistics */}
      <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <AttachMoney color={cashBalance >= 0 ? "primary" : "error"} />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Cash on Hand
                </Typography>
                <Typography
                  variant="h5"
                  color={cashBalance >= 0 ? "text.primary" : "error.main"}
                >
                  ${cashBalance.toFixed(2)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Receipt color="primary" />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Expenses
                </Typography>
                <Typography variant="h5">
                  ${expenseStats.totalExpenses?.toFixed(2) || "0.00"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Receipt color="info" />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Reports
                </Typography>
                <Typography variant="h5">
                  {expenseStats.totalCount || 0}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <CheckCircle color="success" />
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  This Month
                </Typography>
                <Typography variant="h5">
                  $
                  {expenses
                    .filter(
                      (e) =>
                        new Date(e.expenseDate).getMonth() ===
                        new Date().getMonth(),
                    )
                    .reduce((sum, e) => sum + e.amount, 0)
                    .toFixed(2)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Expense Submission Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Submit New Expense
        </Typography>

        {cashBalance < 100 && cashBalance > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Low cash warning: You only have ${cashBalance.toFixed(2)} remaining
            in your cash drawer.
          </Alert>
        )}

        {cashBalance <= 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No cash available: You have ${cashBalance.toFixed(2)} in your cash
            drawer. Contact admin for cash deposit.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Expense Category *</InputLabel>
              <Select
                value={formData.category}
                onChange={handleInputChange("category")}
                required
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                      {category.maxAmount && (
                        <Typography variant="caption" color="text.secondary">
                          (max ${category.maxAmount})
                        </Typography>
                      )}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Amount *"
                value={formData.amount}
                onChange={handleInputChange("amount")}
                type="number"
                inputProps={{ step: 0.01 }}
                InputProps={{ startAdornment: "$" }}
                required
                sx={{ flex: 1 }}
              />
              <TextField
                label="Expense Date"
                value={new Date().toISOString().split("T")[0]}
                onChange={handleInputChange("expenseDate")}
                type="date"
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Stack>

            <TextField
              fullWidth
              label="Description *"
              value={formData.description}
              onChange={handleInputChange("description")}
              multiline
              rows={2}
              required
              helperText="Describe what this expense was for"
            />

            <TextField
              fullWidth
              label="Additional Notes"
              value={formData.notes}
              onChange={handleInputChange("notes")}
              multiline
              rows={2}
            />

            {/* Receipt Photo Upload */}
            <Box>
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptPhoto}
                style={{ display: "none" }}
                id="receipt-photo-upload"
              />
              <label htmlFor="receipt-photo-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoCamera />}
                  fullWidth
                >
                  {receiptPhoto
                    ? "Receipt Photo Uploaded ✓"
                    : "Upload Receipt Photo *"}
                </Button>
              </label>

              {receiptPhoto && (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <img
                    src={receiptPhoto}
                    alt="Receipt preview"
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                    }}
                  />
                </Box>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              startIcon={<Receipt />}
              size="large"
            >
              Submit Expense Report
            </Button>
          </Stack>
        </form>
      </Paper>

      {/* Previous Expenses */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          My Expense Reports ({expenses.length})
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Receipt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No expense reports submitted yet
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <span>
                          {
                            EXPENSE_CATEGORIES.find(
                              (cat) => cat.id === expense.category,
                            )?.icon
                          }
                        </span>
                        <span>
                          {
                            EXPENSE_CATEGORIES.find(
                              (cat) => cat.id === expense.category,
                            )?.name
                          }
                        </span>
                      </Stack>
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>${expense.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label="APPROVED"
                        color="success"
                        size="small"
                        icon={<CheckCircle />}
                      />
                    </TableCell>
                    <TableCell>
                      {expense.receiptPhoto && (
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => {
                            setSelectedPhoto(expense.receiptPhoto);
                            setShowPhotoDialog(true);
                          }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Photo dialog */}
      <Dialog
        open={showPhotoDialog}
        onClose={() => setShowPhotoDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Receipt Photo</DialogTitle>
        <DialogContent>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Receipt"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "70vh",
                objectFit: "contain",
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPhotoDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseReporting;
