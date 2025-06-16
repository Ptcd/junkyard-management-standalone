import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Chip,
} from "@mui/material";
import { CameraAlt, Close, Search, CheckCircle } from "@mui/icons-material";
import OfflineManager from "../utils/offlineManager";
import { BarcodeReader } from "@zxing/browser";

interface VINScannerProps {
  open: boolean;
  onClose: () => void;
  onVINDetected: (vinData: VINDecodeResult) => void;
}

interface VINDecodeResult {
  vin: string;
  year?: string;
  make?: string;
  model?: string;
  vehicleType?: string;
  engineSize?: string;
  fuelType?: string;
  manufacturer?: string;
  plantCountry?: string;
  valid: boolean;
}

const VINScanner: React.FC<VINScannerProps> = ({
  open,
  onClose,
  onVINDetected,
}) => {
  const [manualVIN, setManualVIN] = useState("");
  const [decodedData, setDecodedData] = useState<VINDecodeResult | null>(null);
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const barcodeReaderRef = useRef<BarcodeReader | null>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  const handleVINSubmit = async (vin: string) => {
    if (!vin || vin.length !== 17) {
      return;
    }
    // For now, just set the decodedData to a simple object with the VIN
    setDecodedData({ vin, valid: true });
  };

  const handleUseVIN = () => {
    if (decodedData) {
      onVINDetected(decodedData);
      handleClose();
    }
  };

  const handleClose = useCallback(() => {
    setManualVIN("");
    setDecodedData(null);
    onClose();
  }, [onClose]);

  const startBarcodeScanner = async () => {
    setBarcodeScanning(true);
    if (!videoElementRef.current) return;
    barcodeReaderRef.current = new BarcodeReader();
    try {
      const result = await barcodeReaderRef.current.decodeOnceFromVideoDevice(
        undefined,
        videoElementRef.current,
      );
      if (result && result.text && result.text.length === 17) {
        handleVINSubmit(result.text.trim());
        setBarcodeScanning(false);
      } else {
        alert("No valid 17-character VIN barcode found.");
        setBarcodeScanning(false);
      }
    } catch (err) {
      alert(
        "Barcode scan failed: " + (err instanceof Error ? err.message : err),
      );
      setBarcodeScanning(false);
    }
  };

  const stopBarcodeScanner = () => {
    setBarcodeScanning(false);
    if (barcodeReaderRef.current) {
      barcodeReaderRef.current.reset();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">VIN Scanner & Decoder</Typography>
          <Button onClick={handleClose} color="inherit">
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!decodedData && (
          <Stack spacing={3}>
            {/* Manual Entry */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Search sx={{ mr: 1 }} />
                  Manual Entry
                </Typography>

                <Box sx={{ py: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Enter the 17-character VIN manually
                  </Typography>

                  <input
                    type="text"
                    value={manualVIN}
                    onChange={(e) => setManualVIN(e.target.value.toUpperCase())}
                    placeholder="Enter VIN (17 characters)"
                    maxLength={17}
                    style={{
                      width: "100%",
                      padding: "12px",
                      fontSize: "16px",
                      fontFamily: "monospace",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      marginTop: "8px",
                      marginBottom: "16px",
                    }}
                  />

                  <Button
                    variant="contained"
                    onClick={() => handleVINSubmit(manualVIN)}
                    disabled={manualVIN.length !== 17}
                    fullWidth
                    startIcon={<Search />}
                  >
                    Decode VIN
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Barcode Scanner */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <CameraAlt sx={{ mr: 1 }} />
                  Barcode Scanner
                </Typography>
                {!barcodeScanning ? (
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Use your camera to scan the VIN barcode (usually under the
                      windshield or on the door jamb)
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={startBarcodeScanner}
                      startIcon={<CameraAlt />}
                      sx={{ mt: 2 }}
                    >
                      Start Barcode Scanner
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <video
                      ref={videoElementRef}
                      autoPlay
                      playsInline
                      style={{
                        width: "100%",
                        height: 240,
                        background: "#222",
                        borderRadius: 8,
                      }}
                    />
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        onClick={stopBarcodeScanner}
                        fullWidth
                      >
                        Stop
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* Decoded VIN Results */}
        {decodedData && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">VIN Decoded Successfully</Typography>
              </Box>

              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    VIN Number
                  </Typography>
                  <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
                    {decodedData.vin}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Year
                  </Typography>
                  <Typography variant="body1">
                    {decodedData.year || "Unknown"}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Make
                  </Typography>
                  <Typography variant="body1">
                    {decodedData.make || "Unknown"}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Model
                  </Typography>
                  <Typography variant="body1">
                    {decodedData.model || "Unknown"}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">
                    {decodedData.vehicleType || "Unknown"}
                  </Typography>
                </Stack>

                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={decodedData.valid ? "Valid VIN" : "Invalid VIN"}
                    color={decodedData.valid ? "success" : "error"}
                    icon={<CheckCircle />}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {decodedData && (
          <Button
            variant="contained"
            onClick={handleUseVIN}
            disabled={!decodedData.valid}
          >
            Use This VIN
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VINScanner;
