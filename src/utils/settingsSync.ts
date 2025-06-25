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

  try {
    // First try to get from Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from("yard_settings")
        .select("*")
        .eq("yard_id", yardId)
        .single();

      if (!error && data) {
        // Found existing settings in Supabase
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

        // Update localStorage with fresh data from Supabase
        localStorage.setItem("yardSettings", JSON.stringify(formattedSettings));
        return formattedSettings;
      } else {
        // No settings found in Supabase, check if we have localStorage data to sync up
        const stored = localStorage.getItem("yardSettings");
        let settingsToSync = defaultYardSettings;
        
        if (stored) {
          try {
            const parsedStored = JSON.parse(stored);
            settingsToSync = { ...defaultYardSettings, ...parsedStored };
          } catch (e) {
            // Invalid localStorage data, use defaults
          }
        }

        // Create the settings record in Supabase
        const { error: insertError } = await supabase
          .from("yard_settings")
          .insert({
            yard_id: yardId,
            entity_name: settingsToSync.name,
            business_address: settingsToSync.address,
            business_city: settingsToSync.city,
            business_state: settingsToSync.state,
            business_zip: settingsToSync.zip,
            business_phone: settingsToSync.phone,
            business_email: settingsToSync.email,
            license_number: settingsToSync.licenseNumber,
            updated_at: new Date().toISOString()
          });

        if (!insertError) {
          // Successfully created, update localStorage and return
          localStorage.setItem("yardSettings", JSON.stringify(settingsToSync));
          return settingsToSync;
        }
      }
    }

    // Fallback to localStorage only if Supabase completely failed
    const stored = localStorage.getItem("yardSettings");
    if (stored) {
      try {
        const parsedStored = JSON.parse(stored);
        return { ...defaultYardSettings, ...parsedStored };
      } catch (e) {
        // Invalid localStorage data
      }
    }

    return defaultYardSettings;
  } catch (error) {
    console.error("Error getting yard settings:", error);
    // Final fallback to localStorage or defaults
    const stored = localStorage.getItem("yardSettings");
    if (stored) {
      try {
        return { ...defaultYardSettings, ...JSON.parse(stored) };
      } catch (e) {
        return defaultYardSettings;
      }
    }
    return defaultYardSettings;
  }
};

// Save yard settings to both Supabase and localStorage
export const saveYardSettingsSync = async (yardId: string, settings: YardSettings): Promise<boolean> => {
  try {
    // Always save to localStorage first for immediate feedback
    localStorage.setItem("yardSettings", JSON.stringify(settings));

    // Then save to Supabase
    if (supabase) {
      console.log("🔄 Attempting to save yard settings to Supabase for yardId:", yardId);
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
        }, { 
          onConflict: 'yard_id' 
        });

      if (error) {
        console.error("❌ Supabase error saving yard settings:", {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return false; // Indicate sync failure
      }
      
      console.log("✅ Yard settings saved successfully to Supabase");
      return true; // Successfully synced
    }

    console.warn("⚠️ Supabase not available");
    return false; // Supabase not available
  } catch (error) {
    console.error("💥 Exception saving yard settings:", error);
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
    // Get from Supabase yard_settings table (not separate nmvtis_settings table)
    if (supabase) {
      const { data, error } = await supabase
        .from("yard_settings")
        .select("*")
        .eq("yard_id", yardId)
        .single();

      if (!error && data) {
        // Found existing settings in Supabase
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

        // Update localStorage with fresh data from Supabase
        localStorage.setItem("nmvtisSettings", JSON.stringify(formattedSettings));
        return formattedSettings;
      } else {
        // No settings found in Supabase, check if we have localStorage data to sync up
        const stored = localStorage.getItem("nmvtisSettings");
        let settingsToSync = defaultNMVTISSettings;
        
        if (stored) {
          try {
            const parsedStored = JSON.parse(stored);
            settingsToSync = { ...defaultNMVTISSettings, ...parsedStored };
          } catch (e) {
            // Invalid localStorage data, use defaults
          }
        }

        // Create/update the settings record in Supabase (might already exist from yard settings)
        const { error: upsertError } = await supabase
          .from("yard_settings")
          .upsert({
            yard_id: yardId,
            nmvtis_id: settingsToSync.nmvtisId,
            nmvtis_pin: settingsToSync.nmvtisPin,
            entity_name: settingsToSync.entityName,
            business_address: settingsToSync.businessAddress,
            business_city: settingsToSync.businessCity,
            business_state: settingsToSync.businessState,
            business_zip: settingsToSync.businessZip,
            business_phone: settingsToSync.businessPhone,
            business_email: settingsToSync.businessEmail,
            reporting_frequency: settingsToSync.reportingFrequency,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'yard_id' 
          });

        if (!upsertError) {
          // Successfully created/updated, update localStorage and return
          localStorage.setItem("nmvtisSettings", JSON.stringify(settingsToSync));
          return settingsToSync;
        }
      }
    }

    // Fallback to localStorage only if Supabase completely failed
    const stored = localStorage.getItem("nmvtisSettings");
    if (stored) {
      try {
        const parsedStored = JSON.parse(stored);
        return { ...defaultNMVTISSettings, ...parsedStored };
      } catch (e) {
        // Invalid localStorage data
      }
    }

    return defaultNMVTISSettings;
  } catch (error) {
    console.error("Error getting NMVTIS settings:", error);
    // Final fallback to localStorage or defaults
    const stored = localStorage.getItem("nmvtisSettings");
    if (stored) {
      try {
        return { ...defaultNMVTISSettings, ...JSON.parse(stored) };
      } catch (e) {
        return defaultNMVTISSettings;
      }
    }
    return defaultNMVTISSettings;
  }
};

