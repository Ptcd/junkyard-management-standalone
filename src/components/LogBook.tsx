import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  Download,
  FilterList,
  Sync,
  CloudOff,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import { supabase } from "../utils/supabaseAuth";

interface User {
  id: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
}

interface LogBookProps {
  user: User;
}

const LogBook: React.FC<LogBookProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterDisposition, setFilterDisposition] = useState("");
  const [filterVIN, setFilterVIN] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) {
        console.error("Error fetching transactions:", error);
        // Fallback to localStorage if Supabase fetch fails
        const stored = JSON.parse(localStorage.getItem("vehicleTransactions") || "[]");
        const userTransactions = user.role === "admin" 
          ? stored 
          : stored.filter((t: any) => t.userId === user.id);
        console.log("Using localStorage fallback, found:", userTransactions.length, "transactions");
        setTransactions(userTransactions);
        setFilteredTransactions(userTransactions);
        return;
      }

      console.log("Supabase returned:", data?.length || 0, "total transactions");
      console.log("User role:", user.role, "User ID:", user.id);

      // For drivers, only show their transactions; for admins, show all
      const userTransactions =
        user.role === "admin"
          ? data
          : data.filter((t: any) => t.user_id === user.id);

      console.log("After user filtering:", userTransactions.length, "transactions for this user");
      setTransactions(userTransactions);
      setFilteredTransactions(userTransactions);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to fetch transactions. Please try again.");
    }
  };

  // Check for offline data
  useEffect(() => {
    const offlineTransactions = JSON.parse(localStorage.getItem("offlineTransactions") || "[]");
    setHasOfflineData(offlineTransactions.length > 0);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [user.id, user.role]);

  const syncOfflineTransactions = async () => {
    setIsSyncing(true);
    try {
      const offlineTransactions = JSON.parse(localStorage.getItem("offlineTransactions") || "[]");
      if (offlineTransactions.length > 0) {
        // Format transactions for Supabase
        const formattedTransactions = offlineTransactions.map((t: any) => ({
          user_id: t.userId,
          yard_id: t.yardId,
          vin: t.vehicleVIN,
          year: parseInt(t.vehicleYear, 10),
          make: t.vehicleMake,
          seller_first_name: t.sellerFirstName,
          seller_last_name: t.sellerLastName,
          seller_address: t.sellerAddress,
          purchase_price: parseFloat(t.salePrice),
          seller_phone: t.sellerPhone || "",
          seller_id_type: "Driver's License",
          seller_id_number: "",
          purchase_date: t.saleDate,
          odometer: 0,
          condition: "Used",
          purchase_method: "Cash",
          title_number: "",
          title_state: "",
          notes: "",
          bill_of_sale_pdf_url: t.documentUrls?.[0] || null,
          photos: []
        }));

        const { data, error: syncError } = await supabase
          .from("vehicle_transactions")
          .insert(formattedTransactions)
          .select();
        
        if (syncError) {
          console.error("Failed to sync offline transactions:", syncError);
          setError("Failed to sync offline transactions. Please try again.");
          return;
        }

        if (!data || data.length === 0) {
          throw new Error("No data returned from sync");
        }

        // Update local storage with Supabase IDs
        const localTransactions = JSON.parse(localStorage.getItem("vehicleTransactions") || "[]");
        const updatedTransactions = localTransactions.map((t: any) => {
          const syncedTransaction = data.find((d: any) => d.vin === t.vehicleVIN);
          return syncedTransaction ? { ...t, id: syncedTransaction.id } : t;
        });

        localStorage.setItem("vehicleTransactions", JSON.stringify(updatedTransactions));
        localStorage.removeItem("offlineTransactions");
        setHasOfflineData(false);
        
        // Refresh transactions
        fetchTransactions();
      }
    } catch (syncError) {
      console.error("Failed to sync offline transactions:", syncError);
      setError("Failed to sync offline transactions. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Apply filters
    let filtered = transactions;

    if (filterDate) {
      filtered = filtered.filter(
        (t) => new Date(t.created_at).toISOString().split("T")[0] === filterDate,
      );
    }

    if (filterDisposition) {
      filtered = filtered.filter(
        (t) => (t.disposition || t.vehicleDisposition) === filterDisposition,
      );
    }

    if (filterVIN) {
      filtered = filtered.filter((t) =>
        (t.vin || t.vehicleVIN || "").toLowerCase().includes(filterVIN.toLowerCase()),
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, filterDate, filterDisposition, filterVIN]);

  const exportCSV = () => {
    // Load NMVTIS settings for entity information
    const nmvtisSettings = JSON.parse(localStorage.getItem("nmvtisSettings") || "{}");
    const yardSettings = JSON.parse(localStorage.getItem("yardSettings") || "{}");
    
    const headers = [
      "Reference ID",
      "NMVTIS ID", 
      "PIN",
      "REPORTING ENTITY NAME",
      "IS AN INSURANCE ENTITY?",
      "ADDRESS",
      "CITY",
      "ST",
      "ZIP",
      "PHONE",
      "EMAIL",
      "VIN",
      "Confirm VIN",
      "VEHICLE / VESSEL MAKE",
      "VEHICLE MODEL YEAR",
      "VEHICLE MODEL NAME",
      "VEHICLE STYLE",
      "MILEAGE",
      "VEHICLE SALVAGE OBTAIN DATE",
      "VEHICLE DISPOSITION",
      "REASON FOR DISPOSITION",
      "VEHICLE INTENDED FOR EXPORT",
      "Reserved",
      "INSURANCE OWNER BUSINESS NAME",
      "INSURANCE OWNER FIRSTNM",
      "INSURANCE OWNER LASTNM",
      "INSURANCE OWNER MI",
      "INSURANCE OWNER ADDR",
      "INSURANCE OWNER CITY",
      "INSURANCE OWNER STATE",
      "INSURANCE OWNER ZIP",
      "VEHICLE TRANSFERRED TO COMPANY",
      "VEHICLE TRANSFERRED TO FIRSTNM",
      "VEHICLE TRANSFERRED TO LASTNM",
      "VEHICLE TRANSFERRED TO MI",
      "VEHICLE OBTAINED FROM COMPANY",
      "VEHICLE OBTAINED FROM FIRSTNM",
      "VEHICLE OBTAINED FROM LASTNM",
      "VEHICLE OBTAINED FROM MI",
      "DISMANTLER LOCATION",
      "DISMANTLER LIC NUMBER",
      "DISMANTLER STOCK NUMBER",
      "TITLING JURISDICTION",
      "TITLE NO"
    ];

    const csvData = filteredTransactions.map((t, index) => [
      index + 1, // Reference ID
      nmvtisSettings.nmvtisId || "", // NMVTIS ID
      nmvtisSettings.nmvtisPin || "", // PIN
      nmvtisSettings.entityName || yardSettings.name || "", // REPORTING ENTITY NAME
      "NO", // IS AN INSURANCE ENTITY?
      nmvtisSettings.businessAddress || yardSettings.address || "", // ADDRESS
      nmvtisSettings.businessCity || yardSettings.city || "", // CITY
      nmvtisSettings.businessState || yardSettings.state || "", // ST
      nmvtisSettings.businessZip || yardSettings.zip || "", // ZIP
      // Display phone number exactly as user entered it in settings
      nmvtisSettings.businessPhone || yardSettings.phone || "", // PHONE
      nmvtisSettings.businessEmail || yardSettings.email || "", // EMAIL
      t.vin || t.vehicleVIN || "", // VIN (handle both field names)
      t.vin || t.vehicleVIN || "", // Confirm VIN
      t.make || t.vehicleMake || "", // VEHICLE / VESSEL MAKE
      t.year || t.vehicleYear || "", // VEHICLE MODEL YEAR
      t.model || t.vehicleModel || "", // VEHICLE MODEL NAME
      "", // VEHICLE STYLE
      t.odometer || "", // MILEAGE
      // Format date properly to avoid #### display issues
      t.purchase_date ? new Date(t.purchase_date).toLocaleDateString('en-US') : 
      (t.saleDate ? new Date(t.saleDate).toLocaleDateString('en-US') :
      (t.created_at ? new Date(t.created_at).toLocaleDateString('en-US') : "")), // VEHICLE SALVAGE OBTAIN DATE
      "SCRAP", // VEHICLE DISPOSITION
      "SALVAGE", // REASON FOR DISPOSITION
      "NO", // VEHICLE INTENDED FOR EXPORT
      "", // Reserved
      "", // INSURANCE OWNER BUSINESS NAME
      "", // INSURANCE OWNER FIRSTNM
      "", // INSURANCE OWNER LASTNM
      "", // INSURANCE OWNER MI
      "", // INSURANCE OWNER ADDR
      "", // INSURANCE OWNER CITY
      "", // INSURANCE OWNER STATE
      "", // INSURANCE OWNER ZIP
      "", // VEHICLE TRANSFERRED TO COMPANY
      "", // VEHICLE TRANSFERRED TO FIRSTNM
      "", // VEHICLE TRANSFERRED TO LASTNM
      "", // VEHICLE TRANSFERRED TO MI
      "", // VEHICLE OBTAINED FROM COMPANY
      t.seller_first_name || t.sellerFirstName || "", // VEHICLE OBTAINED FROM FIRSTNM
      t.seller_last_name || t.sellerLastName || "", // VEHICLE OBTAINED FROM LASTNM
      "", // VEHICLE OBTAINED FROM MI
      "", // DISMANTLER LOCATION (left blank as requested)
      "", // DISMANTLER LIC NUMBER (left blank as requested)
      "", // DISMANTLER STOCK NUMBER (Column AN - left blank as requested)
      "", // TITLING JURISDICTION (Column AO - left blank as requested)
      "" // TITLE NO
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map((row) => row.map(field => `"${field}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NMVTIS_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterDisposition("");
    setFilterVIN("");
  };

  const handleDelete = (transaction: any) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Step 1: Delete PDF from Supabase Storage if it exists
      if (transactionToDelete.bill_of_sale_pdf_url) {
        try {
          // Extract file path from URL
          const url = transactionToDelete.bill_of_sale_pdf_url;
          const pathMatch = url.match(/\/storage\/v1\/object\/public\/legal-documents\/(.+)/);
          if (pathMatch) {
            const filePath = pathMatch[1];
            const { error: storageError } = await supabase.storage
              .from('legal-documents')
              .remove([filePath]);
            
            if (storageError) {
              console.error('Error deleting PDF:', storageError);
              // Continue with transaction deletion even if PDF deletion fails
            } else {
              console.log('PDF deleted successfully:', filePath);
            }
          }
        } catch (pdfError) {
          console.error('Error deleting PDF:', pdfError);
          // Continue with transaction deletion even if PDF deletion fails
        }
      }

      // Step 2: Delete from Supabase database
      const { error: dbError } = await supabase
        .from("vehicle_transactions")
        .delete()
        .eq("id", transactionToDelete.id);

      if (dbError) {
        console.error("Error deleting transaction from database:", dbError);
        setError("Failed to delete transaction from database. Please try again.");
        return;
      }

      // Step 3: Remove from local storage
      try {
        // Remove from vehicleTransactions
        const localTransactions = JSON.parse(localStorage.getItem("vehicleTransactions") || "[]");
        const updatedTransactions = localTransactions.filter((t: any) => 
          t.id !== transactionToDelete.id && 
          !(t.vehicleVIN === transactionToDelete.vin && t.timestamp === transactionToDelete.created_at)
        );
        localStorage.setItem("vehicleTransactions", JSON.stringify(updatedTransactions));

        // Remove from offline transactions if exists
        const offlineTransactions = JSON.parse(localStorage.getItem("offlineTransactions") || "[]");
        const updatedOfflineTransactions = offlineTransactions.filter((t: any) => 
          t.id !== transactionToDelete.id && 
          !(t.vehicleVIN === transactionToDelete.vin && t.timestamp === transactionToDelete.created_at)
        );
        localStorage.setItem("offlineTransactions", JSON.stringify(updatedOfflineTransactions));
      } catch (localStorageError) {
        console.error("Error updating local storage:", localStorageError);
        // Continue anyway as the main deletion succeeded
      }

      console.log("Transaction deleted successfully:", transactionToDelete.id);
      setSuccess(`Transaction for VIN ${transactionToDelete.vin || transactionToDelete.vehicleVIN} deleted successfully`);
      
      // Immediately update the local state to reflect the deletion
      setTransactions(prevTransactions => {
        const updated = prevTransactions.filter(t => t.id !== transactionToDelete.id);
        console.log("Updated local state: removed transaction", transactionToDelete.id, "new count:", updated.length);
        return updated;
      });
      
      // Don't automatically refresh - let the user manually refresh if needed
      // This prevents the deleted transaction from coming back
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      console.error("Error deleting transaction:", err);
      setError("Failed to delete transaction. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">
          Transaction Log Book
        </Typography>
        <Stack direction="row" spacing={1}>
          {hasOfflineData && (
            <Tooltip title="You have offline transactions that need to be synced">
              <Chip
                icon={<CloudOff />}
                label="Offline Data"
                color="warning"
                onClick={syncOfflineTransactions}
                disabled={isSyncing}
              />
            </Tooltip>
          )}
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={fetchTransactions}
            disabled={isSyncing}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={syncOfflineTransactions}
            disabled={isSyncing || !hasOfflineData}
          >
            {isSyncing ? "Syncing..." : "Sync Offline Data"}
          </Button>
        </Stack>
      </Stack>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Complete record of all vehicle transactions for NMVTIS compliance
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flexWrap: "wrap" }}
          >
            <Box>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box>
              <FormControl fullWidth>
                <InputLabel>Disposition</InputLabel>
                <Select
                  value={filterDisposition}
                  onChange={(e) => setFilterDisposition(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="TBD">To Be Determined</MenuItem>
                  <MenuItem value="SCRAP">Scrap/Parts</MenuItem>
                  <MenuItem value="CRUSH">Crush</MenuItem>
                  <MenuItem value="REBUILD">Rebuild</MenuItem>
                  <MenuItem value="SOLD">Resale</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <TextField
                fullWidth
                label="Search VIN"
                value={filterVIN}
                onChange={(e) => setFilterVIN(e.target.value)}
                placeholder="Enter VIN to search"
              />
            </Box>
            <Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={clearFilters} size="small">
                  Clear
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={exportCSV}
                  disabled={filteredTransactions.length === 0}
                  size="small"
                >
                  Export
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary">
                {transactions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Records
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="warning.main">
                {
                  transactions.filter((t) => (t.disposition || t.vehicleDisposition) === "TBD")
                    .length
                }
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Disposition
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="success.main">
                $
                {transactions
                  .reduce((sum, t) => sum + parseFloat(t.purchase_price || t.salePrice || 0), 0)
                  .toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="info.main">
                {filteredTransactions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filtered Results
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Transactions Table */}
      <Paper>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>VIN</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Seller First Name</TableCell>
                <TableCell>Seller Last Name</TableCell>
                <TableCell>Seller Address</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Disposition</TableCell>
                {user.role === "admin" && <TableCell>Driver</TableCell>}
                <TableCell>Status</TableCell>
                {user.role === "admin" && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    {new Date(transaction.created_at || transaction.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                  >
                    {transaction.vin || transaction.vehicleVIN}
                  </TableCell>
                  <TableCell>
                    {transaction.year || transaction.vehicleYear} {transaction.make || transaction.vehicleMake}{" "}
                    {transaction.model || transaction.vehicleModel}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {transaction.color || transaction.vehicleColor} {transaction.vehicle_type || transaction.vehicleBody}
                    </Typography>
                  </TableCell>
                  <TableCell>{transaction.seller_first_name || transaction.sellerFirstName}</TableCell>
                  <TableCell>{transaction.seller_last_name || transaction.sellerLastName}</TableCell>
                  <TableCell>
                    {transaction.seller_address || transaction.sellerAddress}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {transaction.seller_city || transaction.sellerCity}, {transaction.seller_state || transaction.sellerState}{" "}
                      {transaction.seller_zip || transaction.sellerZip}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    ${parseFloat(transaction.purchase_price || transaction.salePrice || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.disposition || transaction.vehicleDisposition || "SCRAP"}
                      color={
                        (transaction.disposition || transaction.vehicleDisposition) === "TBD"
                          ? "warning"
                          : "success"
                      }
                      size="small"
                    />
                  </TableCell>
                  {user.role === "admin" && (
                    <TableCell>{transaction.driver_name || transaction.driverName || transaction.purchaserName}</TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label="Complete"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  {user.role === "admin" && (
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Permanently delete this transaction and associated documents">
                          <IconButton
                            color="error"
                            onClick={() => handleDelete(transaction)}
                            disabled={isDeleting}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredTransactions.length === 0 && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              No transactions found matching your criteria.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="alert-dialog-title">
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Permanently Delete Transaction</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {transactionToDelete && (
            <Stack spacing={2}>
              <Alert severity="warning">
                This action cannot be undone. The following will be permanently deleted:
              </Alert>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Transaction Details:
                </Typography>
                <Typography variant="body2">
                  • VIN: {transactionToDelete.vin || transactionToDelete.vehicleVIN}
                </Typography>
                <Typography variant="body2">
                  • Vehicle: {transactionToDelete.year || transactionToDelete.vehicleYear} {transactionToDelete.make || transactionToDelete.vehicleMake}
                </Typography>
                <Typography variant="body2">
                  • Seller: {transactionToDelete.seller_first_name || transactionToDelete.sellerFirstName} {transactionToDelete.seller_last_name || transactionToDelete.sellerLastName}
                </Typography>
                <Typography variant="body2">
                  • Price: ${(transactionToDelete.purchase_price || transactionToDelete.salePrice || 0).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  • Date: {new Date(transactionToDelete.created_at || transactionToDelete.timestamp).toLocaleDateString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  What will be deleted:
                </Typography>
                <Typography variant="body2">
                  • Transaction record from database
                </Typography>
                <Typography variant="body2">
                  • Transaction from local storage
                </Typography>
                {transactionToDelete.bill_of_sale_pdf_url && (
                  <Typography variant="body2">
                    • Associated PDF document from storage
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? null : <DeleteIcon />}
          >
            {isDeleting ? "Deleting..." : "Permanently Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LogBook;
