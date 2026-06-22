ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';