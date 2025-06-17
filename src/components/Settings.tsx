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

  const settingsSections = [
    { label: 'General Settings', icon: <SettingsIcon /> },
    { label: 'Backup & Recovery', icon: <Backup /> },
    { label: 'User Management', icon: <People /> },
    { label: 'Buyer Profiles', icon: <Business /> },
    { label: 'Account Management', icon: <AccountCircle /> },
  ];

  useEffect(() => {
    // Load yard settings from localStorage first
    const savedYardSettings = localStorage.getItem("yardSettings");
    if (savedYardSettings) {
      try {
        const loadedYardSettings = JSON.parse(savedYardSettings);
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
          entityName: loaded.entityName || yardSettings.name,
          businessAddress: loaded.businessAddress || yardSettings.address,
          businessEmail: loaded.businessEmail || yardSettings.email,
        }));
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    } else {
      // If no saved settings, initialize from yardSettings
      setSettings((prev) => ({
        ...prev,
        entityName: yardSettings.name,
        businessAddress: yardSettings.address,
        businessEmail: yardSettings.email,
      }));
    }
  }, [yardSettings.name, yardSettings.address, yardSettings.email]);

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

    // Validate required fields
    const requiredFields = [
      "nmvtisPin",
      "entityName",
      "businessAddress",
    ];
    const missingFields = requiredFields.filter(
      (field) => !settings[field as keyof NMVTISSettings],
    );

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
            <Tab icon={<SettingsIcon />} label="General Settings" iconPosition="start" />
            <Tab icon={<Backup />} label="Backup & Recovery" iconPosition="start" />
            <Tab icon={<People />} label="User Management" iconPosition="start" />
            <Tab icon={<Business />} label="Buyer Profiles" iconPosition="start" />
            <Tab icon={<AccountCircle />} label="Account Management" iconPosition="start" />
          </Tabs>
        </Paper>
      )}

      {/* Tab Content (single column, full width on mobile) */}
      <Box sx={{ maxWidth: 600, mx: 'auto', width: '100%' }}>
        {tabValue === 0 && (
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
              <form onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  {/* Yard Information Section */}
                  <Stack spacing={2}>
                    <Typography variant="h6" gutterBottom>
                      Junkyard Information
                    </Typography>
                    <Divider />
                  </Stack>

                  <TextField
                    fullWidth
                    label="Business Name (Entity Name)"
                    value={yardSettings.name}
                    onChange={(e) =>
                      setYardSettings((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />

                  <TextField
                    fullWidth
                    label="Address (Business Address)"
                    value={yardSettings.address}
                    onChange={(e) =>
                      setYardSettings((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="City"
                      value={yardSettings.city}
                      onChange={(e) =>
                        setYardSettings((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="State"
                      value={yardSettings.state}
                      onChange={(e) =>
                        setYardSettings((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      sx={{ width: 100 }}
                    />
                    <TextField
                      label="ZIP Code"
                      value={yardSettings.zip}
                      onChange={(e) =>
                        setYardSettings((prev) => ({
                          ...prev,
                          zip: e.target.value,
                        }))
                      }
                      sx={{ width: 120 }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Phone Number"
                      value={yardSettings.phone}
                      onChange={(e) =>
                        setYardSettings((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      sx={{ flex: 1 }}
                    />
                  </Stack>

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

        {tabValue === 1 && <BackupManager />}

        {tabValue === 2 && <UserManagement currentUser={user} />}

        {tabValue === 3 && <BuyerProfilesManager user={user} />}

        {tabValue === 4 && (
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
                Danger Zone
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Typography variant="body1" gutterBottom>
                Delete your account permanently. This action cannot be undone.
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                • All your data will be permanently deleted • You will be
                immediately signed out • This action cannot be reversed
              </Typography>

              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete Account
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
          <DialogTitle color="error">Delete Account</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              This will permanently delete your account and all associated data.
              This action cannot be undone.
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
              Delete Account
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default Settings;
