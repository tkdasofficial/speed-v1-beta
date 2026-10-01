export type ActionKind = "read" | "search" | "edit" | "create" | "run" | "asset" | "test" | "inspect" | "fix" | "think";
export type ActionStatus = "done" | "running" | "failed" | "pending";
export type AgentAction = { id: string; kind: ActionKind; title: string; target?: string | undefined; status: ActionStatus };

export type ChatItem =
  | { id: string; type: "user"; text: string; time: string }
  | { id: string; type: "ai"; text: string }
  | { id: string; type: "actions"; actions: AgentAction[] }
  | { id: string; type: "status"; text: string; state: "running" | "done" | "failed" }
  | { id: string; type: "checkpoint"; text: string };

let n = 0;
export const uid = () => `i${Date.now().toString(36)}${(n++).toString(36)}`;
const a = (kind: ActionKind, title: string, target?: string, status: ActionStatus = "done"): AgentAction => ({ id: uid(), kind, title, target, status });

export const seedChat = (): ChatItem[] => [
  { id: uid(), type: "user", text: "Turn my landing page into a mobile app with a login screen and a dashboard.", time: "2h ago" },
  { id: uid(), type: "ai", text: "I'll convert your landing page into a mobile-first app. First I'll read the existing files and plan the structure." },
  { id: uid(), type: "actions", actions: [a("search", "Searched project", "landing page"), a("read", "Read file", "index.html"), a("think", "Planned the implementation")] },
  { id: uid(), type: "ai", text: "I understand the layout now. Next I'll create the login screen, the dashboard and shared navigation." },
  { id: uid(), type: "actions", actions: [a("read", "Read file", "index.css"), a("read", "Opened component", "Header.tsx"), a("create", "Created file", "Login.tsx"), a("create", "Created file", "Dashboard.tsx"), a("edit", "Edited file", "App.tsx"), a("asset", "Generated asset", "app-icon.png")] },
  { id: uid(), type: "ai", text: "The screens are in place. Running checks to make sure everything works." },
  { id: uid(), type: "actions", actions: [a("run", "Ran check", "type check", "failed"), a("fix", "Fixed issue", "Dashboard.tsx"), a("run", "Ran check", "type check"), a("test", "Tested application"), a("inspect", "Inspected preview", "/login")] },
  { id: uid(), type: "status", text: "Worked for 2 minutes", state: "done" },
  { id: uid(), type: "ai", text: "Done. Your app now has a login screen and a dashboard. Open the preview to try it." },
  { id: uid(), type: "checkpoint", text: "Checkpoint saved 2h ago" },
  { id: uid(), type: "user", text: "Check my app for bugs and fix anything broken.", time: "10m ago" },
  { id: uid(), type: "ai", text: "I'll scan the whole project for problems. Starting with the main screens." },
  { id: uid(), type: "actions", actions: [a("search", "Searched project", "src/")] },
  { id: uid(), type: "ai", text: "Let me read the screens that handle login and data." },
  { id: uid(), type: "actions", actions: [a("read", "Read file", "Login.tsx"), a("read", "Read file", "Dashboard.tsx"), a("read", "Read file", "App.tsx"), a("read", "Read file", "Header.tsx")] },
  { id: uid(), type: "ai", text: "Running the checks to see what fails." },
  { id: uid(), type: "actions", actions: [a("run", "Ran check", "type check", "failed"), a("test", "Tested application", undefined, "failed")] },
  { id: uid(), type: "ai", text: "Found 2 bugs: the login button doesn't submit, and the dashboard crashes with an empty list. Fixing both." },
  { id: uid(), type: "actions", actions: [a("inspect", "Inspected error", "Login.tsx"), a("fix", "Fixed bug", "Login.tsx"), a("inspect", "Inspected error", "Dashboard.tsx"), a("fix", "Fixed bug", "Dashboard.tsx"), a("create", "Created file", "Empty.tsx"), a("edit", "Edited file", "Dashboard.tsx")] },
  { id: uid(), type: "ai", text: "Checking again." },
  { id: uid(), type: "actions", actions: [a("run", "Ran check", "type check"), a("test", "Tested application"), a("inspect", "Inspected preview", "/dashboard")] },
  { id: uid(), type: "status", text: "Worked for 3 minutes", state: "done" },
  { id: uid(), type: "ai", text: "All fixed. Login works and the dashboard shows a friendly empty state. No errors left." },
  { id: uid(), type: "checkpoint", text: "Checkpoint saved 8m ago" },
];

