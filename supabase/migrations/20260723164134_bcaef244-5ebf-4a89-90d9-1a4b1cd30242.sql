
-- Guard sensitive profile columns against self-escalation.
-- Trigger runs regardless of SECURITY DEFINER; inside SD functions the
-- current_user becomes the function owner (postgres), so RPCs like buy_frame,
-- spend_coins, etc. continue to work. Direct PostgREST writes as the
-- `authenticated` role are constrained to safe columns.
CREATE OR REPLACE FUNCTION public.profiles_prevent_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.coin_balance    IS DISTINCT FROM OLD.coin_balance    THEN NEW.coin_balance    := OLD.coin_balance;    END IF;
    IF NEW.premium_tier    IS DISTINCT FROM OLD.premium_tier    THEN NEW.premium_tier    := OLD.premium_tier;    END IF;
    IF NEW.premium_until   IS DISTINCT FROM OLD.premium_until   THEN NEW.premium_until   := OLD.premium_until;   END IF;
    IF NEW.aura            IS DISTINCT FROM OLD.aura            THEN NEW.aura            := OLD.aura;            END IF;
    IF NEW.rank            IS DISTINCT FROM OLD.rank            THEN NEW.rank            := OLD.rank;            END IF;
    IF NEW.lifetime_sprits IS DISTINCT FROM OLD.lifetime_sprits THEN NEW.lifetime_sprits := OLD.lifetime_sprits; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_self_escalation_trg ON public.profiles;
CREATE TRIGGER profiles_prevent_self_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_prevent_self_escalation();

-- Guard sensitive business_accounts columns.
CREATE OR REPLACE FUNCTION public.business_accounts_prevent_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.verified              IS DISTINCT FROM OLD.verified              THEN NEW.verified              := OLD.verified;              END IF;
    IF NEW.wallet_balance_cents  IS DISTINCT FROM OLD.wallet_balance_cents  THEN NEW.wallet_balance_cents  := OLD.wallet_balance_cents;  END IF;
    IF NEW.monthly_credits_cents IS DISTINCT FROM OLD.monthly_credits_cents THEN NEW.monthly_credits_cents := OLD.monthly_credits_cents; END IF;
    IF NEW.tier                  IS DISTINCT FROM OLD.tier                  THEN NEW.tier                  := OLD.tier;                  END IF;
    IF NEW.reputation_score      IS DISTINCT FROM OLD.reputation_score      THEN NEW.reputation_score      := OLD.reputation_score;      END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_accounts_prevent_self_escalation_trg ON public.business_accounts;
CREATE TRIGGER business_accounts_prevent_self_escalation_trg
BEFORE UPDATE ON public.business_accounts
FOR EACH ROW
EXECUTE FUNCTION public.business_accounts_prevent_self_escalation();
