import { useState } from "react";
import {
  useListDocuments,
  useCreateDocument,
  useDeleteDocument,
  getListDocumentsQueryKey,
  type Document,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Files, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FileUploadButton } from "@/components/file-upload-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function DocumentsPage() {
  const { data: documents, isLoading } = useListDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("text/plain");
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Document | null>(null);

  const handleCreate = async () => {
    if (!fileName) return;
    try {
      await createDocument.mutateAsync({ data: { fileName, fileType, content } });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      setFileName("");
      setFileType("text/plain");
      setContent("");
    } catch {
      toast({
        variant: "destructive",
        title: "Could not add document",
        description: "Something went wrong. Please try again.",
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${doc.fileName}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteDocument.mutateAsync({
        id: doc.id,
      });

      queryClient.invalidateQueries({
        queryKey: getListDocumentsQueryKey(),
      });

      if (selected?.id === doc.id) {
        setSelected(null);
      }

      toast({
        title: "Document deleted",
        description: "The document has been permanently deleted.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not delete document",
        description: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <Files className="text-primary" />
        Documents
      </h1>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-bold">New Document</h2>
          <FileUploadButton
            onLoaded={(r) => {
              setFileName(r.fileName);
              setFileType(r.fileType);
              setContent(r.content);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a PDF or text-based file (.pdf, .txt, .md, .csv, .json, .html) up to 10 MB, or fill the fields in manually.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="File name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <Input
            placeholder="File type (e.g. text/plain, application/pdf)"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
          />
        </div>
        <Textarea
          placeholder="Document content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={!fileName || createDocument.isPending}>
          {createDocument.isPending ? "Uploading..." : "Add Document"}
          <Plus className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : documents?.length === 0 ? (
          <div className="text-muted-foreground">No documents found.</div>
        ) : (
          documents?.map((doc) => (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(doc)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(doc);
                }
              }}
              className="glass-card p-6 rounded-xl flex flex-col justify-between cursor-pointer transition-colors hover:border-primary/40 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div>
                <h3 className="text-xl font-bold">{doc.fileName}</h3>
                <p className="text-xs text-secondary font-mono mt-1">{doc.fileType}</p>
                <p className="text-muted-foreground mt-2 line-clamp-3">{doc.content}</p>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc);
                  }}
                  disabled={deleteDocument.isPending}
                  title="Delete document"
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
                <DialogTitle>{selected.fileName}</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {selected.fileType}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selected.content || "This document has no extracted text content."}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selected)}
                  disabled={deleteDocument.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteDocument.isPending ? "Deleting..." : "Delete Document"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}