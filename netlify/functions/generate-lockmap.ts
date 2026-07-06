import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type { LockMapProject, LockMappingConflict } from '../../src/types/lockmap';
import { AUDIT_STORE, CORS_HEADERS, jsonRes, type AuditJob } from './_lockmapAudit';

// Queues an AI audit job and returns 202 + jobId immediately. The Anthropic
// call runs in generate-lockmap-background (15-minute budget) because it
// routinely exceeds Netlify's 26-second synchronous function limit.
export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonRes(405, { error: 'Method not allowed' }, { Allow: 'POST, OPTIONS' });
  }

  try {
    const { project, localConflicts } = await req.json().catch(() => ({})) as {
      project?: LockMapProject;
      localConflicts?: LockMappingConflict[];
    };

    if (!project || !Array.isArray(project.locks) || !Array.isArray(project.puzzles)) {
      return jsonRes(400, { error: 'Request body must include a lock map project' });
    }
    if (project.locks.length === 0) {
      return jsonRes(400, { error: 'Add at least one lock before running the AI audit' });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonRes(503, { error: 'AI audit is not configured on this deployment' });
    }

    const jobId = randomUUID();
    const store = getStore(AUDIT_STORE);
    const job: AuditJob = {
      status: 'pending',
      createdAt: new Date().toISOString(),
      project,
      localConflicts: Array.isArray(localConflicts) ? localConflicts : [],
    };
    await store.setJSON(jobId, job);

    // Prefer the live request origin: env.URL is baked at deploy time and goes
    // stale when the site's domain changes (as in the suite-wide rebrand).
    const origin = new URL(req.url).origin || process.env.URL;
    const invokeResponse = await fetch(new URL('/.netlify/functions/generate-lockmap-background', origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });

    if (invokeResponse.status !== 202) {
      await store.setJSON(jobId, { ...job, status: 'failed', error: 'AI audit could not be started. Please try again.' });
      return jsonRes(502, { error: `AI audit could not be started (HTTP ${invokeResponse.status}).` });
    }

    return jsonRes(202, { jobId, status: 'pending' });
  } catch (err) {
    console.error('Error queuing AI lock map audit:', err);
    return jsonRes(500, { error: 'AI audit failed. Please try again.' });
  }
};
