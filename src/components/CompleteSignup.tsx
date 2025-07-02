import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { supabase } from "../utils/supabaseAuth";
import { useNavigate } from "react-router-dom";

const CompleteSignup: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid session from invitation
    const checkInviteSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setError("Invalid or expired invitation link.");
          return;
        }

        if (session?.user) {
          setUserEmail(session.user.email || "");
          
          // Check if user already has a password set
          if (session.user.user_metadata?.invitation_accepted) {
            navigate("/");
            return;
          }
        } else {
          // Try to handle invitation from URL parameters (query params first, then hash)
          const searchParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          
          // Check for tokens in query parameters first (typical for invitations)
          let accessToken = searchParams.get('access_token') || hashParams.get('access_token');
          let refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
          let type = searchParams.get('type') || hashParams.get('type');
          
          console.log("URL parsing:", {
            search: window.location.search,
            hash: window.location.hash,
            accessToken: accessToken ? "present" : "missing",
            refreshToken: refreshToken ? "present" : "missing",
            type: type
          });
          
          if (accessToken && refreshToken) {
            console.log("Found tokens, setting session...");
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (sessionError) {
              console.error("Session setting error:", sessionError);
              setError("Invalid or expired invitation link. Please request a new invitation.");
            } else {
              // Session set successfully, reload to get the session
              console.log("Session set successfully, reloading...");
              window.location.href = window.location.pathname; // Remove query params
            }
          } else {
            console.log("No tokens found in URL");
            setError("Invalid invitation link. Please request a new invitation.");
          }
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setError("Something went wrong. Please try again or request a new invitation.");
      }
    };

    checkInviteSession();
  }, [navigate]);

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          invitation_accepted: true
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Update user profile status to active and transfer invitation data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get invitation data from user metadata
        const invitationData = user.user_metadata || {};
        
        console.log("User metadata from invitation:", invitationData);
        
        // Update profile with invitation data and set status to active
        const profileUpdates: any = {
          status: "active",
          updated_at: new Date().toISOString()
        };
        
        // Transfer name data from invitation if available
        if (invitationData.firstName) {
          profileUpdates.first_name = invitationData.firstName;
        }
        if (invitationData.lastName) {
          profileUpdates.last_name = invitationData.lastName;
        }
        if (invitationData.phone) {
          profileUpdates.phone = invitationData.phone;
        }
        if (invitationData.licenseNumber) {
          profileUpdates.license_number = invitationData.licenseNumber;
        }
        
        console.log("Updating profile with:", profileUpdates);
        
        const { error: profileError } = await supabase
          .from("user_profiles")
          .update(profileUpdates)
          .eq("id", user.id);

        if (profileError) {
          console.error("Profile update failed:", profileError);
          throw new Error("Failed to complete profile setup. Please contact support.");
        }
        
        console.log("Profile updated successfully");
      }

      setSuccess("Account setup complete! Redirecting to dashboard...");
      
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err: any) {
      console.error("Signup completion error:", err);
      setError(err.message || "Failed to complete account setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.50",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Complete Your Account
          </Typography>
          
          {userEmail && (
            <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
              Setting up account for: <strong>{userEmail}</strong>
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create a secure password to complete your account setup.
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

          <form onSubmit={handleCompleteSignup}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Create Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Must be at least 6 characters"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                required
              />

              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
                required
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? "Setting up account..." : "Complete Setup"}
              </Button>
            </Stack>
          </form>

          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 2 }}>
            Having trouble? Contact your administrator for assistance.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CompleteSignup; 