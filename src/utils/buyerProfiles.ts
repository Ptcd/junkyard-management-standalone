// Buyer Profiles Management
// Allows admins to pre-configure common buyers for quick selection during sales

import { supabase } from "./supabaseAuth";

export interface BuyerProfile {
  id: string;
  companyName: string;
  contactName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  secondaryEmail?: string;
  licenseNumber?: string;
  buyerType:
    | "scrap_yard"
    | "parts_dealer"
    | "export_company"
    | "individual"
    | "other";
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  yardId: string;
}

// Get all buyer profiles for a yard
export const getBuyerProfiles = (yardId: string): BuyerProfile[] => {
  const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
  return profiles.filter(
    (profile: BuyerProfile) => profile.yardId === yardId && profile.isActive,
  );
};

// Get all buyer profiles (admin view)
export const getAllBuyerProfiles = (yardId: string): BuyerProfile[] => {
  const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
  return profiles.filter((profile: BuyerProfile) => profile.yardId === yardId);
};

// Get buyer profile by ID
export const getBuyerProfile = (profileId: string): BuyerProfile | null => {
  const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
  return (
    profiles.find((profile: BuyerProfile) => profile.id === profileId) || null
  );
};

// Create new buyer profile
export const createBuyerProfile = (
  profileData: Omit<BuyerProfile, "id" | "createdAt" | "updatedAt">,
): BuyerProfile => {
  const newProfile: BuyerProfile = {
    ...profileData,
    id: `BUYER-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
  profiles.push(newProfile);
  localStorage.setItem("buyerProfiles", JSON.stringify(profiles));

  return newProfile;
};

// Update buyer profile
export const updateBuyerProfile = (
  profileId: string,
  updates: Partial<BuyerProfile>,
): BuyerProfile | null => {
  const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
  const profileIndex = profiles.findIndex(
    (profile: BuyerProfile) => profile.id === profileId,
  );

  if (profileIndex === -1) return null;

  profiles[profileIndex] = {
    ...profiles[profileIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem("buyerProfiles", JSON.stringify(profiles));
  return profiles[profileIndex];
};

// Delete buyer profile (soft delete - set inactive)
export const deleteBuyerProfile = async (profileId: string): Promise<boolean> => {
  console.log("Attempting to delete buyer profile:", profileId);
  
  try {
    // First try to update in Supabase if available
    if (supabase) {
      const { error } = await supabase
        .from("buyer_profiles")
        .update({ 
          is_active: false, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", profileId);

      if (error) {
        // Don't log 404 errors as these are expected for demo profiles
        if (error.message?.includes('404') || error.code === 'PGRST116') {
          console.log("Profile not found in Supabase (demo profile), updating localStorage only");
        } else {
          console.error("Error updating buyer profile in Supabase:", error);
        }
      } else {
        console.log("Buyer profile deactivated in Supabase successfully");
      }
    }
  } catch (supabaseError: any) {
    // Don't log 404 errors as these are expected for demo profiles
    if (!supabaseError?.message?.includes('404')) {
      console.error("Failed to update buyer profile in Supabase:", supabaseError);
    }
  }

  // Also update in localStorage for immediate local consistency
  const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
  const profileIndex = profiles.findIndex(
    (profile: BuyerProfile) => profile.id === profileId,
  );

  if (profileIndex === -1) {
    console.error("Buyer profile not found in localStorage:", profileId);
    return false;
  }

  console.log("Found buyer profile in localStorage, deactivating:", profiles[profileIndex].companyName);
  profiles[profileIndex].isActive = false;
  profiles[profileIndex].updatedAt = new Date().toISOString();

  localStorage.setItem("buyerProfiles", JSON.stringify(profiles));
  console.log("Buyer profile deactivated in localStorage successfully");
  return true;
};

// Get buyer profiles by type
export const getBuyerProfilesByType = (
  yardId: string,
  buyerType: BuyerProfile["buyerType"],
): BuyerProfile[] => {
  const profiles = getBuyerProfiles(yardId);
  return profiles.filter((profile) => profile.buyerType === buyerType);
};

// Search buyer profiles
export const searchBuyerProfiles = (
  yardId: string,
  searchTerm: string,
): BuyerProfile[] => {
  const profiles = getBuyerProfiles(yardId);
  const term = searchTerm.toLowerCase();

  return profiles.filter(
    (profile) =>
      profile.companyName.toLowerCase().includes(term) ||
      profile.contactName.toLowerCase().includes(term) ||
      profile.phone.includes(term) ||
      profile.email.toLowerCase().includes(term),
  );
};

// Get buyer profile statistics
export const getBuyerProfileStats = (yardId: string) => {
  const profiles = getAllBuyerProfiles(yardId);
  const activeProfiles = profiles.filter((p) => p.isActive);

  const typeStats = activeProfiles.reduce(
    (acc, profile) => {
      acc[profile.buyerType] = (acc[profile.buyerType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    total: profiles.length,
    active: activeProfiles.length,
    inactive: profiles.length - activeProfiles.length,
    byType: typeStats,
  };
};

// Clear demo buyer profiles - run once to clean up
export const clearDemoBuyerProfiles = (yardId: string): void => {
  const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
  
  // Remove demo profiles (those with specific demo company names)
  const demoCompanyNames = [
    "Milwaukee Scrap & Metal",
    "Auto Parts Plus", 
    "Global Auto Export LLC",
    "Badger State Recycling"
  ];
  
  const filteredProfiles = profiles.filter((profile: BuyerProfile) => 
    profile.yardId !== yardId || !demoCompanyNames.includes(profile.companyName)
  );
  
  localStorage.setItem("buyerProfiles", JSON.stringify(filteredProfiles));
  console.log("Demo buyer profiles cleared for yard:", yardId);
};

// Get buyer profiles with Supabase sync - New async version
export const getBuyerProfilesSync = async (yardId: string): Promise<BuyerProfile[]> => {
  try {
    // First try to get from Supabase if available
    if (supabase) {
      const { data, error } = await supabase
        .from("buyer_profiles")
        .select("*")
        .eq("yard_id", yardId)
        .order("company_name", { ascending: true });
      
      if (!error && data) {
        console.log("Loaded buyer profiles from Supabase:", data.length);
        // Convert Supabase format to expected format
        const formattedProfiles = data.map((profile: any) => ({
          id: profile.id,
          yardId: profile.yard_id || profile.yardId,
          companyName: profile.company_name || profile.companyName,
          contactName: profile.contact_name || profile.contactName,
          phone: profile.phone,
          email: profile.email,
          secondaryEmail: profile.secondary_email || profile.secondaryEmail,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          zip: profile.zip,
          licenseNumber: profile.license_number || profile.licenseNumber,
          buyerType: profile.buyer_type || profile.buyerType || "other",
          notes: profile.notes,
          isActive: profile.is_active !== undefined ? profile.is_active : (profile.isActive !== undefined ? profile.isActive : true),
          createdAt: profile.created_at || profile.createdAt,
          updatedAt: profile.updated_at || profile.updatedAt || profile.created_at || profile.createdAt,
        }));
        
        // Update localStorage with fresh data for offline access
        const allLocalProfiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
        const otherYardProfiles = allLocalProfiles.filter((p: BuyerProfile) => p.yardId !== yardId);
        const updatedProfiles = [...otherYardProfiles, ...formattedProfiles];
        localStorage.setItem("buyerProfiles", JSON.stringify(updatedProfiles));
        
        return formattedProfiles;
      } else {
        console.log("Supabase buyer profiles query failed, using localStorage fallback");
      }
    }
    
    // Fallback to localStorage
    const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
    console.log("Using localStorage for buyer profiles:", profiles.length);
    return profiles.filter((profile: BuyerProfile) => profile.yardId === yardId);
  } catch (error) {
    console.error("Error getting buyer profiles:", error);
    // Final fallback to localStorage on any error
    const profiles = JSON.parse(localStorage.getItem("buyerProfiles") || "[]");
    return profiles.filter((profile: BuyerProfile) => profile.yardId === yardId);
  }
};
