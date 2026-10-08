import { useState } from "react";
import { useListMemory } from "@workspace/api-client-react";
import { Clock, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type MemoryEntry = {
  id: number;
  memoryType: string;
  content: string;
  createdAt: string | Date;
};

function formatType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(value: string | Date) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(value: string | Date) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MemoryPage() {
  const { data: entries, isLoading } = useListMemory();
  const [selected, setSelected] = useState<MemoryEntry | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <Clock className="text-secondary" />
        Memory Timeline
      </h1>
      <p className="text-muted-foreground -mt-2">
        A chronological log of activity and reasoning across your second brain. Click any entry to retrieve it in full.
      </p>

      {isLoading ? (
        <div>Loading...</div>
      ) : entries?.length ? (
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-secondary/30 to-transparent" />
          <div className="space-y-4">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelected(entry as MemoryEntry)}
                className="relative w-full text-left glass-card p-5 rounded-xl transition-colors hover:border-primary/40 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span className="absolute -left-[23px] top-6 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Activity className="h-4 w-4" />
                    {formatType(entry.memoryType)}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-10 rounded-xl text-center text-muted-foreground">
          No memory entries yet. Activity across CortexOS will appear here.
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-primary">
                  <Activity className="h-4 w-4" />
                  {formatType(selected.memoryType)}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {formatFullDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selected.content}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
