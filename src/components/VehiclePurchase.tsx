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
import { Save as SaveIcon, QrCodeScanner, PhotoCamera, Folder } from "@mui/icons-material";
import VINScanner from "./VINScanner";
import OfflineManager from "../utils/offlineManager";
import {
  recordVehiclePurchase,
  getDriverCashBalance,
} from "../utils/cashTracker";
import { scheduleVehiclePurchaseReport } from "../utils/nmvtisScheduler";
import SignaturePad from "./SignaturePad";
import { User } from "../utils/supabaseAuth";
import { supabase } from '../utils/supabaseAuth';
import { generateMV2459PDF, fileToDataURL } from '../utils/pdfGeneratorV2';

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
  sellerFirstName: string;
  sellerLastName: string;
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

// Helper function to upload file to Supabase Storage
const uploadFileToStorage = async (file: File | Blob, fileName: string, bucket: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

// Helper function to convert signature data URL to blob
const dataURLToBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Helper function to upload PDF to Supabase Storage
const uploadPDFToStorage = async (pdfBlob: Blob, fileName: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('legal-documents')
      .upload(fileName, pdfBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf'
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('legal-documents')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('PDF upload error:', error);
    throw error;
  }
};

const VehiclePurchase: React.FC<VehiclePurchaseProps> = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<VehiclePurchaseData>({
    sellerFirstName: "",
    sellerLastName: "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVINScanner, setShowVINScanner] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [driverCashBalance, setDriverCashBalance] = useState(0);
  const [decodingVIN, setDecodingVIN] = useState(false);

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

  const handleDecodeVIN = async () => {
    setDecodingVIN(true);
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${formData.vehicleVIN}?format=json`
      );
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      if (!data.Results || !data.Results[0]) throw new Error('Invalid API response');
      const result = data.Results[0];
      setFormData((prev) => ({
        ...prev,
        vehicleYear: result.ModelYear || prev.vehicleYear,
        vehicleMake: result.Make || prev.vehicleMake,
        // Optionally add model, type, etc.
      }));
      setError("");
    } catch (err) {
      setError("Failed to decode VIN. Please check the VIN and try again.");
    } finally {
      setDecodingVIN(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    // Validate required fields
    const requiredFields = [
      "sellerFirstName",
      "sellerLastName",
      "sellerAddress",
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
      setIsSubmitting(false);
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
      vehicleDisposition: "TBD",
      purchaserName: `${user.firstName} ${user.lastName}`,
    };

    try {
      if (formData.isImpoundOrLien) {
        // Store impound/lien vehicles separately (local only)
        const existingImpoundLien = JSON.parse(
          localStorage.getItem("impoundLienVehicles") || "[]",
        );
        existingImpoundLien.push(transaction);
        localStorage.setItem(
          "impoundLienVehicles",
          JSON.stringify(existingImpoundLien),
        );
      } else {
        // Generate PDF with embedded signature and ID photo
        let pdfUrl = '';

        try {
          // Get yard settings for PDF generation
          const yardSettings = JSON.parse(localStorage.getItem("yardSettings") || "{}");
          const nmvtisSettings = JSON.parse(localStorage.getItem("nmvtisSettings") || "{}");

          // Convert signature and ID photo to data URLs
          let signatureDataUrl = '';
          let idPhotoDataUrl = '';

          if (formData.sellerSignature) {
            signatureDataUrl = formData.sellerSignature;
          }

          if (formData.sellerDriverLicensePhoto) {
            idPhotoDataUrl = await fileToDataURL(formData.sellerDriverLicensePhoto);
          }

          // Prepare data for PDF generation
          const pdfData = {
            transactionId,
            purchaseDate: formData.saleDate,
            purchasePrice: parseFloat(formData.salePrice),
            
            vin: formData.vehicleVIN,
            year: formData.vehicleYear,
            make: formData.vehicleMake,
            
            sellerFirstName: formData.sellerFirstName,
            sellerLastName: formData.sellerLastName,
            sellerAddress: formData.sellerAddress,
            sellerCity: formData.sellerCity,
            sellerState: formData.sellerState,
            sellerZip: formData.sellerZip,
            sellerPhone: formData.sellerPhone,
            
            purchaserName: `${user.firstName} ${user.lastName}`,
            yardName: nmvtisSettings.entityName || yardSettings.name || 'Junkyard',
            yardAddress: nmvtisSettings.businessAddress || yardSettings.address || '',
            yardCity: nmvtisSettings.businessCity || yardSettings.city || '',
            yardState: nmvtisSettings.businessState || yardSettings.state || 'WI',
            yardZip: nmvtisSettings.businessZip || yardSettings.zip || '',
            yardPhone: nmvtisSettings.businessPhone || yardSettings.phone || '',
            
            signatureDataUrl,
            idPhotoDataUrl,
          };

          // Generate PDF
          const pdfBlob = await generateMV2459PDF(pdfData);
          
          // Upload PDF to storage
          const pdfFileName = `bill-of-sale/${transactionId}_MV2459_${Date.now()}.pdf`;
          pdfUrl = await uploadPDFToStorage(pdfBlob, pdfFileName);
          
          console.log('PDF generated and uploaded:', pdfUrl);
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError);
          // Continue with transaction even if PDF generation fails
        }

        // Format data according to Supabase schema
        const supabaseData = {
          user_id: user.id,
          yard_id: user.yardId,
          vin: formData.vehicleVIN,
          year: parseInt(formData.vehicleYear, 10),
          seller_first_name: formData.sellerFirstName,
          seller_last_name: formData.sellerLastName,
          seller_address: formData.sellerAddress,
          purchase_price: parseFloat(formData.salePrice),
          purchase_date: formData.saleDate,
          seller_phone: formData.sellerPhone,
          seller_id_type: "Driver's License", // Default to Driver's License
          seller_id_number: "", // Add if available
          odometer: 0, // Add if available
          condition: "Used", // Default to Used
          purchase_method: "Cash", // Default to Cash
          title_number: "", // Add if available
          title_state: "", // Add if available
          notes: "",
          bill_of_sale_pdf_url: pdfUrl, // Store PDF URL
        };

        // Try to insert into Supabase with retry logic
        let retries = 3;
        let lastError = null;
        let supabaseSuccess = false;

        while (retries > 0) {
          try {
            console.log("Attempting to save to Supabase:", supabaseData);
            const { data, error } = await supabase
              .from("vehicle_transactions")
              .insert([supabaseData])
              .select();

            if (error) {
              console.error("Supabase error:", error);
              throw error;
            }

            if (!data || data.length === 0) {
              throw new Error("No data returned from insert");
            }

            console.log("Successfully saved to Supabase:", data);
            
            // Update the transaction with the Supabase ID and file URLs
            transaction.id = data[0].id;
            (transaction as any).signatureUrl = pdfUrl;
            (transaction as any).documentUrls = [pdfUrl].filter(Boolean);
            supabaseSuccess = true;
            
            break;
          } catch (error) {
            console.error(`Supabase insert attempt ${4 - retries} failed:`, error);
            lastError = error;
            retries--;
            
            if (retries > 0) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
            }
          }
        }

        if (retries === 0 && lastError) {
          console.error("All Supabase insert attempts failed:", lastError);
          // Store in offline queue if all Supabase insert attempts fail
          const offlineTransactions = JSON.parse(
            localStorage.getItem("offlineTransactions") || "[]"
          );
          offlineTransactions.push(transaction);
          localStorage.setItem(
            "offlineTransactions",
            JSON.stringify(offlineTransactions)
          );
          setError(`Failed to save to database after multiple attempts. Saved locally (offline mode). Will sync when online.`);
        }

        // Also save to local storage for immediate access
        const existingTransactions = JSON.parse(
          localStorage.getItem("vehicleTransactions") || "[]"
        );
        existingTransactions.push(transaction);
        localStorage.setItem(
          "vehicleTransactions",
          JSON.stringify(existingTransactions)
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
          const newBalance = getDriverCashBalance(user.id);
          setDriverCashBalance(newBalance);
        } catch (cashError) {
          console.error("Failed to record cash transaction:", cashError);
        }

        // Schedule NMVTIS reporting for 40 hours after purchase
        try {
          scheduleVehiclePurchaseReport(
            transactionId,
            formData.vehicleVIN,
            formData.saleDate,
            `${formData.sellerFirstName} ${formData.sellerLastName}`,
          );
        } catch (nmvtisError) {
          console.error("Failed to schedule NMVTIS report:", nmvtisError);
        }
      }

      // Only set success if we made it through everything
      setSuccess(true);
      setError("");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Failed to save transaction:", error);
      setError("Failed to save transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
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
                label="Seller's First Name *"
                value={formData.sellerFirstName}
                onChange={handleInputChange("sellerFirstName")}
                required
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Seller's Last Name *"
                value={formData.sellerLastName}
                onChange={handleInputChange("sellerLastName")}
                required
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label="Seller's Phone Number"
                value={formData.sellerPhone}
                onChange={handleInputChange("sellerPhone")}
                helperText="Optional - leave blank if not available"
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
              <Typography variant="subtitle2" gutterBottom>
                Driver's License Photo *
              </Typography>
              <Stack spacing={1}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0] || null;
                    handleFileChange(file);
                  }}
                  style={{ display: "none" }}
                  id="camera-upload"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0] || null;
                    handleFileChange(file);
                  }}
                  style={{ display: "none" }}
                  id="gallery-upload"
                />
                
                <Stack direction="row" spacing={1}>
                  <label htmlFor="camera-upload" style={{ flex: 1 }}>
                    <Button 
                      variant="outlined" 
                      component="span" 
                      fullWidth
                      startIcon={<PhotoCamera />}
                    >
                      Take Photo
                    </Button>
                  </label>
                  <label htmlFor="gallery-upload" style={{ flex: 1 }}>
                    <Button 
                      variant="outlined" 
                      component="span" 
                      fullWidth
                      startIcon={<Folder />}
                    >
                      Choose from Files
                    </Button>
                  </label>
                </Stack>
                
                {formData.sellerDriverLicensePhoto && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    ✓ Driver's license photo uploaded
                  </Alert>
                )}
              </Stack>
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

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                label="Vehicle Identification Number (VIN) *"
                value={formData.vehicleVIN}
                onChange={handleInputChange("vehicleVIN")}
                required
                inputProps={{ maxLength: 17 }}
                helperText="17-character VIN"
              />
              <Button
                variant="contained"
                onClick={handleDecodeVIN}
                disabled={formData.vehicleVIN.length !== 17 || decodingVIN}
                sx={{ minWidth: 120 }}
              >
                {decodingVIN ? "Decoding..." : "Decode VIN"}
              </Button>
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Recording Purchase..." : "Record Purchase"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </form>
      </Paper>

      {/* Seller Signature Pad */}
      <SignaturePad
        open={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSignatureSaved}
        title="Seller Signature Required"
        signerName={`${formData.sellerFirstName} ${formData.sellerLastName} ${formData.sellerLastName ? "Seller" : ""}`}
      />
    </Box>
  );
};

export default VehiclePurchase;
