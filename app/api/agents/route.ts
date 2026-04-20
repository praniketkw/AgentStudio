import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const profileId = req.nextUrl.searchParams.get("profileId");
    const agents = await prisma.agent.findMany({
      where: profileId ? { profileId } : undefined,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(agents);
  } catch {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, systemPrompt, model, tools, knowledgeSources, profileId } = body;

    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: "name and systemPrompt are required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        description: description ?? "",
        systemPrompt,
        model: model || "claude-sonnet-4-6",
        tools: tools || [],
        knowledgeSources: knowledgeSources || [],
        profileId: profileId || null,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
