import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Link,
} from "@mui/material";
import { DirectionsCar } from "@mui/icons-material";
import { signIn, resetPassword, User } from "../utils/supabaseAuth";

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      let errorMessage = "";
      
      if (typeof resetError === "string") {
        errorMessage = resetError;
      } else if (resetError && typeof resetError === "object") {
        errorMessage = (resetError as any)?.message || "Failed to send password reset email";
      }
      
      // Provide additional context and solutions for rate limiting
      if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        errorMessage += "\n\n🔧 Immediate Solutions:\n" +
          "1. Wait 1 hour before trying again\n" +
          "2. Try using a different email address\n" +
          "3. Contact your admin to reset your password directly\n" +
          "4. Admin can create a new account for you in Settings > User Management";
      }
      
      setError(errorMessage);
    } else {
      setSuccess("Password reset email sent! Check your inbox and spam folder.");
      setShowPasswordReset(false);
    }

    setLoading(false);
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

          <Typography variant="h5" component="h2" align="center" gutterBottom>
            Sign In
          </Typography>

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            New users will receive an invitation email from their administrator
          </Typography>

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
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
