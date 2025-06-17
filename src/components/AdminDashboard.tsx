import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  DirectionsCar,
  AttachMoney,
  Assignment,
  TrendingUp,
  Download,
  Settings as SettingsIcon,
  Schedule,
  ReportProblem,
  People,
  Warning,
  CheckCircle,
  Assessment,
  LocalShipping,
  Receipt,
} from "@mui/icons-material";
import { exportNMVTISCSV, downloadCSV } from "../utils/nmvtisExport";
import {
  getScheduledNMVTISReports,
  getPendingNMVTISReportsCount,
} from "../utils/nmvtisScheduler";
import { User } from "../utils/supabaseAuth";
import { supabase } from "../utils/supabaseAuth";

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalRevenue: 0,
    monthlyVehicles: 0,
    pendingNMVTIS: 0,
    scheduledNMVTISReports: 0,
    failedNMVTISReports: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch transactions from Supabase
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        setError("Failed to load transactions. Please try again.");
        return;
      }

      setTransactions(data);

      // Load sales data
      const salesData = JSON.parse(localStorage.getItem("vehicleSales") || "[]");

      // Calculate stats
      const totalRevenue = data.reduce(
        (sum: number, t: any) => sum + parseFloat(t.salePrice || 0),
        0,
      );

      const salesRevenue = salesData.reduce(
        (sum: number, s: any) => sum + parseFloat(s.salePrice || 0),
        0,
      );

      const thisMonth = new Date();
      const monthlyVehicles = data.filter((t: any) => {
        const tDate = new Date(t.timestamp);
        return (
          tDate.getMonth() === thisMonth.getMonth() &&
          tDate.getFullYear() === thisMonth.getFullYear()
        );
      }).length;

      // Get NMVTIS report statistics
      const scheduledReports = getScheduledNMVTISReports();
      const pendingReportsCount = getPendingNMVTISReportsCount();
      const failedReportsCount = scheduledReports.filter(
        (r) => r.status === "failed",
      ).length;

      setStats({
        totalVehicles: data.length,
        totalRevenue: salesRevenue, // Show sales revenue instead of purchase cost
        monthlyVehicles,
        pendingNMVTIS: data.filter((t: any) => t.vehicleDisposition === "TBD")
          .length,
        scheduledNMVTISReports: pendingReportsCount,
        failedNMVTISReports: failedReportsCount,
      });
    };

    fetchTransactions();
  }, []);

  const exportNMVTISReport = () => {
    // Get NMVTIS settings
    const settingsData = localStorage.getItem("nmvtisSettings");
    if (!settingsData) {
      alert(
        "Please configure NMVTIS settings first. Go to Settings to set up your NMVTIS credentials.",
      );
      return;
    }

    try {
      const settings = JSON.parse(settingsData);

      // Validate required settings
      if (!settings.nmvtisId || !settings.nmvtisPin || !settings.entityName) {
        alert(
          "NMVTIS settings are incomplete. Please verify your NMVTIS ID, PIN, and Entity Name in Settings.",
        );
        return;
      }

      // Export CSV using the proper NMVTIS format
      const csvContent = exportNMVTISCSV(transactions, settings);
      const filename = `NMVTIS_Report_${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error("Error exporting NMVTIS report:", error);
      alert(
        "Error generating NMVTIS report. Please check your settings and try again.",
      );
    }
  };

  const recentTransactions = transactions.slice(-5).reverse();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Welcome back, {user.firstName}! Here's your junkyard overview.
      </Typography>

      {/* Stats Cards */}
      <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <DirectionsCar color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Vehicles
                  </Typography>
                  <Typography variant="h4">{stats.totalVehicles}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <AttachMoney color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Sales Revenue
                  </Typography>
                  <Typography variant="h4">
                    ${stats.totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <TrendingUp color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    This Month
                  </Typography>
                  <Typography variant="h4">{stats.monthlyVehicles}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Assignment color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending NMVTIS
                  </Typography>
                  <Typography variant="h4">{stats.pendingNMVTIS}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Schedule color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Scheduled Reports
                  </Typography>
                  <Typography variant="h4">
                    {stats.scheduledNMVTISReports}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {stats.failedNMVTISReports > 0 && (
          <Box sx={{ minWidth: 280 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ReportProblem color="error" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Failed Reports
                    </Typography>
                    <Typography variant="h4">
                      {stats.failedNMVTISReports}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Stack>

      <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
        {/* Recent Transactions */}
        <Box sx={{ flex: 2, minWidth: 400 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Transactions
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>VIN</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {transaction.vehicleYear} {transaction.vehicleMake}{" "}
                          {transaction.vehicleModel}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace" }}>
                          {transaction.vehicleVIN}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {transactions.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2, textAlign: "center" }}
                >
                  No transactions recorded yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <List>
                <ListItem>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Download />}
                    onClick={exportNMVTISReport}
                    disabled={transactions.length === 0}
                  >
                    Export NMVTIS Report
                  </Button>
                </ListItem>
                <ListItem>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Schedule />}
                    onClick={() => (window.location.href = "/nmvtis")}
                    disabled={
                      stats.scheduledNMVTISReports === 0 &&
                      stats.pendingNMVTIS === 0
                    }
                    color="primary"
                  >
                    Manage NMVTIS Reports
                  </Button>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="NMVTIS Compliance"
                    secondary={`${transactions.length} vehicles reported`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Wisconsin DMV Status"
                    secondary="All MV2459 forms generated"
                  />
                </ListItem>
              </List>

              {stats.pendingNMVTIS > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {stats.pendingNMVTIS} vehicles have pending dispositions that
                  need to be updated for NMVTIS reporting.
                </Alert>
              )}

              {stats.scheduledNMVTISReports > 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {stats.scheduledNMVTISReports} NMVTIS reports are scheduled
                  for automatic submission.
                </Alert>
              )}

              {stats.failedNMVTISReports > 0 && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {stats.failedNMVTISReports} NMVTIS reports failed and need
                  attention.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};

export default AdminDashboard;