// Save NMVTIS settings to both Supabase and localStorage - uses same yard_settings table
export const saveNMVTISSettingsSync = async (yardId: string, settings: NMVTISSettings): Promise<boolean> => {
  try {
    // Always save to localStorage first for immediate feedback
    localStorage.setItem("nmvtisSettings", JSON.stringify(settings));

    // Then save to Supabase yard_settings table
    if (supabase) {
      console.log("🔄 Attempting to save NMVTIS settings to Supabase for yardId:", yardId);
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
        }, { 
          onConflict: 'yard_id' 
        });

      if (error) {
        console.error("❌ Supabase error saving NMVTIS settings:", {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return false; // Indicate sync failure
      }
      
      console.log("✅ NMVTIS settings saved successfully to Supabase");
      return true; // Successfully synced
    }

    console.warn("⚠️ Supabase not available");
    return false; // Supabase not available
  } catch (error) {
    console.error("💥 Exception saving NMVTIS settings:", error);
    return false;
  }
};

// Force clear demo settings and save real settings - call this when user first saves real data
export const forceUpdateYardSettings = async (yardId: string, settings: YardSettings): Promise<boolean> => {
  try {
    // Always save to localStorage first for immediate feedback
    localStorage.setItem("yardSettings", JSON.stringify(settings));

    // Force update in Supabase - this will override any existing demo data
    if (supabase) {
      // First delete any existing record for this yard
      await supabase
        .from("yard_settings")
        .delete()
        .eq("yard_id", yardId);

      // Then insert the new settings
      const { error } = await supabase
        .from("yard_settings")
        .insert({
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
        console.error("Error force updating yard settings:", error);
        return false;
      }
      
      return true; // Successfully synced
    }

    return false; // Supabase not available
  } catch (error) {
    console.error("Failed to force update yard settings:", error);
    return false;
  }
};

// Force clear demo NMVTIS settings and save real settings
export const forceUpdateNMVTISSettings = async (yardId: string, settings: NMVTISSettings): Promise<boolean> => {
  try {
    // Always save to localStorage first for immediate feedback
    localStorage.setItem("nmvtisSettings", JSON.stringify(settings));

    // Force update in Supabase - this will override any existing demo data
    if (supabase) {
      // First delete any existing record for this yard
      await supabase
        .from("yard_settings")
        .delete()
        .eq("yard_id", yardId);

      // Then insert the new settings
      const { error } = await supabase
        .from("yard_settings")
        .insert({
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
        console.error("Error force updating NMVTIS settings:", error);
        return false;
      }
      
      return true; // Successfully synced
    }

    return false; // Supabase not available
  } catch (error) {
    console.error("Failed to force update NMVTIS settings:", error);
    return false;
  }
}; 