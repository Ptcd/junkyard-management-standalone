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
} from "@mui/material";
import {
  CloudDownload,
  Email,
  Storage,
  Schedule,
  Warning,
  CheckCircle,
  RestoreFromTrash,
} from "@mui/icons-material";
import {
  downloadBackupFiles,
  sendBackupEmail,
  isBackupDue,
  scheduleMonthlyBackup,
  getAllBackupData,
  restoreFromBackup,
} from "../utils/backupManager";

const BackupManager: React.FC = () => {
  const [backupEmail, setBackupEmail] = useState("");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [backupStatus, setBackupStatus] = useState({
    isDue: false,
    daysUntilNext: 0,
  });
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

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

  const handleSaveSettings = () => {
    localStorage.setItem("backupEmail", backupEmail);
    localStorage.setItem("autoBackupEnabled", autoBackupEnabled.toString());
    setSuccess("Backup settings saved!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleRestoreBackup = () => {
    if (!restoreFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);
        const success = restoreFromBackup(backupData);

        if (success) {
          setSuccess("Data restored successfully! Please refresh the page.");
          setShowRestoreDialog(false);
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
        Data Backup & Recovery
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Protect your junkyard data with automated backups and easy recovery
        options
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

      {/* Backup Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Schedule color={backupStatus.isDue ? "warning" : "success"} />
            <Typography variant="h6">Backup Status</Typography>
            {backupStatus.isDue ? (
              <Chip label="Backup Due" color="warning" />
            ) : (
              <Chip
                label={`${backupStatus.daysUntilNext} days until next backup`}
                color="success"
              />
            )}
          </Stack>

          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Vehicle Purchases
              </Typography>
              <Typography variant="h6">{stats.vehiclePurchases}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Vehicle Sales
              </Typography>
              <Typography variant="h6">{stats.vehicleSales}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Cash Transactions
              </Typography>
              <Typography variant="h6">{stats.cashTransactions}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Records
              </Typography>
              <Typography variant="h6">{stats.totalRecords}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Manual Backup Options */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Manual Backup
        </Typography>
        <Stack spacing={2}>
          <Button
            variant="outlined"
            startIcon={<CloudDownload />}
            onClick={handleDownloadBackup}
            size="large"
          >
            Download Backup Files
          </Button>

          <Divider />

          <Stack direction="row" spacing={2} alignItems="end">
            <TextField
              label="Email Address"
              value={backupEmail}
              onChange={(e) => setBackupEmail(e.target.value)}
              type="email"
              fullWidth
              helperText="Enter email to receive backup files"
            />
            <Button
              variant="contained"
              startIcon={<Email />}
              onClick={handleEmailBackup}
              disabled={emailSending}
              size="large"
            >
              {emailSending ? "Sending..." : "Email Backup"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Automated Backup Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Automated Monthly Backups
        </Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={autoBackupEnabled}
                onChange={(e) => setAutoBackupEnabled(e.target.checked)}
              />
            }
            label="Enable automatic monthly email backups"
          />

          {autoBackupEnabled && (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Automated backups will:</strong>
              </Typography>
              <ul>
                <li>Send backup files to your email every 30 days</li>
                <li>Include vehicle purchases, sales, and NMVTIS logbook</li>
                <li>Provide both JSON and CSV formats</li>
                <li>Keep you compliant with record-keeping requirements</li>
              </ul>
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleSaveSettings}
            disabled={!backupEmail}
          >
            Save Backup Settings
          </Button>
        </Stack>
      </Paper>

      {/* Data Restore */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Recovery
        </Typography>
        <Stack spacing={2}>
          <Alert severity="warning">
            <strong>Warning:</strong> Restoring from backup will overwrite all
            current data. Make sure to download a current backup first!
          </Alert>

          <Button
            variant="outlined"
            startIcon={<RestoreFromTrash />}
            onClick={() => setShowRestoreDialog(true)}
            color="warning"
          >
            Restore from Backup File
          </Button>
        </Stack>
      </Paper>

      {/* Restore Dialog */}
      <Dialog
        open={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Warning color="warning" />
            <Typography variant="h6">Restore from Backup</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="error">
              <strong>This will permanently replace all current data!</strong>
              <br />
              Make sure you have a current backup before proceeding.
            </Alert>

            <input
              type="file"
              accept=".json"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
              id="restore-file-upload"
            />
            <label htmlFor="restore-file-upload">
              <Button variant="outlined" component="span" fullWidth>
                {restoreFile
                  ? `Selected: ${restoreFile.name}`
                  : "Choose Backup File (.json)"}
              </Button>
            </label>
          </Stack>
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
