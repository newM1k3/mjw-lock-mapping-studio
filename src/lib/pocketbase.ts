import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'https://mjwdesign-core.pockethost.io');

// TODO: save project to lockmap_projects collection
// export async function saveProject(project: LockMapProject) { ... }

// TODO: load projects from lockmap_projects collection
// export async function loadProjects() { ... }

// TODO: save generated audit to lockmap_audits collection
// export async function saveAudit(audit: LockMapAudit) { ... }

// TODO: support Hub token handoff via URL parameter `token`
// const params = new URLSearchParams(window.location.search);
// if (params.get('token')) pb.authStore.save(params.get('token')!, null);
