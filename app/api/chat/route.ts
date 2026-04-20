import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { META_AGENT_SYSTEM_PROMPT, META_AGENT_TOOLS } from "@/lib/meta-agent";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

type MessageParam = Anthropic.MessageParam;

async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  profileId: string | null
): Promise<{ result: unknown; agentMutation?: { type: string; data: unknown } }> {
  switch (toolName) {
    case "create_agent": {
      const agent = await prisma.agent.create({
        data: {
          name: toolInput.name as string,
          description: (toolInput.description as string) ?? "",
          systemPrompt: toolInput.systemPrompt as string,
          model: (toolInput.model as string) || "claude-sonnet-4-6",
          tools: (toolInput.tools as object[]) || [],
          knowledgeSources: (toolInput.knowledgeSources as object[]) || [],
          profileId: profileId || null,
        },
      });
      return {
        result: { success: true, agent },
        agentMutation: { type: "created", data: agent },
      };
    }

    case "update_agent": {
      const { id, ...updates } = toolInput as { id: string; [key: string]: unknown };
      const agent = await prisma.agent.update({
        where: { id },
        data: {
          ...(updates.name !== undefined && { name: updates.name as string }),
          ...(updates.description !== undefined && { description: updates.description as string }),
          ...(updates.systemPrompt !== undefined && { systemPrompt: updates.systemPrompt as string }),
          ...(updates.model !== undefined && { model: updates.model as string }),
          ...(updates.tools !== undefined && { tools: updates.tools as object[] }),
          ...(updates.knowledgeSources !== undefined && {
            knowledgeSources: updates.knowledgeSources as object[],
          }),
        },
      });
      return {
        result: { success: true, agent },
        agentMutation: { type: "updated", data: agent },
      };
    }

    case "delete_agent": {
      const { id } = toolInput as { id: string };
      await prisma.agent.delete({ where: { id } });
      return {
        result: { success: true, deletedId: id },
        agentMutation: { type: "deleted", data: { id } },
      };
    }

    case "list_agents": {
      const agents = await prisma.agent.findMany({
        where: profileId ? { profileId } : undefined,
        orderBy: { updatedAt: "desc" },
      });
      return { result: { agents } };
    }

    case "get_agent": {
      const { id } = toolInput as { id: string };
      const agent = await prisma.agent.findUnique({ where: { id } });
      return { result: { agent } };
    }

    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key required" }, { status: 401 });
  }

  let messages: MessageParam[];
  let sessionId: string | null = null;
  let profileId: string | null = null;
  let userMessageContent = "";
  try {
    const body = await req.json();
    messages = body.messages;
    sessionId = body.sessionId || null;
    profileId = body.profileId || null;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && typeof lastUserMsg.content === "string") {
      userMessageContent = lastUserMsg.content;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Persist the user message immediately
  if (sessionId && userMessageContent) {
    try {
      await prisma.chatMessage.create({
        data: { sessionId, role: "user", content: userMessageContent, toolCalls: [] },
      });
      // Auto-title on first message
      const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
      if (session && session.title === "New Chat") {
        const title = userMessageContent.slice(0, 60).trim();
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { title: title || "New Chat" },
        });
      } else {
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        });
      }
    } catch {
      // non-fatal
    }
  }

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let continueLoop = true;
        const conversationMessages: MessageParam[] = [...messages];
        const allAssistantText: string[] = [];
        const allToolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];

        while (continueLoop) {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: META_AGENT_SYSTEM_PROMPT,
            tools: META_AGENT_TOOLS,
            messages: conversationMessages,
            stream: true,
          });

          let fullText = "";
          const toolUseBlocks: Array<{
            id: string;
            name: string;
            input: string;
          }> = [];
          let currentToolUse: { id: string; name: string; input: string } | null = null;
          let stopReason = "";

          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: "",
                };
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                fullText += event.delta.text;
                send({ type: "text", text: event.delta.text });
              } else if (event.delta.type === "input_json_delta" && currentToolUse) {
                currentToolUse.input += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolUse) {
                toolUseBlocks.push(currentToolUse);
                currentToolUse = null;
              }
            } else if (event.type === "message_delta") {
              stopReason = event.delta.stop_reason || "";
            }
          }

          if (fullText) allAssistantText.push(fullText);

          if (stopReason === "tool_use" && toolUseBlocks.length > 0) {
            const assistantContent: Anthropic.Messages.MessageParam["content"] = [];

            if (fullText) {
              assistantContent.push({ type: "text", text: fullText });
            }

            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolBlock of toolUseBlocks) {
              let parsedInput: Record<string, unknown> = {};
              try {
                parsedInput = JSON.parse(toolBlock.input || "{}");
              } catch {
                parsedInput = {};
              }

              assistantContent.push({
                type: "tool_use",
                id: toolBlock.id,
                name: toolBlock.name,
                input: parsedInput,
              });

              send({
                type: "tool_call",
                toolName: toolBlock.name,
                toolInput: parsedInput,
              });

              allToolCalls.push({ name: toolBlock.name, input: parsedInput });

              const { result, agentMutation } = await handleToolCall(
                toolBlock.name,
                parsedInput,
                profileId
              );

              if (agentMutation) {
                send({ type: "agent_mutation", mutation: agentMutation });
                // Link session to created/updated agent
                if (sessionId && (agentMutation.type === "created" || agentMutation.type === "updated")) {
                  const a = agentMutation.data as { id: string };
                  await prisma.chatSession
                    .update({ where: { id: sessionId }, data: { agentId: a.id } })
                    .catch(() => {});
                }
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: toolBlock.id,
                content: JSON.stringify(result),
              });
            }

            conversationMessages.push({ role: "assistant", content: assistantContent });
            conversationMessages.push({ role: "user", content: toolResults });
          } else {
            continueLoop = false;
            send({ type: "done", messageId: uuidv4() });
          }
        }

        // Persist assistant message
        if (sessionId) {
          const finalText = allAssistantText.join("\n\n");
          await prisma.chatMessage
            .create({
              data: {
                sessionId,
                role: "assistant",
                content: finalText,
                toolCalls: allToolCalls as unknown as object[],
              },
            })
            .catch(() => {});
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
