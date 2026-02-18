-- Migration: Add updated_at trigger for custom_field_values table
-- This ensures the updated_at column is automatically updated on row updates

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_custom_field_values_updated_at ON custom_field_values;

-- Create the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_custom_field_values_updated_at
    BEFORE UPDATE ON custom_field_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'update_custom_field_values_updated_at';
