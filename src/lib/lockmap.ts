// lockmap.ts — Lock Mapping Studio on the unified spine (Phase 3).
//
// A lock map is a room-scoped drawer (tool_key=lock_mapping, scope=room). The room is a
// platform `experiences` record, resolved via the user's org membership; its venue is the
// parent `projects` record. On a brand-new map the document is seeded from the room's Story
// (experiences.title/theme/backstory/format/status) so it never starts blank. Replaces the
// retired per-user `lockmap_projects` table.

import pb from './pocketbase';
import type { LockMapProject, RoomStructure } from '../types/lockmap';
import { isGeneratedRoomPayload, seedFromGeneratedRoom, STATUS_TO_STAGE } from '../utils/seedFromGenerated';

type Rec = Record<string, unknown>;

/** A room the signed-in user can map, plus its raw Story fields for seeding. */
export interface RoomOption {
  id: string; // experiences record id
  title: string;
  experience: Rec;
}

/** The user's venue + its rooms, resolved from org membership. */
export interface RoomContext {
  orgId: string;
  venueId: string;
  rooms: RoomOption[];
}

const ROOM_STRUCTURES: RoomStructure[] = ['linear', 'semi-linear', 'open-world'];
const okStructure = (v: unknown): RoomStructure =>
  ROOM_STRUCTURES.includes(v as RoomStructure) ? (v as RoomStructure) : 'linear';

/**
 * Resolve the venue + rooms for the signed-in user: the first project under their first
 * active org membership, and that project's non-retired experiences. Mirrors venue.ts's
 * resolveVenue, extended to also return the rooms (room-scoped tools pick one).
 */
export async function resolveRoomContext(): Promise<RoomContext | null> {
  if (!pb.authStore.isValid) return null;
  const uid = pb.authStore.record?.id;
  if (!uid) return null;

  const memberships = await pb.collection('memberships').getFullList({
    filter: `user = '${uid}' && status = 'active'`,
    requestKey: null,
  });
  for (const m of memberships) {
    const orgId = m.organization as string;
    const projects = await pb.collection('projects').getFullList({
      filter: `organization = '${orgId}'`,
      requestKey: null,
    });
    const venue = projects[0];
    if (!venue) continue;

    const exps = await pb.collection('experiences').getFullList({
      filter: `project = '${venue.id}' && status != 'retired'`,
      requestKey: null,
    });
    const rooms: RoomOption[] = exps.map((e) => ({
      id: e.id as string,
      title: (e.title as string) || 'Untitled Room',
      experience: e as Rec,
    }));
    return { orgId, venueId: venue.id, rooms };
  }
  return null;
}

/**
 * Seed a fresh lock map from a room's Story so it never starts blank.
 * Rooms sent from the AI Room Generator carry their full generated document in
 * design_parameters — those seed complete zones, locks, and puzzle mappings.
 */
export function seedFromRoom(e: Rec): LockMapProject {
  if (isGeneratedRoomPayload(e.design_parameters)) {
    return seedFromGeneratedRoom(e.design_parameters.room, (e.status as string) || '');
  }

  return {
    id: crypto.randomUUID(),
    title: (e.title as string) ?? '',
    theme: (e.theme as string) || (e.premise as string) || '',
    tone: '',
    roomStructure: okStructure(e.format),
    targetAudience: '',
    designStage: STATUS_TO_STAGE[e.status as string] ?? '',
    zones: [],
    locks: [],
    puzzles: [],
  };
}

/**
 * Load the room's lock map drawer, or a Story-seeded blank if none exists yet.
 * One drawer per room (tool_key=lock_mapping, scope=room).
 */
export async function loadLockMap(room: RoomOption): Promise<LockMapProject> {
  try {
    const rec = await pb.collection('drawers').getFirstListItem(
      `tool_key = 'lock_mapping' && room = '${room.id}'`,
      { requestKey: null },
    );
    return rec.data as LockMapProject;
  } catch {
    return seedFromRoom(room.experience);
  }
}

/** Upsert the room's lock map drawer (one row per room). Returns the drawer record id. */
export async function saveLockMap(ctx: RoomContext, roomId: string, project: LockMapProject): Promise<string> {
  if (!pb.authStore.isValid) throw new Error('Must be signed in to save');

  const body = {
    tool_key: 'lock_mapping',
    scope_type: 'room',
    organization: ctx.orgId,
    venue: ctx.venueId,
    room: roomId,
    title: project.title || 'Untitled Lock Map',
    data: { ...project },
    status: 'active',
  };

  let existingId: string | null = null;
  try {
    const existing = await pb.collection('drawers').getFirstListItem(
      `tool_key = 'lock_mapping' && room = '${roomId}'`,
      { requestKey: null },
    );
    existingId = existing.id;
  } catch {
    existingId = null; // no drawer for this room yet
  }

  if (existingId) {
    await pb.collection('drawers').update(existingId, body, { requestKey: null });
    return existingId;
  }
  const created = await pb.collection('drawers').create({ ...body, version: 1 }, { requestKey: null });
  return created.id;
}
