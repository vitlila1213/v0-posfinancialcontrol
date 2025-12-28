-- Add PIX key type and owner name fields to withdrawals table
ALTER TABLE withdrawals
ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
ADD COLUMN IF NOT EXISTS pix_owner_name TEXT;

-- Add comment to clarify PIX key types
COMMENT ON COLUMN withdrawals.pix_key_type IS 'Type of PIX key: cpf, phone, email, random';
COMMENT ON COLUMN withdrawals.pix_owner_name IS 'Name of the PIX key owner';

-- Allow admins to update status to 'cancelled'
-- The existing RLS policy withdrawals_update_admin already allows this
