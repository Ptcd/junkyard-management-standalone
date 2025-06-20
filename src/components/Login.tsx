import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Stack,
  Link,
} from "@mui/material";
import { DirectionsCar } from "@mui/icons-material";
import { signIn, signUp, resetPassword, User } from "../utils/supabaseAuth";

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [yardId, setYardId] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { user, error: authError } = await signIn(email, password);

    if (authError) {
      setError(
        typeof authError === "string"
          ? authError
          : (authError as any)?.message || "Failed to sign in",
      );
    } else if (user) {
      if (user.status === "inactive") {
        setError(
          "Your account has been deactivated. Please contact an administrator.",
        );
      } else {
        onLogin(user);
      }
    } else {
      setError("Invalid email or password");
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    const userData = {
      firstName,
      lastName,
      role: "admin" as const,
      yardId: yardId || "default-yard",
      phone,
    };

    const { data, error: authError } = await signUp(email, password, userData);

    if (authError) {
      let errorMessage = "Failed to create account";
      
      if (typeof authError === "string") {
        errorMessage = authError;
      } else if (authError && typeof authError === "object") {
        errorMessage = (authError as any)?.message || errorMessage;
      }
      
      // Provide additional context for rate limiting
      if (errorMessage.includes("rate limit")) {
        errorMessage += "\n\nTip: You can also create users directly in your Supabase dashboard (Authentication > Users) to bypass rate limits during development.";
      }
      
      setError(errorMessage);
    } else if (data?.user) {
      setSuccess(
        "Account created successfully! Please check your email to verify your account.",
      );
      setTabValue(0); // Switch to sign-in tab
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setLicenseNumber("");
    }

    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(
        typeof resetError === "string"
          ? resetError
          : (resetError as any)?.message ||
              "Failed to send password reset email",
      );
    } else {
      setSuccess("Password reset email sent! Check your inbox.");
      setShowPasswordReset(false);
    }

    setLoading(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError("");
    setSuccess("");
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <DirectionsCar sx={{ mr: 1, fontSize: 40 }} color="primary" />
            <Typography component="h1" variant="h4">
              Junkyard Management
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="Sign In" />
            <Tab label="Sign Up" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Sign In Tab */}
          {tabValue === 0 && (
            <Box component="form" onSubmit={handleSignIn}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>

              <Box sx={{ textAlign: "center" }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPasswordReset(!showPasswordReset);
                  }}
                >
                  Forgot password?
                </Link>
              </Box>

              {showPasswordReset && (
                <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Enter your email address to receive a password reset link:
                  </Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handlePasswordReset}
                    disabled={loading || !email}
                    sx={{ mt: 1 }}
                  >
                    Send Reset Email
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Sign Up Tab */}
          {tabValue === 1 && (
            <Box component="form" onSubmit={handleSignUp}>
              <Stack spacing={2}>
                <TextField
                  required
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  helperText="This will be your login email"
                />

                <Stack direction="row" spacing={2}>
                  <TextField
                    required
                    fullWidth
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <TextField
                    required
                    fullWidth
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Stack>

                <TextField
                  required
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Password must be at least 8 characters"
                />

                <TextField
                  required
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <TextField
                  fullWidth
                  label="Yard ID (Optional)"
                  value={yardId}
                  onChange={(e) => setYardId(e.target.value)}
                  helperText="Leave blank to use default yard"
                />

                <TextField
                  fullWidth
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
