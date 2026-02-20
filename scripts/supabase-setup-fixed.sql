-- Fixed Supabase PostgreSQL Function for Raw SQL Execution
CREATE OR REPLACE FUNCTION execute_raw_query(
    query_string TEXT,
    query_params JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_json JSONB;
BEGIN
    -- Execute the dynamic query with parameters
    -- Note: This is a simplified version for testing
    RETURN QUERY EXECUTE query_string;
    
    RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_raw_query TO authenticated;
GRANT EXECUTE ON FUNCTION execute_raw_query TO service_role;
