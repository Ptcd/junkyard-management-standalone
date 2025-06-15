import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Save as SaveIcon, QrCodeScanner } from "@mui/icons-material";
import VINScanner from "./VINScanner";
import OfflineManager from "../utils/offlineManager";
import {
  recordVehiclePurchase,
  getDriverCashBalance,
} from "../utils/cashTracker";
import { scheduleVehiclePurchaseReport } from "../utils/nmvtisScheduler";
import SignaturePad from "./SignaturePad";
import { User } from "../utils/supabaseAuth";

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

interface VehiclePurchaseData {
  // Seller Information (MV2459 Requirements)
  sellerName: string;
  sellerAddress: string;
  sellerCity: string;
  sellerState: string;
  sellerZip: string;
  sellerPhone: string;
  sellerDriverLicensePhoto: File | null;
  sellerSignature: string | null;

  // Vehicle Information
  vehicleYear: string;
  vehicleMake: string;
  vehicleVIN: string;

  // Transaction Information
  salePrice: string;
  saleDate: string;
  isImpoundOrLien: boolean;

  // Driver Information
  driverName: string;
}

interface VehiclePurchaseProps {
  user: User;
}

const VehiclePurchase: React.FC<VehiclePurchaseProps> = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<VehiclePurchaseData>({
    sellerName: "",
    sellerAddress: "",
    sellerCity: "",
    sellerState: "WI",
    sellerZip: "",
    sellerPhone: "",
    sellerDriverLicensePhoto: null,
    sellerSignature: null,
    vehicleYear: "",
    vehicleMake: "",
    vehicleVIN: "",
    salePrice: "",
    saleDate: new Date().toISOString().split("T")[0],
    isImpoundOrLien: false,
    driverName: `${user.firstName} ${user.lastName}`,
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showVINScanner, setShowVINScanner] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [driverCashBalance, setDriverCashBalance] = useState(0);

  // Load driver's cash balance on component mount
  React.useEffect(() => {
    // Only load cash balance for drivers, not admins
    if (user.role === "driver") {
      const balance = getDriverCashBalance(user.id);
      setDriverCashBalance(balance);
    }
  }, [user.id, user.role]);

  const handleInputChange =
    (field: keyof VehiclePurchaseData) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any,
    ) => {
      const value = event.target ? event.target.value : event;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSwitchChange =
    (field: keyof VehiclePurchaseData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleFileChange = (file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      sellerDriverLicensePhoto: file,
    }));
  };

  const handleVINScanned = (vinData: VINDecodeResult) => {
    setFormData((prev) => ({
      ...prev,
      vehicleVIN: vinData.vin,
      vehicleYear: vinData.year || "",
      vehicleMake: vinData.make || "",
    }));
    setShowVINScanner(false);
  };

  const handleSignatureSaved = (signatureData: string) => {
    setFormData((prev) => ({
      ...prev,
      sellerSignature: signatureData,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      "sellerName",
      "sellerAddress",
      "sellerPhone",
      "vehicleYear",
      "vehicleMake",
      "vehicleVIN",
      "salePrice",
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof VehiclePurchaseData],
    );

    if (
      missingFields.length > 0 ||
      !formData.sellerDriverLicensePhoto ||
      !formData.sellerSignature
    ) {
      const missing = missingFields.join(", ");
      const photoMissing = !formData.sellerDriverLicensePhoto
        ? "Driver License Photo"
        : "";
      const signatureMissing = !formData.sellerSignature
        ? "Seller Signature"
        : "";
      const allMissing = [missing, photoMissing, signatureMissing]
        .filter(Boolean)
        .join(", ");
      setError(`Please fill in all required fields: ${allMissing}`);
      return;
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}`;

    // Create transaction object
    const transaction = {
      id: transactionId,
      ...formData,
      timestamp: new Date().toISOString(),
      userId: user.id,
      yardId: user.yardId,
      status: "completed",
      vehicleDisposition: "TBD", // Default for tracking
      purchaserName: `${user.firstName} ${user.lastName}`, // Auto-fill from logged-in user
    };

    const offlineManager = OfflineManager.getInstance();

    try {
      // Store in different locations based on impound/lien status
      if (formData.isImpoundOrLien) {
        // Store impound/lien vehicles separately
        const existingImpoundLien = JSON.parse(
          localStorage.getItem("impoundLienVehicles") || "[]",
        );
        existingImpoundLien.push(transaction);
        localStorage.setItem(
          "impoundLienVehicles",
          JSON.stringify(existingImpoundLien),
        );
      } else {
        // Use offline manager for regular vehicle transactions
        await offlineManager.saveTransaction(
          transaction,
          "vehicleTransactions",
        );

        // Record cash transaction for vehicle purchase
        try {
          recordVehiclePurchase(
            user.id,
            `${user.firstName} ${user.lastName}`,
            user.yardId,
            parseFloat(formData.salePrice),
            formData.vehicleVIN,
            transactionId,
          );

          // Update driver's cash balance display
          const newBalance = getDriverCashBalance(user.id);
          setDriverCashBalance(newBalance);
        } catch (cashError) {
          console.error("Failed to record cash transaction:", cashError);
          // Don't fail the entire transaction for cash tracking issues
        }

        // Schedule NMVTIS reporting for 1 week after purchase
        try {
          scheduleVehiclePurchaseReport(
            transactionId,
            formData.vehicleVIN,
            formData.saleDate,
            formData.sellerName,
          );
        } catch (nmvtisError) {
          console.error("Failed to schedule NMVTIS report:", nmvtisError);
          // Don't fail the entire transaction for NMVTIS scheduling issues
        }
      }

      setSuccess(true);
      setError("");

      // Navigate back to dashboard after 2 seconds to allow user to see success message
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Failed to save transaction:", error);
      setError("Failed to save transaction. Please try again.");
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Vehicle Purchase Form (MV2459)
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Wisconsin Junked Vehicle Bill of Sale
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {formData.isImpoundOrLien
            ? "Impound/Lien vehicle recorded successfully! Data stored separately for impound processing."
            : "Vehicle purchase recorded successfully! NMVTIS reporting will be automatically scheduled for 40 hours."}
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
            {/* Seller Information Section */}
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom>
                Seller Information
              </Typography>
              <Divider />
            </Stack>

            <Box>
              <TextField
                fullWidth
                label="Seller's Full Name *"
                value={formData.sellerName}
                onChange={handleInputChange("sellerName")}
                required
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Seller's Phone Number *"
                value={formData.sellerPhone}
                onChange={handleInputChange("sellerPhone")}
                required
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Seller's Address *"
                value={formData.sellerAddress}
                onChange={handleInputChange("sellerAddress")}
                required
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="City"
                value={formData.sellerCity}
                onChange={handleInputChange("sellerCity")}
              />
            </Box>

            <Box>
              <FormControl fullWidth>
                <InputLabel>State</InputLabel>
                <Select
                  value={formData.sellerState}
                  onChange={handleInputChange("sellerState")}
                >
                  <MenuItem value="WI">Wisconsin</MenuItem>
                  <MenuItem value="MN">Minnesota</MenuItem>
                  <MenuItem value="IA">Iowa</MenuItem>
                  <MenuItem value="IL">Illinois</MenuItem>
                  <MenuItem value="MI">Michigan</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <TextField
                fullWidth
                label="ZIP Code"
                value={formData.sellerZip}
                onChange={handleInputChange("sellerZip")}
              />
            </Box>

            <Box>
              <input
                type="file"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] || null;
                  handleFileChange(file);
                }}
                style={{ display: "none" }}
                id="driver-license-upload"
                required
              />
              <label htmlFor="driver-license-upload">
                <Button variant="outlined" component="span" fullWidth>
                  Take Photo of Driver's License *
                  {formData.sellerDriverLicensePhoto && (
                    <Chip
                      label="Photo Uploaded"
                      color="success"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Button>
              </label>
            </Box>

            <Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setShowSignaturePad(true)}
              >
                Seller Signature *
                {formData.sellerSignature && (
                  <Chip
                    label="Signed"
                    color="success"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Button>
            </Box>

            {/* Vehicle Information Section */}
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Vehicle Information
              </Typography>
              <Divider />
            </Stack>

            <Box>
              <TextField
                fullWidth
                label="Vehicle Identification Number (VIN) *"
                value={formData.vehicleVIN}
                onChange={handleInputChange("vehicleVIN")}
                required
                inputProps={{ maxLength: 17 }}
                helperText="17-character VIN"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowVINScanner(true)}
                        edge="end"
                        title="Scan VIN"
                      >
                        <QrCodeScanner />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Year *"
                value={formData.vehicleYear}
                onChange={handleInputChange("vehicleYear")}
                required
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Make *"
                value={formData.vehicleMake}
                onChange={handleInputChange("vehicleMake")}
                required
              />
            </Box>

            {/* Transaction Information Section */}
            <Stack spacing={2}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Transaction Information
              </Typography>
              <Divider />
            </Stack>

            <Box>
              <TextField
                fullWidth
                label="Sale Price *"
                value={formData.salePrice}
                onChange={handleInputChange("salePrice")}
                type="number"
                required
                InputProps={{
                  startAdornment: "$",
                }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Sale Date
              </Typography>
              <TextField
                fullWidth
                value={formData.saleDate}
                onChange={handleInputChange("saleDate")}
                type="date"
                required
              />
            </Box>

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isImpoundOrLien}
                    onChange={handleSwitchChange("isImpoundOrLien")}
                  />
                }
                label="Is this an impound or lien?"
              />
            </Box>

            {/* Submit Buttons */}
            <Box>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  size="large"
                >
                  Record Purchase
                </Button>
              </Stack>
            </Box>
          </Stack>
        </form>
      </Paper>

      {/* VIN Scanner Dialog */}
      <VINScanner
        open={showVINScanner}
        onClose={() => setShowVINScanner(false)}
        onVINDetected={handleVINScanned}
      />

      {/* Seller Signature Pad */}
      <SignaturePad
        open={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSignatureSaved}
        title="Seller Signature Required"
        signerName={formData.sellerName || "Seller"}
      />
    </Box>
  );
};

export default VehiclePurchase;
