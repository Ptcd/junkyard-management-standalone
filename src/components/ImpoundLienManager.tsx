import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from "@mui/icons-material";

interface ImpoundLienVehicle {
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
  // Additional fields for impound/lien processing
  impoundStatus?: "pending" | "processed" | "released" | "auctioned" | "auto-transferred";
  impoundReason?: string;
  impoundDate?: string;
  releaseDate?: string;
  auctionDate?: string;
  notes?: string;
  // Legal compliance fields
  impoundAuthority?: string;
  storageLocation?: string;
  releasedTo?: string;
  feesCollected?: string;
  licensePlate?: string;
  vehicleColor?: string;
  // Auto-transfer tracking
  autoTransferDate?: string;
  autoTransferTransactionId?: string;
}

interface User {
  id: string;
  username: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
}

interface ImpoundLienManagerProps {
  user: User;
}

const ImpoundLienManager: React.FC<ImpoundLienManagerProps> = ({ user }) => {
  const [vehicles, setVehicles] = useState<ImpoundLienVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] =
    useState<ImpoundLienVehicle | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ImpoundLienVehicle>>({});
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadVehicles();
    checkForAutoTransfers();
  }, []);

  const loadVehicles = () => {
    const stored = localStorage.getItem("impoundLienVehicles");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter by user's yard if they're not admin
        const filtered =
          user.role === "admin"
            ? parsed
            : parsed.filter(
                (v: ImpoundLienVehicle) => v.yardId === user.yardId,
              );
        setVehicles(filtered);
      } catch (e) {
        console.error("Error loading impound/lien vehicles:", e);
        setError("Error loading vehicle data");
      }
    }
  };

  const checkForAutoTransfers = () => {
    const stored = localStorage.getItem("impoundLienVehicles");
    if (!stored) return;

    try {
      const allVehicles = JSON.parse(stored);
      const today = new Date();
      let hasUpdates = false;

      const updatedVehicles = allVehicles.map((vehicle: ImpoundLienVehicle) => {
        // Check if vehicle is processed and past 21-day release date
        if (vehicle.impoundStatus === "processed" && vehicle.releaseDate) {
          const releaseDate = new Date(vehicle.releaseDate);
          
          // If past release date and not already auto-transferred
          if (today >= releaseDate && !vehicle.autoTransferDate) {
            // Create automatic sale transaction
            const transferTransactionId = createAutoTransferTransaction(vehicle);
            
            hasUpdates = true;
            return {
              ...vehicle,
              impoundStatus: "auto-transferred" as const,
              autoTransferDate: today.toISOString().split('T')[0],
              autoTransferTransactionId: transferTransactionId,
              notes: (vehicle.notes || "") + "\nAuto-transferred to On Kaul Auto Salvage after 21-day hold period."
            };
          }
        }
        return vehicle;
      });

      if (hasUpdates) {
        localStorage.setItem("impoundLienVehicles", JSON.stringify(updatedVehicles));
        loadVehicles(); // Reload to show updates
        setSuccess("Vehicles past 21-day hold period have been automatically transferred to On Kaul Auto Salvage");
        setTimeout(() => setSuccess(""), 7000);
      }
    } catch (error) {
      console.error("Error checking for auto-transfers:", error);
    }
  };

  const createAutoTransferTransaction = (vehicle: ImpoundLienVehicle): string => {
    const transferTransactionId = `AUTO-TRANSFER-${Date.now()}`;
    
    // Create sale record for the automatic transfer
    const saleRecord = {
      id: transferTransactionId,
      originalTransactionId: vehicle.id,
      originalVehicle: vehicle,
      buyerName: "On Kaul Auto Salvage",
      buyerAddress: "8520 W Kaul Ave",
      buyerCity: "Milwaukee",
      buyerState: "WI",
      buyerZip: "53225",
      buyerPhone: "",
      buyerEmail: "",
      buyerLicenseNumber: "",
      salePrice: vehicle.salePrice, // Use original purchase amount
      saleDate: new Date().toISOString().split('T')[0],
      disposition: "SOLD",
      notes: "Automatic transfer from Nunu's Towing after 21-day impound hold period",
      paymentStatus: "completed",
      actualReceivedAmount: vehicle.salePrice,
      timestamp: new Date().toISOString(),
      soldBy: "Nunu's Towing and Salvage",
      userId: "AUTO-SYSTEM",
      yardId: "nunús-towing",
      sellerInfo: {
        name: "Nunu's Towing and Salvage",
        address: "12401 W Custer Ave",
        city: "Butler",
        state: "WI",
        zip: "53007"
      }
    };

    // Store sale record
    const existingSales = JSON.parse(localStorage.getItem("vehicleSales") || "[]");
    existingSales.push(saleRecord);
    localStorage.setItem("vehicleSales", JSON.stringify(existingSales));

    // Update the original vehicle transaction with new disposition
    const existingTransactions = JSON.parse(localStorage.getItem("vehicleTransactions") || "[]");
    const updatedTransactions = existingTransactions.map((t: any) =>
      t.id === vehicle.id
        ? { 
            ...t, 
            vehicleDisposition: "SOLD",
            saleRecordId: transferTransactionId,
            autoTransferInfo: {
              transferDate: new Date().toISOString().split('T')[0],
              fromCompany: "Nunu's Towing and Salvage",
              toCompany: "On Kaul Auto Salvage",
              transferAmount: vehicle.salePrice
            }
          }
        : t
    );
    localStorage.setItem("vehicleTransactions", JSON.stringify(updatedTransactions));

    return transferTransactionId;
  };

  const handleView = (vehicle: ImpoundLienVehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetails(true);
  };

  const handleEdit = (vehicle: ImpoundLienVehicle) => {
    setSelectedVehicle(vehicle);
    setEditForm({
      impoundStatus: vehicle.impoundStatus || "pending",
      impoundReason: vehicle.impoundReason || "",
      impoundDate: vehicle.impoundDate || vehicle.saleDate,
      releaseDate: vehicle.releaseDate || "",
      auctionDate: vehicle.auctionDate || "",
      notes: vehicle.notes || "",
      impoundAuthority: vehicle.impoundAuthority || "",
      storageLocation: vehicle.storageLocation || "",
      releasedTo: vehicle.releasedTo || "",
      feesCollected: vehicle.feesCollected || "",
      licensePlate: vehicle.licensePlate || "",
      vehicleColor: vehicle.vehicleColor || "",
    });
    setShowEdit(true);
  };

  const handleSaveEdit = () => {
    if (!selectedVehicle) return;

    // Auto-set release date to 21 days after impound date when status is changed to processed
    let updatedEditForm = { ...editForm };
    if (updatedEditForm.impoundStatus === "processed" && !updatedEditForm.releaseDate) {
      const impoundDate = new Date(updatedEditForm.impoundDate || selectedVehicle.saleDate);
      const releaseDate = new Date(impoundDate);
      releaseDate.setDate(releaseDate.getDate() + 21); // Add 21 days
      updatedEditForm.releaseDate = releaseDate.toISOString().split('T')[0];
    }

    const updatedVehicles = vehicles.map((v) =>
      v.id === selectedVehicle.id ? { ...v, ...updatedEditForm } : v,
    );

    // Update localStorage
    const allVehicles = JSON.parse(
      localStorage.getItem("impoundLienVehicles") || "[]",
    );
    const updatedAllVehicles = allVehicles.map((v: ImpoundLienVehicle) =>
      v.id === selectedVehicle.id ? { ...v, ...updatedEditForm } : v,
    );

    localStorage.setItem(
      "impoundLienVehicles",
      JSON.stringify(updatedAllVehicles),
    );
    setVehicles(updatedVehicles);
    setShowEdit(false);
    setSuccess("Vehicle updated successfully" + 
      (updatedEditForm.releaseDate && !editForm.releaseDate ? 
        " - Release date set to 21 days after impound" : ""));

    setTimeout(() => setSuccess(""), 5000);
  };

  const handleDelete = (vehicleId: string) => {
    if (
      window.confirm("Are you sure you want to delete this vehicle record?")
    ) {
      const updatedVehicles = vehicles.filter((v) => v.id !== vehicleId);

      // Update localStorage
      const allVehicles = JSON.parse(
        localStorage.getItem("impoundLienVehicles") || "[]",
      );
      const updatedAllVehicles = allVehicles.filter(
        (v: ImpoundLienVehicle) => v.id !== vehicleId,
      );

      localStorage.setItem(
        "impoundLienVehicles",
        JSON.stringify(updatedAllVehicles),
      );
      setVehicles(updatedVehicles);
      setSuccess("Vehicle deleted successfully");

      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "processed":
        return "info";
      case "released":
        return "success";
      case "auctioned":
        return "secondary";
      case "auto-transferred":
        return "primary";
      default:
        return "default";
    }
  };

  const checkLienHolder = (vin: string) => {
    // Open Wisconsin DOT Lien Holder Search in new tab
    // User will need to manually enter VIN on their site
    const url = "https://trust.dot.state.wi.us/linq/linqservlet?whoami=linqp1";
    window.open(url, '_blank');
    
    // Could show a dialog with instructions
    alert(`VIN to search: ${vin}\n\nThe Wisconsin DOT Lien Holder Search will open in a new tab. Please enter this VIN to check for liens.`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Impound & Lien Vehicle Management
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Manage vehicles marked as impound or lien cases. Vehicles automatically transfer to On Kaul Auto Salvage after 21 days.
      </Typography>

      {/* Add manual check button */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: "grey.100" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">
            System automatically checks for vehicles past their 21-day hold period and transfers them to On Kaul Auto Salvage.
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={checkForAutoTransfers}
          >
            Check Now
          </Button>
        </Stack>
      </Paper>

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

      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>VIN</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Seller</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Impound Date</TableCell>
                <TableCell>Release Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No impound or lien vehicles found
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => (
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
                    <TableCell>{vehicle.sellerName}</TableCell>
                    <TableCell>${vehicle.salePrice}</TableCell>
                    <TableCell>
                      <Chip
                        label={vehicle.impoundStatus || "pending"}
                        color={getStatusColor(
                          vehicle.impoundStatus || "pending",
                        )}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {vehicle.impoundDate 
                        ? new Date(vehicle.impoundDate).toLocaleDateString()
                        : new Date(vehicle.saleDate).toLocaleDateString()
                      }
                    </TableCell>
                    <TableCell>
                      {vehicle.releaseDate
                        ? new Date(vehicle.releaseDate).toLocaleDateString()
                        : vehicle.impoundStatus === "processed"
                        ? <Chip label="21 days from impound" color="info" size="small" />
                        : vehicle.impoundStatus === "auto-transferred"
                        ? <Chip label="Auto-transferred" color="primary" size="small" />
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handleView(vehicle)}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEdit(vehicle)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<SearchIcon />}
                          onClick={() => checkLienHolder(vehicle.vehicleVIN)}
                          color="info"
                        >
                          Check Liens
                        </Button>
                        {user.role === "admin" && (
                          <Button
                            size="small"
                            startIcon={<DeleteIcon />}
                            color="error"
                            onClick={() => handleDelete(vehicle.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Details Dialog */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Vehicle Details</DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="h6">Vehicle Information</Typography>
              <Typography>VIN: {selectedVehicle.vehicleVIN}</Typography>
              <Typography>
                Vehicle: {selectedVehicle.vehicleYear}{" "}
                {selectedVehicle.vehicleMake}
              </Typography>
              <Typography>License Plate: {selectedVehicle.licensePlate || "Not recorded"}</Typography>
              <Typography>Color: {selectedVehicle.vehicleColor || "Not recorded"}</Typography>
              <Typography>Price: ${selectedVehicle.salePrice}</Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Seller Information
              </Typography>
              <Typography>Name: {selectedVehicle.sellerName}</Typography>
              <Typography>Address: {selectedVehicle.sellerAddress}</Typography>
              <Typography>Phone: {selectedVehicle.sellerPhone}</Typography>

              <Typography variant="h6" sx={{ mt: 2 }}>
                Impound Information
              </Typography>
              <Typography>
                Status: {selectedVehicle.impoundStatus || "pending"}
              </Typography>
              <Typography>
                Impound Date: {selectedVehicle.impoundDate 
                  ? new Date(selectedVehicle.impoundDate).toLocaleDateString()
                  : new Date(selectedVehicle.saleDate).toLocaleDateString()
                }
              </Typography>
              <Typography>
                Authority: {selectedVehicle.impoundAuthority || "Not specified"}
              </Typography>
              <Typography>
                Storage Location: {selectedVehicle.storageLocation || "Not specified"}
              </Typography>
              {selectedVehicle.releaseDate && (
                <Typography>
                  Release Date: {new Date(selectedVehicle.releaseDate).toLocaleDateString()}
                </Typography>
              )}
              {selectedVehicle.releasedTo && (
                <Typography>Released To: {selectedVehicle.releasedTo}</Typography>
              )}
              {selectedVehicle.feesCollected && (
                <Typography>Fees Collected: ${selectedVehicle.feesCollected}</Typography>
              )}
              {selectedVehicle.impoundStatus === "auctioned" && selectedVehicle.auctionDate && (
                <Typography>
                  Auction Date: {new Date(selectedVehicle.auctionDate).toLocaleDateString()}
                </Typography>
              )}
              {selectedVehicle.impoundStatus === "auto-transferred" && (
                <>
                  <Typography>
                    Auto-Transfer Date: {selectedVehicle.autoTransferDate ? new Date(selectedVehicle.autoTransferDate).toLocaleDateString() : "N/A"}
                  </Typography>
                  <Typography>
                    Transferred From: Nunu's Towing and Salvage
                  </Typography>
                  <Typography>
                    Transferred To: On Kaul Auto Salvage
                  </Typography>
                  <Typography>
                    Transfer Amount: ${selectedVehicle.salePrice}
                  </Typography>
                  {selectedVehicle.autoTransferTransactionId && (
                    <Typography>
                      Transfer Transaction ID: {selectedVehicle.autoTransferTransactionId}
                    </Typography>
                  )}
                </>
              )}
              <Typography>
                Reason: {selectedVehicle.impoundReason || "Not specified"}
              </Typography>
              <Typography>Notes: {selectedVehicle.notes || "None"}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Impound/Lien Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editForm.impoundStatus || "pending"}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    impoundStatus: e.target.value as any,
                  }))
                }
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="processed">Processed</MenuItem>
                <MenuItem value="released">Released</MenuItem>
                <MenuItem value="auctioned">Auctioned</MenuItem>
                <MenuItem value="auto-transferred">Auto-Transferred</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Impound Reason"
              value={editForm.impoundReason || ""}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  impoundReason: e.target.value,
                }))
              }
              multiline
              rows={2}
            />

            <TextField
              fullWidth
              label="Impound Date"
              type="date"
              value={editForm.impoundDate || ""}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  impoundDate: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Release Date"
              type="date"
              value={editForm.releaseDate || ""}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  releaseDate: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Auction Date"
              type="date"
              value={editForm.auctionDate || ""}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  auctionDate: e.target.value,
                }))
              }
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Notes"
              value={editForm.notes || ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              multiline
              rows={3}
            />

            <Typography variant="h6" sx={{ mt: 2 }}>
              Legal Compliance Details
            </Typography>

            <TextField
              fullWidth
              label="Impound Authority"
              value={editForm.impoundAuthority || ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, impoundAuthority: e.target.value }))
              }
              helperText="Police dept, towing company, court order, etc."
            />

            <TextField
              fullWidth
              label="Storage Location"
              value={editForm.storageLocation || ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, storageLocation: e.target.value }))
              }
              helperText="Where on the lot is this vehicle stored?"
            />

            <TextField
              fullWidth
              label="License Plate"
              value={editForm.licensePlate || ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, licensePlate: e.target.value }))
              }
            />

            <TextField
              fullWidth
              label="Vehicle Color"
              value={editForm.vehicleColor || ""}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, vehicleColor: e.target.value }))
              }
            />

            {(editForm.impoundStatus === "released" || editForm.impoundStatus === "auctioned") && (
              <>
                <TextField
                  fullWidth
                  label="Released To"
                  value={editForm.releasedTo || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, releasedTo: e.target.value }))
                  }
                  helperText="Name of person who picked up vehicle"
                />

                <TextField
                  fullWidth
                  label="Fees Collected"
                  value={editForm.feesCollected || ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, feesCollected: e.target.value }))
                  }
                  type="number"
                  InputProps={{
                    startAdornment: "$",
                  }}
                  helperText="Total fees collected for storage, towing, etc."
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImpoundLienManager;
