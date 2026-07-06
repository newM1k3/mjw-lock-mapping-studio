import { getStore } from '@netlify/blobs';
import { AUDIT_STORE, jsonRes, type AuditJob } from './_lockmapAudit';

// Polled by the Risk Audit panel while generate-lockmap-background works.
// The jobId is an unguessable UUID handed only to the client that queued it.
export default async (req: Request) => {
  if (req.method !== 'GET') {
    return jsonRes(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const jobId = new URL(req.url).searchParams.get('jobId')?.trim();
  if (!jobId) {
    return jsonRes(400, { error: 'jobId query parameter is required.' });
  }

  const store = getStore(AUDIT_STORE);
  const job = await store.get(jobId, { type: 'json' }) as AuditJob | null;
  if (!job) {
    return jsonRes(404, { error: 'Unknown audit job.' });
  }

  return jsonRes(200, {
    status: job.status,
    ...(job.status === 'complete' ? { result: job.result } : {}),
    ...(job.status === 'failed' ? { error: job.error || 'AI audit failed. Please try again.' } : {}),
  }, {
    'Cache-Control': 'no-store',
  });
};
