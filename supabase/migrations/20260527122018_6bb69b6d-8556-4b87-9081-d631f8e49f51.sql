
-- Balkan rank enum
CREATE TYPE public.balkan_rank AS ENUM (
  'MDS',
  'CRAI_DE_CARTIER',
  'SPRITARUL',
  'CAMATARU_DE_PAHAR',
  'BOIERUL_NOPTII',
  'REGELE_CENTRULUI',
  'ZEU_BALCANIC'
);

CREATE TYPE public.venue_type AS ENUM ('club', 'bar', 'terasa', 'after', 'pub');

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE,
  display_name TEXT,
  city_id UUID,
  avatar_url TEXT,
  bio TEXT,
  rank public.balkan_rank NOT NULL DEFAULT 'MDS',
  aura INT NOT NULL DEFAULT 0,
  lifetime_sprits INT NOT NULL DEFAULT 0,
  location_consent BOOLEAN NOT NULL DEFAULT false,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- handle validation trigger (no email/uuid)
CREATE OR REPLACE FUNCTION public.validate_handle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.handle IS NOT NULL AND NEW.handle !~ '^[a-z0-9_\.]{3,24}$' THEN
    RAISE EXCEPTION 'Handle trebuie să fie 3-24 caractere: a-z, 0-9, _ sau .';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_profiles_validate BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_handle();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- CITIES
-- =========================
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  region TEXT,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  chaos_level NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities_public_read" ON public.cities FOR SELECT USING (true);

-- now add FK from profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_city_fk FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;

-- =========================
-- STREETS
-- =========================
CREATE TABLE public.streets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(city_id, slug)
);
CREATE INDEX idx_streets_city ON public.streets(city_id);
GRANT SELECT ON public.streets TO anon, authenticated;
GRANT ALL ON public.streets TO service_role;
ALTER TABLE public.streets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streets_public_read" ON public.streets FOR SELECT USING (true);

-- =========================
-- VENUES (cluburi reale)
-- =========================
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_id UUID NOT NULL REFERENCES public.streets(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  type public.venue_type NOT NULL DEFAULT 'club',
  description TEXT,
  cover_url TEXT,
  ig_handle TEXT,
  address TEXT,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city_id, slug)
);
CREATE INDEX idx_venues_street ON public.venues(street_id);
CREATE INDEX idx_venues_city ON public.venues(city_id);
GRANT SELECT ON public.venues TO anon, authenticated;
GRANT INSERT ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_public_read" ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues_auth_insert" ON public.venues FOR INSERT TO authenticated WITH CHECK (true);

-- =========================
-- VENUE PHOTOS (user-uploaded "poze de aseară")
-- =========================
CREATE TABLE public.venue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_venue_photos_venue ON public.venue_photos(venue_id, created_at DESC);
GRANT SELECT ON public.venue_photos TO anon, authenticated;
GRANT INSERT, DELETE ON public.venue_photos TO authenticated;
GRANT ALL ON public.venue_photos TO service_role;
ALTER TABLE public.venue_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_photos_public_read" ON public.venue_photos FOR SELECT USING (true);
CREATE POLICY "venue_photos_self_insert" ON public.venue_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "venue_photos_self_delete" ON public.venue_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- SPRIT PROOFS (poze cu șpriț verificate AI)
-- =========================
CREATE TABLE public.sprit_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  ai_verified BOOLEAN NOT NULL DEFAULT false,
  ai_confidence NUMERIC(3,2),
  ai_reason TEXT,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sprit_proofs_user ON public.sprit_proofs(user_id, created_at DESC);
CREATE INDEX idx_sprit_proofs_day ON public.sprit_proofs(created_at DESC) WHERE ai_verified = true;
GRANT SELECT ON public.sprit_proofs TO anon, authenticated;
GRANT INSERT, DELETE ON public.sprit_proofs TO authenticated;
GRANT ALL ON public.sprit_proofs TO service_role;
ALTER TABLE public.sprit_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprit_proofs_public_read" ON public.sprit_proofs FOR SELECT USING (true);
CREATE POLICY "sprit_proofs_self_insert" ON public.sprit_proofs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sprit_proofs_self_delete" ON public.sprit_proofs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- CHECK-INS LIVE
-- =========================
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '4 hours')
);
CREATE INDEX idx_check_ins_venue_live ON public.check_ins(venue_id, expires_at);
GRANT SELECT ON public.check_ins TO anon, authenticated;
GRANT INSERT, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
-- only live check-ins are publicly visible
CREATE POLICY "check_ins_public_live_read" ON public.check_ins FOR SELECT USING (expires_at > now());
CREATE POLICY "check_ins_self_insert" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "check_ins_self_delete" ON public.check_ins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- STORAGE BUCKETS
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars','avatars', true),
  ('proofs','proofs', true),
  ('venue-photos','venue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: user can only write to their own folder /<uid>/...
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars','proofs','venue-photos'));
CREATE POLICY "storage_user_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('avatars','proofs','venue-photos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "storage_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('avatars','proofs','venue-photos') AND (storage.foldername(name))[1] = auth.uid()::text);

