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
} from "@mui/material";
import { Save as SaveIcon, Settings as SettingsIcon, Backup, People, Business } from "@mui/icons-material";
import BackupManager from "./BackupManager";
import UserManagement from "./UserManagement";
import BuyerProfilesManager from "./BuyerProfilesManager";
import { User } from "../utils/supabaseAuth";

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

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("nmvtisSettings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    }
  }, []);

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
      "nmvtisId",
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

    // Save to localStorage
    localStorage.setItem("nmvtisSettings", JSON.stringify(settings));

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Configure junkyard operations, NMVTIS reporting, and data backup
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<SettingsIcon />} label="General Settings" iconPosition="start" />
          <Tab icon={<Backup />} label="Backup & Recovery" iconPosition="start" />
          <Tab icon={<People />} label="User Management" iconPosition="start" />
          <Tab icon={<Business />} label="Buyer Profiles" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
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
                  label="Business Name"
                  value={yardSettings.name}
                  onChange={(e) => setYardSettings(prev => ({ ...prev, name: e.target.value }))}
                />

                <TextField
                  fullWidth
                  label="Address"
                  value={yardSettings.address}
                  onChange={(e) => setYardSettings(prev => ({ ...prev, address: e.target.value }))}
                />

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="City"
                    value={yardSettings.city}
                    onChange={(e) => setYardSettings(prev => ({ ...prev, city: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="State"
                    value={yardSettings.state}
                    onChange={(e) => setYardSettings(prev => ({ ...prev, state: e.target.value }))}
                    sx={{ width: 100 }}
                  />
                  <TextField
                    label="ZIP Code"
                    value={yardSettings.zip}
                    onChange={(e) => setYardSettings(prev => ({ ...prev, zip: e.target.value }))}
                    sx={{ width: 120 }}
                  />
                </Stack>

                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Phone Number"
                    value={yardSettings.phone}
                    onChange={(e) => setYardSettings(prev => ({ ...prev, phone: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Email"
                    value={yardSettings.email}
                    onChange={(e) => setYardSettings(prev => ({ ...prev, email: e.target.value }))}
                    sx={{ flex: 1 }}
                  />
                </Stack>

                <TextField
                  fullWidth
                  label="License Number"
                  value={yardSettings.licenseNumber}
                  onChange={(e) => setYardSettings(prev => ({ ...prev, licenseNumber: e.target.value }))}
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
                  value={settings.businessEmail}
                  onChange={handleInputChange("businessEmail")}
                  type="email"
                  helperText="Email for compliance notifications and reports"
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

      {tabValue === 1 && (
        <BackupManager />
      )}

      {tabValue === 2 && (
        <UserManagement currentUser={user} />
      )}

      {tabValue === 3 && (
        <BuyerProfilesManager user={user} />
      )}
    </Box>
  );
};

export default Settings;
