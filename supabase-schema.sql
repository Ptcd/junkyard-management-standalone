-- Supabase Schema for Junkyard Management System
-- Run this SQL in your Supabase SQL editor to set up the database

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
  yard_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  PRIMARY KEY (id)
);

-- Create vehicle_transactions table
CREATE TABLE IF NOT EXISTS vehicle_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  yard_id TEXT NOT NULL,
  vin TEXT NOT NULL,
  year INTEGER,
  make TEXT,
  model TEXT,
  color TEXT,
  vehicle_type TEXT,
  purchase_price DECIMAL(10,2),
  seller_name TEXT,
  seller_address TEXT,
  seller_phone TEXT,
  seller_id_type TEXT,
  seller_id_number TEXT,
  purchase_date DATE,
  odometer INTEGER,
  condition TEXT,
  purchase_method TEXT,
  title_number TEXT,
  title_state TEXT,
  notes TEXT,
  signature_data TEXT,
  photos TEXT[], -- Array of photo URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create vehicle_sales table
CREATE TABLE IF NOT EXISTS vehicle_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  yard_id TEXT NOT NULL,
  vin TEXT NOT NULL,
  buyer_name TEXT,
  buyer_address TEXT,
  buyer_phone TEXT,
  buyer_id_type TEXT,
  buyer_id_number TEXT,
  sale_price DECIMAL(10,2),
  sale_date DATE,
  sale_type TEXT,
  parts_sold TEXT[],
  notes TEXT,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create cash_transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  yard_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'expense', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- Reference to vehicle transaction or expense
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  yard_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  receipt_url TEXT,
  mileage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create impound_lien_vehicles table
CREATE TABLE IF NOT EXISTS impound_lien_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  yard_id TEXT NOT NULL,
  vin TEXT NOT NULL,
  year INTEGER,
  make TEXT,
  model TEXT,
  color TEXT,
  license_plate TEXT,
  owner_name TEXT,
  owner_address TEXT,
  owner_phone TEXT,
  lien_amount DECIMAL(10,2),
  storage_fee_daily DECIMAL(10,2),
  impound_date DATE,
  lien_notice_sent_date DATE,
  status TEXT DEFAULT 'impounded' CHECK (status IN ('impounded', 'lien_sale_pending', 'sold', 'released')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create nmvtis_reports table
CREATE TABLE IF NOT EXISTS nmvtis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  yard_id TEXT NOT NULL,
  vin TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('purchase', 'sale', 'update')),
  report_data JSONB NOT NULL,
  submitted_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create settings table
CREATE TABLE IF NOT EXISTS yard_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  yard_id TEXT UNIQUE NOT NULL,
  nmvtis_id TEXT,
  nmvtis_pin TEXT,
  entity_name TEXT,
  business_address TEXT,
  business_city TEXT,
  business_state TEXT,
  business_zip TEXT,
  business_phone TEXT,
  business_email TEXT,
  reporting_frequency TEXT DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE impound_lien_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nmvtis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE yard_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "New users can insert their profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for vehicle_transactions
CREATE POLICY "Users can view transactions from their yard" ON vehicle_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = vehicle_transactions.yard_id
        )
    );

CREATE POLICY "Users can insert transactions for their yard" ON vehicle_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = vehicle_transactions.yard_id
        )
    );

CREATE POLICY "Users can update their own transactions" ON vehicle_transactions
    FOR UPDATE USING (user_id = auth.uid());

-- Create policies for vehicle_sales
CREATE POLICY "Users can view sales from their yard" ON vehicle_sales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = vehicle_sales.yard_id
        )
    );

CREATE POLICY "Users can insert sales for their yard" ON vehicle_sales
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = vehicle_sales.yard_id
        )
    );

CREATE POLICY "Users can update their own sales" ON vehicle_sales
    FOR UPDATE USING (user_id = auth.uid());

-- Create policies for cash_transactions
CREATE POLICY "Users can view cash transactions from their yard" ON cash_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = cash_transactions.yard_id
        )
    );

CREATE POLICY "Users can insert cash transactions for their yard" ON cash_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = cash_transactions.yard_id
        )
    );

-- Create policies for expenses
CREATE POLICY "Users can view expenses from their yard" ON expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = expenses.yard_id
        )
    );

CREATE POLICY "Users can insert expenses for their yard" ON expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = expenses.yard_id
        )
    );

CREATE POLICY "Users can update their own expenses" ON expenses
    FOR UPDATE USING (user_id = auth.uid());

-- Create policies for impound_lien_vehicles
CREATE POLICY "Users can view impound vehicles from their yard" ON impound_lien_vehicles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = impound_lien_vehicles.yard_id
        )
    );

CREATE POLICY "Users can insert impound vehicles for their yard" ON impound_lien_vehicles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = impound_lien_vehicles.yard_id
        )
    );

CREATE POLICY "Users can update impound vehicles from their yard" ON impound_lien_vehicles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = impound_lien_vehicles.yard_id
        )
    );

-- Create policies for nmvtis_reports
CREATE POLICY "Users can view NMVTIS reports from their yard" ON nmvtis_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = nmvtis_reports.yard_id
        )
    );

CREATE POLICY "Users can insert NMVTIS reports for their yard" ON nmvtis_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = nmvtis_reports.yard_id
        )
    );

-- Create policies for yard_settings
CREATE POLICY "Users can view settings for their yard" ON yard_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND yard_id = yard_settings.yard_id
        )
    );

CREATE POLICY "Admins can update settings for their yard" ON yard_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = yard_settings.yard_id
        )
    );

CREATE POLICY "Admins can insert settings for their yard" ON yard_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin' AND yard_id = yard_settings.yard_id
        )
    );

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, email, role, yard_id, first_name, last_name)
  VALUES (NEW.id, NEW.email, NEW.email, 'driver', 'yard001', 'New', 'User');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_vehicle_transactions_updated_at BEFORE UPDATE ON vehicle_transactions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_vehicle_sales_updated_at BEFORE UPDATE ON vehicle_sales FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_impound_lien_vehicles_updated_at BEFORE UPDATE ON impound_lien_vehicles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_yard_settings_updated_at BEFORE UPDATE ON yard_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default yard settings
INSERT INTO yard_settings (yard_id, entity_name) 
VALUES ('yard001', 'Demo Junkyard & Auto Parts')
ON CONFLICT (yard_id) DO NOTHING; 