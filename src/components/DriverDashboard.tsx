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
import { supabase } from "../utils/supabaseAuth";

interface DriverDashboardProps {
  user: User;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch transactions from Supabase
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        setError("Failed to load transactions. Please try again.");
        return;
      }

      setTransactions(data);
    };

    fetchTransactions();
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
                Quick Vehicle Checks
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Button
                  variant="contained"
                  color="info"
                  size="large"
                  href="https://trust.dot.state.wi.us/linq/linqservlet?whoami=linqp1"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mb: 1 }}
                >
                  Check for Liens (WisDOT)
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  href="https://trust.dot.state.wi.us/totl/totlservlet?whoami=totlp1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Verify Seller is Owner (WisDOT)
                </Button>
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
