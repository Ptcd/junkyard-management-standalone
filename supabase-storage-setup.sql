-- Supabase Storage Setup for Legal Documents
-- Run this in your Supabase SQL Editor

-- Create storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-documents',
  'legal-documents',
  false, -- Private bucket for security
  10485760, -- 10MB limit per file
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
);

-- Create RLS policies for legal-documents bucket

-- Allow authenticated users to upload documents for their yard
CREATE POLICY "Users can upload documents for their yard" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'legal-documents' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND yard_id = split_part(name, '/', 1)
  )
);

-- Allow users to view documents from their yard
CREATE POLICY "Users can view documents from their yard" ON storage.objects
FOR SELECT USING (
  bucket_id = 'legal-documents' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND (
      role = 'admin' OR 
      yard_id = split_part(name, '/', 1)
    )
  )
);

-- Allow admins to access all documents
CREATE POLICY "Admins can access all documents" ON storage.objects
FOR ALL USING (
  bucket_id = 'legal-documents' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create function to generate secure file paths
CREATE OR REPLACE FUNCTION generate_document_path(
  transaction_id TEXT,
  document_type TEXT,
  file_extension TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  yard_id TEXT;
  file_path TEXT;
BEGIN
  -- Get yard_id from user profile
  SELECT up.yard_id INTO yard_id
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Generate secure path: yard_id/document_type/transaction_id_timestamp.extension
  file_path := yard_id || '/' || document_type || '/' || transaction_id || '_' || extract(epoch from now())::text || '.' || file_extension;
  
  RETURN file_path;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_document_path TO authenticated;

-- Create audit log table for document access (law enforcement compliance)
CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  document_path TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'upload')),
  transaction_id TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Policy for audit log access (admins only)
CREATE POLICY "Admins can view audit logs" ON document_access_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy for inserting audit logs (all authenticated users)
CREATE POLICY "Users can insert audit logs" ON document_access_log
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to log document access
CREATE OR REPLACE FUNCTION log_document_access(
  document_path TEXT,
  access_type TEXT,
  transaction_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO document_access_log (user_id, document_path, access_type, transaction_id)
  VALUES (auth.uid(), document_path, access_type, transaction_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_document_access TO authenticated;

-- Update vehicle_transactions table to include document URLs
ALTER TABLE vehicle_transactions 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS id_photo_url TEXT,
ADD COLUMN IF NOT EXISTS bill_of_sale_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS additional_document_urls TEXT[];

-- Create index for faster VIN searches (partial matching)
CREATE INDEX IF NOT EXISTS idx_vehicle_transactions_vin_partial ON vehicle_transactions USING gin(vin gin_trgm_ops);

-- Enable trigram extension for partial text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create function for enhanced VIN search
CREATE OR REPLACE FUNCTION search_transactions_by_vin(search_term TEXT)
RETURNS TABLE (
  id UUID,
  vin TEXT,
  year INTEGER,
  make TEXT,
  seller_first_name TEXT,
  seller_last_name TEXT,
  purchase_date DATE,
  purchase_price DECIMAL,
  signature_url TEXT,
  id_photo_url TEXT,
  bill_of_sale_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vt.id,
    vt.vin,
    vt.year,
    vt.make,
    vt.seller_first_name,
    vt.seller_last_name,
    vt.purchase_date,
    vt.purchase_price,
    vt.signature_url,
    vt.id_photo_url,
    vt.bill_of_sale_pdf_url,
    vt.created_at
  FROM vehicle_transactions vt
  WHERE vt.vin ILIKE '%' || search_term || '%'
  ORDER BY vt.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_transactions_by_vin TO authenticated;

-- Create view for law enforcement document access
CREATE OR REPLACE VIEW law_enforcement_documents AS
SELECT 
  vt.id,
  vt.vin,
  vt.year,
  vt.make,
  vt.model,
  vt.seller_first_name,
  vt.seller_last_name,
  vt.seller_address,
  vt.seller_phone,
  vt.purchase_date,
  vt.purchase_price,
  vt.signature_url,
  vt.id_photo_url,
  vt.bill_of_sale_pdf_url,
  vt.additional_document_urls,
  vt.created_at,
  up.first_name as purchaser_first_name,
  up.last_name as purchaser_last_name,
  ys.entity_name as yard_name,
  ys.business_address as yard_address,
  ys.business_phone as yard_phone
FROM vehicle_transactions vt
LEFT JOIN user_profiles up ON vt.user_id = up.id
LEFT JOIN yard_settings ys ON vt.yard_id = ys.yard_id
WHERE vt.signature_url IS NOT NULL OR vt.id_photo_url IS NOT NULL;

-- Grant access to the view for admins
GRANT SELECT ON law_enforcement_documents TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Admins can access law enforcement documents" ON law_enforcement_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
); 