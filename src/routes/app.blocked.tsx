import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldOff, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBlockedList, useBlockMutations } from "@/lib/blocks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/blocked")({
  head: () => ({ meta: [{ title: "Blocați · OXIDAȚII" }] }),
  component: BlockedPage,
});

function BlockedPage() {
  const { user } = useAuth();
  const { data: list, isLoading } = useBlockedList(user?.id);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  if (!user) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Trebuie să fii logat.
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-10 max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="font-display uppercase text-2xl leading-none">Utilizatori blocați</h1>
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
          nu îți pot trimite cerere, mesaje sau vedea profilul
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Se încarcă...</div>
      ) : !list || list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
          <ShieldOff className="mx-auto opacity-50" />
          <div className="font-display uppercase">Niciun utilizator blocat.</div>
          <p className="text-xs text-muted-foreground">
            Poți bloca pe oricine din pagina lui de profil.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((b) => {
            const handle = b.blocked?.handle ?? b.blocked?.display_name ?? "anonim";
            return (
              <li
                key={b.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card"
              >
                <Link
                  to="/app/user/$id"
                  params={{ id: b.blocked?.id ?? b.blocked_id }}
                  className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-foreground/30 to-foreground/10 flex items-center justify-center text-background font-display font-bold shrink-0"
                >
                  {b.blocked?.avatar_url ? (
                    <img src={b.blocked.avatar_url} alt="" className="h-full w-full object-cover grayscale" />
                  ) : (
                    handle[0]?.toUpperCase()
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold truncate">@{handle}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    blocat
                  </div>
                </div>
                <button
                  onClick={() => setConfirm({ id: b.blocked?.id ?? b.blocked_id, name: handle })}
                  className="px-3 h-9 rounded-full border border-foreground/20 text-foreground flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest active:scale-95 transition"
                >
                  <UserCheck size={14} /> deblochează
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <UnblockDialog
        viewerId={user.id}
        target={confirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function UnblockDialog({
  viewerId,
  target,
  onClose,
}: {
  viewerId: string;
  target: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const { unblock } = useBlockMutations(viewerId, target?.id ?? "");
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deblochează @{target?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Va putea din nou să-ți trimită cereri și mesaje și să-ți vadă profilul.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anulează</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              unblock.mutate();
              onClose();
            }}
          >
            Deblochează
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