-- =========================
-- SEED — Orașe RO
-- =========================
INSERT INTO public.cities (slug,name,region,lat,lng,chaos_level) VALUES
  ('bucuresti','București','Muntenia',44.4268,26.1025,9.4),
  ('cluj-napoca','Cluj-Napoca','Transilvania',46.7712,23.6236,8.7),
  ('timisoara','Timișoara','Banat',45.7489,21.2087,7.9),
  ('iasi','Iași','Moldova',47.1585,27.6014,8.2),
  ('constanta','Constanța','Dobrogea',44.1598,28.6348,8.6),
  ('brasov','Brașov','Transilvania',45.6427,25.5887,7.4),
  ('sibiu','Sibiu','Transilvania',45.7983,24.1256,6.8),
  ('craiova','Craiova','Oltenia',44.3302,23.7949,7.6),
  ('oradea','Oradea','Crișana',47.0722,21.9217,7.1),
  ('galati','Galați','Moldova',45.4353,28.0080,7.3),
  ('ploiesti','Ploiești','Muntenia',44.9469,26.0354,7.8),
  ('suceava','Suceava','Bucovina',47.6514,26.2556,6.4),
  ('targu-mures','Târgu Mureș','Transilvania',46.5455,24.5625,6.9),
  ('pitesti','Pitești','Muntenia',44.8565,24.8692,7.2),
  ('bacau','Bacău','Moldova',46.5670,26.9146,6.7),
  ('arad','Arad','Crișana',46.1866,21.3123,6.5);

-- =========================
-- SEED — Străzi reale (top zone de ieșit)
-- =========================
WITH c AS (SELECT id, slug FROM public.cities)
INSERT INTO public.streets (city_id, slug, name)
SELECT c.id, s.slug, s.name FROM c JOIN (VALUES
  -- București
  ('bucuresti','calea-victoriei','Calea Victoriei'),
  ('bucuresti','lipscani','Lipscani'),
  ('bucuresti','centru-vechi','Centru Vechi'),
  ('bucuresti','dorobanti','Calea Dorobanți'),
  ('bucuresti','floreasca','Floreasca'),
  ('bucuresti','victoriei','Piața Victoriei'),
  ('bucuresti','baneasa','Băneasa'),
  -- Cluj
  ('cluj-napoca','piata-unirii','Piața Unirii'),
  ('cluj-napoca','eroilor','Bd. Eroilor'),
  ('cluj-napoca','horea','Str. Horea'),
  ('cluj-napoca','centru-vechi','Centru Vechi'),
  ('cluj-napoca','manastur','Mănăștur'),
  -- Timișoara
  ('timisoara','piata-victoriei','Piața Victoriei'),
  ('timisoara','iosefin','Iosefin'),
  ('timisoara','fabric','Fabric'),
  ('timisoara','bd-revolutiei','Bd. Revoluției 1989'),
  -- Iași
  ('iasi','lapusneanu','Str. Lăpușneanu'),
  ('iasi','copou','Copou'),
  ('iasi','palas','Palas'),
  ('iasi','tatarasi','Tătărași'),
  -- Constanța
  ('constanta','mamaia','Mamaia'),
  ('constanta','faleza-nord','Faleză Nord'),
  ('constanta','centru-vechi','Centru Vechi'),
  ('constanta','tomis-nord','Tomis Nord'),
  -- Brașov
  ('brasov','republicii','Str. Republicii'),
  ('brasov','piata-sfatului','Piața Sfatului'),
  ('brasov','schei','Schei'),
  -- Sibiu
  ('sibiu','piata-mare','Piața Mare'),
  ('sibiu','nicolae-balcescu','Str. Nicolae Bălcescu'),
  -- Craiova
  ('craiova','calea-unirii','Calea Unirii'),
  ('craiova','lipscani','Str. Lipscani'),
  -- Oradea
  ('oradea','republicii','Calea Republicii'),
  ('oradea','piata-unirii','Piața Unirii'),
  -- Galați
  ('galati','bd-domneasca','Bd. Domnească'),
  ('galati','faleza','Faleza Dunării'),
  -- Ploiești
  ('ploiesti','republicii','Bd. Republicii'),
  ('ploiesti','cantacuzino','Cantacuzino'),
  -- Suceava
  ('suceava','centru','Centru'),
  ('suceava','areni','Areni'),
  -- Tg. Mureș
  ('targu-mures','trandafirilor','Piața Trandafirilor'),
  ('targu-mures','centru','Centru'),
  -- Pitești
  ('pitesti','victoriei','Str. Victoriei'),
  ('pitesti','trivale','Trivale'),
  -- Bacău
  ('bacau','centru','Centru'),
  ('bacau','9-mai','Str. 9 Mai'),
  -- Arad
  ('arad','bd-revolutiei','Bd. Revoluției'),
  ('arad','aurel-vlaicu','Bd. Aurel Vlaicu'),
  ('arad','micalaca','Micălaca'),
  ('arad','centru','Centru')
) AS s(city_slug, slug, name) ON c.slug = s.city_slug;

