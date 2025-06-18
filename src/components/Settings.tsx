import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from "@mui/material";
import {
  Save as SaveIcon,
  Settings as SettingsIcon,
  Backup,
  People,
  Business,
  AccountCircle,
  Delete,
} from "@mui/icons-material";
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import BackupManager from "./BackupManager";
import UserManagement from "./UserManagement";
import BuyerProfilesManager from "./BuyerProfilesManager";
import { User, updateUserProfile, deleteAccount } from "../utils/supabaseAuth";

interface NMVTISSettings {
  nmvtisId: string;
  nmvtisPin: string;
  entityName: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  businessEmail: string;
  reportingFrequency: string;
}

interface YardSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  licenseNumber: string;
}

interface SettingsProps {
  user: User;
}

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<NMVTISSettings>({
    nmvtisId: "",
    nmvtisPin: "",
    entityName: "",
    businessAddress: "",
    businessCity: "",
    businessState: "WI",
    businessZip: "",
    businessPhone: "",
    businessEmail: "",
    reportingFrequency: "30",
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [profileForm, setProfileForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || "",
    email: user.email || "",
  });

  const [yardSettings, setYardSettings] = useState<YardSettings>({
    name: "Demo Junkyard & Auto Parts",
    address: "123 Salvage Road",
    city: "Milwaukee",
    state: "WI",
    zip: "53201",
    phone: "(414) 555-0123",
    email: "office@demojunkyard.com",
    licenseNumber: "WI-JUNK-2024-001",
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const settingsSections = user.role === 'admin' ? [
    { label: 'General Settings', icon: <SettingsIcon /> },
    { label: 'Backup & Recovery', icon: <Backup /> },
    { label: 'User Management', icon: <People /> },
    { label: 'Buyer Profiles', icon: <Business /> },
    { label: 'Account Management', icon: <AccountCircle /> },
  ] : [
    { label: 'Account Management', icon: <AccountCircle /> },
  ];

  useEffect(() => {
    // Load yard settings from localStorage first
    const savedYardSettings = localStorage.getItem("yardSettings");
    let loadedYardSettings = yardSettings;
    
    if (savedYardSettings) {
      try {
        loadedYardSettings = JSON.parse(savedYardSettings);
        setYardSettings((prev) => ({ ...prev, ...loadedYardSettings }));
      } catch (e) {
        console.error("Error loading yard settings:", e);
      }
    }

    // Load NMVTIS settings from localStorage
    const savedSettings = localStorage.getItem("nmvtisSettings");
    if (savedSettings) {
      try {
        const loaded = JSON.parse(savedSettings);
        setSettings((prev) => ({
          ...prev,
          ...loaded,
          // Only use yard settings as fallback if the loaded values are empty
          entityName: loaded.entityName || loadedYardSettings.name,
          businessAddress: loaded.businessAddress || loadedYardSettings.address,
          businessEmail: loaded.businessEmail || loadedYardSettings.email,
        }));
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    } else {
      // Only initialize from yardSettings if no saved NMVTIS settings exist
      setSettings((prev) => ({
        ...prev,
        entityName: loadedYardSettings.name,
        businessAddress: loadedYardSettings.address,
        businessEmail: loadedYardSettings.email,
      }));
    }
  }, []); // Keep empty dependencies to run only once on mount

  const handleInputChange =
    (field: keyof NMVTISSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields - check actual source values
    const requiredFields = [];
    const missingFields = [];

    // Check NMVTIS PIN
    if (!settings.nmvtisPin) {
      requiredFields.push("nmvtisPin");
      missingFields.push("NMVTIS PIN");
    }

    // Check entity name (from yard settings)
    if (!yardSettings.name) {
      requiredFields.push("entityName");
      missingFields.push("Business Name");
    }

    // Check business address (from yard settings)
    if (!yardSettings.address) {
      requiredFields.push("businessAddress");
      missingFields.push("Business Address");
    }

    if (missingFields.length > 0) {
      setError(
        `Please fill in all required fields: ${missingFields.join(", ")}`,
      );
      return;
    }

    // Save to localStorage with automatic syncing
    localStorage.setItem("nmvtisSettings", JSON.stringify({
      ...settings,
      entityName: yardSettings.name,
      businessAddress: yardSettings.address,
      businessEmail: yardSettings.email, // Sync email from yard settings
    }));

    // Also save yard settings
    localStorage.setItem("yardSettings", JSON.stringify(yardSettings));

    setSuccess(true);
    setError("");

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error: updateError } = await updateUserProfile(user.id, {
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      phone: profileForm.phone,
    });

    if (updateError) {
      setError(
        typeof updateError === "string"
          ? updateError
          : "Failed to update profile",
      );
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setError("Please type DELETE to confirm account deletion");
      return;
    }

    // For drivers, we want to keep transactions but transfer ownership to admin
    // For admins, we use the standard deletion process
    const { error: deleteError } = await deleteAccount();

    if (deleteError) {
      setError(
        typeof deleteError === "string"
          ? deleteError
          : "Failed to delete account",
      );
    } else {
      // User will be signed out automatically
      window.location.href = "/";
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Configure junkyard operations, NMVTIS reporting, and data backup
      </Typography>

      {/* Hamburger menu for mobile */}
      {isMobile ? (
        <>
          <Button
            onClick={() => setDrawerOpen(true)}
            startIcon={<MenuIcon />}
            sx={{ mb: 2 }}
            variant="outlined"
          >
            Menu
          </Button>
          <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <List sx={{ width: 240 }}>
              {settingsSections.map((section, idx) => (
                <ListItem key={section.label} disablePadding>
                  <ListItemButton
                    selected={tabValue === idx}
                    onClick={() => {
                      setTabValue(idx);
                      setDrawerOpen(false);
                    }}
                  >
                    <ListItemIcon>{section.icon}</ListItemIcon>
                    <ListItemText primary={section.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Drawer>
        </>
      ) : (
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            {user.role === 'admin' ? (
              <>
                <Tab icon={<SettingsIcon />} label="General Settings" iconPosition="start" />
                <Tab icon={<Backup />} label="Backup & Recovery" iconPosition="start" />
                <Tab icon={<People />} label="User Management" iconPosition="start" />
                <Tab icon={<Business />} label="Buyer Profiles" iconPosition="start" />
                <Tab icon={<AccountCircle />} label="Account Management" iconPosition="start" />
              </>
            ) : (
              <Tab icon={<AccountCircle />} label="Account Management" iconPosition="start" />
            )}
          </Tabs>
        </Paper>
      )}

      {/* Tab Content (single column, full width on mobile) */}
      <Box sx={{ width: "100%" }}>
        {/* General Settings - Admin Only */}
        {user.role === 'admin' && tabValue === 0 && (
          <Box>
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Settings saved successfully!
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Junkyard & NMVTIS Configuration
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  {/* Yard Settings Section */}
                  <Stack spacing={2}>
                    <Typography variant="h6" gutterBottom>
                      Junkyard Information
                    </Typography>
                    <Divider />
                  </Stack>

                  <TextField
                    fullWidth
                    label="Business Name"
                    value={yardSettings.name}
                    onChange={(e) =>
                      setYardSettings((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                    helperText="Legal business name for documentation"
                  />

                  <TextField
                    fullWidth
                    label="Business Address"
                    value={yardSettings.address}
                    onChange={(e) =>
                      setYardSettings((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    required
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      label="City"
                      value={yardSettings.city}
                      onChange={(e) =>
                        setYardSettings((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      required
                    />

                    <FormControl fullWidth>
                      <InputLabel>State</InputLabel>
                      <Select
                        value={yardSettings.state}
                        onChange={(e) =>
                          setYardSettings((prev) => ({
                            ...prev,
                            state: e.target.value,
                          }))
                        }
                        required
                      >
                        <MenuItem value="WI">Wisconsin</MenuItem>
                        <MenuItem value="MN">Minnesota</MenuItem>
                        <MenuItem value="IA">Iowa</MenuItem>
                        <MenuItem value="IL">Illinois</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      label="ZIP Code"
                      value={yardSettings.zip}
                      onChange={(e) =>
                        setYardSettings((prev) => ({
                          ...prev,
                          zip: e.target.value,
                        }))
                      }
                      required
                    />
                  </Stack>

                  <TextField
                    fullWidth
                    label="Business Phone"
                    value={yardSettings.phone}
                    onChange={(e) =>
                      setYardSettings((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    required
                  />

                  <TextField
                    fullWidth
                    label="License Number"
                    value={yardSettings.licenseNumber}
                    onChange={(e) =>
                      setYardSettings((prev) => ({
                        ...prev,
                        licenseNumber: e.target.value,
                      }))
                    }
                  />

                  {/* NMVTIS Settings Section */}
                  <Stack spacing={2}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      NMVTIS Reporting Configuration
                    </Typography>
                    <Divider />
                  </Stack>

                  <TextField
                    fullWidth
                    label="NMVTIS Identification Number"
                    value={settings.nmvtisId}
                    onChange={handleInputChange("nmvtisId")}
                    helperText="Your unique NMVTIS reporting identifier"
                  />

                  <TextField
                    fullWidth
                    label="Reporting Frequency (days)"
                    value={settings.reportingFrequency}
                    onChange={handleInputChange("reportingFrequency")}
                    type="number"
                    helperText="How often to generate NMVTIS reports (typically 30 days)"
                  />

                  <TextField
                    fullWidth
                    label="Business Contact Email"
                    value={yardSettings.email}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      setYardSettings((prev) => ({
                        ...prev,
                        email: newEmail,
                      }));
                      // Also update NMVTIS settings email to keep them in sync
                      setSettings((prev) => ({
                        ...prev,
                        businessEmail: newEmail,
                      }));
                    }}
                    type="email"
                    helperText="Email for compliance notifications and reports"
                  />

                  {/* NMVTIS PIN Field */}
                  <TextField
                    fullWidth
                    label="NMVTIS PIN"
                    value={settings.nmvtisPin}
                    onChange={handleInputChange("nmvtisPin")}
                    required
                    helperText="Your NMVTIS reporting PIN (required)"
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    size="large"
                  >
                    Save Settings
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Box>
        )}

        {/* Backup & Recovery - Admin Only */}
        {user.role === 'admin' && tabValue === 1 && <BackupManager />}

        {/* User Management - Admin Only */}
        {user.role === 'admin' && tabValue === 2 && <UserManagement currentUser={user} />}

        {/* Buyer Profiles - Admin Only */}
        {user.role === 'admin' && tabValue === 3 && <BuyerProfilesManager user={user} />}

        {/* Account Management - Both Admin and Driver */}
        {((user.role === 'admin' && tabValue === 4) || (user.role === 'driver' && tabValue === 0)) && (
          <Box>
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Profile updated successfully!
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Profile Management */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <form onSubmit={handleProfileUpdate}>
                <Stack spacing={3}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      required
                    />
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      required
                    />
                  </Stack>

                  <TextField
                    fullWidth
                    label="Email"
                    value={profileForm.email}
                    disabled
                    helperText="Email cannot be changed. Contact an administrator if needed."
                  />

                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />

                  <Typography variant="body2" color="text.secondary">
                    Role: {user.role} • Yard ID: {user.yardId}
                  </Typography>

                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Update Profile
                  </Button>
                </Stack>
              </form>
            </Paper>

            {/* Account Deletion */}
            <Paper
              elevation={2}
              sx={{ p: 3, border: "1px solid", borderColor: "error.main" }}
            >
              <Typography variant="h6" gutterBottom color="error">
                {user.role === 'driver' ? 'Delete Driver Account' : 'Danger Zone'}
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Typography variant="body1" gutterBottom>
                {user.role === 'driver' 
                  ? 'Delete your driver account. Your transactions will remain with the admin account.' 
                  : 'Delete your account permanently. This action cannot be undone.'
                }
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {user.role === 'driver' ? (
                  <>
                    • Your profile will be deleted
                    <br />
                    • All vehicle transactions you created will remain in the system
                    <br />
                    • You will be immediately signed out
                    <br />
                    • This action cannot be reversed
                  </>
                ) : (
                  <>
                    • All your data will be permanently deleted
                    <br />
                    • You will be immediately signed out
                    <br />
                    • This action cannot be reversed
                  </>
                )}
              </Typography>

              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setShowDeleteDialog(true)}
              >
                {user.role === 'driver' ? 'Delete Driver Account' : 'Delete Account'}
              </Button>
            </Paper>
          </Box>
        )}

        {/* Delete Account Confirmation Dialog */}
        <Dialog
          open={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeleteConfirmText("");
            setError("");
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle color="error">
            {user.role === 'driver' ? 'Delete Driver Account' : 'Delete Account'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              {user.role === 'driver' ? (
                <>
                  This will delete your driver account but keep all vehicle transactions in the system. 
                  Your transactions will remain accessible to administrators.
                </>
              ) : (
                <>
                  This will permanently delete your account and all associated data. 
                  This action cannot be undone.
                </>
              )}
            </DialogContentText>

            <DialogContentText sx={{ mb: 2 }}>
              Type <strong>DELETE</strong> to confirm:
            </DialogContentText>

            <TextField
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              error={error.includes("DELETE")}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              variant="contained"
              disabled={deleteConfirmText !== "DELETE"}
            >
              {user.role === 'driver' ? 'Delete Driver Account' : 'Delete Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Settings;
