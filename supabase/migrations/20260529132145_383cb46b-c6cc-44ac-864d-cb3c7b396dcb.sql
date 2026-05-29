
-- Seed ~25 extra venues per city with varied types and realistic offsets
WITH names AS (
  SELECT * FROM (VALUES
    ('Terasa Centrală', 'terasa'), ('Old Town Pub', 'pub'), ('Neon Club', 'club'),
    ('Bistro Boem', 'bar'), ('Speakeasy 21', 'bar'), ('After Hours', 'after'),
    ('Grădina cu Cireși', 'terasa'), ('Beer Garden', 'pub'), ('Vinoteca', 'bar'),
    ('Club Underground', 'club'), ('Rooftop 360', 'terasa'), ('Pivnița Veche', 'pub'),
    ('Cocktail Lab', 'bar'), ('Sky Bar', 'bar'), ('Disco Inferno', 'club'),
    ('Late Night Lounge', 'after'), ('Sprițăria', 'bar'), ('Beraria H', 'pub'),
    ('Boutique Wine', 'bar'), ('Garage Club', 'club'), ('Terasa Parc', 'terasa'),
    ('Whiskey Room', 'bar'), ('Club Fabrica', 'club'), ('Bar la Colț', 'bar'),
    ('Terasa Veche', 'terasa')
  ) AS t(vname, vtype)
),
indexed AS (
  SELECT vname, vtype, row_number() OVER () AS idx FROM names
)
INSERT INTO public.venues (name, slug, type, city_id, lat, lng, address, opening_hours, verified)
SELECT
  n.vname,
  lower(regexp_replace(n.vname, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || c.slug || '-' || n.idx,
  n.vtype::venue_type,
  c.id,
  c.lat + (random() - 0.5) * 0.028,
  c.lng + (random() - 0.5) * 0.040,
  'Str. ' || (ARRAY['Republicii','Avram Iancu','Mihai Viteazul','Eroilor','Independenței','Unirii','Decebal','Traian','Libertății','Memorandumului'])[1 + (n.idx % 10)] || ' ' || (10 + (n.idx * 7) % 90),
  jsonb_build_object(
    'mon', CASE WHEN n.vtype IN ('club','after') THEN '22:00-05:00' ELSE '10:00-00:00' END,
    'tue', CASE WHEN n.vtype IN ('club','after') THEN '22:00-05:00' ELSE '10:00-00:00' END,
    'wed', CASE WHEN n.vtype IN ('club','after') THEN '22:00-05:00' ELSE '10:00-00:00' END,
    'thu', CASE WHEN n.vtype IN ('club','after') THEN '22:00-05:00' ELSE '10:00-02:00' END,
    'fri', CASE WHEN n.vtype IN ('club','after') THEN '23:00-06:00' ELSE '10:00-03:00' END,
    'sat', CASE WHEN n.vtype IN ('club','after') THEN '23:00-06:00' ELSE '10:00-03:00' END,
    'sun', CASE WHEN n.vtype IN ('club','after') THEN 'closed' ELSE '11:00-00:00' END
  ),
  false
FROM public.cities c
CROSS JOIN indexed n
ON CONFLICT (city_id, slug) DO NOTHING;
