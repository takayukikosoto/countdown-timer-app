-- Fix increment_visitor_count function to work with current visitors table structure
-- (without event_date column)

DROP FUNCTION IF EXISTS public.increment_visitor_count(integer);

CREATE OR REPLACE FUNCTION public.increment_visitor_count(increment_by integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  visitor_record_exists BOOLEAN;
BEGIN
  -- Check if any visitor record exists
  SELECT EXISTS(SELECT 1 FROM visitors LIMIT 1) INTO visitor_record_exists;
  
  IF NOT visitor_record_exists THEN
    -- Create initial visitor record if none exists
    INSERT INTO visitors (count) VALUES (increment_by);
    RETURN increment_by;
  ELSE
    -- Update existing visitor count (use the first/only record)
    UPDATE visitors
    SET count = count + increment_by,
        updated_at = NOW()
    WHERE id = (SELECT id FROM visitors ORDER BY updated_at DESC LIMIT 1)
    RETURNING count INTO current_count;
    
    RETURN current_count;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.increment_visitor_count(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_visitor_count(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_visitor_count(integer) TO service_role;
