
-- Catalog: avatar frames
CREATE TABLE public.avatar_frames (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_coins int NOT NULL CHECK (price_coins >= 0),
  css_class text NOT NULL,
  emoji text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.avatar_frames TO anon, authenticated;
GRANT ALL ON public.avatar_frames TO service_role;
ALTER TABLE public.avatar_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avatar_frames_public_read" ON public.avatar_frames FOR SELECT TO public USING (true);

-- Owned frames per user
CREATE TABLE public.user_frames (
  user_id uuid NOT NULL,
  frame_id text NOT NULL REFERENCES public.avatar_frames(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, frame_id)
);
GRANT SELECT, INSERT ON public.user_frames TO authenticated;
GRANT ALL ON public.user_frames TO service_role;
ALTER TABLE public.user_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_frames_self_read" ON public.user_frames FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_frames_public_read_owned" ON public.user_frames FOR SELECT TO authenticated USING (true);

-- Active frame on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_frame_id text REFERENCES public.avatar_frames(id) ON DELETE SET NULL;

-- Coin boosts (profile or party)
CREATE TABLE public.coin_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('profile','party')),
  target_id uuid,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  cost_coins int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coin_boosts_active ON public.coin_boosts(kind, expires_at);
CREATE INDEX idx_coin_boosts_user ON public.coin_boosts(user_id);
GRANT SELECT ON public.coin_boosts TO authenticated, anon;
GRANT ALL ON public.coin_boosts TO service_role;
ALTER TABLE public.coin_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coin_boosts_public_read_active" ON public.coin_boosts FOR SELECT TO public USING (expires_at > now());

-- Chat gift catalog
CREATE TABLE public.chat_gift_catalog (
  id text PRIMARY KEY,
  emoji text NOT NULL,
  name text NOT NULL,
  price_coins int NOT NULL CHECK (price_coins >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_gift_catalog TO anon, authenticated;
GRANT ALL ON public.chat_gift_catalog TO service_role;
ALTER TABLE public.chat_gift_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_gift_catalog_public_read" ON public.chat_gift_catalog FOR SELECT TO public USING (true);

-- Chat gifts sent
CREATE TABLE public.chat_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  gift_id text NOT NULL REFERENCES public.chat_gift_catalog(id),
  message_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_gifts_conv ON public.chat_gifts(conversation_id, created_at DESC);
GRANT SELECT ON public.chat_gifts TO authenticated;
GRANT ALL ON public.chat_gifts TO service_role;
ALTER TABLE public.chat_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_gifts_members_read" ON public.chat_gifts FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Coin spend ledger
CREATE TABLE public.coin_spends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount int NOT NULL CHECK (amount > 0),
  kind text NOT NULL,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coin_spends_user ON public.coin_spends(user_id, created_at DESC);
GRANT SELECT ON public.coin_spends TO authenticated;
GRANT ALL ON public.coin_spends TO service_role;
ALTER TABLE public.coin_spends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coin_spends_self_read" ON public.coin_spends FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Atomic spend RPC
CREATE OR REPLACE FUNCTION public.spend_coins(_amount int, _kind text, _ref_id text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance int;
  _new_balance int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Trebuie să fii autentificat';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Sumă invalidă';
  END IF;

  SELECT coin_balance INTO _balance FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF _balance IS NULL THEN
    RAISE EXCEPTION 'Profil inexistent';
  END IF;
  IF _balance < _amount THEN
    RAISE EXCEPTION 'Nu ai destui coins (ai % / ai nevoie de %)', _balance, _amount;
  END IF;

  UPDATE public.profiles SET coin_balance = coin_balance - _amount
    WHERE id = auth.uid()
    RETURNING coin_balance INTO _new_balance;

  INSERT INTO public.coin_spends (user_id, amount, kind, ref_id)
    VALUES (auth.uid(), _amount, _kind, _ref_id);

  RETURN _new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_coins(int, text, text) TO authenticated;

-- Seed catalogs
INSERT INTO public.avatar_frames (id, name, price_coins, css_class, emoji) VALUES
  ('neon',  'Neon Pulse',  100, 'ring-4 ring-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.8)] animate-pulse', '💜'),
  ('gold',  'Gold Boss',   300, 'ring-4 ring-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.85)]', '👑'),
  ('fire',  'Fire Lord',   250, 'ring-4 ring-orange-500 shadow-[0_0_22px_rgba(249,115,22,0.85)] animate-pulse', '🔥'),
  ('ice',   'Ice Cold',    200, 'ring-4 ring-cyan-400 shadow-[0_0_22px_rgba(34,211,238,0.8)]', '❄️'),
  ('legend','Legendarul',  500, 'ring-4 ring-rose-500 shadow-[0_0_28px_rgba(244,63,94,0.9)] animate-pulse', '⭐')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chat_gift_catalog (id, emoji, name, price_coins) VALUES
  ('beer',      '🍺', 'Bere',         5),
  ('shot',      '🥃', 'Shot',         8),
  ('champagne', '🥂', 'Șampanie',     15),
  ('fire',      '🔥', 'Foc',          10),
  ('heart',     '❤️', 'Inimă',         12),
  ('crown',     '👑', 'Coroană',      25),
  ('diamond',   '💎', 'Diamant',      50)
ON CONFLICT (id) DO NOTHING;
