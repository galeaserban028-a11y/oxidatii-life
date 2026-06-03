
-- Premium tier required column
ALTER TABLE public.avatar_frames ADD COLUMN IF NOT EXISTS premium_tier_required premium_tier;

INSERT INTO public.avatar_frames (id, name, emoji, price_coins, css_class, premium_tier_required) VALUES
  ('vip_aurum', 'Aurum VIP', '🥂', 0, 'ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.7)]', 'vip'),
  ('vipplus_crystal', 'Crystal VIP+', '💎', 0, 'ring-[3px] ring-rose-300 shadow-[0_0_22px_rgba(253,164,175,0.85)] animate-pulse', 'vip_plus'),
  ('pro_holo', 'Holo Pro', '✨', 0, 'ring-[3px] ring-violet-400 shadow-[0_0_24px_rgba(167,139,250,0.9)] animate-pulse', 'pro'),
  ('elite_diamond', 'Diamond Elite', '👑', 0, 'ring-4 ring-cyan-200 shadow-[0_0_30px_rgba(165,243,252,0.95)] animate-pulse', 'elite')
ON CONFLICT (id) DO UPDATE SET
  premium_tier_required = EXCLUDED.premium_tier_required,
  css_class = EXCLUDED.css_class,
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji;
