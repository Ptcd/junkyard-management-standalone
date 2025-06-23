import React, { useState, useEffect } from "react";
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
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Autocomplete,
} from "@mui/material";
import {
  Save as SaveIcon,
  Search as SearchIcon,
  QrCodeScanner,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import VINScanner from "./VINScanner";
import { sendMV2459Email, downloadMV2459 } from "../utils/mv2459Generator";
import { recordVehicleSale, getDriverCashBalance } from "../utils/cashTracker";
import { reportVehicleSaleImmediate } from "../utils/nmvtisScheduler";
import SignaturePad from "./SignaturePad";
import { User } from "../utils/supabaseAuth";
import { BuyerProfile, getBuyerProfilesSync } from "../utils/buyerProfiles";
import { supabase } from "../utils/supabaseAuth";

interface VehicleTransaction {
  id: string;
  sellerName: string;
  sellerAddress: string;
  sellerCity: string;
  sellerState: string;
  sellerZip: string;
  sellerPhone: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleVIN: string;
  salePrice: string;
  saleDate: string;
  isImpoundOrLien: boolean;
  driverName: string;
  timestamp: string;
  userId: string;
  yardId: string;
  status: string;
  vehicleDisposition: string;
  purchaserName: string;
}

interface VehicleSaleData {
  originalVehicle: VehicleTransaction | null;
  buyerName: string;
  buyerAddress: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerLicenseNumber: string;
  actualSalePrice: string;
  saleDate: string;
  disposition: "SOLD" | "SCRAPPED" | "EXPORTED" | "PARTS";
  notes: string;
  yardSignature: string | null;
  sendEmailMV2459: boolean;
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

interface VehicleSellProps {
  user: User;
}

const VehicleSell: React.FC<VehicleSellProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchVIN, setSearchVIN] = useState("");
  const [availableVehicles, setAvailableVehicles] = useState<
    VehicleTransaction[]
  >([]);
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleTransaction | null>(null);
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [showVINScanner, setShowVINScanner] = useState(false);
  const [formData, setFormData] = useState<VehicleSaleData>({
    originalVehicle: null,
    buyerName: "",
    buyerAddress: "",
    buyerCity: "",
    buyerState: "WI",
    buyerZip: "",
    buyerPhone: "",
    buyerEmail: "",
    buyerLicenseNumber: "",
    actualSalePrice: "",
    saleDate: new Date().toISOString().split("T")[0],
    disposition: "SCRAPPED",
    notes: "",
    yardSignature: null,
    sendEmailMV2459: false,
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [driverCashBalance, setDriverCashBalance] = useState(0);
  const [emailSending, setEmailSending] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [buyerProfiles, setBuyerProfiles] = useState<BuyerProfile[]>([]);
  const [selectedBuyerProfile, setSelectedBuyerProfile] =
    useState<BuyerProfile | null>(null);
  const [useCustomBuyer, setUseCustomBuyer] = useState(false);

  useEffect(() => {
    loadAvailableVehicles();
    loadBuyerProfiles();
    // Load driver's cash balance - only for drivers, not admins
    if (user.role === "driver") {
      const balance = getDriverCashBalance(user.id);
      setDriverCashBalance(balance);
    }
  }, [user.id, user.role]);

  const loadAvailableVehicles = async () => {
    try {
      // First try to load from Supabase
      const { data, error } = await supabase
        .from("vehicle_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      let allTransactions = [];

      if (error) {
        console.error("Error fetching from Supabase:", error);
        // Fallback to localStorage if Supabase fetch fails
        const stored = JSON.parse(localStorage.getItem("vehicleTransactions") || "[]");
        allTransactions = stored;
        console.log("Using localStorage fallback for VehicleSell");
      } else {
        console.log("Loaded transactions from Supabase for VehicleSell:", data?.length || 0);
        allTransactions = data || [];
      }

      // Filter for available vehicles (not sold, not impound/lien, user's yard)
      const available = allTransactions.filter((vehicle: any) => {
        const vehicleDisposition = vehicle.vehicle_disposition || vehicle.vehicleDisposition || "TBD";
        const isImpoundOrLien = vehicle.is_impound_or_lien || vehicle.isImpoundOrLien || false;
        const vehicleYardId = vehicle.yard_id || vehicle.yardId;
        const vehicleVIN = vehicle.vin || vehicle.vehicleVIN;
        
        // Debug logging to see what's happening
        console.log("VehicleSell Filter Debug:", {
          vehicleId: vehicle.id,
          vehicleVIN: vehicleVIN,
          vehicleDisposition: vehicleDisposition,
          isImpoundOrLien: isImpoundOrLien,
          vehicleYardId: vehicleYardId,
          userYardId: user.yardId,
          userRole: user.role,
          rawDisposition: vehicle.vehicle_disposition,
          rawDisposition2: vehicle.vehicleDisposition,
          passes: vehicleDisposition === "TBD" && !isImpoundOrLien && vehicleVIN && (user.role === "admin" || vehicleYardId === user.yardId)
        });
        
        return (
          vehicleDisposition === "TBD" &&
          !isImpoundOrLien &&
          vehicleVIN && // Must have a VIN
          (user.role === "admin" || vehicleYardId === user.yardId)
        );
      });

      // Convert Supabase format to expected format if needed
      const formattedVehicles = available.map((vehicle: any) => ({
        id: vehicle.id,
        sellerName: `${vehicle.seller_first_name || vehicle.sellerFirstName || ""} ${vehicle.seller_last_name || vehicle.sellerLastName || ""}`.trim(),
        sellerAddress: vehicle.seller_address || vehicle.sellerAddress || "",
        sellerCity: vehicle.seller_city || vehicle.sellerCity || "",
        sellerState: vehicle.seller_state || vehicle.sellerState || "",
        sellerZip: vehicle.seller_zip || vehicle.sellerZip || "",
        sellerPhone: vehicle.seller_phone || vehicle.sellerPhone || "",
        vehicleYear: (vehicle.year || vehicle.vehicleYear || "").toString(),
        vehicleMake: vehicle.make || vehicle.vehicleMake || "",
        vehicleVIN: vehicle.vin || vehicle.vehicleVIN || "",
        salePrice: (vehicle.purchase_price || vehicle.salePrice || "0").toString(),
        saleDate: vehicle.purchase_date || vehicle.saleDate || "",
        isImpoundOrLien: vehicle.is_impound_or_lien || vehicle.isImpoundOrLien || false,
        driverName: vehicle.driver_name || vehicle.driverName || "",
        timestamp: vehicle.created_at || vehicle.timestamp || "",
        userId: vehicle.user_id || vehicle.userId || "",
        yardId: vehicle.yard_id || vehicle.yardId || "",
        status: vehicle.status || "completed",
        vehicleDisposition: vehicle.vehicle_disposition || vehicle.vehicleDisposition || "TBD",
        purchaserName: vehicle.purchaser_name || vehicle.purchaserName || "",
      }));

      console.log("Available vehicles for sale:", formattedVehicles.length);
      setAvailableVehicles(formattedVehicles);
    } catch (err) {
      console.error("Error loading available vehicles:", err);
      setError("Failed to load available vehicles. Please try again.");
    }
  };

  const loadBuyerProfiles = async () => {
    try {
      const profiles = await getBuyerProfilesSync(user.yardId);
      setBuyerProfiles(profiles);
    } catch (error) {
      console.error("Error loading buyer profiles:", error);
    }
  };

  const handleVINSearch = () => {
    if (!searchVIN.trim()) {
      setError("Please enter a VIN to search");
      return;
    }

    const found = availableVehicles.find(
      (vehicle) => vehicle.vehicleVIN.toLowerCase() === searchVIN.toLowerCase(),
    );

    if (found) {
      setSelectedVehicle(found);
      setFormData((prev) => ({
        ...prev,
        originalVehicle: found,
        actualSalePrice: "", // Leave empty for user to fill
      }));
      setError("");
      setSuccess(false);
    } else {
      setSelectedVehicle(null);
      setFormData((prev) => ({
        ...prev,
        originalVehicle: null,
      }));
      setError(
        "VIN not found in available inventory. Vehicle may already be sold or not exist.",
      );
    }
  };

  const handleVINScanned = (vinData: VINDecodeResult) => {
    setSearchVIN(vinData.vin);
    setShowVINScanner(false);
    // Auto-search after scanning
    setTimeout(() => {
      const found = availableVehicles.find(
        (vehicle) =>
          vehicle.vehicleVIN.toLowerCase() === vinData.vin.toLowerCase(),
      );
      if (found) {
        setSelectedVehicle(found);
        setFormData((prev) => ({
          ...prev,
          originalVehicle: found,
          actualSalePrice: "",
        }));
        setError("");
      } else {
        setError("Scanned VIN not found in available inventory.");
      }
    }, 100);
  };

  const handleInputChange =
    (field: keyof VehicleSaleData) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any,
    ) => {
      const value = event.target ? event.target.value : event;
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleSelectVehicle = (vehicle: VehicleTransaction) => {
    setSelectedVehicle(vehicle);
    setSearchVIN(vehicle.vehicleVIN);
    setFormData((prev) => ({
      ...prev,
      originalVehicle: vehicle,
      actualSalePrice: "",
    }));
  };

  const handleSignatureSaved = (signatureData: string) => {
    setFormData((prev) => ({
      ...prev,
      yardSignature: signatureData,
    }));
  };

  const handleBuyerProfileSelect = (profileId: string) => {
    const profile = buyerProfiles.find((p) => p.id === profileId);
    if (profile) {
      setSelectedBuyerProfile(profile);
      setFormData((prev) => ({
        ...prev,
        buyerName: profile.companyName,
        buyerAddress: profile.address,
        buyerCity: profile.city,
        buyerState: profile.state,
        buyerZip: profile.zip,
        buyerPhone: profile.phone,
        buyerEmail: profile.email,
        buyerLicenseNumber: profile.licenseNumber || "",
      }));
      setUseCustomBuyer(false);
    }
  };

  const handleCustomBuyerToggle = () => {
    setUseCustomBuyer(!useCustomBuyer);
    if (!useCustomBuyer) {
      // Clear buyer profile selection when switching to custom
      setSelectedBuyerProfile(null);
      setFormData((prev) => ({
        ...prev,
        buyerName: "",
        buyerAddress: "",
        buyerCity: "",
        buyerState: "WI",
        buyerZip: "",
        buyerPhone: "",
        buyerEmail: "",
        buyerLicenseNumber: "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.originalVehicle) {
      setError("Please select a vehicle to sell");
      return;
    }

    // Validate required fields
    const requiredFields = [
      "buyerName",
      "buyerAddress",
      "buyerPhone",
      "actualSalePrice",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof VehicleSaleData],
    );

    if (missingFields.length > 0 || !formData.yardSignature) {
      const missing = missingFields.join(", ");
      const signatureMissing = !formData.yardSignature ? "Yard Signature" : "";
      const allMissing = [missing, signatureMissing].filter(Boolean).join(", ");
      setError(`Please fill in all required fields: ${allMissing}`);
      return;
    }

    try {
      // Generate sale transaction ID
      const saleId = `SALE-${Date.now()}`;

      // Create sale record
      const saleRecord = {
        id: saleId,
        originalTransactionId: formData.originalVehicle.id,
        originalVehicle: formData.originalVehicle,
        buyerName: formData.buyerName,
        buyerAddress: formData.buyerAddress,
        buyerCity: formData.buyerCity,
        buyerState: formData.buyerState,
        buyerZip: formData.buyerZip,
        buyerPhone: formData.buyerPhone,
        buyerEmail: formData.buyerEmail,
        buyerLicenseNumber: formData.buyerLicenseNumber,
        salePrice: formData.actualSalePrice,
        saleDate: formData.saleDate,
        disposition: formData.disposition,
        notes: formData.notes,
        paymentStatus: "completed",
        actualReceivedAmount: formData.actualSalePrice,
        timestamp: new Date().toISOString(),
        soldBy: `${user.firstName} ${user.lastName}`,
        userId: user.id,
        yardId: user.yardId,
      };

      // Update the original vehicle transaction with new disposition in Supabase AND localStorage
      try {
        // First update in Supabase
        const { error: updateError } = await supabase
          .from("vehicle_transactions")
          .update({
            vehicle_disposition: formData.disposition,
            sale_record_id: saleId,
            updated_at: new Date().toISOString()
          })
          .eq("id", formData.originalVehicle.id);

        if (updateError) {
          console.error("Error updating vehicle in Supabase:", updateError);
        } else {
          console.log("Vehicle disposition updated in Supabase successfully");
        }
      } catch (supabaseError) {
        console.error("Failed to update vehicle in Supabase:", supabaseError);
      }

      // Also update localStorage for immediate local consistency
      const existingTransactions = JSON.parse(
        localStorage.getItem("vehicleTransactions") || "[]",
      );
      const updatedTransactions = existingTransactions.map(
        (t: VehicleTransaction) =>
          t.id === formData.originalVehicle!.id
            ? {
                ...t,
                vehicleDisposition: formData.disposition,
                saleRecordId: saleId,
              }
            : t,
      );

      // Save updated transactions to localStorage
      localStorage.setItem(
        "vehicleTransactions",
        JSON.stringify(updatedTransactions),
      );

      // Store sale record in Supabase AND localStorage
      try {
        // First save to Supabase
        const { error: saleError } = await supabase
          .from("vehicle_sales")
          .insert([{
            id: saleId,
            original_transaction_id: formData.originalVehicle.id,
            original_vehicle: formData.originalVehicle,
            buyer_name: formData.buyerName,
            buyer_address: formData.buyerAddress,
            buyer_city: formData.buyerCity,
            buyer_state: formData.buyerState,
            buyer_zip: formData.buyerZip,
            buyer_phone: formData.buyerPhone,
            buyer_email: formData.buyerEmail,
            buyer_license_number: formData.buyerLicenseNumber,
            sale_price: parseFloat(formData.actualSalePrice),
            sale_date: formData.saleDate,
            disposition: formData.disposition,
            notes: formData.notes,
            payment_status: "completed",
            actual_received_amount: parseFloat(formData.actualSalePrice),
            timestamp: new Date().toISOString(),
            sold_by: `${user.firstName} ${user.lastName}`,
            user_id: user.id,
            yard_id: user.yardId,
          }]);

        if (saleError) {
          console.error("Error saving sale to Supabase:", saleError);
        } else {
          console.log("Vehicle sale saved to Supabase successfully");
        }
      } catch (supabaseSaleError) {
        console.error("Failed to save sale to Supabase:", supabaseSaleError);
      }

      // Also store in localStorage for immediate local access
      const existingSales = JSON.parse(
        localStorage.getItem("vehicleSales") || "[]",
      );
      existingSales.push(saleRecord);
      localStorage.setItem("vehicleSales", JSON.stringify(existingSales));

      // Record cash transaction for estimated sale amount
      try {
        recordVehicleSale(
          user.id,
          `${user.firstName} ${user.lastName}`,
          user.yardId,
          parseFloat(formData.actualSalePrice),
          formData.originalVehicle.vehicleVIN,
          saleId,
        );

        // Update driver's cash balance display
        const newBalance = getDriverCashBalance(user.id);
        setDriverCashBalance(newBalance);
      } catch (cashError) {
        console.error("Failed to record cash transaction:", cashError);
        // Don't fail the entire transaction for cash tracking issues
      }

      // Immediately report vehicle sale to NMVTIS
      try {
        const nmvtisResult = await reportVehicleSaleImmediate(
          saleId,
          formData.originalVehicle.vehicleVIN,
          formData.originalVehicle.saleDate, // Original purchase date
          formData.originalVehicle.sellerName, // Original seller
          formData.buyerName, // Current buyer
        );

        if (!nmvtisResult.success) {
          console.warn("NMVTIS reporting failed:", nmvtisResult.message);
          // Don't fail the entire transaction for NMVTIS issues
        }
      } catch (nmvtisError) {
        console.error("Failed to report to NMVTIS:", nmvtisError);
        // Don't fail the entire transaction for NMVTIS issues
      }

      // Send MV2459 email if buyer email is provided
      if (
        formData.buyerEmail &&
        formData.buyerEmail.trim() &&
        formData.sendEmailMV2459
      ) {
        setEmailSending(true);
        try {
          // Get yard info from settings (mock for now)
          const yardInfo = {
            name: "Demo Junkyard & Auto Parts",
            address: "123 Salvage Road",
            city: "Milwaukee",
            state: "WI",
            zip: "53201",
            phone: "(414) 555-0123",
            email: "office@demojunkyard.com",
            licenseNumber: "WI-JUNK-2024-001",
          };

          const emailResult = await sendMV2459Email(
            saleRecord,
            yardInfo,
            formData.buyerEmail,
          );

          if (emailResult.success) {
            setSuccess(true);
            setError("");
          } else {
            setError(`Sale recorded but email failed: ${emailResult.message}`);
          }
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          setError(
            "Sale recorded but failed to send MV2459 email. You can download it manually.",
          );
        } finally {
          setEmailSending(false);
        }
      } else {
        setSuccess(true);
        setError("");
      }

      // Reset form and reload available vehicles
      await loadAvailableVehicles(); // Refresh the vehicle list immediately
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Failed to save sale:", error);
      setError("Failed to save sale. Please try again.");
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Vehicle Sales & Disposition
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Sell vehicles from inventory to scrap yards and update NMVTIS
        dispositions
      </Typography>

      {/* Driver Cash Balance - Only show for drivers */}
      {user.role === "driver" && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: "info.light" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">
              💰 Cash on Hand: <strong>${driverCashBalance.toFixed(2)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Updated after each sale transaction
            </Typography>
          </Stack>
        </Paper>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Vehicle sale recorded successfully!{" "}
          {formData.buyerEmail && "MV2459 form sent to buyer."} NMVTIS sale
          report submitted immediately.
        </Alert>
      )}

      {emailSending && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Sending MV2459 form to buyer via email...
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* VIN Search Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Step 1: Find Vehicle in Inventory
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Enter VIN to Search"
            value={searchVIN}
            onChange={(e) => setSearchVIN(e.target.value)}
            inputProps={{ maxLength: 17 }}
            helperText="17-character VIN"
            sx={{ flexGrow: 1 }}
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
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleVINSearch}
            size="large"
          >
            Search
          </Button>
        </Stack>

        {selectedVehicle && (
          <Card
            sx={{
              mt: 2,
              bgcolor: "success.light",
              color: "success.contrastText",
            }}
          >
            <CardContent>
              <Typography variant="h6">Vehicle Found!</Typography>
              <Typography>
                <strong>VIN:</strong> {selectedVehicle.vehicleVIN}
              </Typography>
              <Typography>
                <strong>Vehicle:</strong> {selectedVehicle.vehicleYear}{" "}
                {selectedVehicle.vehicleMake}
              </Typography>
              <Typography>
                <strong>Purchase Date:</strong>{" "}
                {new Date(selectedVehicle.saleDate).toLocaleDateString()}
              </Typography>
              <Typography>
                <strong>Purchase Price:</strong> ${selectedVehicle.salePrice}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={() => setShowVehicleDetails(true)}
                sx={{ mt: 1, color: "inherit", borderColor: "currentColor" }}
              >
                View Full Details
              </Button>
            </CardContent>
          </Card>
        )}
      </Paper>

      {/* Available Vehicles Table */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Inventory ({availableVehicles.length} vehicles)
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Purchase Date</TableCell>
                <TableCell>VIN</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Purchase Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No vehicles available for sale in inventory
                  </TableCell>
                </TableRow>
              ) : (
                availableVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      {new Date(vehicle.saleDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {vehicle.vehicleVIN}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {vehicle.vehicleYear} {vehicle.vehicleMake}
                    </TableCell>
                    <TableCell>${vehicle.salePrice}</TableCell>
                    <TableCell>
                      <Chip
                        label={vehicle.vehicleDisposition}
                        color="warning"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSelectVehicle(vehicle)}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Sale Form */}
      {selectedVehicle && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Step 2: Complete Sale Information
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Buyer Information */}
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  Buyer Information
                </Typography>
                <Divider />
              </Stack>

              {/* Buyer Profile Selection */}
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useCustomBuyer}
                        onChange={handleCustomBuyerToggle}
                      />
                    }
                    label="Enter custom buyer information"
                  />
                </Stack>

                {!useCustomBuyer && (
                  <FormControl fullWidth>
                    <InputLabel>Select Buyer Profile</InputLabel>
                    <Select
                      value={
                        selectedBuyerProfile ? selectedBuyerProfile.id : ""
                      }
                      onChange={(e) => handleBuyerProfileSelect(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Choose from saved buyer profiles</em>
                      </MenuItem>
                      {buyerProfiles.map((profile) => (
                        <MenuItem key={profile.id} value={profile.id}>
                          <Stack>
                            <Typography variant="body1">
                              {profile.companyName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {profile.contactName} • {profile.city},{" "}
                              {profile.state}
                            </Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {selectedBuyerProfile && !useCustomBuyer && (
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: "success.light",
                      color: "success.contrastText",
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Selected Buyer: {selectedBuyerProfile.companyName}
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Contact:</strong>{" "}
                        {selectedBuyerProfile.contactName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Phone:</strong> {selectedBuyerProfile.phone}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Email:</strong> {selectedBuyerProfile.email}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Address:</strong> {selectedBuyerProfile.address}
                        , {selectedBuyerProfile.city},{" "}
                        {selectedBuyerProfile.state} {selectedBuyerProfile.zip}
                      </Typography>
                      {selectedBuyerProfile.notes && (
                        <Typography variant="body2">
                          <strong>Notes:</strong> {selectedBuyerProfile.notes}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Stack>

              {/* Custom Buyer Fields - Only show when useCustomBuyer is true */}
              {useCustomBuyer && (
                <>
                  <TextField
                    fullWidth
                    label="Buyer Name/Company *"
                    value={formData.buyerName}
                    onChange={handleInputChange("buyerName")}
                    required
                  />

                  <TextField
                    fullWidth
                    label="Buyer Phone *"
                    value={formData.buyerPhone}
                    onChange={handleInputChange("buyerPhone")}
                    required
                  />

                  <TextField
                    fullWidth
                    label="Buyer Email"
                    value={formData.buyerEmail}
                    onChange={handleInputChange("buyerEmail")}
                  />

                  <TextField
                    fullWidth
                    label="Buyer Address *"
                    value={formData.buyerAddress}
                    onChange={handleInputChange("buyerAddress")}
                    required
                  />

                  <TextField
                    fullWidth
                    label="City"
                    value={formData.buyerCity}
                    onChange={handleInputChange("buyerCity")}
                  />

                  <FormControl fullWidth>
                    <InputLabel>State</InputLabel>
                    <Select
                      value={formData.buyerState}
                      onChange={handleInputChange("buyerState")}
                    >
                      <MenuItem value="WI">Wisconsin</MenuItem>
                      <MenuItem value="MN">Minnesota</MenuItem>
                      <MenuItem value="IA">Iowa</MenuItem>
                      <MenuItem value="IL">Illinois</MenuItem>
                      <MenuItem value="MI">Michigan</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="ZIP Code"
                    value={formData.buyerZip}
                    onChange={handleInputChange("buyerZip")}
                  />

                  <TextField
                    fullWidth
                    label="Buyer License Number"
                    value={formData.buyerLicenseNumber}
                    onChange={handleInputChange("buyerLicenseNumber")}
                    helperText="Scrap dealer license or business license number"
                  />
                </>
              )}

              {/* Sale Information */}
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Sale Information
                </Typography>
                <Divider />
              </Stack>

              <TextField
                fullWidth
                label="Sale Price *"
                value={formData.actualSalePrice}
                onChange={handleInputChange("actualSalePrice")}
                type="number"
                required
                InputProps={{
                  startAdornment: "$",
                }}
              />

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

              <FormControl fullWidth>
                <InputLabel>Vehicle Disposition *</InputLabel>
                <Select
                  value={formData.disposition}
                  onChange={handleInputChange("disposition")}
                  required
                >
                  <MenuItem value="SCRAPPED">Scrapped</MenuItem>
                  <MenuItem value="SOLD">Sold for Repair</MenuItem>
                  <MenuItem value="PARTS">Sold for Parts</MenuItem>
                  <MenuItem value="EXPORTED">Exported</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={handleInputChange("notes")}
                multiline
                rows={3}
                helperText="Optional notes about the sale or disposition"
              />

              <Box>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setShowSignaturePad(true)}
                >
                  Yard Representative Signature *
                  {formData.yardSignature && (
                    <Chip
                      label="Signed"
                      color="success"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Button>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.sendEmailMV2459}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sendEmailMV2459: e.target.checked,
                      }))
                    }
                  />
                }
                label="Email MV2459 Junk Bill to Buyer"
              />

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                size="large"
              >
                Complete Sale
              </Button>
            </Stack>
          </form>
        </Paper>
      )}

      {/* VIN Scanner Dialog */}
      <VINScanner
        open={showVINScanner}
        onClose={() => setShowVINScanner(false)}
        onVINDetected={handleVINScanned}
      />

      {/* Vehicle Details Dialog */}
      <Dialog
        open={showVehicleDetails}
        onClose={() => setShowVehicleDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Vehicle Purchase Details</DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="h6">Vehicle Information</Typography>
              <Typography>VIN: {selectedVehicle.vehicleVIN}</Typography>
              <Typography>
                Vehicle: {selectedVehicle.vehicleYear}{" "}
                {selectedVehicle.vehicleMake}
              </Typography>
              <Typography>
                Purchase Price: ${selectedVehicle.salePrice}
              </Typography>
              <Typography>
                Purchase Date:{" "}
                {new Date(selectedVehicle.saleDate).toLocaleDateString()}
              </Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Original Seller Information
              </Typography>
              <Typography>Name: {selectedVehicle.sellerName}</Typography>
              <Typography>Address: {selectedVehicle.sellerAddress}</Typography>
              <Typography>Phone: {selectedVehicle.sellerPhone}</Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Transaction Information
              </Typography>
              <Typography>
                Purchased By: {selectedVehicle.driverName}
              </Typography>
              <Typography>Transaction ID: {selectedVehicle.id}</Typography>
              <Typography>
                Current Status: {selectedVehicle.vehicleDisposition}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVehicleDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Signature Pad Dialog */}
      <SignaturePad
        open={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSignatureSaved}
        title="Yard Representative Signature Required"
        signerName={`${user.firstName} ${user.lastName} (${user.role})`}
      />
    </Box>
  );
};

export default VehicleSell;
