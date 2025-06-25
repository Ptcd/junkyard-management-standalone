// Settings Synchronization Utility
// Handles syncing yard settings and NMVTIS settings between localStorage and Supabase

import { supabase } from "./supabaseAuth";

export interface YardSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  licenseNumber: string;
}

export interface NMVTISSettings {
  nmvtisId: string;
  nmvtisPin: string;
  entityName: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  businessEmail: string;
  reportingFrequency: string;
}

// Get yard settings with Supabase sync
export const getYardSettingsSync = async (yardId: string): Promise<YardSettings> => {
  const defaultYardSettings: YardSettings = {
    name: "Demo Junkyard & Auto Parts",
    address: "123 Salvage Road",
    city: "Milwaukee",
    state: "WI",
    zip: "53201",
    phone: "(414) 555-0123",
    email: "office@demojunkyard.com",
    licenseNumber: "WI-JUNK-2024-001",
  };

  console.log("🔍 getYardSettingsSync called with yardId:", yardId);

  try {
    // First try to get from Supabase
    if (supabase) {
      console.log("📡 Attempting to fetch from Supabase yard_settings table...");
      const { data, error } = await supabase
        .from("yard_settings")
        .select("*")
        .eq("yard_id", yardId)
        .single();

      console.log("📊 Supabase response - data:", data, "error:", error);

      if (!error && data) {
        console.log("✅ Loaded yard settings from Supabase:", data);
        const formattedSettings: YardSettings = {
          name: data.entity_name || data.name || defaultYardSettings.name,
          address: data.business_address || data.address || defaultYardSettings.address,
          city: data.business_city || data.city || defaultYardSettings.city,
          state: data.business_state || data.state || defaultYardSettings.state,
          zip: data.business_zip || data.zip || defaultYardSettings.zip,
          phone: data.business_phone || data.phone || defaultYardSettings.phone,
          email: data.business_email || data.email || defaultYardSettings.email,
          licenseNumber: data.license_number || defaultYardSettings.licenseNumber,
        };

        console.log("🔄 Formatted settings:", formattedSettings);
        // Update localStorage with fresh data
        localStorage.setItem("yardSettings", JSON.stringify(formattedSettings));
        return formattedSettings;
      } else {
        console.log("⚠️ No yard settings found in Supabase, using localStorage/defaults");
      }
    } else {
      console.log("❌ Supabase not available");
    }

    // Fallback to localStorage
    const stored = localStorage.getItem("yardSettings");
    console.log("💾 localStorage yardSettings:", stored);
    if (stored) {
      const parsedStored = JSON.parse(stored);
      console.log("📦 Using localStorage settings:", parsedStored);
      return { ...defaultYardSettings, ...parsedStored };
    }

    console.log("🏭 Using default settings:", defaultYardSettings);
    return defaultYardSettings;
  } catch (error) {
    console.error("💥 Error getting yard settings:", error);
    // Final fallback to localStorage or defaults
    const stored = localStorage.getItem("yardSettings");
    if (stored) {
      return { ...defaultYardSettings, ...JSON.parse(stored) };
    }
    return defaultYardSettings;
  }
};

