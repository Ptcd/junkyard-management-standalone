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
// @ts-ignore
import Quagga from 'quagga';
import Tesseract from 'tesseract.js';

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
  const [scanning, setScanning] = useState(false);
  const [manualVIN, setManualVIN] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState("");
  const [decodedData, setDecodedData] = useState<VINDecodeResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const startCamera = async () => {
    try {
      setScanning(true);
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use rear camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(
        "Unable to access camera. Please check permissions or try manual entry.",
      );
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const decodeVIN = async (vin: string): Promise<VINDecodeResult> => {
    // Basic VIN validation
    if (vin.length !== 17) {
      throw new Error("VIN must be exactly 17 characters");
    }

    try {
      // Use NHTSA DecodeVinValues API (flat format - easier to parse)
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.Results || !data.Results[0]) {
        throw new Error("Invalid API response format");
      }

      // Parse the NHTSA flat format response
      const result = data.Results[0];

      // Extract key vehicle information
      const make = result.Make || "";
      const model = result.Model || "";
      const year = result.ModelYear || "";
      const vehicleType = result.VehicleType || "";
      const engineSize = result.DisplacementL || "";
      const fuelType = result.FuelTypePrimary || "";
      const manufacturer = result.Manufacturer || "";
      const plantCountry = result.PlantCountry || "";

      // Check if VIN decode was successful
      const errorCode = result.ErrorCode || "";
      const isValid =
        errorCode === "0" || errorCode === "" || result.Make !== "";

      return {
        vin,
        year: year && year !== "" ? year : undefined,
        make: make && make !== "" ? make : undefined,
        model: model && model !== "" ? model : undefined,
        vehicleType:
          vehicleType && vehicleType !== "" ? vehicleType : undefined,
        engineSize: engineSize && engineSize !== "" ? engineSize : undefined,
        fuelType: fuelType && fuelType !== "" ? fuelType : undefined,
        manufacturer:
          manufacturer && manufacturer !== "" ? manufacturer : undefined,
        plantCountry:
          plantCountry && plantCountry !== "" ? plantCountry : undefined,
        valid: isValid,
      };
    } catch (error) {
      console.error("NHTSA API failed, using fallback decoder:", error);

      // Fallback to improved local decoder
      return fallbackDecodeVIN(vin);
    }
  };

  // Improved fallback VIN decoder with proper year handling
  const fallbackDecodeVIN = (vin: string): VINDecodeResult => {
    const wmi = vin.substring(0, 3); // World Manufacturer Identifier
    const vds = vin.substring(3, 9); // Vehicle Descriptor Section
    const yearChar = vin.charAt(9); // Model year character
    const plant = vin.charAt(10); // Manufacturing plant
    const serialNumber = vin.substring(11); // Serial number

    // Comprehensive manufacturer lookup based on WMI
    const manufacturers: { [key: string]: string } = {
      // GM brands
      "1G1": "Chevrolet",
      "1G4": "Buick",
      "1G6": "Cadillac",
      "1GC": "Chevrolet Truck",
      "1GT": "GMC",
      "1GY": "Cadillac",
      "3G7": "Pontiac",
      "2G1": "Chevrolet",

      // Ford brands
      "1FA": "Ford",
      "1FB": "Ford",
      "1FC": "Ford",
      "1FD": "Ford",
      "1FE": "Ford",
      "1FF": "Ford",
      "1FG": "Ford",
      "1FH": "Ford",
      "1FJ": "Ford",
      "1FK": "Ford",
      "1FL": "Ford",
      "1FM": "Ford",
      "1FN": "Ford",
      "1FP": "Ford",
      "1FR": "Ford",
      "1FS": "Ford",
      "1FT": "Ford",
      "1FU": "Ford",
      "1FV": "Ford",
      "1FW": "Ford",
      "1FX": "Ford",
      "1FY": "Ford",
      "1FZ": "Ford",

      // Chrysler brands
      "1C3": "Chrysler",
      "1C4": "Jeep",
      "1C6": "Chrysler",
      "1D3": "Dodge",
      "1D4": "Dodge",
      "1D7": "Dodge",
      "2C3": "Chrysler",
      "2D4": "Dodge",

      // Japanese brands
      "1N4": "Nissan",
      "1N6": "Nissan",
      "2T1": "Toyota",
      "2T2": "Toyota",
      "2T3": "Toyota",
      "4T1": "Toyota",
      "4T3": "Toyota",
      "5N1": "Nissan",
      "5N3": "Nissan",
      JH4: "Acura",
      JHM: "Honda",
      JM1: "Mazda",
      JM3: "Mazda",
      JF1: "Subaru",
      JF2: "Subaru",
      "19U": "Acura",
      "1HG": "Honda",

      // Korean brands
      KM8: "Hyundai",
      KNM: "Hyundai",
      KNA: "Kia",
      KNB: "Kia",
      KND: "Kia",

      // European brands
      WBA: "BMW",
      WBS: "BMW",
      WBY: "BMW",
      WDB: "Mercedes-Benz",
      WDC: "Mercedes-Benz",
      WDD: "Mercedes-Benz",
      WDF: "Mercedes-Benz",
      WDG: "Mercedes-Benz",
      "3VW": "Volkswagen",
      WVW: "Volkswagen",
      WAU: "Audi",
      WA1: "Audi",
      YV1: "Volvo",
      YV4: "Volvo",
      SAL: "Land Rover",
      SAJ: "Jaguar",

      // Others
      "5YJ": "Tesla",
      "7SA": "Tesla",
    };

    // Decode year character - handle the 30-year cycle properly
    const decodeYear = (yearChar: string): string => {
      const char = yearChar.toUpperCase();

      // Numbers are straightforward (2001-2009)
      const numberYears: { [key: string]: string } = {
        "1": "2001",
        "2": "2002",
        "3": "2003",
        "4": "2004",
        "5": "2005",
        "6": "2006",
        "7": "2007",
        "8": "2008",
        "9": "2009",
      };

      if (numberYears[char]) {
        return numberYears[char];
      }

      // For letters, we need to determine if it's 1980s, 2010s, or beyond
      // Since this is fallback, we'll make reasonable assumptions based on current date
      const currentYear = new Date().getFullYear();

      const letterMappings = {
        A: [1980, 2010],
        B: [1981, 2011],
        C: [1982, 2012],
        D: [1983, 2013],
        E: [1984, 2014],
        F: [1985, 2015],
        G: [1986, 2016],
        H: [1987, 2017],
        J: [1988, 2018],
        K: [1989, 2019],
        L: [1990, 2020],
        M: [1991, 2021],
        N: [1992, 2022],
        P: [1993, 2023],
        R: [1994, 2024],
        S: [1995, 2025],
        T: [1996, 2026],
        V: [1997, 2027],
        W: [1998, 2028],
        X: [1999, 2029],
        Y: [2000, 2030],
      };

      const years = letterMappings[char as keyof typeof letterMappings];
      if (years) {
        // Choose the most reasonable year based on current date
        // If we're closer to the newer cycle, choose that
        const [older, newer] = years;
        return currentYear >= 2010 ? newer.toString() : older.toString();
      }

      return "Unknown";
    };

    const manufacturer = manufacturers[wmi] || "Unknown";
    const modelYear = decodeYear(yearChar);

    return {
      vin,
      year: modelYear !== "Unknown" ? modelYear : undefined,
      make: manufacturer !== "Unknown" ? manufacturer : undefined,
      model: undefined, // Would need VDS decoding for specific models
      vehicleType: undefined,
      manufacturer: manufacturer !== "Unknown" ? manufacturer : undefined,
      valid: true,
    };
  };

  const handleVINSubmit = async (vin: string) => {
    if (!vin || vin.length !== 17) {
      setError("Please enter a valid 17-character VIN");
      return;
    }

    setDecoding(true);
    setError("");

    try {
      const decoded = await decodeVIN(vin.toUpperCase());
      setDecodedData(decoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decode VIN");
    } finally {
      setDecoding(false);
    }
  };

  const handleUseVIN = () => {
    if (decodedData) {
      onVINDetected(decodedData);
      handleClose();
    }
  };

  const handleClose = useCallback(() => {
    stopCamera();
    setManualVIN("");
    setDecodedData(null);
    setError("");
    onClose();
  }, [onClose]);

  const captureFrame = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    // Display canvas image data in the UI for debugging
    setError("Canvas image data: " + canvas.toDataURL());

    setDecoding(true);
    setError("");

    try {
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      // Display OCR result in the UI for debugging
      setError("OCR Result: " + text);
      // Find a 17-character VIN-like string in the OCR result
      const vinMatch = text.match(/[A-HJ-NPR-Z0-9]{17}/);
      if (vinMatch) {
        const vin = vinMatch[0];
        setError("Matched VIN: " + vin);
        await handleVINSubmit(vin);
        stopCamera();
      } else {
        setError("No valid 17-character VIN found in the image. Try again or use manual entry.");
      }
    } catch (err: any) {
      setError("OCR failed: " + (err instanceof Error ? err.message : err));
    } finally {
      setDecoding(false);
    }
  };

  // Start Quagga barcode scanning
  const startBarcodeScanner = () => {
    setBarcodeScanning(true);
    setError("");
    Quagga.init({
      inputStream: {
        type: "LiveStream",
        target: barcodeRef.current!,
        constraints: {
          facingMode: "environment",
        },
      },
      decoder: {
        readers: ["code_128_reader", "code_39_reader"],
      },
      locate: true,
    }, (err: any) => {
      if (err) {
        // Display Quagga initialization error in the UI for debugging
        setError("Quagga initialization error: " + err.message);
        setBarcodeScanning(false);
        return;
      }
      Quagga.start();
    });
    Quagga.onDetected(handleBarcodeDetected);
  };

  // Stop Quagga barcode scanning
  const stopBarcodeScanner = () => {
    Quagga.stop();
    Quagga.offDetected(handleBarcodeDetected);
    setBarcodeScanning(false);
  };

  // Handle detected barcode
  const handleBarcodeDetected = (result: any) => {
    if (result && result.codeResult && result.codeResult.code) {
      const vin = result.codeResult.code.trim();
      if (vin.length === 17) {
        stopBarcodeScanner();
        handleVINSubmit(vin);
      }
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!decodedData && (
          <Stack spacing={3}>
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
                      Use your camera to scan the VIN barcode (usually under the windshield or on the door jamb)
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
                    <div ref={barcodeRef} style={{ width: "100%", height: 240, background: "#222" }} />
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

            {/* Camera Scanner */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <CameraAlt sx={{ mr: 1 }} />
                  Camera Scanner
                </Typography>

                {!scanning ? (
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Use your camera to scan the VIN barcode or text
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={startCamera}
                      startIcon={<CameraAlt />}
                      sx={{ mt: 2 }}
                    >
                      Start Camera
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={captureFrame}
                        disabled={decoding}
                        fullWidth
                      >
                        {decoding ? (
                          <CircularProgress size={20} />
                        ) : (
                          "Capture & Decode"
                        )}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={stopCamera}
                        disabled={decoding}
                      >
                        Stop
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

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
                    disabled={manualVIN.length !== 17 || decoding}
                    fullWidth
                    startIcon={
                      decoding ? <CircularProgress size={20} /> : <Search />
                    }
                  >
                    {decoding ? "Decoding..." : "Decode VIN"}
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
