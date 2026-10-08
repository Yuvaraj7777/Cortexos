import { useState } from "react";
import {
  useListProjects,
  useCreateProject,
  useDeleteProject,
  getListProjectsQueryKey,
  type Project,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Trash2 } from "lucide-react";
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
} from "@/components/ui/dialog";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);

  const handleCreate = async () => {
    if (!name) return;
    try {
      await createProject.mutateAsync({ data: { name, description } });
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      setName("");
      setDescription("");
    } catch {
      toast({
        variant: "destructive",
        title: "Could not create project",
        description: "Something went wrong. Please try again.",
      });
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteProject.mutateAsync({
        id: project.id,
      });

      queryClient.invalidateQueries({
        queryKey: getListProjectsQueryKey(),
      });

      if (selected?.id === project.id) {
        setSelected(null);
      }

      toast({
        title: "Project deleted",
        description: "The project has been permanently deleted.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not delete project",
        description: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <Briefcase className="text-primary" />
        Projects
      </h1>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-bold">New Project</h2>
          <FileUploadButton
            label="Import from file"
            onLoaded={(r) => {
              setDescription(r.content);
              setName((prev) => prev || r.fileName.replace(/\.[^.]+$/, ""));
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Import a PDF or text file (.pdf, .txt, .md, .csv, .json) to fill the description, or type it in.
        </p>
        <Input
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={!name || createProject.isPending}>
          {createProject.isPending ? "Creating..." : "Create Project"}
          <Plus className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : projects?.length === 0 ? (
          <div className="text-muted-foreground">No projects found.</div>
        ) : (
          projects?.map((proj) => (
            <div
              key={proj.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(proj)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(proj);
                }
              }}
              className="glass-card p-6 rounded-xl flex flex-col justify-between cursor-pointer transition-colors hover:border-primary/40 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div>
                <h3 className="text-xl font-bold">{proj.name}</h3>
                <p className="text-muted-foreground mt-2 line-clamp-3">{proj.description}</p>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(proj);
                  }}
                  disabled={deleteProject.isPending}
                  title="Delete project"
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
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selected.description || "No description provided."}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selected)}
                  disabled={deleteProject.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteProject.isPending ? "Deleting..." : "Delete Project"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}