// Save yard settings to both Supabase and localStorage
export const saveYardSettingsSync = async (yardId: string, settings: YardSettings): Promise<boolean> => {
  console.log("💾 saveYardSettingsSync called with yardId:", yardId, "settings:", settings);
  
  try {
    // First save to Supabase - update the yard_settings table with both yard and business info
    if (supabase) {
      console.log("📡 Saving to Supabase...");
      const { error } = await supabase
        .from("yard_settings")
        .upsert({
          yard_id: yardId,
          entity_name: settings.name,
          business_address: settings.address,
          business_city: settings.city,
          business_state: settings.state,
          business_zip: settings.zip,
          business_phone: settings.phone,
          business_email: settings.email,
          license_number: settings.licenseNumber,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("❌ Error saving yard settings to Supabase:", error);
      } else {
        console.log("✅ Yard settings saved to Supabase successfully");
      }
    } else {
      console.log("❌ Supabase not available for saving");
    }

    // Also save to localStorage for immediate access
    localStorage.setItem("yardSettings", JSON.stringify(settings));
    console.log("✅ Yard settings saved to localStorage");
    return true;
  } catch (error) {
    console.error("💥 Failed to save yard settings:", error);
    // Still save to localStorage as fallback
    localStorage.setItem("yardSettings", JSON.stringify(settings));
    return false;
  }
};

// Get NMVTIS settings with Supabase sync - uses same yard_settings table
export const getNMVTISSettingsSync = async (yardId: string): Promise<NMVTISSettings> => {
  const defaultNMVTISSettings: NMVTISSettings = {
    nmvtisId: "",
    nmvtisPin: "",
    entityName: "",
    businessAddress: "",
    businessCity: "",
    businessState: "WI",
    businessZip: "",
    businessPhone: "",
    businessEmail: "",
    reportingFrequency: "30",
  };

  try {
    // Get from Supabase yard_settings table (not nmvtis_settings)
    if (supabase) {
      const { data, error } = await supabase
        .from("yard_settings")
        .select("*")
        .eq("yard_id", yardId)
        .single();

      if (!error && data) {
        console.log("Loaded NMVTIS settings from Supabase yard_settings table");
        const formattedSettings: NMVTISSettings = {
          nmvtisId: data.nmvtis_id || defaultNMVTISSettings.nmvtisId,
          nmvtisPin: data.nmvtis_pin || defaultNMVTISSettings.nmvtisPin,
          entityName: data.entity_name || defaultNMVTISSettings.entityName,
          businessAddress: data.business_address || defaultNMVTISSettings.businessAddress,
          businessCity: data.business_city || defaultNMVTISSettings.businessCity,
          businessState: data.business_state || defaultNMVTISSettings.businessState,
          businessZip: data.business_zip || defaultNMVTISSettings.businessZip,
          businessPhone: data.business_phone || defaultNMVTISSettings.businessPhone,
          businessEmail: data.business_email || defaultNMVTISSettings.businessEmail,
          reportingFrequency: data.reporting_frequency || defaultNMVTISSettings.reportingFrequency,
        };

        // Update localStorage with fresh data
        localStorage.setItem("nmvtisSettings", JSON.stringify(formattedSettings));
        return formattedSettings;
      } else {
        console.log("No NMVTIS settings found in Supabase, using localStorage/defaults");
      }
    }

    // Fallback to localStorage
    const stored = localStorage.getItem("nmvtisSettings");
    if (stored) {
      return { ...defaultNMVTISSettings, ...JSON.parse(stored) };
    }

    return defaultNMVTISSettings;
  } catch (error) {
    console.error("Error getting NMVTIS settings:", error);
    // Final fallback to localStorage or defaults
    const stored = localStorage.getItem("nmvtisSettings");
    if (stored) {
      return { ...defaultNMVTISSettings, ...JSON.parse(stored) };
    }
    return defaultNMVTISSettings;
  }
};

// Save NMVTIS settings to both Supabase and localStorage - uses same yard_settings table
export const saveNMVTISSettingsSync = async (yardId: string, settings: NMVTISSettings): Promise<boolean> => {
  try {
    // Save to Supabase yard_settings table (not separate nmvtis_settings table)
    if (supabase) {
      const { error } = await supabase
        .from("yard_settings")
        .upsert({
          yard_id: yardId,
          nmvtis_id: settings.nmvtisId,
          nmvtis_pin: settings.nmvtisPin,
          entity_name: settings.entityName,
          business_address: settings.businessAddress,
          business_city: settings.businessCity,
          business_state: settings.businessState,
          business_zip: settings.businessZip,
          business_phone: settings.businessPhone,
          business_email: settings.businessEmail,
          reporting_frequency: settings.reportingFrequency,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error saving NMVTIS settings to Supabase:", error);
      } else {
        console.log("NMVTIS settings saved to Supabase successfully");
      }
    }

    // Also save to localStorage for immediate access
    localStorage.setItem("nmvtisSettings", JSON.stringify(settings));
    console.log("NMVTIS settings saved to localStorage");
    return true;
  } catch (error) {
    console.error("Failed to save NMVTIS settings:", error);
    // Still save to localStorage as fallback
    localStorage.setItem("nmvtisSettings", JSON.stringify(settings));
    return false;
  }
}; 