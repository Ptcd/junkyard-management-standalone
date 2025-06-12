import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  OpenInNew,
  ContentCopy,
  CheckCircle,
  Assignment,
  Schedule,
  Download,
} from "@mui/icons-material";
import {
  getPendingAAMVAReports,
  generateAAMVAReportSummary,
  downloadAAMVABatchCSV,
  markAAMVAReportsSubmitted,
  getAAMVASubmissionStats,
} from "../utils/nmvtisAAMVAHelper";

interface User {
  id: string;
  role: "admin" | "driver";
  yardId: string;
  firstName: string;
  lastName: string;
}

interface VAWorkflowHelperProps {
  user: User;
}

const VAWorkflowHelper: React.FC<VAWorkflowHelperProps> = ({ user }) => {
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [completedReports, setCompletedReports] = useState<string[]>([]);
  const [showReportData, setShowReportData] = useState(false);
  const [currentReportData, setCurrentReportData] = useState("");
  const [stats, setStats] = useState({ pending: 0, submitted: 0, failed: 0, scheduled: 0, total: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const pending = getPendingAAMVAReports();
    const statsData = getAAMVASubmissionStats();
    setPendingReports(pending);
    setStats(statsData);
  };

  const steps = [
    {
      label: "Check for Pending Reports",
      description: "Verify how many NMVTIS reports need to be submitted today",
    },
    {
      label: "Open AAMVA SVRS Website",
      description: "Log into the NMVTIS reporting system",
    },
    {
      label: "Submit Each Report",
      description: "Enter vehicle data into AAMVA forms (copy/paste ready)",
    },
    {
      label: "Mark as Complete",
      description: "Update the system to show reports were submitted",
    },
  ];

  const handleOpenAAMVA = () => {
    window.open('https://nmvtisreporting.aamva.org/', '_blank');
    setActiveStep(2);
  };

  const handleViewReportData = (reportId: string) => {
    const data = generateAAMVAReportSummary(reportId);
    setCurrentReportData(data);
    setShowReportData(true);
  };

  const handleCopyData = async () => {
    try {
      await navigator.clipboard.writeText(currentReportData);
      alert("Report data copied! Now paste it into the AAMVA form.");
    } catch (err) {
      alert("Please manually select and copy the text.");
    }
  };

  const handleMarkReportComplete = (reportId: string) => {
    setCompletedReports([...completedReports, reportId]);
  };

  const handleFinishAll = () => {
    if (completedReports.length === 0) {
      alert("Please mark at least one report as complete first.");
      return;
    }
    
    markAAMVAReportsSubmitted(completedReports);
    setCompletedReports([]);
    setActiveStep(0);
    loadData();
    alert(`${completedReports.length} reports marked as submitted successfully!`);
  };

  const handleBatchDownload = () => {
    downloadAAMVABatchCSV();
    alert("Downloaded! Use this CSV file if AAMVA allows batch upload.");
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        VA NMVTIS Workflow
      </Typography>
      <Typography variant="subtitle1" gutterBottom color="text.secondary">
        Step-by-step process for Virtual Assistant NMVTIS reporting
      </Typography>

      {/* Quick Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" variant="body2">
              Reports Due Today
            </Typography>
            <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 200 }}>
          <CardContent>
            <Typography color="textSecondary" variant="body2">
              Completed This Session
            </Typography>
            <Typography variant="h4" color="success.main">{completedReports.length}</Typography>
          </CardContent>
        </Card>
      </Stack>

      {stats.pending === 0 ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          🎉 All NMVTIS reports are up to date! No work needed today.
        </Alert>
      ) : (
        <>
          {/* Step-by-Step Workflow */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Today's NMVTIS Workflow ({stats.pending} reports)
            </Typography>
            
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel>{step.label}</StepLabel>
                  <StepContent>
                    <Typography>{step.description}</Typography>
                    <Box sx={{ mb: 2 }}>
                      {index === 0 && (
                        <Button
                          variant="contained"
                          onClick={() => setActiveStep(1)}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          I see {stats.pending} reports - Continue
                        </Button>
                      )}
                      
                      {index === 1 && (
                        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<OpenInNew />}
                            onClick={handleOpenAAMVA}
                          >
                            Open AAMVA SVRS
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={handleBatchDownload}
                          >
                            Download CSV (if batch upload available)
                          </Button>
                        </Stack>
                      )}
                      
                      {index === 2 && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Use the report list below to copy/paste data for each VIN.
                        </Alert>
                      )}
                      
                      {index === 3 && (
                        <Button
                          variant="contained"
                          color="success"
                          onClick={handleFinishAll}
                          disabled={completedReports.length === 0}
                          sx={{ mt: 1 }}
                        >
                          Finish - Mark {completedReports.length} Reports as Submitted
                        </Button>
                      )}
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* Reports List for VA */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reports to Submit ({pendingReports.length})
            </Typography>
            
            <List>
              {pendingReports.map((report, index) => (
                <ListItem key={report.id} sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}>
                  <ListItemIcon>
                    <Typography variant="h6">{index + 1}</Typography>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" fontFamily="monospace">
                          VIN: {report.vehicleData.vin}
                        </Typography>
                        <Chip 
                          label={report.reportType} 
                          color={report.reportType === 'PURCHASE' ? 'info' : 'success'}
                          size="small"
                        />
                        {completedReports.includes(report.id) && (
                          <Chip label="✓ DONE" color="success" size="small" />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="body2">
                        From: {report.vehicleData.sellerName}
                        {report.vehicleData.buyerName && ` → To: ${report.vehicleData.buyerName}`}
                      </Typography>
                    }
                  />
                  
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Assignment />}
                      onClick={() => handleViewReportData(report.id)}
                    >
                      Get Data
                    </Button>
                    
                    {!completedReports.includes(report.id) ? (
                      <Button
                        variant="outlined"
                        size="small"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={() => handleMarkReportComplete(report.id)}
                      >
                        Mark Done
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        disabled
                      >
                        ✓ Complete
                      </Button>
                    )}
                  </Stack>
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      )}

      {/* Report Data Dialog */}
      <Dialog open={showReportData} onClose={() => setShowReportData(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Copy This Data to AAMVA Form
          <Button
            startIcon={<ContentCopy />}
            onClick={handleCopyData}
            sx={{ float: "right" }}
          >
            Copy
          </Button>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This data is formatted for easy copy/paste into the AAMVA SVRS form.
          </Alert>
          <TextField
            multiline
            rows={15}
            fullWidth
            value={currentReportData}
            variant="outlined"
            InputProps={{
              readOnly: true,
              style: { fontFamily: 'monospace', fontSize: '0.9rem' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReportData(false)}>Close</Button>
          <Button onClick={handleCopyData} startIcon={<ContentCopy />} variant="contained">
            Copy to Clipboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VAWorkflowHelper; 