/** Pool of loop rounds; each round = one AI message followed by one actions card. */
const roundPool: { message: string; status: string; actions: [ActionKind, string, string?][] }[] = [
  { message: "Let me look at the relevant files first.", status: "Analyzing your project...", actions: [["search", "Searched project", "src/"], ["read", "Read file", "App.tsx"], ["read", "Read file", "Header.tsx"], ["think", "Planned the change"]] },
  { message: "I understand the structure. Now I'll make the changes.", status: "Building the change...", actions: [["edit", "Edited file", "App.tsx"], ["create", "Created file", "Feature.tsx"], ["edit", "Edited file", "index.css"]] },
  { message: "Let me check the build for errors.", status: "Checking the build...", actions: [["run", "Ran check", "type check"]] },
  { message: "Found a small issue. Fixing it now.", status: "Fixing issues...", actions: [["inspect", "Inspected error", "Feature.tsx"], ["fix", "Fixed bug", "Feature.tsx"], ["run", "Ran check", "type check"]] },
  { message: "Adding the finishing touches to the screens.", status: "Polishing the UI...", actions: [["edit", "Edited file", "Dashboard.tsx"], ["edit", "Edited file", "Login.tsx"], ["asset", "Generated image", "hero.png"], ["edit", "Edited file", "Button.tsx"], ["create", "Created file", "Empty.tsx"]] },
  { message: "Now I'll test the app to make sure everything works.", status: "Testing the application...", actions: [["test", "Tested application"], ["inspect", "Inspected preview", "/"]] },
];

const pick = <T,>(arr: T[], n: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Scripted agent run: an unbounded Message → Actions loop with variable rounds and actions per card. */
export const scriptedRun = (prompt: string) => {
  const short = prompt.length > 40 ? `${prompt.slice(0, 40)}…` : prompt;
  const first = roundPool[0]!, last = roundPool[roundPool.length - 1]!;
  const middle = pick(roundPool.slice(1, -1), rand(1, roundPool.length - 2));
  const rounds = [first, ...middle, last].map((r, i) => ({
    message: i === 0 ? `I'll work on "${short}". ${r.message}` : r.message,
    status: r.status,
    actions: pick(r.actions, rand(1, r.actions.length)).map(([k, t, tg]) => a(k, t, tg, "pending")),
  }));
  return {
    steps: rounds,
    outro: "Completed. The change is ready — open the preview to check it, or tell me what to adjust.",
  };
};

export const suggestions = ["Check my app for bugs", "Add payment processing", "Connect an AI assistant", "Add SMS message sending", "Add a database", "Add user login"];

export type Task = { id: string; title: string; desc: string; status: "ready" | "active" | "draft"; progress?: number | undefined };
export const seedTasks: Task[] = [
  { id: "t1", title: "Add dark mode toggle", desc: "Settings switch with saved preference.", status: "ready" },
  { id: "t2", title: "Connect checkout", desc: "Card payments on the pricing page.", status: "active", progress: 62 },
  { id: "t3", title: "Write onboarding flow", desc: "Three-step welcome for new users.", status: "draft" },
  { id: "t4", title: "Improve page speed", desc: "Compress images and lazy-load lists.", status: "draft" },
];

export type FileNode = { name: string; path: string; type: "folder" | "file"; children?: FileNode[] };
export const fileTree: FileNode[] = [
  { name: "src", path: "src", type: "folder", children: [
    { name: "components", path: "src/components", type: "folder", children: [
      { name: "Header.tsx", path: "src/components/Header.tsx", type: "file" },
      { name: "Button.tsx", path: "src/components/Button.tsx", type: "file" },
    ] },
    { name: "screens", path: "src/screens", type: "folder", children: [
      { name: "Login.tsx", path: "src/screens/Login.tsx", type: "file" },
      { name: "Dashboard.tsx", path: "src/screens/Dashboard.tsx", type: "file" },
    ] },
    { name: "App.tsx", path: "src/App.tsx", type: "file" },
    { name: "index.css", path: "src/style/index.css", type: "file" },
  ] },
  { name: "public", path: "public", type: "folder", children: [{ name: "app-icon.png", path: "public/app-icon.png", type: "file" }] },
  { name: "package.json", path: "package.json", type: "file" },
  { name: "README.md", path: "README.md", type: "file" },
];

export const fileContents: Record<string, string> = {
  "src/App.tsx": `import { Login } from "./screens/Login";\nimport { Dashboard } from "./screens/Dashboard";\n\nexport default function App() {\n  const user = useSession();\n  return user ? <Dashboard user={user} /> : <Login />;\n}`,
  "src/screens/Login.tsx": `export function Login() {\n  return (\n    <form className="login">\n      <input type="email" placeholder="Email" />\n      <input type="password" placeholder="Password" />\n      <button>Sign in</button>\n    </form>\n  );\n}`,
  "src/screens/Dashboard.tsx": `export function Dashboard({ user }) {\n  return (\n    <main>\n      <h1>Welcome, {user.name}</h1>\n      <Stats />\n    </main>\n  );\n}`,
};

export const changedFiles = [
  { path: "src/screens/Dashboard.tsx", change: "M" },
  { path: "src/screens/Login.tsx", change: "A" },
  { path: "src/App.tsx", change: "M" },
];
