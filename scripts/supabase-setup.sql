-- Supabase PostgreSQL Function for Raw SQL Execution
-- สร้าง function นี้ใน Supabase SQL Editor ที่ https://supabase.com/project/[your-project]/sql

CREATE OR REPLACE FUNCTION execute_raw_query(
    query_string TEXT,
    query_params JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    param_array TEXT[];
    param_record RECORD;
    result_json JSONB;
BEGIN
    -- Convert JSONB array to PostgreSQL array
    SELECT array_agg(elem::text) INTO param_array 
    FROM jsonb_array_elements(query_params) AS elem;
    
    -- Execute the dynamic query with parameters
    FOR result_json IN 
        EXECUTE format('%s', query_string) 
        USING param_array
    LOOP
        RETURN NEXT result_json;
    END LOOP;
    
    RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_raw_query TO authenticated;
GRANT EXECUTE ON FUNCTION execute_raw_query TO service_role;
