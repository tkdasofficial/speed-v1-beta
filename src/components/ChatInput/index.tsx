import { ArrowUp, Check, ChevronDown, Mic, Plus, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const models = ["Free", "Balanced", "Power"];

/**
 * The single chat input box used by both the dashboard and the workspace.
 * Controlled when `value`/`onChange` are given, self-managed otherwise.
 */
export function ChatInput({ onSend, busy, onStop, value, onChange, placeholder = "Make, test, iterate..." }: { onSend: (text: string) => void; busy: boolean; onStop: () => void; value?: string; onChange?: (v: string) => void; placeholder?: string }) {
  const [inner, setInner] = useState("");
  const text = value ?? inner;
  const setText = (v: string) => { if (onChange) onChange(v); else setInner(v); };
  const [plan, setPlan] = useState(false);
  const [model, setModel] = useState(models[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const send = () => {
    if (!text.trim() || busy) return;
    onSend(plan ? `[Plan] ${text.trim()}` : text.trim());
    setText("");
    ref.current?.focus();
  };
  const canSend = !!text.trim() && !busy;

  return (
    <div className="rounded-[8px] border border-border bg-card p-2.5">
      <textarea
        ref={ref}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) { e.preventDefault(); send(); } }}
        placeholder={placeholder}
        aria-label="Message the agent"
        className="block max-h-40 w-full resize-none bg-transparent px-1 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none"
      />
      <div className="mt-2 flex items-center gap-1.5">
        <button type="button" aria-label="Add attachment" className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground"><Plus className="!h-4 !w-4" /></button>
        <button type="button" onClick={() => setPlan(!plan)} aria-pressed={plan} className={`flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border px-2 text-[13px] font-medium ${plan ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
          <span className={`grid h-4 w-4 place-items-center rounded-[3px] border ${plan ? "border-primary bg-primary" : "border-muted-foreground"}`}>{plan && <Check className="!h-3 !w-3" />}</span>
          Plan
        </button>
        <div className="relative">
          <button type="button" onClick={() => setModelOpen(!modelOpen)} aria-haspopup="listbox" aria-expanded={modelOpen} className="flex h-8 items-center gap-1 rounded-[6px] px-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            {model} <ChevronDown className="!h-3.5 !w-3.5" />
          </button>
          {modelOpen && (
            <div role="listbox" className="absolute bottom-10 left-0 z-30 w-40 rounded-[6px] border border-border bg-card p-1">
              {models.map((m) => (
                <button key={m} role="option" aria-selected={m === model} type="button" onClick={() => { setModel(m); setModelOpen(false); }} className="flex h-8 w-full items-center justify-between rounded-[5px] px-2 text-left text-[13px] hover:bg-accent">
                  {m} {m === model && <Check className="!h-3.5 !w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setListening(!listening)} aria-pressed={listening} aria-label="Voice input" className={`ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-[6px] ${listening ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}><Mic className="!h-4 !w-4" /></button>
        {busy ? (
          <button type="button" onClick={onStop} aria-label="Stop agent" className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-border text-foreground"><Square className="!h-3.5 !w-3.5" /></button>
        ) : (
          <button type="button" onClick={send} disabled={!canSend} aria-label="Send" className={`grid h-8 w-8 shrink-0 place-items-center rounded-[6px] ${canSend ? "bg-cta text-black" : "bg-accent text-muted-foreground/50"}`}><ArrowUp className="!h-4 !w-4" /></button>
        )}
      </div>
    </div>
  );
}
