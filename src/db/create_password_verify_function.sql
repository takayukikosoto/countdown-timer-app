-- Create password verification function for fallback authentication

CREATE OR REPLACE FUNCTION public.verify_password_direct(
  p_password text,
  p_stored_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use crypt to verify password against stored hash
  RETURN crypt(p_password, p_stored_hash) = p_stored_hash;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.verify_password_direct(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_password_direct(text, text) TO authenticated;
