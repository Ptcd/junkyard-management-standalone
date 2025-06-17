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
} from "@mui/material";
import { Download, FilterList, Sync, CloudOff } from "@mui/icons-material";
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasOfflineData, setHasOfflineData] = useState(false);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        // Fallback to localStorage if Supabase fetch fails
        const stored = JSON.parse(localStorage.getItem("vehicleTransactions") || "[]");
        const userTransactions = user.role === "admin" 
          ? stored 
          : stored.filter((t: any) => t.userId === user.id);
        setTransactions(userTransactions);
        setFilteredTransactions(userTransactions);
        return;
      }

      // For drivers, only show their transactions; for admins, show all
      const userTransactions =
        user.role === "admin"
          ? data
          : data.filter((t: any) => t.user_id === user.id);

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
          model: "",
          color: "",
          vehicle_type: "",
          purchase_price: parseFloat(t.salePrice),
          seller_name: t.sellerName,
          seller_address: t.sellerAddress,
          seller_phone: t.sellerPhone,
          seller_id_type: "Driver's License",
          seller_id_number: "",
          purchase_date: t.saleDate,
          odometer: 0,
          condition: "Used",
          purchase_method: "Cash",
          title_number: "",
          title_state: "",
          notes: "",
          signature_data: t.sellerSignature,
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
        (t) => t.vehicleDisposition === filterDisposition,
      );
    }

    if (filterVIN) {
      filtered = filtered.filter((t) =>
        t.vehicleVIN.toLowerCase().includes(filterVIN.toLowerCase()),
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, filterDate, filterDisposition, filterVIN]);

  const exportCSV = () => {
    const headers = [
      "Date",
      "VIN",
      "Year",
      "Make",
      "Model",
      "Seller Name",
      "Seller Address",
      "Sale Price",
      "Disposition",
      "Driver ID",
      "Notes",
    ];

    const csvData = filteredTransactions.map((t) => [
      new Date(t.created_at).toISOString().split("T")[0],
      t.vin || t.vehicleVIN || "",
      t.year || t.vehicleYear || "",
      t.make || t.vehicleMake || "",
      t.model || t.vehicleModel || "",
      t.seller_name || t.sellerName || "",
      t.seller_address || t.sellerAddress || "",
      t.purchase_price || t.salePrice || "",
      t.vehicle_disposition || t.vehicleDisposition || "",
      t.user_id || t.userId || "",
      t.notes || "",
    ]);

    const csv = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Logbook_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterDisposition("");
    setFilterVIN("");
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
                  transactions.filter((t) => t.vehicleDisposition === "TBD")
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
                  .reduce((sum, t) => sum + parseFloat(t.salePrice || 0), 0)
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
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}
                  >
                    {transaction.vehicleVIN}
                  </TableCell>
                  <TableCell>
                    {transaction.vehicleYear} {transaction.vehicleMake}{" "}
                    {transaction.vehicleModel}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {transaction.vehicleColor} {transaction.vehicleBody}
                    </Typography>
                  </TableCell>
                  <TableCell>{transaction.sellerFirstName}</TableCell>
                  <TableCell>{transaction.sellerLastName}</TableCell>
                  <TableCell>
                    {transaction.sellerAddress}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {transaction.sellerCity}, {transaction.sellerState}{" "}
                      {transaction.sellerZip}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    ${parseFloat(transaction.salePrice).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.vehicleDisposition}
                      color={
                        transaction.vehicleDisposition === "TBD"
                          ? "warning"
                          : "success"
                      }
                      size="small"
                    />
                  </TableCell>
                  {user.role === "admin" && (
                    <TableCell>{transaction.driverName}</TableCell>
                  )}
                  <TableCell>
                    <Chip
                      label="Complete"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
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
    </Box>
  );
};

export default LogBook;
