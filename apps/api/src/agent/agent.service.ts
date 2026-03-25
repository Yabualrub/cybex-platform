import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantServicesService } from '../tenant-services/tenant-services.service';

type UserPayload = { sub: string; tenantId: string; email?: string; role?: string };

@Injectable()
export class AgentService {
  constructor(
    private prisma: PrismaService,
    private readonly tenantServices: TenantServicesService,
  ) {}

  private async requireAgentEnabled(tenantId: string) {
    // ✅ feature gate
    await this.tenantServices.requireEnabled(tenantId, 'ai_agent');
  }

  async getSettings(tenantId: string) {
    await this.requireAgentEnabled(tenantId);

    const existing = await this.prisma.agentSettings.findUnique({ where: { tenantId } });
    if (existing) return existing;

    return this.prisma.agentSettings.create({
      data: { tenantId },
    });
  }

  async updateSettings(tenantId: string, patch: any) {
    await this.requireAgentEnabled(tenantId);

    const data: any = {};
    if (typeof patch.displayName === 'string') data.displayName = patch.displayName;

    // optional
    if (typeof patch.language === 'string') data.language = patch.language;

    if (typeof patch.tone === 'string') data.tone = patch.tone;
    if (patch.businessInfo !== undefined) data.businessInfo = patch.businessInfo;
    if (patch.hours !== undefined) data.hours = patch.hours;
    if (patch.rules !== undefined) data.rules = patch.rules;

    return this.prisma.agentSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }

  // ✅ per-user isolation
  async listConversations(tenantId: string, user: UserPayload) {
    await this.requireAgentEnabled(tenantId);

    return this.prisma.agentConversation.findMany({
      where: { tenantId, ownerUserId: user.sub },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        channel: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
        languagePreference: true,
      },
    });
  }

  async createConversation(
    tenantId: string,
    user: UserPayload,
    input?: { channel?: string; subject?: string; languagePreference?: string },
  ) {
    await this.requireAgentEnabled(tenantId);

    return this.prisma.agentConversation.create({
      data: {
        tenantId,
        ownerUserId: user.sub,
        channel: (input?.channel as any) ?? 'WEB',
        subject: input?.subject ?? 'Website Chat',
        languagePreference: input?.languagePreference ?? null,
      },
      select: {
        id: true,
        channel: true,
        subject: true,
        createdAt: true,
        updatedAt: true,
        languagePreference: true,
      },
    });
  }

  async getMessages(tenantId: string, user: UserPayload, conversationId: string) {
    await this.requireAgentEnabled(tenantId);

    const convo = await this.prisma.agentConversation.findFirst({
      where: { id: conversationId, tenantId, ownerUserId: user.sub },
      select: { id: true },
    });
    if (!convo) throw new NotFoundException('Conversation not found');

    return this.prisma.agentMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    });
  }

  async deleteConversation(tenantId: string, user: UserPayload, conversationId: string) {
    await this.requireAgentEnabled(tenantId);

    const convo = await this.prisma.agentConversation.findFirst({
      where: { id: conversationId, tenantId, ownerUserId: user.sub },
      select: { id: true },
    });

    if (!convo) throw new NotFoundException('Conversation not found');

    await this.prisma.agentConversation.delete({
      where: { id: conversationId },
    });

    return { ok: true };
  }

  async sendMessage(tenantId: string, user: UserPayload, conversationId: string, content: string) {
    await this.requireAgentEnabled(tenantId);

    if (!content?.trim()) throw new BadRequestException('content is required');

    const convo = await this.prisma.agentConversation.findFirst({
      where: { id: conversationId, tenantId, ownerUserId: user.sub },
      select: { id: true, languagePreference: true },
    });
    if (!convo) throw new NotFoundException('Conversation not found');

    const settings = await this.getSettings(tenantId);

    // save user msg
    await this.prisma.agentMessage.create({
      data: {
        conversationId,
        role: 'user',
        content,
        createdByUserId: user?.sub ?? null,
      },
    });

    // take last 20 msgs
    const history = await this.prisma.agentMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { role: true, content: true },
    });

    // ✅ language per-conversation (fallback to settings.language)
    const systemPrompt = buildSystemPrompt(settings, convo.languagePreference);

    // ✅ لو ما بدك OpenAI هسا: رح يرجع fallback بدون ما يكسر
    const assistantText = await callOpenAI(systemPrompt, history);

    const saved = await this.prisma.agentMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantText,
      },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    await this.prisma.agentConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return saved;
  }
}

function buildSystemPrompt(settings: any, conversationLanguage?: string | null) {
  const name = settings.displayName ?? 'AI Agent';
  const tone = settings.tone ?? 'professional';

  // ✅ prefer conversation language, fallback to settings language, then 'en'
  const language = conversationLanguage ?? settings.language ?? 'en';

  return `
You are ${name}, an AI assistant for a business.
Language: ${language}
Tone: ${tone}

BusinessInfo (JSON): ${JSON.stringify(settings.businessInfo ?? {})}
Hours (JSON): ${JSON.stringify(settings.hours ?? {})}
Rules (JSON): ${JSON.stringify(settings.rules ?? {})}

If unsure, ask a short clarifying question.
Keep replies helpful and concise.
  `.trim();
}

async function callOpenAI(systemPrompt: string, history: Array<{ role: string; content: string }>) {
  const apiKey = process.env.OPENAI_API_KEY;

  // ✅ fallback (no errors) لو ما حطيت key لسه
  if (!apiKey) {
    return 'AI is not connected yet (missing OPENAI_API_KEY).';
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as any, content: m.content })),
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('OPENAI_ERROR_STATUS', res.status);
    console.error('OPENAI_ERROR_BODY', text);
    return `OpenAI error: ${text}`;
  }

  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? 'No response';
}
