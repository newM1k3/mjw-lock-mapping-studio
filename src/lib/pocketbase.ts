import PocketBase from 'pocketbase';
import type { LockMapProject } from '../types/lockmap';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'https://immersive-kit.pockethost.io');

export interface SavedProjectMeta {
  id: string;          // PocketBase record ID
  externalId: string;  // LockMapProject.id
  title: string;
  savedAt: string;     // ISO string
  project: LockMapProject;
}

export async function saveProject(project: LockMapProject): Promise<string> {
  if (!pb.authStore.isValid) {
    throw new Error('Must be signed in to save projects');
  }

  const userId = pb.authStore.record?.id ?? '';
  const payload = { ...project };

  // Upsert: if a record with this external_id already exists, update it
  try {
    const existing = await pb.collection('lockmap_projects').getFirstListItem(
      `external_id = "${project.id}" && user_id = "${userId}"`,
      { requestKey: null }
    );
    await pb.collection('lockmap_projects').update(existing.id, { payload });
    return existing.id;
  } catch {
    // No existing record — create new
    const record = await pb.collection('lockmap_projects').create({
      external_id: project.id,
      user_id: userId,
      payload,
      archived: false,
    });
    return record.id;
  }
}

export async function loadProjects(): Promise<SavedProjectMeta[]> {
  if (!pb.authStore.isValid) return [];

  const userId = pb.authStore.record?.id ?? '';

  try {
    const records = await pb.collection('lockmap_projects').getList(1, 20, {
      filter: `user_id = "${userId}" && (archived = false || archived = null)`,
      sort: '-updated',
      requestKey: null,
    });

    return records.items.map((r) => ({
      id: r.id,
      externalId: r['external_id'] as string,
      title: (r['payload'] as LockMapProject)?.title ?? 'Untitled Project',
      savedAt: r['updated'] as string,
      project: r['payload'] as LockMapProject,
    }));
  } catch {
    return [];
  }
}
