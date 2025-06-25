import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import {
  AttachMoney as MoneyIcon,
  CheckCircle as CheckIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { User } from "../utils/supabaseAuth";
import { recordVehicleSale, getDriverCashBalance } from "../utils/cashTracker";
import { supabase } from "../utils/supabaseAuth";

interface PendingCollectionsProps {
  user: User;
}

interface PendingSale {
  id: string;
  originalVehicle: any;
  buyerName: string;
  salePrice: string;
  saleDate: string;
  disposition: string;
  soldBy: string;
  paymentStatus: string;
  actualReceivedAmount: string;
  timestamp: string;
}

const PendingCollections: React.FC<PendingCollectionsProps> = ({ user }) => {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<PendingSale | null>(null);
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [actualAmount, setActualAmount] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [driverCashBalance, setDriverCashBalance] = useState(0);

  useEffect(() => {
    loadPendingSales();
    // Load driver's cash balance
    const balance = getDriverCashBalance(user.id);
    setDriverCashBalance(balance);
  }, [user.id]);

  const loadPendingSales = async () => {
    try {
      // First try to load from Supabase
      const { data, error } = await supabase
        .from("vehicle_sales")
        .select("*")
        .eq("payment_status", "pending")
        .order("timestamp", { ascending: false });

      let pendingSalesData = [];

      if (error) {
        console.error("Error fetching from Supabase:", error);
        // Fallback to localStorage
        const stored = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
        pendingSalesData = stored.filter((sale: any) => sale.paymentStatus === "pending");
        console.log("Using localStorage fallback for pending sales");
      } else {
        console.log("Loaded pending sales from Supabase:", data?.length || 0);
        // Convert Supabase format to expected format
        pendingSalesData = (data || []).map((sale: any) => ({
          id: sale.id,
          originalVehicle: sale.original_vehicle || sale.originalVehicle,
          buyerName: sale.buyer_name || sale.buyerName,
          salePrice: (sale.sale_price || sale.salePrice || "0").toString(),
          saleDate: sale.sale_date || sale.saleDate,
          disposition: sale.disposition,
          soldBy: sale.sold_by || sale.soldBy,
          paymentStatus: sale.payment_status || sale.paymentStatus,
          actualReceivedAmount: (sale.actual_received_amount || sale.actualReceivedAmount || "0").toString(),
          timestamp: sale.timestamp,
        }));
      }

      // Filter for user's yard if not admin
      if (user.role !== "admin") {
        pendingSalesData = pendingSalesData.filter((sale: any) => 
          sale.originalVehicle?.yardId === user.yardId
        );
      }

      setPendingSales(pendingSalesData);
    } catch (err) {
      console.error("Error loading pending sales:", err);
      setError("Failed to load pending sales. Please try again.");
    }
  };

  const handleCollectPayment = (sale: PendingSale) => {
    setSelectedSale(sale);
    setActualAmount(sale.salePrice); // Default to original sale price
    setShowCollectDialog(true);
  };

  const confirmCollectPayment = async () => {
    if (!selectedSale || !actualAmount) {
      setError("Please enter the actual amount received");
      return;
    }

    try {
      const amountReceived = parseFloat(actualAmount);
      
      // Update sale record in Supabase
      try {
        const { error } = await supabase
          .from("vehicle_sales")
          .update({
            payment_status: "completed",
            actual_received_amount: amountReceived,
            collected_by: `${user.firstName} ${user.lastName}`,
            collected_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedSale.id);

        if (error) {
          console.error("Error updating sale in Supabase:", error);
        } else {
          console.log("Sale updated in Supabase successfully");
        }
      } catch (supabaseError) {
        console.error("Failed to update sale in Supabase:", supabaseError);
      }

      // Also update localStorage
      const existingSales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
      const updatedSales = existingSales.map((sale: any) =>
        sale.id === selectedSale.id
          ? {
              ...sale,
              paymentStatus: "completed",
              actualReceivedAmount: actualAmount,
              collectedBy: `${user.firstName} ${user.lastName}`,
              collectedDate: new Date().toISOString(),
            }
          : sale
      );
      localStorage.setItem("vehicleSales", JSON.stringify(updatedSales));

      // Record cash transaction for the collecting driver
      try {
        recordVehicleSale(
          user.id,
          `${user.firstName} ${user.lastName}`,
          user.yardId,
          amountReceived,
          selectedSale.originalVehicle?.vehicleVIN || "",
          selectedSale.id,
        );

        // Update driver's cash balance display
        const newBalance = getDriverCashBalance(user.id);
        setDriverCashBalance(newBalance);
      } catch (cashError) {
        console.error("Failed to record cash transaction:", cashError);
        setError("Payment recorded but failed to update cash balance");
      }

      setSuccess(`Payment of $${amountReceived} collected successfully! Cash balance updated.`);
      setShowCollectDialog(false);
      setSelectedSale(null);
      setActualAmount("");
      
      // Reload pending sales
      loadPendingSales();

      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 3000);

    } catch (err) {
      console.error("Error collecting payment:", err);
      setError("Failed to record payment collection");
    }
  };

  const totalPendingAmount = pendingSales.reduce(
    (sum, sale) => sum + parseFloat(sale.salePrice || "0"),
    0
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pending Collections
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Vehicles delivered but payments not yet collected
      </Typography>

      {/* Driver Cash Balance */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: "info.light" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            💰 Cash on Hand: <strong>${driverCashBalance.toFixed(2)}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Updated after each collection
          </Typography>
        </Stack>
      </Paper>

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

      {/* Summary Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Pending Vehicles
            </Typography>
            <Typography variant="h4" color="warning.main">
              {pendingSales.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Pending Amount
            </Typography>
            <Typography variant="h4" color="warning.main">
              ${totalPendingAmount.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Pending Sales Table */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vehicles Awaiting Payment Collection
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vehicle</TableCell>
                <TableCell>Buyer</TableCell>
                <TableCell>Sale Price</TableCell>
                <TableCell>Delivered By</TableCell>
                <TableCell>Delivery Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      No pending collections. All payments are up to date!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pendingSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Stack>
                        <Typography variant="body2" fontWeight="bold">
                          {sale.originalVehicle?.vehicleYear} {sale.originalVehicle?.vehicleMake}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          VIN: {sale.originalVehicle?.vehicleVIN}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{sale.buyerName}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        ${parseFloat(sale.salePrice).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>{sale.soldBy}</TableCell>
                    <TableCell>
                      {new Date(sale.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="Payment Pending"
                        color="warning"
                        size="small"
                        icon={<ReceiptIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<MoneyIcon />}
                        onClick={() => handleCollectPayment(sale)}
                      >
                        Collect Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Collect Payment Dialog */}
      <Dialog open={showCollectDialog} onClose={() => setShowCollectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Collect Payment</DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Typography variant="h6">
                {selectedSale.originalVehicle?.vehicleYear} {selectedSale.originalVehicle?.vehicleMake}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Buyer: {selectedSale.buyerName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Original Sale Price: ${parseFloat(selectedSale.salePrice).toFixed(2)}
              </Typography>
              <TextField
                label="Actual Amount Received *"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                type="number"
                fullWidth
                required
                inputProps={{
                  step: "0.01"
                }}
                InputProps={{
                  startAdornment: "$",
                }}
                helperText="Enter the exact amount of cash received"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCollectDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmCollectPayment}
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
            disabled={!actualAmount}
          >
            Record Payment Collection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingCollections; 