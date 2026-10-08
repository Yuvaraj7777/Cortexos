import { useState } from "react";
import { useListNotes, useCreateNote, useDeleteNote, getListNotesQueryKey, type Note } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadButton } from "@/components/file-upload-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function NotesPage() {
  const { data: notes, isLoading } = useListNotes();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Note | null>(null);

  const handleCreate = async () => {
    if (!title) return;
    await createNote.mutateAsync({ data: { title, content } });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
    setTitle("");
    setContent("");
  };

  const handleDelete = async (id: number) => {
    const note = notes?.find((n) => n.id === id);

    const confirmed = window.confirm(
      `Are you sure you want to delete "${note?.title || "this note"}"?`,
    );

    if (!confirmed) return;

    await deleteNote.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });

    if (selected?.id === id) {
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <FileText className="text-primary" />
        Notes
      </h1>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-bold">New Note</h2>
          <FileUploadButton
            label="Import from file"
            onLoaded={(r) => {
              setContent(r.content);
              setTitle((prev) => prev || r.fileName.replace(/\.[^.]+$/, ""));
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Import a PDF or text file (.pdf, .txt, .md, .csv, .json) to fill the note, or type it in.
        </p>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
        <Button onClick={handleCreate} disabled={!title || createNote.isPending}>
          {createNote.isPending ? "Creating..." : "Save Note"} <Plus className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          notes?.map((note) => (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(note)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(note);
                }
              }}
              className="glass-card p-6 rounded-xl flex flex-col justify-between cursor-pointer transition-colors hover:border-primary/40 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div>
                <h3 className="text-xl font-bold">{note.title}</h3>
                <p className="text-muted-foreground mt-2 line-clamp-3">{note.content}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(note.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                {selected.summary && (
                  <DialogDescription>{selected.summary}</DialogDescription>
                )}
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