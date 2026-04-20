import Anthropic from "@anthropic-ai/sdk";

export const META_AGENT_SYSTEM_PROMPT = `You are an expert AI Agent Builder assistant. Your job is to help users design and create custom AI agents through natural conversation.

When a user describes what they want, your goal is to:
1. Ask clarifying questions if needed to fully understand their requirements
2. Suggest an appropriate name, description, system prompt, model, tools, and knowledge sources
3. Use the available tools to create or update the agent in the database
4. Iterate with the user until they are satisfied

## Agent Fields You Must Populate
- **name**: Short, memorable name (e.g. "Customer Support Bot", "Code Reviewer")
- **description**: 1-2 sentence description of what the agent does, shown in the UI
- **systemPrompt**: Detailed instructions for the agent — its persona, rules, tone, capabilities, and constraints
- **model**: One of:
  - claude-opus-4-7 (most capable, best for complex reasoning)
  - claude-sonnet-4-6 (balanced — fast and smart, recommended default)
  - claude-haiku-4-5-20251001 (fastest and cheapest, best for simple tasks)
- **tools**: Array of tools the agent can use (e.g. web search, code execution, calculator)
- **knowledgeSources**: Array of knowledge sources (websites, files, folders, API calls)

## Guidelines
- Be conversational and helpful. Ask one or two clarifying questions at a time, not a huge list.
- When you have enough information (name, description, system prompt, model at minimum), go ahead and call create_agent or update_agent — don't keep asking for more.
- After creating or updating an agent, confirm what you did and ask if they want any changes.
- If a user asks to see their agents, call list_agents.
- If a user wants to delete an agent, confirm first then call delete_agent.
- Suggest sensible defaults for model (claude-sonnet-4-6) and tools/knowledge sources based on the use case.
- Write system prompts that are detailed, specific, and production-ready — not vague placeholders.
- Format your responses in clear markdown.`;

export const META_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_agent",
    description:
      "Create a new AI agent and save it to the database. Call this once you have enough information from the user.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Short, memorable name for the agent",
        },
        description: {
          type: "string",
          description: "1-2 sentence description of what the agent does",
        },
        systemPrompt: {
          type: "string",
          description:
            "Detailed system prompt / instructions for the agent. Should be thorough and production-ready.",
        },
        model: {
          type: "string",
          enum: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
          description: "The Claude model this agent will use",
        },
        tools: {
          type: "array",
          description: "List of tools the agent can use",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
            required: ["name", "description"],
          },
        },
        knowledgeSources: {
          type: "array",
          description: "List of knowledge sources for the agent",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: {
                type: "string",
                enum: ["website", "file", "folder", "api"],
              },
              name: { type: "string" },
              value: { type: "string" },
              description: { type: "string" },
            },
            required: ["id", "type", "name", "value"],
          },
        },
      },
      required: ["name", "description", "systemPrompt", "model"],
    },
  },
  {
    name: "update_agent",
    description:
      "Update an existing agent's fields. Only include fields that should change.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The ID of the agent to update",
        },
        name: { type: "string" },
        description: { type: "string" },
        systemPrompt: { type: "string" },
        model: {
          type: "string",
          enum: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
        },
        tools: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
            },
            required: ["name", "description"],
          },
        },
        knowledgeSources: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["website", "file", "folder", "api"] },
              name: { type: "string" },
              value: { type: "string" },
              description: { type: "string" },
            },
            required: ["id", "type", "name", "value"],
          },
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_agent",
    description: "Delete an agent by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The ID of the agent to delete",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_agents",
    description: "List all agents created by the user",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_agent",
    description: "Get full details of a specific agent by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "The ID of the agent to retrieve",
        },
      },
      required: ["id"],
    },
  },
];
