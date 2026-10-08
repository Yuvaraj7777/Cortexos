import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { MessageSquare, Plus, Send, Trash2, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { data: conversations } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversation, refetch: refetchConversation } = useGetOpenaiConversation(
    activeId ?? 0,
    {
      query: {
        enabled: activeId != null,
        queryKey: getGetOpenaiConversationQueryKey(activeId ?? 0),
      },
    },
  );

  const messages = conversation?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streaming]);

  const refreshConversations = () =>
    queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });

  const handleNew = async () => {
    const convo = await createConversation.mutateAsync({ data: { title: "New conversation" } });
    await refreshConversations();
    setActiveId(convo.id);
  };

  const handleDelete = async (id: number) => {
    await deleteConversation.mutateAsync({ id });
    await refreshConversations();
    if (activeId === id) setActiveId(null);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    let convoId = activeId;
    if (convoId == null) {
      const convo = await createConversation.mutateAsync({ data: { title: "New conversation" } });
      convoId = convo.id;
      setActiveId(convoId);
      await refreshConversations();
    }

    setInput("");
    setIsStreaming(true);
    setStreaming("");

    try {
      const res = await fetch(`/api/openai/conversations/${convoId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content }),
      });
      await refetchConversation();

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          try {
            const evt = JSON.parse(payload) as { content?: string; error?: string; done?: boolean };
            if (evt.content) {
              acc += evt.content;
              setStreaming(acc);
            }
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    } catch (err) {
      setStreaming((s) => s + "\n\n[Connection error — please try again.]");
    } finally {
      setIsStreaming(false);
      setStreaming("");
      await refetchConversation();
      await refreshConversations();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight neon-text flex items-center gap-3">
        <MessageSquare className="text-primary" />
        OS Chat
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 h-[calc(100dvh-220px)] min-h-[420px]">
        {/* Conversation list */}
        <div className="glass-card rounded-xl p-3 flex flex-col gap-2 overflow-hidden">
          <Button onClick={handleNew} disabled={createConversation.isPending} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> New Session
          </Button>
          <div className="flex-1 overflow-y-auto space-y-1 mt-1">
            {conversations?.length ? (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-md cursor-pointer transition-all ${
                    activeId === c.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <span className="truncate text-sm">{c.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground px-3 py-2">No sessions yet.</p>
            )}
          </div>
        </div>

        {/* Message panel */}
        <div className="glass-card rounded-xl flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && !isStreaming ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <Bot className="h-10 w-10 text-primary/60" />
                <p className="max-w-sm">
                  Ask CortexOS to reason over your knowledge, summarize notes, or think through a problem.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="h-8 w-8 shrink-0 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary/15 border border-primary/20 text-foreground"
                        : "bg-white/5 border border-white/10 text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="h-8 w-8 shrink-0 rounded-md bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 shrink-0 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed bg-white/5 border border-white/10">
                  {streaming || <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4 flex gap-2">
            <Input
              placeholder="Message CortexOS..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isStreaming}
            />
            <Button onClick={handleSend} disabled={isStreaming || !input.trim()}>
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
