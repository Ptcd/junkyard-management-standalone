import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import {
  Search,
  Download,
  Visibility,
  GetApp,
  Description,
  Image,
  Assignment,
  PictureAsPdf,
} from "@mui/icons-material";
import { supabase } from "../utils/supabaseAuth";

interface User {
  id: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
}

interface DocumentManagerProps {
  user: User;
}

interface TransactionDocument {
  id: string;
  vin: string;
  year: number;
  make?: string;
  seller_first_name: string;
  seller_last_name: string;
  purchase_date: string;
  purchase_price: number;
  created_at: string;
  bill_of_sale_pdf_url?: string;
  // Legacy fields for backward compatibility
  signature_url?: string;
  id_photo_url?: string;
  signature_data?: string;
  photos?: string[];
  signatureUrl?: string;
  idPhotoUrl?: string;
  documentUrls?: string[];
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<TransactionDocument[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionDocument[]>([]);
  const [searchVin, setSearchVin] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [documentViewOpen, setDocumentViewOpen] = useState(false);
  const [error, setError] = useState("");

  // Fetch all transactions with documents
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("vehicle_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      // If not admin, filter by yard
      if (user.role !== "admin") {
        query = query.eq("yard_id", user.yardId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Also get localStorage transactions for offline data
      const localTransactions = JSON.parse(
        localStorage.getItem("vehicleTransactions") || "[]"
      );

      // Combine and deduplicate
      const allTransactions = [...(data || []), ...localTransactions];
      const uniqueTransactions = allTransactions.filter(
        (transaction, index, self) =>
          index === self.findIndex((t) => t.vin === transaction.vin && t.created_at === transaction.created_at)
      );

      setTransactions(uniqueTransactions);
      setFilteredTransactions(uniqueTransactions);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      setError("Failed to load transaction documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  // Filter transactions based on search criteria
  useEffect(() => {
    let filtered = transactions;

    // Partial VIN search - matches any part of the VIN
    if (searchVin) {
      filtered = filtered.filter((t) =>
        (t.vin || "").toLowerCase().includes(searchVin.toLowerCase())
      );
    }

    // Date filter
    if (searchDate) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.purchase_date || t.created_at).toISOString().split("T")[0];
        return transactionDate === searchDate;
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchVin, searchDate]);

  // Download document
  const downloadDocument = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
      setError("Failed to download document");
    }
  };

  // View document in dialog
  const viewDocument = (url: string) => {
    setSelectedDocument(url);
    setDocumentViewOpen(true);
  };

  // Generate PDF bill of sale
  const generateBillOfSalePDF = (transaction: TransactionDocument) => {
    // This would integrate with a PDF generation library
    // For now, we'll create a simple HTML version
    const billOfSaleData = {
      transactionId: transaction.id,
      vin: transaction.vin,
      year: transaction.year,
      sellerName: `${transaction.seller_first_name} ${transaction.seller_last_name}`,
      purchasePrice: transaction.purchase_price,
      purchaseDate: transaction.purchase_date,
    };

    console.log("Generate PDF for:", billOfSaleData);
    setError("PDF generation feature coming soon!");
  };

  // Export all documents for a transaction
  const exportAllDocuments = (transaction: TransactionDocument) => {
    const documents = [];
    
    if (transaction.signatureUrl) {
      documents.push({ url: transaction.signatureUrl, name: `${transaction.vin}_signature.png` });
    }
    
    if (transaction.idPhotoUrl) {
      documents.push({ url: transaction.idPhotoUrl, name: `${transaction.vin}_id_photo.jpg` });
    }

    if (transaction.documentUrls) {
      transaction.documentUrls.forEach((url, index) => {
        documents.push({ url, name: `${transaction.vin}_document_${index + 1}` });
      });
    }

    // Download all documents
    documents.forEach((doc, index) => {
      setTimeout(() => {
        downloadDocument(doc.url, doc.name);
      }, index * 1000); // Stagger downloads
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Document Manager
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Legal document access for law enforcement and compliance
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Search Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search Documents
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: { xs: 1, md: 2 } }}>
              <TextField
                fullWidth
                label="Search by VIN (partial match)"
                value={searchVin}
                onChange={(e) => setSearchVin(e.target.value)}
                placeholder="Enter any part of VIN..."
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                }}
                helperText="Enter any part of the VIN to find matching vehicles"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Filter by Date"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ flex: 0.5 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchVin("");
                  setSearchDate("");
                }}
                sx={{ height: "56px" }}
              >
                Clear
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredTransactions.length} of {transactions.length} transactions
        {searchVin && ` matching VIN: "${searchVin}"`}
      </Typography>

      {/* Documents Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>VIN</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Seller</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Documents</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id || `${transaction.vin}-${transaction.created_at}`}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {transaction.vin}
                  </Typography>
                </TableCell>
                <TableCell>
                  {transaction.year} {transaction.make || "Unknown"}
                </TableCell>
                <TableCell>
                  {transaction.seller_first_name} {transaction.seller_last_name}
                </TableCell>
                <TableCell>
                  {new Date(transaction.purchase_date || transaction.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  ${transaction.purchase_price?.toFixed(2) || "0.00"}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {transaction.signatureUrl && (
                      <Chip
                        icon={<Assignment />}
                        label="Signature"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {transaction.idPhotoUrl && (
                      <Chip
                        icon={<Image />}
                        label="ID Photo"
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {transaction.signatureUrl && (
                      <IconButton
                        size="small"
                        onClick={() => viewDocument(transaction.signatureUrl!)}
                        title="View Signature"
                      >
                        <Visibility />
                      </IconButton>
                    )}
                    {transaction.idPhotoUrl && (
                      <IconButton
                        size="small"
                        onClick={() => viewDocument(transaction.idPhotoUrl!)}
                        title="View ID Photo"
                      >
                        <Image />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => generateBillOfSalePDF(transaction)}
                      title="Generate Bill of Sale PDF"
                    >
                      <Description />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => exportAllDocuments(transaction)}
                      title="Download All Documents"
                    >
                      <GetApp />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredTransactions.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            {searchVin || searchDate ? "No documents found matching your search criteria" : "No documents available"}
          </Typography>
        </Box>
      )}

      {/* Document Viewer Dialog */}
      <Dialog
        open={documentViewOpen}
        onClose={() => setDocumentViewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Document Viewer</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box textAlign="center">
              <img
                src={selectedDocument}
                alt="Document"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentViewOpen(false)}>Close</Button>
          {selectedDocument && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => {
                const filename = selectedDocument.includes("signature") ? "signature.png" : "id_photo.jpg";
                downloadDocument(selectedDocument, filename);
              }}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentManager; 