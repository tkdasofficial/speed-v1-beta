// GitHub repository client — calls the Speed API Worker (tokens never reach the browser).
import type * as G from "../../../cloudflare/functions/api/github";
import { endpoint } from "./index";

export const githubRepos = endpoint<typeof G.githubRepos>("githubRepos");
export const getProjectRepo = endpoint<typeof G.getProjectRepo>("getProjectRepo");
export const linkProjectRepo = endpoint<typeof G.linkProjectRepo>("linkProjectRepo");
export const unlinkProjectRepo = endpoint<typeof G.unlinkProjectRepo>("unlinkProjectRepo");
export const verifyProjectRepo = endpoint<typeof G.verifyProjectRepo>("verifyProjectRepo");
