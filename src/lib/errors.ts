/**
 * Normalize an unknown thrown value (from `catch`, promises, fetch, Supabase)
 * into a user-facing message string.
 *
 * Use in place of `catch (e: any) { toast.error(e.message ?? "..."); }`:
 *
 *   } catch (e) {
 *     toast.error(errorMessage(e, "Nu s-a putut salva"));
 *   }
 */
export function errorMessage(e: unknown, fallback = "A apărut o eroare"): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const rec = e as { message?: unknown; error?: unknown };
    if (typeof rec.message === "string" && rec.message) return rec.message;
    if (typeof rec.error === "string" && rec.error) return rec.error;
  }
  return fallback;
}
