import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Stack,
} from "@mui/material";
import { DirectionsCar, Lock } from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../utils/supabaseAuth";

const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if we have the required parameters and session
    const checkSession = async () => {
      try {
        // First check URL parameters for recovery type
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search);
        const type = hashParams.get('type') || urlParams.get('type');
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');

        console.log("Password reset params:", { type, hasAccessToken: !!accessToken });

        // If this is a recovery flow, set up the session for password reset
        if (type === 'recovery' && accessToken) {
          try {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            if (sessionError) {
              console.error("Session setup error:", sessionError);
              setError("Invalid password reset link. Please request a new one.");
              return;
            }

            // Successfully set up recovery session
            setIsValidSession(true);
            return;
          } catch (err) {
            console.error("Error setting up recovery session:", err);
            setError("Failed to process password reset link.");
            return;
          }
        }

        // If no recovery parameters, check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setError("Invalid password reset link. Please request a new one.");
          return;
        }

        // If we have a session but it's not from a recovery flow, reject it
        if (session && type !== 'recovery') {
          console.log("Regular session detected, but not recovery flow");
          setError("Invalid password reset link. Please request a new one.");
          return;
        }

        // If we have a recovery session, allow password reset
        if (session && type === 'recovery') {
          setIsValidSession(true);
          return;
        }

        // No valid session or recovery flow
        setError("Invalid password reset link. Please request a new one.");
      } catch (err) {
        console.error("Error checking session:", err);
        setError("Something went wrong. Please try again.");
      }
    };

    checkSession();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess("Password updated successfully! Redirecting to login...");
      
      // Sign out the user and redirect to login after a delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/", { replace: true });
      }, 2000);

    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/", { replace: true });
  };

  if (!isValidSession && !error) {
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
            <Box sx={{ textAlign: "center" }}>
              <DirectionsCar sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Loading...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verifying your password reset link
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

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
            <Lock sx={{ mr: 1, fontSize: 40 }} color="primary" />
            <Typography component="h1" variant="h4">
              Reset Password
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              {error.includes("Invalid password reset link") && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleBackToLogin}
                  >
                    Back to Login
                  </Button>
                </Box>
              )}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {isValidSession && !success && (
            <Box component="form" onSubmit={handlePasswordUpdate}>
              <Stack spacing={3}>
                <Typography variant="body1" color="text.secondary">
                  Enter your new password below. Make sure it's secure and easy to remember.
                </Typography>

                <TextField
                  required
                  fullWidth
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  helperText="Password must be at least 8 characters long"
                  disabled={loading}
                />

                <TextField
                  required
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mt: 3 }}
                >
                  {loading ? "Updating Password..." : "Update Password"}
                </Button>

                <Button
                  variant="text"
                  onClick={handleBackToLogin}
                  disabled={loading}
                  sx={{ mt: 1 }}
                >
                  Back to Login
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PasswordReset; 