-- Fixed Supabase PostgreSQL Function with Parameter Support
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
    param_count INTEGER;
    result_json JSONB;
    modified_query TEXT;
BEGIN
    -- Convert JSONB array to PostgreSQL array
    SELECT array_agg(elem::text) INTO param_array 
    FROM jsonb_array_elements(query_params) AS elem;
    
    -- Get parameter count
    SELECT COALESCE(array_length(param_array, 1), 0) INTO param_count;
    
    -- If no parameters, execute query directly
    IF param_count = 0 THEN
        RETURN QUERY EXECUTE query_string;
    ELSE
        -- Execute with parameters using format
        modified_query := query_string;
        RETURN QUERY EXECUTE format('%I', modified_query) USING param_array;
    END IF;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN QUERY SELECT jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE,
            'query', query_string
        )::jsonb;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_raw_query TO authenticated;
GRANT EXECUTE ON FUNCTION execute_raw_query TO service_role;
