import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';
import {
  AUDIT_STORE,
  SYSTEM_PROMPT,
  formatProject,
  sanitiseCards,
  sanitiseConflicts,
  type AuditJob,
} from './_lockmapAudit';

// Background worker ("-background" suffix → 15-minute budget). Netlify replies
// 202 to the caller immediately; all outcomes are reported via the job blob.
export default async (req: Request) => {
  const store = getStore(AUDIT_STORE);
  let jobId: string | undefined;

  try {
    const body = await req.json().catch(() => ({})) as { jobId?: unknown };
    jobId = typeof body.jobId === 'string' && body.jobId.trim() ? body.jobId.trim() : undefined;
    if (!jobId) {
      console.error('generate-lockmap-background invoked without jobId');
      return;
    }

    const job = await store.get(jobId, { type: 'json' }) as AuditJob | null;
    if (!job || job.status !== 'pending') {
      console.error('generate-lockmap-background received unknown or non-pending job', { jobId, status: job?.status });
      return;
    }

    await store.setJSON(jobId, { ...job, status: 'processing' } satisfies AuditJob);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      // Headroom matters: 4 conflicts + 8 verbose cards can exceed 6k tokens,
      // and a truncated response fails JSON.parse below.
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Deepen the lock mapping audit for this room:\n\n${formatProject(job.project, job.localConflicts)}`,
        },
      ],
    });

    if (message.stop_reason === 'max_tokens') {
      throw new Error('AI response was truncated at the output token limit');
    }

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    let rawJson = textContent.text.trim();
    rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const firstBrace = rawJson.indexOf('{');
    const lastBrace = rawJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      rawJson = rawJson.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    const conflicts = sanitiseConflicts(parsed.conflicts, job.project);
    const implementationCards = sanitiseCards(parsed.implementationCards, job.project);

    if (conflicts.length === 0 && implementationCards.length === 0) {
      throw new Error('AI response contained no valid conflicts or cards');
    }

    await store.setJSON(jobId, {
      ...job,
      status: 'complete',
      result: {
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        conflicts,
        implementationCards,
      },
    } satisfies AuditJob);
  } catch (err) {
    console.error('AI lock map audit failed:', { jobId, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
    if (jobId) {
      const existing = await store.get(jobId, { type: 'json' }).catch(() => null) as AuditJob | null;
      if (existing) {
        const debug = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        await store.setJSON(jobId, { ...existing, status: 'failed', error: 'AI audit failed. Please try again.', debug } satisfies AuditJob).catch((writeErr) => {
          console.error('Failed to record audit job failure', { jobId, writeErr });
        });
      }
    }
  }
};
