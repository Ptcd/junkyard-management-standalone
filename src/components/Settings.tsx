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
import { 
  getYardSettingsSync, 
  saveYardSettingsSync, 
  getNMVTISSettingsSync, 
  saveNMVTISSettingsSync,
  forceUpdateYardSettings,
  forceUpdateNMVTISSettings,
  YardSettings,
  NMVTISSettings 
} from "../utils/settingsSync";

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
    const loadSettings = async () => {
      try {
        // Load yard settings with Supabase sync
        const loadedYardSettings = await getYardSettingsSync(user.yardId);
        setYardSettings(loadedYardSettings);

        // Load NMVTIS settings with Supabase sync
        const loadedNMVTISSettings = await getNMVTISSettingsSync(user.yardId);
        
        // Merge yard settings into NMVTIS settings if NMVTIS fields are empty
        const mergedSettings = {
          ...loadedNMVTISSettings,
          entityName: loadedNMVTISSettings.entityName || loadedYardSettings.name,
          businessAddress: loadedNMVTISSettings.businessAddress || loadedYardSettings.address,
          businessCity: loadedNMVTISSettings.businessCity || loadedYardSettings.city,
          businessState: loadedNMVTISSettings.businessState || loadedYardSettings.state,
          businessZip: loadedNMVTISSettings.businessZip || loadedYardSettings.zip,
          businessPhone: loadedNMVTISSettings.businessPhone || loadedYardSettings.phone,
          businessEmail: loadedNMVTISSettings.businessEmail || loadedYardSettings.email,
        };
        
        setSettings(mergedSettings);
      } catch (error) {
        console.error("Error loading settings:", error);
        setError("Failed to load settings. Using local defaults.");
      }
    };

    loadSettings();
  }, [user.yardId]);

  const handleInputChange =
    (field: keyof NMVTISSettings) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleYardSettingsChange =
    (field: keyof YardSettings) =>
    (event: React.ChangeEvent<HTMLInputElement> | any) => {
      setYardSettings((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  // Function to clear demo data and force real settings
  const handleClearDemoData = async () => {
    try {
      const realSettings = {
        name: "",
        address: "",
        city: "",
        state: "WI",
        zip: "",
        phone: "",
        email: "",
        licenseNumber: "",
      };

      // Force update to clear demo data
      const result = await forceUpdateYardSettings(user.yardId, realSettings);
      if (result) {
        setYardSettings(realSettings);
        setSuccess(true);
        setError("");
      } else {
        setError("Failed to clear demo data");
      }
    } catch (error) {
      console.error("Error clearing demo data:", error);
      setError("Failed to clear demo data");
    }

    setTimeout(() => {
      setSuccess(false);
      setError("");
    }, 3000);
  };

  // Function to check if current settings are demo data
  const isDemoData = () => {
    return yardSettings.name === "Demo Junkyard & Auto Parts" ||
           yardSettings.address === "123 Salvage Road";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
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

    try {
      console.log("🚀 Starting settings save process...");
      console.log("👤 User yardId:", user.yardId);
      console.log("📋 Yard settings to save:", yardSettings);

      // Create updated NMVTIS settings with yard settings merged in
      const updatedNMVTISSettings = {
        ...settings,
        entityName: yardSettings.name,
        businessAddress: yardSettings.address,
        businessCity: yardSettings.city,
        businessState: yardSettings.state,
        businessZip: yardSettings.zip,
        businessPhone: yardSettings.phone,
        businessEmail: yardSettings.email,
      };

      console.log("📋 NMVTIS settings to save:", updatedNMVTISSettings);

      // If this is demo data or the user is saving real data over demo data,
      // use force update to ensure it takes precedence over database defaults
      const isDemo = isDemoData();
      console.log("🎭 Is demo data:", isDemo);

      console.log("💾 Attempting to save settings...");
      const [yardSaveResult, nmvtisSaveResult] = await Promise.all([
        isDemo ? 
          forceUpdateYardSettings(user.yardId, yardSettings) :
          saveYardSettingsSync(user.yardId, yardSettings),
        isDemo ?
          forceUpdateNMVTISSettings(user.yardId, updatedNMVTISSettings) :
          saveNMVTISSettingsSync(user.yardId, updatedNMVTISSettings)
      ]);

      console.log("📊 Save results - Yard:", yardSaveResult, "NMVTIS:", nmvtisSaveResult);

      if (yardSaveResult && nmvtisSaveResult) {
        setSuccess(true);
        setError("");
        console.log("✅ Settings saved successfully!");
      } else {
        setSuccess(true);
        setError("Settings saved locally but may not sync across devices - Check console for details");
        console.log("⚠️ Partial save failure - check above logs for errors");
      }
    } catch (error) {
      console.error("💥 Exception during settings save:", error);
      setError("Failed to save settings. Please try again.");
      return;
    }

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
    console.log("handleDeleteAccount called with deleteConfirmText:", deleteConfirmText);
    
    if (deleteConfirmText !== "DELETE") {
      console.log("Confirmation text doesn't match, showing error");
      setError("Please type DELETE to confirm account deletion");
      return;
    }

    console.log("Starting account deletion for user role:", user.role);
    setError(""); // Clear any previous errors

    // For drivers, we want to keep transactions but transfer ownership to admin
    // For admins, we use the standard deletion process
    const result = await deleteAccount();
    
    console.log("deleteAccount result:", result);

    if (result.error) {
      console.error("Account deletion failed:", result.error);
      setError(
        typeof result.error === "string"
          ? result.error
          : "Failed to delete account",
      );
    } else {
      console.log("Account deletion successful, redirecting...");
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
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable" 
            scrollButtons="auto"
          >
            {user.role === 'admin' ? (
              <>
                <Tab 
                  icon={<SettingsIcon />} 
                  label="General Settings"
                  onClick={() => setTabValue(0)}
                />
                <Tab 
                  icon={<Backup />} 
                  label="Backup & Recovery"
                  onClick={() => setTabValue(1)}
                />
                <Tab 
                  icon={<People />} 
                  label="User Management"
                  onClick={() => setTabValue(2)}
                />
                <Tab 
                  icon={<Business />} 
                  label="Buyer Profiles"
                  onClick={() => setTabValue(3)}
                />
                <Tab 
                  icon={<AccountCircle />} 
                  label="Account Management"
                  onClick={() => setTabValue(4)}
                />
              </>
            ) : (
              <Tab 
                icon={<AccountCircle />} 
                label="Account Management" 
                onClick={() => setTabValue(0)}
              />
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
                    onChange={handleYardSettingsChange("name")}
                    required
                    helperText="Legal business name for documentation"
                  />

                  <TextField
                    fullWidth
                    label="Business Address"
                    value={yardSettings.address}
                    onChange={handleYardSettingsChange("address")}
                    required
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      label="City"
                      value={yardSettings.city}
                      onChange={handleYardSettingsChange("city")}
                      required
                    />

                    <FormControl fullWidth>
                      <InputLabel>State</InputLabel>
                      <Select
                        value={yardSettings.state}
                        onChange={handleYardSettingsChange("state")}
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
                      onChange={handleYardSettingsChange("zip")}
                      required
                    />
                  </Stack>

                  <TextField
                    fullWidth
                    label="Business Phone"
                    value={yardSettings.phone}
                    onChange={handleYardSettingsChange("phone")}
                    required
                  />

                  <TextField
                    fullWidth
                    label="License Number"
                    value={yardSettings.licenseNumber}
                    onChange={handleYardSettingsChange("licenseNumber")}
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

                  {/* Demo Data Warning and Clear Button */}
                  {isDemoData() && (
                    <Alert severity="warning" sx={{ my: 2 }}>
                      <Typography variant="body2">
                        <strong>Demo Data Detected:</strong> Your settings are currently showing demo information. 
                        Click "Clear Demo Data" to start fresh, or simply edit the fields above with your real information.
                      </Typography>
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<Delete />}
                        onClick={handleClearDemoData}
                        sx={{ mt: 1 }}
                        size="small"
                      >
                        Clear Demo Data
                      </Button>
                    </Alert>
                  )}

                  {/* Debug Panel */}
                  <Alert severity="info" sx={{ my: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Debug Info:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      • User Role: {user.role}<br/>
                      • Yard ID: {user.yardId}<br/>
                      • Demo Data: {isDemoData() ? 'Yes' : 'No'}<br/>
                      • Current Business Name: {yardSettings.name}<br/>
                      • Last Save Status: {success ? 'Success' : error ? 'Error' : 'Not saved yet'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8em', color: 'text.secondary' }}>
                      After clicking "Save Settings", check your browser console (F12) for detailed sync logs with emoji indicators (🔄 ✅ ❌).
                    </Typography>
                  </Alert>

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
        {user.role === 'admin' && tabValue === 1 && (
          <Box>
            <BackupManager />
          </Box>
        )}

        {/* User Management - Admin Only */}
        {user.role === 'admin' && tabValue === 2 && (
          <Box>
            <UserManagement currentUser={user} />
          </Box>
        )}

        {/* Buyer Profiles - Admin Only */}
        {user.role === 'admin' && tabValue === 3 && (
          <Box>
            <BuyerProfilesManager user={user} />
          </Box>
        )}

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
              onClick={() => {
                console.log("Delete button clicked! Test message");
                handleDeleteAccount();
              }}
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
