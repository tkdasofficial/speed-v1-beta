// GitHub repository RPCs: authenticate → authorize project → GitHub client (tokens stay server-side).
import { z } from "zod";

async function base() {
  const { requireUser, assertOwnsProject, AuthError } = await import("@security/authorize.server");
  const gh = await import("../github/client.server");
  const { d1 } = await import("@backend/d1");
  const me = await requireUser();
  const wrap = async <T>(f: () => Promise<T>) => {
    try { return await f(); }
    catch (e) { if (e instanceof gh.GithubError) throw new AuthError(e.code === "reconnect" ? 401 : e.code === "not_found" ? 404 : 403, e.message); throw e; }
  };
  return { me, assertOwnsProject, gh, d1, wrap };
}

export async function githubRepos() {
  const { me, gh, wrap } = await base();
  return wrap(() => gh.listRepos(me.id));
}

type LinkRow = { github_repo_id: number; owner: string; name: string; full_name: string; default_branch: string; private: number; verified_at: string | null };
const toLink = (r: LinkRow) => ({ id: r.github_repo_id, owner: r.owner, name: r.name, fullName: r.full_name, defaultBranch: r.default_branch, private: !!r.private, verifiedAt: r.verified_at });

export async function getProjectRepo(raw: unknown) {
  const { projectId } = z.object({ projectId: z.string().min(1) }).parse(raw);
  const { me, assertOwnsProject, d1 } = await base();
  await assertOwnsProject(me.id, projectId);
  const r = (await d1<LinkRow>("SELECT * FROM project_repos WHERE project_id = ?", [projectId]))[0];
  return r ? toLink(r) : null;
}

export async function linkProjectRepo(raw: unknown) {
  const { projectId, repoId } = z.object({ projectId: z.string().min(1), repoId: z.number().int().positive() }).parse(raw);
  const { me, assertOwnsProject, gh, d1, wrap } = await base();
  await assertOwnsProject(me.id, projectId);
  const repo = gh.toRepo(await wrap(() => gh.gh<import("../github/client.server").RawRepo>(me.id, `/repositories/${repoId}`)));
  await d1(
    `INSERT INTO project_repos (project_id, user_id, github_repo_id, owner, name, full_name, default_branch, private, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(project_id) DO UPDATE SET user_id=excluded.user_id, github_repo_id=excluded.github_repo_id, owner=excluded.owner, name=excluded.name,
       full_name=excluded.full_name, default_branch=excluded.default_branch, private=excluded.private, verified_at=excluded.verified_at`,
    [projectId, me.id, repo.id, repo.owner, repo.name, repo.fullName, repo.defaultBranch, repo.private ? 1 : 0],
  );
  return getProjectRepo({ projectId });
}

export async function unlinkProjectRepo(raw: unknown) {
  const { projectId } = z.object({ projectId: z.string().min(1) }).parse(raw);
  const { me, assertOwnsProject, d1 } = await base();
  await assertOwnsProject(me.id, projectId);
  await d1("DELETE FROM project_repos WHERE project_id = ?", [projectId]);
  return { ok: true };
}

/** Confirms the linked repository is still reachable with the user's current GitHub authorization. */
export async function verifyProjectRepo(raw: unknown) {
  const { projectId } = z.object({ projectId: z.string().min(1) }).parse(raw);
  const { me, assertOwnsProject, gh, d1 } = await base();
  await assertOwnsProject(me.id, projectId);
  const link = (await d1<LinkRow>("SELECT * FROM project_repos WHERE project_id = ?", [projectId]))[0];
  if (!link) return { ok: false as const, error: "No repository connected" };
  try {
    const repo = gh.toRepo(await gh.gh<import("../github/client.server").RawRepo>(me.id, `/repositories/${link.github_repo_id}`));
    await d1("UPDATE project_repos SET full_name = ?, owner = ?, name = ?, default_branch = ?, private = ?, verified_at = datetime('now') WHERE project_id = ?",
      [repo.fullName, repo.owner, repo.name, repo.defaultBranch, repo.private ? 1 : 0, projectId]);
    return { ok: true as const, canPush: repo.canPush, fullName: repo.fullName };
  } catch (e) {
    if (e instanceof gh.GithubError) return { ok: false as const, code: e.code, error: e.message };
    throw e;
  }
}
