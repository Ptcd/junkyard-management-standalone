import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Chip,
  Snackbar,
  IconButton,
  Typography,
  Button,
  Stack,
} from "@mui/material";
import {
  WifiOff,
  Wifi,
  Sync as SyncIcon,
  Close as CloseIcon,
  CloudQueue,
} from "@mui/icons-material";
import OfflineManager from "../utils/offlineManager";

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [showSyncMessage, setShowSyncMessage] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const offlineManager = OfflineManager.getInstance();

  useEffect(() => {
    // Check if offline functionality is supported
    setIsSupported(offlineManager.canWorkOffline());

    // Listen for online/offline status changes
    const handleOnlineStatusChange = (online: boolean) => {
      setIsOnline(online);
      if (!online) {
        setShowOfflineAlert(true);
      }
      updateQueuedCount();
    };

    // Listen for sync completion
    const handleSyncComplete = (event: CustomEvent) => {
      setSyncMessage(event.detail);
      setShowSyncMessage(true);
      updateQueuedCount();
    };

    offlineManager.addOnlineStatusListener(handleOnlineStatusChange);
    window.addEventListener(
      "syncComplete",
      handleSyncComplete as EventListener,
    );

    // Initial load
    updateQueuedCount();

    return () => {
      offlineManager.removeOnlineStatusListener(handleOnlineStatusChange);
      window.removeEventListener(
        "syncComplete",
        handleSyncComplete as EventListener,
      );
    };
  }, []);

  const updateQueuedCount = () => {
    setQueuedCount(offlineManager.getQueuedTransactionCount());
  };

  const handleManualSync = async () => {
    try {
      await offlineManager.syncQueuedTransactions();
      setSyncMessage("Manual sync completed successfully");
      setShowSyncMessage(true);
    } catch (error) {
      setSyncMessage("Manual sync failed");
      setShowSyncMessage(true);
    }
  };

  const handleCloseOfflineAlert = () => {
    setShowOfflineAlert(false);
  };

  const handleCloseSyncMessage = () => {
    setShowSyncMessage(false);
  };

  if (!isSupported) {
    return null; // Don't show anything if offline features aren't supported
  }

  return (
    <>
      {/* Connection Status Indicator */}
      <Box sx={{ position: "fixed", top: 70, right: 16, zIndex: 1300 }}>
        <Stack spacing={1} alignItems="flex-end">
          {/* Online/Offline Status */}
          <Chip
            icon={isOnline ? <Wifi /> : <WifiOff />}
            label={isOnline ? "Online" : "Offline"}
            color={isOnline ? "success" : "error"}
            size="small"
            variant="filled"
          />

          {/* Queued Transactions Indicator */}
          {queuedCount > 0 && (
            <Chip
              icon={<CloudQueue />}
              label={`${queuedCount} queued`}
              color="warning"
              size="small"
              variant="filled"
              onClick={isOnline ? handleManualSync : undefined}
              sx={{
                cursor: isOnline ? "pointer" : "default",
                opacity: isOnline ? 1 : 0.7,
              }}
            />
          )}

          {/* Manual Sync Button (when online and has queued items) */}
          {isOnline && queuedCount > 0 && (
            <Button
              startIcon={<SyncIcon />}
              onClick={handleManualSync}
              size="small"
              variant="outlined"
              color="primary"
            >
              Sync Now
            </Button>
          )}
        </Stack>
      </Box>

      {/* Offline Alert */}
      <Snackbar
        open={showOfflineAlert}
        autoHideDuration={null} // Keep open until manually closed
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleCloseOfflineAlert}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography variant="body2">
            <strong>You're offline!</strong>
            {queuedCount > 0
              ? ` ${queuedCount} transactions will sync when connection returns.`
              : " New transactions will be saved locally and synced when connection returns."}
          </Typography>
        </Alert>
      </Snackbar>

      {/* Sync Completion Message */}
      <Snackbar
        open={showSyncMessage}
        autoHideDuration={4000}
        onClose={handleCloseSyncMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={handleCloseSyncMessage}>
          {syncMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OfflineIndicator;
