import { ArrowDown, Bot, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionGroup } from "@/components/workspace/ActionGroup";
import { ChatInput } from "@/components/ChatInput";
import { scriptedRun, suggestions, uid, type ChatItem } from "@/lib/workspace-data";

export function ChatView({ items, setItems }: { items: ChatItem[]; setItems: React.Dispatch<React.SetStateAction<ChatItem[]>> }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  const toBottom = useCallback((smooth = true) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => { toBottom(false); }, [toBottom]);
  useEffect(() => { if (atBottom) toBottom(); }, [items, atBottom, toBottom]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const onScroll = () => {
    const el = scroller.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const send = (text: string) => {
    const run = scriptedRun(text);
    const statusId = uid();
    setBusy(true);
    setAtBottom(true);
    setItems((prev) => [...prev, { id: uid(), type: "user", text, time: "Just now" }, { id: statusId, type: "status", text: "Analyzing your project...", state: "running" }]);
    let t = 400;
    run.steps.forEach((step, si) => {
      const groupId = uid();
      t += 500;
      later(t, () => setItems((p) => [...p.filter((i) => i.id !== statusId), { id: uid(), type: "ai", text: step.message }, { id: statusId, type: "status", text: step.status, state: "running" }]));
      t += 500;
      later(t, () => setItems((p) => {
        const rest = p.filter((i) => i.id !== statusId);
        return [...rest, { id: groupId, type: "actions", actions: step.actions.map((a) => ({ ...a })) }, { id: statusId, type: "status", text: step.status, state: "running" }];
      }));
      step.actions.forEach((_, ai) => {
        const setStatus = (status: "running" | "done") => setItems((p) => p.map((i) => i.id === groupId && i.type === "actions" ? { ...i, actions: i.actions.map((a, k) => k === ai ? { ...a, status } : a) } : i));
        t += 300; later(t, () => setStatus("running"));
        t += 700; later(t, () => setStatus("done"));
      });
      if (si === run.steps.length - 1) {
        t += 500;
        later(t, () => {
          setItems((p) => [...p.filter((i) => i.id !== statusId), { id: uid(), type: "status", text: "Completed", state: "done" }, { id: uid(), type: "ai", text: run.outro }, { id: uid(), type: "checkpoint", text: "Checkpoint saved just now" }]);
          setBusy(false);
        });
      }
    });
  };

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setItems((p) => [...p.filter((i) => !(i.type === "status" && i.state === "running")).map((i) => i.type === "actions" ? { ...i, actions: i.actions.map((a) => a.status === "running" ? { ...a, status: "failed" as const } : a) } : i), { id: uid(), type: "status", text: "Stopped by you", state: "failed" }]);
    setBusy(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {items.length === 0 ? <EmptyChat onPick={send} /> : (
          <div className="mx-auto grid max-w-2xl gap-3 px-4 pb-6 pt-4">
            {items.map((item) => <Item key={item.id} item={item} />)}
          </div>
        )}
      </div>
      <div className="relative shrink-0 px-3 pb-2 pt-1">
        {!atBottom && items.length > 0 && (
          <button type="button" onClick={() => { toBottom(); setAtBottom(true); }} className="absolute -top-11 left-1/2 flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold shadow-lg">
            <ArrowDown className="!h-4 !w-4" /> Scroll to latest
          </button>
        )}
        <div className="mx-auto max-w-2xl"><ChatInput onSend={send} busy={busy} onStop={stop} /></div>
      </div>
    </div>
  );
}

function Item({ item }: { item: ChatItem }) {
  switch (item.type) {
    case "user":
      return (
        <div className="grid justify-items-end gap-1">
          <div className="max-w-[85%] whitespace-pre-wrap rounded-[16px] rounded-br-[6px] bg-primary px-4 py-2.5 shadow-[0_16px_40px_-22px_var(--primary)] text-[15px] leading-6 text-primary-foreground">{item.text}</div>
          <span className="text-[11px] text-muted-foreground">{item.time}</span>
        </div>
      );
    case "ai":
      return <p className="m-0 text-[15px] leading-6 text-foreground">{item.text}</p>;
    case "actions":
      return <ActionGroup actions={item.actions} />;
    case "status": {
      const Icon = item.state === "running" ? Loader2 : item.state === "failed" ? XCircle : Clock;
      return (
        <div className={`flex items-center gap-2 text-[13px] font-medium ${item.state === "running" ? "text-warning" : item.state === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
          <Icon className={`!h-4 !w-4 ${item.state === "running" ? "animate-spin" : ""}`} /> {item.text}
        </div>
      );
    }
    case "checkpoint":
      return (
        <div className="flex h-10 items-center gap-2 rounded-[12px] border border-border bg-gradient-to-b from-card to-background px-3 text-[13px] text-muted-foreground">
          <CheckCircle2 className="!h-4 !w-4" /> {item.text}
          <button type="button" className="ml-auto text-[12px] font-semibold text-foreground hover:underline">Rollback</button>
        </div>
      );
  }
}

function EmptyChat({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[10%] h-[320px] w-[140%] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_oklab,var(--primary)_30%,transparent),transparent_70%)] blur-[10px]" />
      <div className="relative grid h-12 w-12 place-items-center rounded-[12px] border border-primary/45 bg-primary/20"><Bot className="!h-5 !w-5" /></div>
      <h2 className="relative mb-2 mt-5 text-[26px] font-extrabold leading-tight tracking-[-0.03em]">New chat with Agent</h2>
      <p className="relative m-0 text-[15px] leading-relaxed text-muted-foreground">Describe what to build or change. The agent reads your project, makes edits and tests them.</p>
      <div className="relative mt-7 grid w-full gap-2">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className="flex h-12 items-center rounded-[14px] border border-border bg-gradient-to-b from-card to-background px-4 text-left text-[14px] font-semibold transition hover:-translate-y-0.5 hover:border-primary">{s}</button>
        ))}
      </div>
    </div>
  );
}
