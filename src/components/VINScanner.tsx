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
import { CameraAlt, Close, Search, CheckCircle, PhotoCamera } from "@mui/icons-material";
import OfflineManager from "../utils/offlineManager";
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat } from '@zxing/library';

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
  const [readyToScan, setReadyToScan] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const barcodeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const decodeVIN = async (vin: string): Promise<VINDecodeResult> => {
    if (vin.length !== 17) {
      return { vin, valid: false };
    }
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
      );
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      if (!data.Results || !data.Results[0]) throw new Error('Invalid API response');
      const result = data.Results[0];
      const make = result.Make || '';
      const model = result.Model || '';
      const year = result.ModelYear || '';
      const vehicleType = result.VehicleType || '';
      const engineSize = result.DisplacementL || '';
      const fuelType = result.FuelTypePrimary || '';
      const manufacturer = result.Manufacturer || '';
      const plantCountry = result.PlantCountry || '';
      const errorCode = result.ErrorCode || '';
      const isValid = errorCode === '0' || errorCode === '' || result.Make !== '';
      return {
        vin,
        year: year && year !== '' ? year : undefined,
        make: make && make !== '' ? make : undefined,
        model: model && model !== '' ? model : undefined,
        vehicleType: vehicleType && vehicleType !== '' ? vehicleType : undefined,
        engineSize: engineSize && engineSize !== '' ? engineSize : undefined,
        fuelType: fuelType && fuelType !== '' ? fuelType : undefined,
        manufacturer: manufacturer && manufacturer !== '' ? manufacturer : undefined,
        plantCountry: plantCountry && plantCountry !== '' ? plantCountry : undefined,
        valid: isValid,
      };
    } catch (error) {
      // Fallback: just return the VIN as valid
      return { vin, valid: true };
    }
  };

  const handleVINSubmit = async (vin: string) => {
    if (!vin || vin.length !== 17) {
      return;
    }
    const decoded = await decodeVIN(vin);
    setDecodedData(decoded);
    setPhotoPreview(null);
    onVINDetected(decoded);
    handleClose();
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
