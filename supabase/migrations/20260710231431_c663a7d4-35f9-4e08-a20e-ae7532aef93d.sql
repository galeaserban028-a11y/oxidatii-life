-- Duplicates: same columns, same order — waste RAM + slow writes
DROP INDEX IF EXISTS public.idx_venues_city_id;      -- dup of idx_venues_city
DROP INDEX IF EXISTS public.idx_venues_latlng_notnull; -- dup of idx_venues_geo_name
DROP INDEX IF EXISTS public.idx_members_user;        -- dup of idx_conv_members_user