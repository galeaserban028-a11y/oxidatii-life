import { Moment, archivo, hind, SHEET_BOTTOM } from "./shared";

export function PostMenu({
  photo: _photo,
  onClose,
  onDelete,
}: {
  photo: Moment;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center"
      onClick={onClose}
      style={hind}
    >
      <div
        className="w-full sm:max-w-[22rem] bg-background border-t sm:border border-foreground/10 sm:rounded-2xl rounded-t-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: `calc(${SHEET_BOTTOM})` }}
      >
        <div className="py-2">
          <button
            onClick={onDelete}
            className="w-full text-left px-5 py-4 text-sunset-orange uppercase text-[13px] tracking-[0.1em] hover:bg-foreground/5 transition"
            style={archivo}
          >
            Șterge postarea
          </button>
          <div className="h-px bg-foreground/10" />
          <button
            onClick={onClose}
            className="w-full text-left px-5 py-4 text-muted-foreground uppercase text-[13px] tracking-[0.1em] hover:bg-foreground/5 transition"
            style={archivo}
          >
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}
