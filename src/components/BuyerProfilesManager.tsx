import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Card,
  CardContent,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  BuyerProfile,
  getBuyerProfiles,
  getAllBuyerProfiles,
  createBuyerProfile,
  updateBuyerProfile,
  deleteBuyerProfile,
  getBuyerProfileStats,
  createDefaultBuyerProfiles,
  searchBuyerProfiles,
} from "../utils/buyerProfiles";
import { User } from "../utils/supabaseAuth";

interface BuyerProfilesManagerProps {
  user: User;
}

const BuyerProfilesManager: React.FC<BuyerProfilesManagerProps> = ({
  user,
}) => {
  const [profiles, setProfiles] = useState<BuyerProfile[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<BuyerProfile | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byType: {} as Record<string, number>,
  });

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    address: "",
    city: "",
    state: "WI",
    zip: "",
    phone: "",
    email: "",
    secondaryEmail: "",
    licenseNumber: "",
    buyerType: "scrap_yard" as BuyerProfile["buyerType"],
    notes: "",
  });

  useEffect(() => {
    loadProfiles();
    loadStats();
    // Create default profiles if none exist
    createDefaultBuyerProfiles(user.yardId);
  }, [user.yardId]);

  const loadProfiles = () => {
    const allProfiles = getAllBuyerProfiles(user.yardId);
    console.log("Loading buyer profiles:", allProfiles.length, "total");
    console.log("Profile statuses:", allProfiles.map(p => ({ 
      name: p.companyName, 
      isActive: p.isActive 
    })));
    setProfiles(allProfiles);
  };

  const loadStats = () => {
    const profileStats = getBuyerProfileStats(user.yardId);
    setStats(profileStats);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      const searchResults = searchBuyerProfiles(user.yardId, searchTerm);
      setProfiles(searchResults);
    } else {
      loadProfiles();
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      address: "",
      city: "",
      state: "WI",
      zip: "",
      phone: "",
      email: "",
      secondaryEmail: "",
      licenseNumber: "",
      buyerType: "scrap_yard",
      notes: "",
    });
  };

  const handleAddProfile = () => {
    try {
      createBuyerProfile({
        ...formData,
        isActive: true,
        yardId: user.yardId,
      });

      setSuccess("Buyer profile created successfully!");
      setShowAddDialog(false);
      resetForm();
      loadProfiles();
      loadStats();
    } catch (err) {
      setError("Failed to create buyer profile");
    }

    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
  };

  const handleEditProfile = () => {
    if (!selectedProfile) return;

    try {
      updateBuyerProfile(selectedProfile.id, formData);
      setSuccess("Buyer profile updated successfully!");
      setShowEditDialog(false);
      setSelectedProfile(null);
      resetForm();
      loadProfiles();
      loadStats();
    } catch (err) {
      setError("Failed to update buyer profile");
    }

    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (
      window.confirm("Are you sure you want to deactivate this buyer profile?")
    ) {
      try {
        console.log("User confirmed deletion of profile:", profileId);
        const result = await deleteBuyerProfile(profileId);
        
        if (result) {
          setSuccess("Buyer profile deactivated successfully!");
          console.log("Profile deactivated, refreshing lists...");
          loadProfiles();
          loadStats();
        } else {
          setError("Failed to deactivate buyer profile - profile not found");
        }
      } catch (err) {
        console.error("Error deactivating buyer profile:", err);
        setError("Failed to deactivate buyer profile");
      }

      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 3000);
    } else {
      console.log("User cancelled profile deletion");
    }
  };

  const openEditDialog = (profile: BuyerProfile) => {
    setSelectedProfile(profile);
    setFormData({
      companyName: profile.companyName,
      contactName: profile.contactName,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zip: profile.zip,
      phone: profile.phone,
      email: profile.email,
      secondaryEmail: profile.secondaryEmail || "",
      licenseNumber: profile.licenseNumber || "",
      buyerType: profile.buyerType,
      notes: profile.notes || "",
    });
    setShowEditDialog(true);
  };

  const getBuyerTypeLabel = (type: string) => {
    const labels = {
      scrap_yard: "Scrap Yard",
      parts_dealer: "Parts Dealer",
      export_company: "Export Company",
      individual: "Individual",
      other: "Other",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getBuyerTypeColor = (type: string) => {
    const colors = {
      scrap_yard: "primary",
      parts_dealer: "success",
      export_company: "info",
      individual: "warning",
      other: "default",
    };
    return colors[type as keyof typeof colors] || "default";
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Buyer Profiles Management
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Manage pre-configured buyer companies for quick vehicle sales
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

      {/* Statistics Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Profiles
            </Typography>
            <Typography variant="h4">{stats.total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Active Profiles
            </Typography>
            <Typography variant="h4" color="success.main">
              {stats.active}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Scrap Yards
            </Typography>
            <Typography variant="h4">{stats.byType.scrap_yard || 0}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Parts Dealers
            </Typography>
            <Typography variant="h4">
              {stats.byType.parts_dealer || 0}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Search and Add */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search Buyers"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
          >
            Search
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Add Buyer
          </Button>
        </Stack>
      </Paper>

      {/* Profiles Table */}
      <Paper sx={{ p: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Contact Info</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <Stack>
                      <Typography variant="subtitle2">
                        {profile.companyName}
                      </Typography>
                      {profile.licenseNumber && (
                        <Typography variant="caption" color="text.secondary">
                          License: {profile.licenseNumber}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{profile.contactName}</TableCell>
                  <TableCell>
                    <Chip
                      label={getBuyerTypeLabel(profile.buyerType)}
                      color={getBuyerTypeColor(profile.buyerType) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack>
                      <Typography variant="body2">
                        {profile.city}, {profile.state}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {profile.address}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">{profile.phone}</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2">{profile.email}</Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={profile.isActive ? "Active" : "Inactive"}
                      color={profile.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit Profile">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(profile)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {profile.isActive && (
                        <Tooltip title="Deactivate Profile">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProfile(profile.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {profiles.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No buyer profiles found. Add some buyers to get started.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onClose={() => {
          setShowAddDialog(false);
          setShowEditDialog(false);
          setSelectedProfile(null);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {showAddDialog ? "Add New Buyer Profile" : "Edit Buyer Profile"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Company Name *"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    companyName: e.target.value,
                  }))
                }
                fullWidth
                required
              />
              <TextField
                label="Contact Name *"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactName: e.target.value,
                  }))
                }
                fullWidth
                required
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel>Buyer Type</InputLabel>
              <Select
                value={formData.buyerType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    buyerType: e.target.value as BuyerProfile["buyerType"],
                  }))
                }
              >
                <MenuItem value="scrap_yard">Scrap Yard</MenuItem>
                <MenuItem value="parts_dealer">Parts Dealer</MenuItem>
                <MenuItem value="export_company">Export Company</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Address *"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              fullWidth
              required
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="City *"
                value={formData.city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, city: e.target.value }))
                }
                fullWidth
                required
              />
              <TextField
                label="State"
                value={formData.state}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, state: e.target.value }))
                }
                sx={{ width: 100 }}
              />
              <TextField
                label="ZIP Code"
                value={formData.zip}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, zip: e.target.value }))
                }
                sx={{ width: 120 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Phone *"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                fullWidth
                required
              />
              <TextField
                label="License Number"
                value={formData.licenseNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    licenseNumber: e.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Primary Email *"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                fullWidth
                required
              />
              <TextField
                label="Secondary Email"
                type="email"
                value={formData.secondaryEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    secondaryEmail: e.target.value,
                  }))
                }
                fullWidth
              />
            </Stack>

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              multiline
              rows={3}
              fullWidth
              helperText="Payment terms, specialties, pickup preferences, etc."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowAddDialog(false);
              setShowEditDialog(false);
              setSelectedProfile(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={showAddDialog ? handleAddProfile : handleEditProfile}
            variant="contained"
            disabled={
              !formData.companyName ||
              !formData.contactName ||
              !formData.address ||
              !formData.phone ||
              !formData.email
            }
          >
            {showAddDialog ? "Add Profile" : "Update Profile"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BuyerProfilesManager;
