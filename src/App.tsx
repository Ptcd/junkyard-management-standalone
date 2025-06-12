import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  AccountCircle,
  DirectionsCar,
  Assignment,
  Dashboard,
  AdminPanelSettings,
  Logout,
  Settings as SettingsIcon,
  CarRepair,
  AttachMoney,
  AccountBalanceWallet,
  Receipt,
  Assessment,
  SupportAgent,
} from "@mui/icons-material";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import DriverDashboard from "./components/DriverDashboard";
import VehiclePurchase from "./components/VehiclePurchase";
import VehicleSell from "./components/VehicleSell";
import LogBook from "./components/LogBook";
import Settings from "./components/Settings";
import ImpoundLienManager from "./components/ImpoundLienManager";
import OfflineIndicator from "./components/OfflineIndicator";
import AccountingDashboard from "./components/AccountingDashboard";
import ExpenseReporting from "./components/ExpenseReporting";
import NMVTISManager from "./components/NMVTISManager";
import VAWorkflowHelper from "./components/VAWorkflowHelper";
import { initializeNMVTISScheduler } from "./utils/nmvtisScheduler";
import { initializeNMVTIS } from "./utils/nmvtisReporting";
import { getCurrentUser, signOut, User } from "./utils/supabaseAuth";
import "./App.css";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

function TabPanel({
  children,
  value,
  index,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
}) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for current authenticated user
    const checkUser = async () => {
      const { user: currentUser } = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      setLoading(false);
    };

    checkUser();

    // Initialize NMVTIS system
    try {
      // Configure NMVTIS with demo settings
      initializeNMVTIS({
        reportingEntityId: "WI-DEMO-JUNKYARD-001",
        entityName: "Demo Junkyard & Auto Parts",
        entityAddress: "123 Salvage Road",
        entityCity: "Milwaukee",
        entityState: "WI", 
        entityZip: "53201",
        entityPhone: "(414) 555-0123",
        apiProvider: "aamva_svrs" // Start with AAMVA SVRS (manual reporting)
      });

      // Initialize the scheduler
      initializeNMVTISScheduler();
    } catch (error) {
      console.error("Failed to initialize NMVTIS system:", error);
    }
  }, []);

  useEffect(() => {
    // Update tab based on current route
    const path = location.pathname;
    if (path.includes("/purchase")) setTabValue(1);
    else if (path.includes("/sell")) setTabValue(2);
    else if (path.includes("/logbook")) setTabValue(3);
    else if (path.includes("/impound")) setTabValue(4);
    else if (path.includes("/accounting")) setTabValue(5);
    else if (path.includes("/expenses")) setTabValue(6);
    else if (path.includes("/nmvtis")) setTabValue(7);
    else if (path.includes("/va-workflow")) setTabValue(8);
    else if (path.includes("/settings")) setTabValue(9);
    else setTabValue(0);
  }, [location]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    navigate("/");
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      setUser(null);
      setAnchorEl(null);
      navigate("/login");
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    switch (newValue) {
      case 0:
        navigate("/");
        break;
      case 1:
        navigate("/purchase");
        break;
      case 2:
        navigate("/sell");
        break;
      case 3:
        navigate("/logbook");
        break;
      case 4:
        navigate("/impound");
        break;
      case 5:
        navigate("/accounting");
        break;
      case 6:
        navigate("/expenses");
        break;
      case 7:
        navigate("/nmvtis");
        break;
      case 8:
        navigate("/va-workflow");
        break;
      case 9:
        navigate("/settings");
        break;
    }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <DirectionsCar sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Junkyard Management System
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user.firstName} {user.lastName} ({user.role})
            </Typography>
            <IconButton size="large" onClick={handleMenu} color="inherit">
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ bgcolor: "primary.dark" }}
          textColor="inherit"
          indicatorColor="secondary"
        >
          <Tab icon={<Dashboard />} label="Dashboard" iconPosition="start" />
          <Tab
            icon={<DirectionsCar />}
            label="Vehicle Purchase"
            iconPosition="start"
          />
          <Tab
            icon={<AttachMoney />}
            label="Vehicle Sell"
            iconPosition="start"
          />
          <Tab icon={<Assignment />} label="Log Book" iconPosition="start" />
          <Tab icon={<CarRepair />} label="Impound/Lien" iconPosition="start" />
          <Tab icon={<AccountBalanceWallet />} label="Accounting" iconPosition="start" />
          <Tab icon={<Receipt />} label="Expenses" iconPosition="start" />
          <Tab icon={<Assessment />} label="NMVTIS" iconPosition="start" />
          <Tab icon={<SupportAgent />} label="VA Workflow" iconPosition="start" />
          {user.role === "admin" && (
            <Tab
              icon={<SettingsIcon />}
              label="Settings"
              iconPosition="start"
            />
          )}
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Routes>
          <Route
            path="/"
            element={
              user.role === "admin" ? (
                <AdminDashboard user={user} />
              ) : (
                <DriverDashboard user={user} />
              )
            }
          />
          <Route path="/purchase" element={<VehiclePurchase user={user} />} />
          <Route path="/sell" element={<VehicleSell user={user} />} />
          <Route path="/logbook" element={<LogBook user={user} />} />
          <Route path="/impound" element={<ImpoundLienManager user={user} />} />
          <Route path="/accounting" element={<AccountingDashboard user={user} />} />
          <Route path="/expenses" element={<ExpenseReporting user={user} />} />
          <Route path="/nmvtis" element={<NMVTISManager user={user} />} />
          <Route path="/va-workflow" element={<VAWorkflowHelper user={user} />} />
          {user.role === "admin" && (
            <Route path="/settings" element={<Settings user={user} />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
      
      {/* Offline Indicator */}
      <OfflineIndicator />
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <MainApp />
      </Router>
    </ThemeProvider>
  );
}

export default App;