-- =========================
-- SEED — Câteva venues reale verificate
-- =========================
WITH s AS (
  SELECT st.id AS street_id, st.city_id, c.slug AS city_slug, st.slug AS street_slug
  FROM public.streets st JOIN public.cities c ON c.id = st.city_id
)
INSERT INTO public.venues (street_id, city_id, slug, name, type, description, ig_handle, address, verified)
SELECT s.street_id, s.city_id, v.slug, v.name, v.type::public.venue_type, v.description, v.ig_handle, v.address, true
FROM s JOIN (VALUES
  -- București — Centru Vechi / Lipscani
  ('bucuresti','centru-vechi','control-club','Control Club','club','Indie, electronic, undergroud. Centru Vechi.','controlclub','Str. Constantin Mille 4'),
  ('bucuresti','centru-vechi','expirat','Expirat','club','Live & DJ sets, vibe alternative.','expiratclub','Str. Doctor Dimitrie Brândză'),
  ('bucuresti','lipscani','shoteria','Shoteria','bar','Shoturi pe bandă. Lipscani clasic.','shoteria.ro','Str. Lipscani 18'),
  ('bucuresti','floreasca','form-space','Form Space','club','Mainstream club, mare, energie.','formspace','Calea Floreasca 111-113'),
  ('bucuresti','dorobanti','janis','Janis','bar','Cocktail bar Dorobanți.','janisbar','Calea Dorobanți'),
  -- Cluj
  ('cluj-napoca','piata-unirii','form-space-cluj','Form Space','club','Cluj nightlife landmark.','formspacecluj','Bd. 21 Decembrie 1989'),
  ('cluj-napoca','centru-vechi','janis','Janis','bar','Cocktail bar. Vibe vechi Cluj.','janiscluj','Str. Iuliu Maniu'),
  ('cluj-napoca','horea','flying-circus','Flying Circus Pub','pub','Pub legendar, terasă, șprițuri ieftine.','flyingcircuspub','Str. Iuliu Maniu 2'),
  -- Timișoara
  ('timisoara','piata-victoriei','daos','Daos Club','club','Underground, electronic.','daos.club','Str. Marășești'),
  ('timisoara','bd-revolutiei','aethernativ','Aethernativ','bar','Cocktail bar boem.','aethernativ','Str. Mărășești 14'),
  -- Iași
  ('iasi','copou','jassyro','Jassyro','club','Club Copou. Studenți, vibe Iași.','jassyro.iasi','Bd. Carol I'),
  ('iasi','lapusneanu','beraria-h','Berăria H','pub','Berărie, terasă, șprițuri.','berariah.iasi','Str. Lăpușneanu'),
  -- Constanța
  ('constanta','mamaia','loft','Loft','club','Pe plajă, vibe seaside.','loftmamaia','Mamaia'),
  ('constanta','mamaia','fratelli-beach','Fratelli Beach','club','Beach club, mainstream.','fratellibeach','Mamaia'),
  -- Cluj alt
  ('cluj-napoca','manastur','submarine','Submarine','club','Indie underground.','submarinecj','Mănăștur'),
  -- Brașov
  ('brasov','piata-sfatului','tipografia','Tipografia','bar','Cocktail bar centru istoric.','tipografia.bv','Piața Sfatului'),
  ('brasov','republicii','deane-irish-pub','Deane''s Irish Pub','pub','Irish pub clasic.','deanesbv','Str. Republicii'),
  -- Sibiu
  ('sibiu','piata-mare','imperium','Imperium Live Club','club','Live club Sibiu.','imperium.sibiu','Str. Nicolae Bălcescu'),
  -- Oradea
  ('oradea','piata-unirii','crama-veche','Crama Veche','bar','Crama centrală, șprițuri.','cramaveche.or','Piața Unirii'),
  -- Arad
  ('arad','bd-revolutiei','flex','Flex Club','club','Club central Arad.','flexarad','Bd. Revoluției'),
  ('arad','bd-revolutiei','art-club-30','Art Club 30','club','Vibe alternativ.','artclub30','Bd. Revoluției 30'),
  -- Craiova
  ('craiova','calea-unirii','play','Play Club','club','Centru Craiova.','playcraiova','Calea Unirii'),
  -- Galați
  ('galati','bd-domneasca','crystal','Crystal Club','club','Mainstream Galați.','crystalgl','Bd. Domnească'),
  -- Ploiești
  ('ploiesti','republicii','metropolis','Metropolis','club','Club central Ploiești.','metropolisph','Bd. Republicii')
) AS v(city_slug, street_slug, slug, name, type, description, ig_handle, address)
  ON s.city_slug = v.city_slug AND s.street_slug = v.street_slug
ON CONFLICT (city_id, slug) DO NOTHING;
