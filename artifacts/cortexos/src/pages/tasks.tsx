import { useState } from "react";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
  type Task,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["todo", "in_progress", "done"];

function priorityClasses(priority: string): string {
  if (priority === "high")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  if (priority === "medium")
    return "border-secondary/30 bg-secondary/10 text-secondary";
  return "border-primary/20 bg-primary/10 text-primary";
}

export default function TasksPage() {
  const { data: tasks, isLoading } = useListTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [selected, setSelected] = useState<Task | null>(null);

  const handleCreate = async () => {
    if (!title) return;

    try {
      await createTask.mutateAsync({
        data: { title, description, priority, status },
      });

      queryClient.invalidateQueries({
        queryKey: getListTasksQueryKey(),
      });

      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
    } catch {
      toast({
        variant: "destructive",
        title: "Could not add task",
        description: "Something went wrong. Please try again.",
      });
    }
  };

  const handleStatusChange = async (
    task: Task,
    newStatus: string,
  ) => {
    try {
      const updatedTask = await updateTask.mutateAsync({
        id: task.id,
        data: { status: newStatus },
      });

      queryClient.invalidateQueries({
        queryKey: getListTasksQueryKey(),
      });

      if (selected?.id === task.id) {
        setSelected(updatedTask);
      }

      toast({
        title: "Task updated",
        description: `Task marked as ${newStatus.replace("_", " ")}.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not update task",
        description: "Something went wrong. Please try again.",
      });
    }
  };

  const handleDelete = async (task: Task) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteTask.mutateAsync({
        id: task.id,
      });

      queryClient.invalidateQueries({
        queryKey: getListTasksQueryKey(),
      });

      if (selected?.id === task.id) {
        setSelected(null);
      }

      toast({
        title: "Task deleted",
        description: "The task has been permanently deleted.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not delete task",
        description: "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <CheckSquare className="text-primary" />
        Tasks
      </h1>

      <div className="glass-card p-6 rounded-xl space-y-4">
        <h2 className="text-xl font-bold">New Task</h2>

        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Priority
            </label>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem
                    key={p}
                    value={p}
                    className="capitalize"
                  >
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Status
            </label>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={!title || createTask.isPending}
        >
          {createTask.isPending ? "Adding..." : "Add Task"}
          <Plus className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : tasks?.length === 0 ? (
          <div className="text-muted-foreground">
            No tasks found.
          </div>
        ) : (
          tasks?.map((task) => (
            <div
              key={task.id}
              className="glass-card p-6 rounded-xl flex justify-between items-center gap-4 transition-colors hover:border-primary/40 hover:bg-white/[0.04]"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected(task)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(task);
                  }
                }}
                className="min-w-0 flex-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
              >
                <h3 className="text-xl font-bold">
                  {task.title}
                </h3>

                <p className="text-muted-foreground mt-2 line-clamp-2">
                  {task.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs border px-3 py-1 rounded-full capitalize ${priorityClasses(
                    task.priority,
                  )}`}
                >
                  {task.priority}
                </span>

                <Select
                  value={task.status}
                  onValueChange={(newStatus) =>
                    handleStatusChange(task, newStatus)
                  }
                >
                  <SelectTrigger
                    className="w-[130px] h-9"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(task);
                  }}
                  disabled={deleteTask.isPending}
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(open) =>
          !open && setSelected(null)
        }
      >
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs border px-3 py-1 rounded-full capitalize ${priorityClasses(
                    selected.priority,
                  )}`}
                >
                  {selected.priority}
                </span>

                <Select
                  value={selected.status}
                  onValueChange={(newStatus) =>
                    handleStatusChange(selected, newStatus)
                  }
                >
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selected.description ||
                  "No description provided."}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selected)}
                  disabled={deleteTask.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteTask.isPending ? "Deleting..." : "Delete Task"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}