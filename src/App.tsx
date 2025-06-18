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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar,
  Badge,
  CircularProgress,
  Alert,
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
  Menu as MenuIcon,
  Close as CloseIcon,
  Person,
  Folder,
} from "@mui/icons-material";
import Login from "./components/Login";
import PasswordReset from "./components/PasswordReset";
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
import DocumentManager from "./components/DocumentManager";
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
  typography: {
    h4: {
      fontSize: "1.5rem",
      "@media (min-width:600px)": {
        fontSize: "2.125rem",
      },
    },
    h5: {
      fontSize: "1.25rem",
      "@media (min-width:600px)": {
        fontSize: "1.5rem",
      },
    },
    h6: {
      fontSize: "1.125rem",
      "@media (min-width:600px)": {
        fontSize: "1.25rem",
      },
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
  },
  components: {
    MuiContainer: {
      defaultProps: {
        maxWidth: false,
      },
      styleOverrides: {
        root: {
          paddingLeft: 8,
          paddingRight: 8,
          "@media (min-width:600px)": {
            paddingLeft: 16,
            paddingRight: 16,
          },
          "@media (min-width:960px)": {
            paddingLeft: 24,
            paddingRight: 24,
            maxWidth: "1200px",
            margin: "0 auto",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          fontSize: "1rem",
          padding: "12px 24px",
          "@media (max-width:600px)": {
            fontSize: "1.1rem",
            padding: "16px 24px",
            minHeight: 56,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputBase-root": {
            fontSize: "1rem",
            "@media (max-width:600px)": {
              fontSize: "1.1rem",
              minHeight: 56,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            margin: "8px 0",
          },
        },
      },
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

// Navigation menu items
const getMenuItems = (userRole: string) =>
  [
    {
      path: "/",
      label: "Dashboard",
      icon: <Dashboard />,
      roles: ["admin", "driver"],
    },
    {
      path: "/purchase",
      label: "Vehicle Purchase",
      icon: <DirectionsCar />,
      roles: ["admin", "driver"],
    },
    {
      path: "/sell",
      label: "Vehicle Sell",
      icon: <AttachMoney />,
      roles: ["admin", "driver"],
    },
    {
      path: "/logbook",
      label: "Log Book",
      icon: <Assignment />,
      roles: ["admin", "driver"],
    },
    {
      path: "/impound",
      label: "Impound/Lien",
      icon: <CarRepair />,
      roles: ["admin", "driver"],
    },
    {
      path: "/accounting",
      label: "Accounting",
      icon: <AccountBalanceWallet />,
      roles: ["admin"],
    },
    {
      path: "/expenses",
      label: "Expenses",
      icon: <Receipt />,
      roles: ["admin", "driver"],
    },
    {
      path: "/nmvtis",
      label: "NMVTIS",
      icon: <Assessment />,
      roles: ["admin"],
    },
    {
      path: "/va-workflow",
      label: "VA Workflow",
      icon: <SupportAgent />,
      roles: ["admin"],
    },
    {
      path: "/settings",
      label: "Settings",
      icon: <SettingsIcon />,
      roles: ["admin"],
    },
    {
      path: "/document-manager",
      label: "Document Manager",
      icon: <Folder />,
      roles: ["admin"],
    },
  ].filter((item) => item.roles.includes(userRole));

function MainApp({ user }: { user: User }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = getMenuItems(user.role);

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) {
        console.error("Sign out error:", signOutError);
      } else {
        // Force page reload to reset auth state
        window.location.href = "/";
      }
    } catch (e) {
      console.error("Unexpected error during sign out:", e);
    } finally {
      setAnchorEl(null);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: { xs: 64, sm: 64 } }}>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleMobileDrawer}
              sx={{ mr: 2, p: 2 }}
            >
              <MenuIcon sx={{ fontSize: 28 }} />
            </IconButton>
          )}

          <DirectionsCar sx={{ mr: 2, fontSize: { xs: 28, sm: 32 } }} />
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontSize: { xs: "1.1rem", sm: "1.25rem" },
              fontWeight: 500,
            }}
          >
            {isMobile ? "Junkyard Mgmt" : "Junkyard Management System"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            {!isMobile && (
              <Typography variant="body2" sx={{ mr: 2, fontSize: "0.9rem" }}>
                {user.firstName} {user.lastName} ({user.role})
              </Typography>
            )}
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
              sx={{ p: { xs: 2, sm: 1.5 } }}
            >
              <AccountCircle sx={{ fontSize: { xs: 28, sm: 24 } }} />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                },
              }}
            >
              {isMobile && (
                <MenuItem disabled sx={{ py: 2 }}>
                  <Person sx={{ mr: 2, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user.firstName} {user.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.role}
                    </Typography>
                  </Box>
                </MenuItem>
              )}
              {isMobile && <Divider />}
              <MenuItem onClick={handleLogout} sx={{ py: 2, minHeight: 48 }}>
                <Logout sx={{ mr: 2, fontSize: 20 }} />
                <Typography variant="body1">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={toggleMobileDrawer}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: { xs: "85vw", sm: 320 },
            maxWidth: 400,
          },
        }}
      >
        <Box sx={{ p: 3, bgcolor: "primary.main", color: "white" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Avatar
                sx={{ bgcolor: "secondary.main", mr: 2, width: 48, height: 48 }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontSize: "1.2rem", fontWeight: "bold" }}
                >
                  {user.firstName[0]}
                  {user.lastName[0]}
                </Typography>
              </Avatar>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", fontSize: "1.1rem" }}
                >
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.8, fontSize: "0.95rem" }}
                >
                  {user.role}
                </Typography>
              </Box>
            </Box>
            <IconButton
              color="inherit"
              onClick={toggleMobileDrawer}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 64,
                  px: 3,
                  py: 2,
                  "&.Mui-selected": {
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    "& .MuiListItemIcon-root": {
                      color: "primary.contrastText",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 48 }}>
                  {React.cloneElement(item.icon, { sx: { fontSize: 28 } })}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontSize: "1.1rem",
                      fontWeight: 500,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Desktop Navigation */}
      {!isMobile && (
        <Paper
          elevation={1}
          sx={{
            borderRadius: 0,
            bgcolor: "primary.dark",
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: "flex", overflowX: "auto" }}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    color: "white",
                    minWidth: "auto",
                    px: 2,
                    py: 1.5,
                    borderRadius: 0,
                    bgcolor:
                      location.pathname === item.path
                        ? "rgba(255,255,255,0.1)"
                        : "transparent",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.08)",
                    },
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          </Container>
        </Paper>
      )}

      <Container
        sx={{
          mt: { xs: 1, sm: 2 },
          mb: { xs: 1, sm: 2 },
          px: { xs: 1, sm: 2, md: 3 },
          maxWidth: { xs: "100%", md: "lg" },
          width: "100%",
        }}
      >
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
          <Route
            path="/accounting"
            element={<AccountingDashboard user={user} />}
          />
          <Route path="/expenses" element={<ExpenseReporting user={user} />} />
          <Route path="/nmvtis" element={<NMVTISManager user={user} />} />
          <Route
            path="/va-workflow"
            element={<VAWorkflowHelper user={user} />}
          />
          {user.role === "admin" && (
            <Route path="/settings" element={<Settings user={user} />} />
          )}
          <Route path="/document-manager" element={<DocumentManager user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </Box>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const { user: currentUser, error: authError } = await getCurrentUser();

        if (authError) {
          console.error("Auth check error:", authError);
          setError(
            typeof authError === "string" ? authError : "Authentication error",
          );
          setUser(null);
        } else {
          setUser(currentUser);
        }
      } catch (e) {
        console.error("Unexpected error during auth check:", e);
        setError("Unexpected authentication error");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  // Handle login success
  const handleLogin = (userData: User) => {
    setUser(userData);
    setError(null);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public routes - no authentication required */}
          <Route path="/reset-password" element={<PasswordReset />} />
          
          {/* Protected routes - authentication required */}
          <Route path="/*" element={
            user ? (
              <MainApp user={user} />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
