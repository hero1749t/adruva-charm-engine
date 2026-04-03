DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.discount_coupons;
DROP POLICY IF EXISTS "Anyone can read coupon usage for validation" ON public.coupon_usage;
DROP POLICY IF EXISTS "Anyone can insert coupon usage" ON public.coupon_usage;

CREATE OR REPLACE FUNCTION public.validate_public_coupon(
  _owner_id UUID,
  _code TEXT,
  _customer_phone TEXT,
  _subtotal NUMERIC
)
RETURNS TABLE (
  coupon_id UUID,
  code TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon public.discount_coupons%ROWTYPE;
  _usage_count INTEGER;
BEGIN
  SELECT *
  INTO _coupon
  FROM public.discount_coupons
  WHERE owner_id = _owner_id
    AND upper(code) = upper(trim(_code))
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, 'Invalid or expired coupon code'::TEXT;
    RETURN;
  END IF;

  IF now() < _coupon.valid_from OR now() > _coupon.valid_until THEN
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, 'This coupon has expired'::TEXT;
    RETURN;
  END IF;

  IF _subtotal < _coupon.min_order_amount THEN
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, format('Minimum order Rs %s required', _coupon.min_order_amount)::TEXT;
    RETURN;
  END IF;

  SELECT count(*)
  INTO _usage_count
  FROM public.coupon_usage
  WHERE coupon_id = _coupon.id
    AND customer_phone = trim(_customer_phone);

  IF _usage_count >= _coupon.max_uses_per_person THEN
    RETURN QUERY
    SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, 'You have already used this coupon the maximum number of times'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT _coupon.id, _coupon.code, _coupon.discount_type, _coupon.discount_value, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_public_coupon(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_public_coupon(UUID, TEXT, TEXT, NUMERIC) TO anon, authenticated;

CREATE POLICY "Anyone can insert validated coupon usage"
ON public.coupon_usage
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.discount_coupons dc
    WHERE dc.id = coupon_usage.coupon_id
      AND dc.owner_id = coupon_usage.owner_id
      AND dc.is_active = true
  )
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = coupon_usage.order_id
      AND o.owner_id = coupon_usage.owner_id
      AND coalesce(o.customer_phone, '') = coupon_usage.customer_phone
  )
);
