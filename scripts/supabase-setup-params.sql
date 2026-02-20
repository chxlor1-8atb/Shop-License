-- RPC Function that handles parameters correctly
CREATE OR REPLACE FUNCTION execute_raw_query(
    query_string TEXT,
    query_params JSONB DEFAULT '[]'::jsonb
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    param_count INTEGER;
    param_array TEXT[];
    result RECORD;
BEGIN
    -- Get parameters from JSONB
    SELECT array_agg(elem::text) INTO param_array 
    FROM jsonb_array_elements(query_params) AS elem;
    
    SELECT COALESCE(array_length(param_array, 1), 0) INTO param_count;
    
    -- If no parameters, execute directly
    IF param_count = 0 THEN
        FOR result IN EXECUTE query_string LOOP
            RETURN NEXT row_to_json(result)::jsonb;
        END LOOP;
    ELSE
        -- Execute with parameters - handle $1, $2, etc.
        FOR result IN EXECUTE query_string USING param_array[1], param_array[2], param_array[3], param_array[4], param_array[5] LOOP
            RETURN NEXT row_to_json(result)::jsonb;
        END LOOP;
    END IF;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error as JSON
        RETURN QUERY SELECT jsonb_build_object(
            'error', SQLERRM,
            'query', query_string,
            'params', query_params
        )::jsonb;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_raw_query TO authenticated;
GRANT EXECUTE ON FUNCTION execute_raw_query TO service_role;
