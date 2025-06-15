import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CloudUpload,
  Download,
  OpenInNew,
  CheckCircle,
  Schedule,
  Error,
  ContentCopy,
  Refresh,
  Assignment,
} from "@mui/icons-material";
import {
  getPendingAAMVAReports,
  generateAAMVAReportSummary,
  downloadAAMVABatchCSV,
  openAAMVAWithInstructions,
  markAAMVAReportsSubmitted,
  getAAMVASubmissionStats,
  formatAAMVADate,
} from "../utils/nmvtisAAMVAHelper";

interface User {
  id: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
}

interface NMVTISManagerProps {
  user: User;
}

const NMVTISManager: React.FC<NMVTISManagerProps> = ({ user }) => {
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    submitted: 0,
    failed: 0,
    scheduled: 0,
    total: 0,
  });
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [reportSummary, setReportSummary] = useState<string>("");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const pending = getPendingAAMVAReports();
    const statsData = getAAMVASubmissionStats();

    setPendingReports(pending);
    setStats(statsData);
  };

  const handleSelectReport = (reportId: string, checked: boolean) => {
    if (checked) {
      setSelectedReports([...selectedReports, reportId]);
    } else {
      setSelectedReports(selectedReports.filter((id) => id !== reportId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(pendingReports.map((r) => r.id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleViewReport = (reportId: string) => {
    const summary = generateAAMVAReportSummary(reportId);
    setReportSummary(summary);
    setSelectedReportId(reportId);
    setShowReportDialog(true);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(reportSummary);
      alert("Report data copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      alert("Failed to copy to clipboard. Please select and copy manually.");
    }
  };

  const handleMarkSubmitted = () => {
    if (selectedReports.length === 0) {
      alert("Please select reports to mark as submitted");
      return;
    }
    setShowSubmitDialog(true);
  };

  const confirmMarkSubmitted = () => {
    markAAMVAReportsSubmitted(selectedReports);
    setSelectedReports([]);
    setShowSubmitDialog(false);
    loadData();
    alert(`${selectedReports.length} reports marked as submitted!`);
  };

  const handleBatchDownload = () => {
    if (pendingReports.length === 0) {
      alert("No pending reports to download");
      return;
    }
    downloadAAMVABatchCSV();
    alert("Batch CSV file downloaded! You can upload this to AAMVA SVRS.");
  };

  const handleOpenAAMVA = () => {
    openAAMVAWithInstructions();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        NMVTIS Management
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Streamlined AAMVA SVRS reporting workflow
      </Typography>

      {/* Statistics Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Schedule color="warning" sx={{ mr: 1 }} />
              <Box>
                <Typography color="textSecondary" variant="body2">
                  Pending Submission
                </Typography>
                <Typography variant="h6">{stats.pending}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CheckCircle color="success" sx={{ mr: 1 }} />
              <Box>
                <Typography color="textSecondary" variant="body2">
                  Submitted
                </Typography>
                <Typography variant="h6">{stats.submitted}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Assignment color="info" sx={{ mr: 1 }} />
              <Box>
                <Typography color="textSecondary" variant="body2">
                  Scheduled
                </Typography>
                <Typography variant="h6">{stats.scheduled}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {stats.failed > 0 && (
          <Card sx={{ minWidth: 200 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Error color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Failed
                  </Typography>
                  <Typography variant="h6">{stats.failed}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* Action Buttons */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<OpenInNew />}
            onClick={handleOpenAAMVA}
            color="primary"
            disabled={stats.pending === 0}
          >
            Open AAMVA SVRS
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleBatchDownload}
            disabled={stats.pending === 0}
          >
            Download Batch CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<CheckCircle />}
            onClick={handleMarkSubmitted}
            disabled={selectedReports.length === 0}
            color="success"
          >
            Mark Selected as Submitted ({selectedReports.length})
          </Button>

          <Button variant="text" startIcon={<Refresh />} onClick={loadData}>
            Refresh
          </Button>
        </Stack>

        {stats.pending > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You have {stats.pending} reports ready for submission to AAMVA SVRS.
            Use the buttons above for batch processing or view individual
            reports below.
          </Alert>
        )}
      </Paper>

      {/* Pending Reports Table */}
      <Paper elevation={2}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Pending Reports ({pendingReports.length})
          </Typography>

          {pendingReports.length === 0 ? (
            <Alert severity="success">
              No pending NMVTIS reports! All reports are up to date.
            </Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={
                            selectedReports.length === pendingReports.length &&
                            pendingReports.length > 0
                          }
                          indeterminate={
                            selectedReports.length > 0 &&
                            selectedReports.length < pendingReports.length
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>VIN</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Due Date</TableCell>
                      <TableCell>Vehicle Info</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedReports.includes(report.id)}
                            onChange={(e) =>
                              handleSelectReport(report.id, e.target.checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {report.vehicleData.vin}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.reportType}
                            color={
                              report.reportType === "PURCHASE"
                                ? "info"
                                : "success"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {formatAAMVADate(report.scheduleDate)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            From: {report.vehicleData.sellerName}
                          </Typography>
                          {report.vehicleData.buyerName && (
                            <Typography variant="body2">
                              To: {report.vehicleData.buyerName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View report details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewReport(report.id)}
                            >
                              <Assignment />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      </Paper>

      {/* Report Details Dialog */}
      <Dialog
        open={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          NMVTIS Report Details
          <Tooltip title="Copy to clipboard">
            <IconButton onClick={handleCopyToClipboard} sx={{ float: "right" }}>
              <ContentCopy />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={15}
            fullWidth
            value={reportSummary}
            variant="outlined"
            InputProps={{
              readOnly: true,
              style: { fontFamily: "monospace", fontSize: "0.9rem" },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReportDialog(false)}>Close</Button>
          <Button onClick={handleCopyToClipboard} startIcon={<ContentCopy />}>
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog
        open={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Mark {selectedReports.length} reports as submitted to AAMVA SVRS?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Only confirm this after you have successfully submitted the reports
            to AAMVA SVRS.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmMarkSubmitted}
            variant="contained"
            color="success"
          >
            Confirm Submitted
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NMVTISManager;
