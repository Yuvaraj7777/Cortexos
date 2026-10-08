import { openai } from "@workspace/integrations-openai-ai-server";

const MODEL = "qwen3:8b";

export async function aiText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function aiJSON<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n\nRespond ONLY with a single valid JSON object. No markdown, no code fences.`,
      },
      { role: "user", content: userPrompt },
    ],
  });
  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("AI returned invalid JSON");
  }
}
