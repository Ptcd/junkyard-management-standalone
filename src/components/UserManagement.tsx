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
  Tooltip,
  DialogContentText,
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
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  getDriverCashBalance,
  getDriverCashHistory,
} from "../utils/cashTracker";
import { getDriverExpenses, getExpenseStats } from "../utils/expenseManager";
import {
  User,
  getAllUsers,
  inviteUser,
  updateUserProfile,
  deleteUserAsAdmin,
} from "../utils/supabaseAuth";

interface UserManagementProps {
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newUser, setNewUser] = useState({
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
    if (
      !newUser.firstName ||
      !newUser.lastName ||
      !newUser.email
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const userData = {
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      yardId: currentUser.yardId,
      phone: newUser.phone,
      licenseNumber: newUser.licenseNumber,
    };

    const { data, error: createError } = await inviteUser(
      newUser.email,
      userData,
    );

    if (createError) {
      setError(
        typeof createError === "string"
          ? createError
          : (createError as any)?.message || "Failed to send invitation",
      );
    } else if (data?.user) {
      setSuccess(`Invitation sent to ${newUser.email}! They will receive an email to complete their account setup.`);
      setShowAddUserDialog(false);
      setNewUser({
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

  const handleUpdateUserStatus = async (
    userId: string,
    newStatus: "active" | "inactive",
  ) => {
    setLoading(true);
    const { error: updateError } = await updateUserProfile(userId, {
      status: newStatus,
    });

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

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    // Prevent deleting yourself
    if (userToDelete.id === currentUser.id) {
      setError("You cannot delete your own account from here. Use Account Settings instead.");
      setShowDeleteDialog(false);
      setUserToDelete(null);
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const result = await deleteUserAsAdmin(userToDelete.id);

      if (result.error) {
        setError(`Failed to delete user: ${result.error}`);
      } else if (result.success) {
        setSuccess(`User ${userToDelete.firstName} ${userToDelete.lastName} access removed successfully! All their data has been preserved.`);
        
        // Log deletion summary if available
        if (result.deletionSummary) {
          console.log("Deletion summary:", result.deletionSummary);
        }
        
        // Reload the users list
        loadUsers();
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setError("An unexpected error occurred while deleting the user");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setUserToDelete(null);
      
      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    }
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

  const drivers = users.filter((user) => user.role === "driver");

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

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 2,
          }}
        >
          {drivers.map((driver) => {
            const stats = getUserStats(driver);
            return (
              <Card key={driver.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ mb: 2 }}
                  >
                    <AccountCircle color="primary" />
                    <Box>
                      <Typography variant="h6">
                        {driver.firstName} {driver.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {driver.email} • {driver.licenseNumber || "No license"}
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
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">All Users ({users.length})</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setShowAddUserDialog(true)}
        >
          Invite User
        </Button>
      </Stack>

      {/* Users Table */}
      <Paper sx={{ p: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
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
                  <TableCell>{user.phone}</TableCell>
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
                        onClick={() =>
                          handleUpdateUserStatus(
                            user.id,
                            user.status === "active" ? "inactive" : "active",
                          )
                        }
                        disabled={loading}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Tooltip title={
                        user.id === currentUser.id 
                          ? "Cannot delete your own account" 
                          : "Permanently delete user and all associated data"
                      }>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteUser(user)}
                            disabled={loading || deleting || user.id === currentUser.id}
                          >
                            <Delete />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => !deleting && setShowDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Remove User Access</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {userToDelete && (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>This action cannot be undone!</strong>
                </Alert>
                
                <Typography gutterBottom>
                  Are you sure you want to permanently delete the following user?
                </Typography>
                
                <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>{userToDelete.firstName} {userToDelete.lastName}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: {userToDelete.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Role: {userToDelete.role}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {userToDelete.status}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  This will permanently delete the user account, but preserve all their data:
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="error.main">
                    <strong>Will be deleted:</strong>
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>User account and authentication access</li>
                    <li>User login credentials</li>
                  </ul>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom color="success.main">
                    <strong>Will be preserved for business records:</strong>
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>All vehicle transactions (marked as "Deleted User")</li>
                    <li>All vehicle sales records</li>
                    <li>All cash transaction history</li>
                    <li>All expense reports</li>
                    <li>All NMVTIS reports</li>
                    <li>Associated document files</li>
                  </ul>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    💡 Data is preserved for legal compliance, auditing, and business continuity. 
                    Only the user's access is removed.
                  </Typography>
                </Box>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowDeleteDialog(false)} 
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteUser} 
            color="warning" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? null : <Delete />}
          >
            {deleting ? "Removing..." : "Remove User Access"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog
        open={showAddUserDialog}
        onClose={() => setShowAddUserDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invite New User</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="First Name *"
                value={newUser.firstName}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, firstName: e.target.value }))
                }
                fullWidth
              />
              <TextField
                label="Last Name *"
                value={newUser.lastName}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, lastName: e.target.value }))
                }
                fullWidth
              />
            </Stack>

            <TextField
              label="Email *"
              type="email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, email: e.target.value }))
              }
              fullWidth
              helperText="User will receive an invitation email to complete their account setup"
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser((prev) => ({
                    ...prev,
                    role: e.target.value as "admin" | "driver",
                  }))
                }
              >
                <MenuItem value="driver">Driver</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Phone"
              value={newUser.phone}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, phone: e.target.value }))
              }
              fullWidth
            />

            <TextField
              label="License Number"
              value={newUser.licenseNumber}
              onChange={(e) =>
                setNewUser((prev) => ({
                  ...prev,
                  licenseNumber: e.target.value,
                }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddUserDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            disabled={loading}
          >
            {loading ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog
        open={showUserDetailsDialog}
        onClose={() => setShowUserDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedUser
            ? `${selectedUser.firstName} ${selectedUser.lastName} - Details`
            : "User Details"}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* User Info */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  User Information
                </Typography>
                <Stack spacing={1}>
                  <Typography>
                    <strong>Email:</strong>{" "}
                    {selectedUser.email || "Not provided"}
                  </Typography>
                  <Typography>
                    <strong>Phone:</strong>{" "}
                    {selectedUser.phone || "Not provided"}
                  </Typography>
                  <Typography>
                    <strong>Role:</strong> {selectedUser.role}
                  </Typography>
                </Stack>
              </Box>

              {/* Financial Summary for drivers */}
              {selectedUser.role === "driver" && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Financial Summary
                  </Typography>
                  {(() => {
                    const stats = getUserStats(selectedUser);
                    return (
                      <Stack spacing={1}>
                        <Typography>
                          <strong>Cash Balance:</strong> $
                          {stats.cashBalance.toFixed(2)}
                        </Typography>
                        <Typography>
                          <strong>Total Transactions:</strong>{" "}
                          {stats.totalTransactions}
                        </Typography>
                        <Typography>
                          <strong>Total Expenses:</strong> $
                          {stats.totalExpenses.toFixed(2)}
                        </Typography>
                        <Typography>
                          <strong>Expense Reports:</strong>{" "}
                          {stats.totalExpenseReports}
                        </Typography>
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
