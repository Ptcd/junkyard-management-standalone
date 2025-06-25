import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  CloudDownload,
  Email,
  Storage,
  Schedule,
  Warning,
  CheckCircle,
  RestoreFromTrash,
  CloudUpload,
  Save,
  Restore,
  Error as ErrorIcon,
  Delete,
  Backup,
  Security,
} from "@mui/icons-material";
import {
  getAllBackupData,
  downloadBackupFiles,
  sendBackupEmail,
  restoreFromBackup as restoreFromBackupFile,
  isBackupDue,
  scheduleMonthlyBackup,
} from "../utils/backupManager";
import {
  getDataProtectionConfig,
  saveDataProtectionConfig,
  createLocalBackup,
  validateDataIntegrity,
  getLocalBackups,
  restoreFromBackup as restoreFromLocalBackup,
  emergencyDataRecovery,
  syncCriticalDataToCloud,
  DataProtectionConfig,
  DataValidationResult,
} from "../utils/dataProtection";

const BackupManager: React.FC = () => {
  const [backupEmail, setBackupEmail] = useState("");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [backupStatus, setBackupStatus] = useState({
    isDue: false,
    daysUntilNext: 30,
  });
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  
  // Data protection states
  const [protectionConfig, setProtectionConfig] = useState<DataProtectionConfig | null>(null);
  const [validationResult, setValidationResult] = useState<DataValidationResult | null>(null);
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [showBackupsDialog, setShowBackupsDialog] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load backup settings
    const savedEmail = localStorage.getItem("backupEmail");
    const autoBackup = localStorage.getItem("autoBackupEnabled") === "true";

    if (savedEmail) setBackupEmail(savedEmail);
    setAutoBackupEnabled(autoBackup);

    // Check backup status
    const status = isBackupDue();
    setBackupStatus(status);

    // Auto-schedule if enabled and due
    if (autoBackup && savedEmail && status.isDue) {
      scheduleMonthlyBackup(savedEmail);
    }

    // Load data protection config
    const config = getDataProtectionConfig();
    setProtectionConfig(config);

    // Run initial data validation
    const validation = validateDataIntegrity();
    setValidationResult(validation);

    // Load local backups
    const backups = getLocalBackups();
    setLocalBackups(backups);
  }, []);

  const handleDownloadBackup = () => {
    try {
      downloadBackupFiles();
      setSuccess("Backup files downloaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to download backup files");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleEmailBackup = async () => {
    if (!backupEmail) {
      setError("Please enter an email address");
      return;
    }

    setEmailSending(true);
    try {
      const result = await sendBackupEmail(backupEmail);

      if (result.success) {
        setSuccess(result.message);
        // Update backup status
        const status = isBackupDue();
        setBackupStatus(status);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to send backup email");
    } finally {
      setEmailSending(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    }
  };

  const handleCreateLocalBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await createLocalBackup("manual");
      if (result.success) {
        setSuccess(result.message);
        // Refresh local backups list
        const backups = getLocalBackups();
        setLocalBackups(backups);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Failed to create local backup");
    } finally {
      setIsCreatingBackup(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 3000);
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    try {
      const result = await syncCriticalDataToCloud();
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Failed to sync to cloud");
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 3000);
    }
  };

  const handleEmergencyRecovery = async () => {
    try {
      const result = await emergencyDataRecovery();
      if (result.success) {
        setSuccess(result.message);
        // Refresh validation
        const validation = validateDataIntegrity();
        setValidationResult(validation);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Emergency recovery failed");
    }
  };

  const handleRestoreFromLocalBackup = (backupId: string) => {
    const result = restoreFromLocalBackup(backupId);
    if (result.success) {
      setSuccess(result.message);
      // Refresh validation
      const validation = validateDataIntegrity();
      setValidationResult(validation);
    } else {
      setError(result.message);
    }
    setShowBackupsDialog(false);
  };

  const handleSaveSettings = () => {
    if (!protectionConfig) return;

    localStorage.setItem("backupEmail", backupEmail);
    localStorage.setItem("autoBackupEnabled", autoBackupEnabled.toString());
    
    const updatedConfig = {
      ...protectionConfig,
      autoBackupEnabled,
      backupEmail,
    };
    
    saveDataProtectionConfig(updatedConfig);
    setProtectionConfig(updatedConfig);
    setSuccess("Backup settings saved!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleRestoreBackup = () => {
    if (!restoreFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);
        const success = restoreFromBackupFile(backupData);

        if (success) {
          setSuccess("Data restored successfully! Please refresh the page.");
          setShowRestoreDialog(false);
          // Refresh validation
          const validation = validateDataIntegrity();
          setValidationResult(validation);
        } else {
          setError("Failed to restore backup data");
        }
      } catch (err) {
        setError("Invalid backup file format");
      }

      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    };

    reader.readAsText(restoreFile);
  };

  const getDataStats = () => {
    const data = getAllBackupData();
    return {
      vehiclePurchases: data.vehicleTransactions.length,
      vehicleSales: data.vehicleSales.length,
      cashTransactions: data.cashTransactions.length,
      totalRecords: Object.values(data).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0,
      ),
    };
  };

  const stats = getDataStats();

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Data Protection & Backup Manager
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Protect your data with automatic backups, validation checks, and emergency recovery
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

      {/* Data Validation Status */}
      {validationResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              {validationResult.isValid ? (
                <CheckCircle color="success" />
              ) : (
                <ErrorIcon color="error" />
              )}
              <Box>
                <Typography variant="h6">
                  Data Integrity: {validationResult.isValid ? "Good" : "Issues Found"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Checked {validationResult.checkedTables.length} data tables
                </Typography>
              </Box>
            </Stack>
            
            {validationResult.errors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error">Errors:</Typography>
                <List dense>
                  {validationResult.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {validationResult.warnings.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="warning.main">Warnings:</Typography>
                <List dense>
                  {validationResult.warnings.map((warning, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={warning} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<Backup />}
              onClick={handleCreateLocalBackup}
              disabled={isCreatingBackup}
            >
              {isCreatingBackup ? "Creating..." : "Create Backup"}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={handleSyncToCloud}
              disabled={isSyncing}
            >
              {isSyncing ? "Syncing..." : "Sync to Cloud"}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={() => setShowBackupsDialog(true)}
            >
              View Backups ({localBackups.length})
            </Button>
            
            <Button
              variant="outlined"
              color="warning"
              startIcon={<Security />}
              onClick={handleEmergencyRecovery}
            >
              Emergency Recovery
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Backup Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backup Status
          </Typography>
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Last Backup
              </Typography>
              <Typography variant="body1">
                {protectionConfig ? new Date(protectionConfig.lastBackup).toLocaleString() : "Never"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Next Backup Due
              </Typography>
              <Typography variant="body1">
                {backupStatus.isDue ? (
                  <Chip color="warning" label="Backup Due Now" size="small" />
                ) : (
                  `${backupStatus.daysUntilNext} days`
                )}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Local Backups
              </Typography>
              <Typography variant="body1">{localBackups.length} available</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backup Configuration
          </Typography>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Backup Email Address"
              type="email"
              value={backupEmail}
              onChange={(e) => setBackupEmail(e.target.value)}
              helperText="Email address for automatic backup notifications"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={autoBackupEnabled}
                  onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                />
              }
              label="Enable Automatic Daily Backups"
            />

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveSettings}
              >
                Save Settings
              </Button>

              <Button
                variant="outlined"
                startIcon={<Email />}
                onClick={handleEmailBackup}
                disabled={emailSending || !backupEmail}
              >
                {emailSending ? "Sending..." : "Send Backup Email"}
              </Button>

              <Button
                variant="outlined"
                startIcon={<CloudDownload />}
                onClick={handleDownloadBackup}
              >
                Download Backup
              </Button>

              <Button
                variant="outlined"
                startIcon={<Restore />}
                onClick={() => setShowRestoreDialog(true)}
              >
                Restore from File
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Local Backups Dialog */}
      <Dialog open={showBackupsDialog} onClose={() => setShowBackupsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Local Backups</DialogTitle>
        <DialogContent>
          {localBackups.length === 0 ? (
            <Typography>No local backups available</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Label</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Tables</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {localBackups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>{backup.label}</TableCell>
                      <TableCell>{new Date(backup.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{Object.keys(backup.tables).length}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleRestoreFromLocalBackup(backup.id)}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBackupsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onClose={() => setShowRestoreDialog(false)}>
        <DialogTitle>Restore from Backup File</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will replace all current data with the backup data. This action cannot be undone.
          </Alert>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
            style={{ margin: "16px 0" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRestoreDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRestoreBackup}
            variant="contained"
            color="warning"
            disabled={!restoreFile}
          >
            Restore Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupManager;
