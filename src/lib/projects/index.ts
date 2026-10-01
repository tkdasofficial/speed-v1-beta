export const projectSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const known = [
  "WebsiteToApk", "Hyper Copilot", "Stellar Dashboard", "Pulse Commerce", "Nexus API",
  "hyper-copilot-sandbox", "Clone hyper copilot sandbox", "hyper-copilot-sandbox-1", "elite-veo",
];

export const projectName = (id: string) => known.find((n) => projectSlug(n) === id) ?? id;
