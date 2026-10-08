import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { readFileContent, type ReadFileResult } from "@/lib/read-file";

const ACCEPT =
  ".pdf,.txt,.md,.markdown,.csv,.json,.log,.html,.htm,.xml,.yml,.yaml,application/pdf,text/*";

export function FileUploadButton({
  onLoaded,
  label = "Upload file",
}: {
  onLoaded: (result: ReadFileResult) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await readFileContent(file);
      onLoaded(result);
      toast({
        title: "File loaded",
        description: `"${result.fileName}" is ready — review it and save.`,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "";
      toast({
        variant: "destructive",
        title: reason === "too-large" ? "File too large" : "Could not read file",
        description:
          reason === "too-large"
            ? "Please upload a file under 10 MB."
            : "Try a PDF or text-based file (.pdf, .txt, .md, .csv, .json, .html).",
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" /> {label}
          </>
        )}
      </Button>
    </>
  );
}
