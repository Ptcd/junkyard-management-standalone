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
  Alert,
  Grid,
  Paper,
  LinearProgress,
} from "@mui/material";
import {
  DirectionsCar,
  AddCircle,
  Assignment,
  TrendingUp,
  AttachMoney,
  Receipt,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { User } from "../utils/supabaseAuth";

interface DriverDashboardProps {
  user: User;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load transactions from localStorage
    const stored = JSON.parse(
      localStorage.getItem("vehicleTransactions") || "[]",
    );
    // Filter transactions by this driver
    const driverTransactions = stored.filter((t: any) => t.userId === user.id);
    setTransactions(driverTransactions);
  }, [user.id]);

  const recentTransactions = transactions.slice(-10).reverse();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Driver Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Welcome back, {user.firstName}! Ready to record some vehicle purchases?
      </Typography>

      {/* Quick Actions */}
      <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddCircle />}
                  onClick={() => navigate("/purchase")}
                >
                  Record Vehicle Purchase
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<Assignment />}
                  onClick={() => navigate("/logbook")}
                >
                  View Transaction Log
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My Statistics
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">
                    Vehicles Purchased
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {transactions.length}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">Total Value</Typography>
                  <Typography variant="h5" color="success.main">
                    $
                    {transactions
                      .reduce(
                        (sum, t) => sum + parseFloat(t.salePrice || "0"),
                        0,
                      )
                      .toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography color="text.secondary">This Month</Typography>
                  <Typography variant="h5" color="info.main">
                    {
                      transactions.filter(
                        (t) =>
                          new Date(t.timestamp).getMonth() ===
                          new Date().getMonth(),
                      ).length
                    }
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Recent Transactions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your Recent Transactions
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
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No transactions recorded yet.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddCircle />}
                onClick={() => navigate("/purchase")}
              >
                Record Your First Purchase
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DriverDashboard;
