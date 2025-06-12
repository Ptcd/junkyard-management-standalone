import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import {
  PersonAdd,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  AccountCircle,
  LocalShipping,
  AttachMoney,
  TrendingUp,
} from "@mui/icons-material";
import { getDriverCashBalance, getDriverCashHistory } from "../utils/cashTracker";
import { getDriverExpenses, getExpenseStats } from "../utils/expenseManager";
import { User, getAllUsers, signUp, updateUserProfile } from "../utils/supabaseAuth";

interface UserManagementProps {
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "driver" as "admin" | "driver",
    email: "",
    phone: "",
    licenseNumber: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { users: userList, error: loadError } = await getAllUsers();
    if (loadError) {
      setError("Failed to load users");
    } else {
      setUsers(userList);
    }
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.firstName || !newUser.lastName || !newUser.email) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const userData = {
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      yardId: currentUser.yardId,
      phone: newUser.phone,
      licenseNumber: newUser.licenseNumber,
      hireDate: new Date().toISOString().split("T")[0],
    };

    const { data, error: createError } = await signUp(newUser.email, newUser.password, userData);

    if (createError) {
      setError(typeof createError === 'string' ? createError : (createError as any)?.message || "Failed to create user");
    } else if (data?.user) {
      setSuccess("User added successfully!");
      setShowAddUserDialog(false);
      setNewUser({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "driver",
        email: "",
        phone: "",
        licenseNumber: "",
      });
      loadUsers(); // Reload users list
    }

    setLoading(false);
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: "active" | "inactive") => {
    setLoading(true);
    const { error: updateError } = await updateUserProfile(userId, { status: newStatus });

    if (updateError) {
      setError("Failed to update user status");
    } else {
      setSuccess("User status updated successfully!");
      loadUsers(); // Reload users list
    }

    setLoading(false);
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
  };

  const getUserStats = (user: User) => {
    const cashBalance = getDriverCashBalance(user.id);
    const cashHistory = getDriverCashHistory(user.id);
    const expenses = getDriverExpenses(user.id);
    const expenseStats = getExpenseStats(user.id, user.yardId);

    return {
      cashBalance,
      totalTransactions: cashHistory.length,
      totalExpenses: expenseStats.totalExpenses || 0,
      totalExpenseReports: expenseStats.totalCount || 0,
    };
  };

  const drivers = users.filter(user => user.role === "driver");

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        User Management
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

      {/* Driver Statistics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Driver Overview ({drivers.length} drivers)
        </Typography>
        
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 2 }}>
          {drivers.map((driver) => {
            const stats = getUserStats(driver);
            return (
              <Card key={driver.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <AccountCircle color="primary" />
                    <Box>
                      <Typography variant="h6">
                        {driver.firstName} {driver.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {driver.username} • {driver.licenseNumber || "No license"}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: "auto" }}>
                      <Chip
                        label={driver.status}
                        color={driver.status === "active" ? "success" : "error"}
                        size="small"
                      />
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AttachMoney color="success" fontSize="small" />
                      <Typography variant="body2">
                        ${stats.cashBalance.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LocalShipping color="primary" fontSize="small" />
                      <Typography variant="body2">
                        {stats.totalTransactions} trips
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TrendingUp color="warning" fontSize="small" />
                      <Typography variant="body2">
                        ${stats.totalExpenses.toFixed(2)} expenses
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedUser(driver);
                      setShowUserDetailsDialog(true);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Paper>

      {/* Add User Button */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">All Users ({users.length})</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setShowAddUserDialog(true)}
        >
          Add User
        </Button>
      </Stack>

      {/* Users Table */}
      <Paper sx={{ p: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Hire Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={user.role === "admin" ? "primary" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      color={user.status === "active" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.hireDate ? new Date(user.hireDate).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDetailsDialog(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <Button
                        size="small"
                        variant="outlined"
                        color={user.status === "active" ? "warning" : "success"}
                        onClick={() => handleUpdateUserStatus(user.id, user.status === "active" ? "inactive" : "active")}
                        disabled={loading}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onClose={() => setShowAddUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="First Name *"
                value={newUser.firstName}
                onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Last Name *"
                value={newUser.lastName}
                onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                fullWidth
              />
            </Stack>

            <TextField
              label="Username *"
              value={newUser.username}
              onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Email *"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              fullWidth
            />

            <TextField
              label="Password *"
              type={showPassword ? "text" : "password"}
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              fullWidth
              helperText="Password must be at least 6 characters"
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as "admin" | "driver" }))}
              >
                <MenuItem value="driver">Driver</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Phone"
              value={newUser.phone}
              onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />

            <TextField
              label="License Number"
              value={newUser.licenseNumber}
              onChange={(e) => setNewUser(prev => ({ ...prev, licenseNumber: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddUserDialog(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained" disabled={loading}>
            {loading ? "Adding..." : "Add User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onClose={() => setShowUserDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} - Details` : "User Details"}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* User Info */}
              <Box>
                <Typography variant="h6" gutterBottom>User Information</Typography>
                <Stack spacing={1}>
                  <Typography><strong>Username:</strong> {selectedUser.username}</Typography>
                  <Typography><strong>Role:</strong> {selectedUser.role}</Typography>
                  <Typography><strong>Email:</strong> {selectedUser.email || "Not provided"}</Typography>
                  <Typography><strong>Phone:</strong> {selectedUser.phone || "Not provided"}</Typography>
                  <Typography><strong>License:</strong> {selectedUser.licenseNumber || "Not provided"}</Typography>
                  <Typography><strong>Hire Date:</strong> {selectedUser.hireDate ? new Date(selectedUser.hireDate).toLocaleDateString() : "N/A"}</Typography>
                </Stack>
              </Box>

              {/* Financial Summary for drivers */}
              {selectedUser.role === "driver" && (
                <Box>
                  <Typography variant="h6" gutterBottom>Financial Summary</Typography>
                  {(() => {
                    const stats = getUserStats(selectedUser);
                    return (
                      <Stack spacing={1}>
                        <Typography><strong>Cash Balance:</strong> ${stats.cashBalance.toFixed(2)}</Typography>
                        <Typography><strong>Total Transactions:</strong> {stats.totalTransactions}</Typography>
                        <Typography><strong>Total Expenses:</strong> ${stats.totalExpenses.toFixed(2)}</Typography>
                        <Typography><strong>Expense Reports:</strong> {stats.totalExpenseReports}</Typography>
                      </Stack>
                    );
                  })()}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUserDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement; 