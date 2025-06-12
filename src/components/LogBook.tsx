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
} from "@mui/material";
import { Download, FilterList } from "@mui/icons-material";

interface User {
  id: string;
  username: string;
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

  useEffect(() => {
    // Load transactions from localStorage
    const stored = JSON.parse(
      localStorage.getItem("vehicleTransactions") || "[]",
    );

    // For drivers, only show their transactions; for admins, show all
    const userTransactions =
      user.role === "admin"
        ? stored
        : stored.filter((t: any) => t.userId === user.id);

    setTransactions(userTransactions);
    setFilteredTransactions(userTransactions);
  }, [user.id, user.role]);

  useEffect(() => {
    // Apply filters
    let filtered = transactions;

    if (filterDate) {
      filtered = filtered.filter(
        (t) => new Date(t.timestamp).toISOString().split("T")[0] === filterDate,
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
      "Driver",
      "Notes",
    ];

    const csvData = filteredTransactions.map((t) => [
      new Date(t.timestamp).toISOString().split("T")[0],
      t.vehicleVIN,
      t.vehicleYear,
      t.vehicleMake,
      t.vehicleModel,
      t.sellerName,
      `"${t.sellerAddress} ${t.sellerCity} ${t.sellerState} ${t.sellerZip}"`,
      t.salePrice,
      t.vehicleDisposition,
      t.driverName,
      `"${t.notes || ""}"`,
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
      <Typography variant="h4" gutterBottom>
        Transaction Log Book
      </Typography>
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
                <TableCell>Seller</TableCell>
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
                    {new Date(transaction.timestamp).toLocaleDateString()}
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
                  <TableCell>
                    {transaction.sellerName}
                    <br />
                    <Typography variant="caption" color="text.secondary">
                      {transaction.sellerPhone}
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
