// import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import InputField from "../ui/InputField";
import { useEffect, useRef, useState } from "react";
import { Search, Bell, MoreHorizontal, Paperclip, Smile, Send } from "lucide-react";
import { clsx } from "../../utils";
// import { clsx, formatTime } from "../../utils";
import UserChip from "../ui/UserChip";
import type { DM, Thread } from "../../types";

export default function Messages() {
  const [threads, setThreads] = useState<Thread[]>([
    {
      id: "t1",
      participantId: "u2",
      last: "Let's iterate on the UI after lunch.",
      unread: true,
      messages: [
        { id: "m1", from: "u2", text: "Morning! Pushing a new branch.", ts: Date.now() - 1000 * 60 * 60 * 4 },
        { id: "m2", from: "me", text: "Nice! I'll pull and test.", ts: Date.now() - 1000 * 60 * 60 * 3.8 },
        { id: "m3", from: "u2", text: "Let's iterate on the UI after lunch.", ts: Date.now() - 1000 * 60 * 60 * 1.2 },
      ],
    },
    {
      id: "t2",
      participantId: "u3",
      last: "Remember to add optimistic updates.",
      messages: [
        { id: "m1", from: "u3", text: "Queue or cache for offline mode?", ts: Date.now() - 1000 * 60 * 120 },
        { id: "m2", from: "me", text: "Cache first, then sync.", ts: Date.now() - 1000 * 60 * 118 },
      ],
    },
  ]);
  const [activeId] = useState<string>(threads[0]?.id ?? "");
  // const [activeId, setActiveId] = useState<string>(threads[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const activeThread = threads.find(t => t.id === activeId);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, activeThread?.messages.length]);

  useEffect(() => {
    setThreads(prev => prev.map(t => (t.id === activeId ? { ...t, unread: false } : t)));
  }, [activeId]);

  const sendMessage = () => {
    if (!draft.trim() || !activeThread) return;
    const msg: DM = { id: `m_${Date.now()}`, from: "me", text: draft.trim(), ts: Date.now() };
    setThreads(prev =>
      prev.map(t =>
        t.id === activeThread.id ? { ...t, unread: false, messages: [...t.messages, msg], last: msg.text } : t
      )
    );
    setDraft("");
  };

  // const lastTimestamp = (thread: Thread) => thread.messages[thread.messages.length - 1]?.ts ?? Date.now();

  return (
    <div className="grid h-[calc(100vh-1rem)] w-[calc(100vw-12.5rem)] rounded-xl border border-border dark:border-border-dark overflow-hidden small:grid-cols-1 m-2 ml-0" style={{ gridTemplateColumns: "320px minmax(420px, 1fr)" }}>
      <aside className="border-r border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
        <div className="sticky top-0 bg-transparent p-2.5 flex gap-2">
          <Search size={20} className="my-2" />
          <InputField className="input bg-muted dark:bg-muted-dark" placeholder="Search DMs" />
        </div>
        {/* <div>
          {threads.map(t => {
            const u = USERS.find(x => x.id === t.participantId)!;
            return (
              <div
                key={t.id}
                className={
                  `thread transition hover:bg-muted dark:hover:bg-muted-dark border-b-1 ${
                    activeId === t.id
                      ? "bg-muted dark:bg-muted-dark border-l-8 border-accent dark:border-accent"
                      : "border-border dark:border-border-dark"
                  }`
                }
                onClick={() => setActiveId(t.id)}
              >
                <Avatar src={u.avatar} alt={u.name} />
                <div className="thread__content">
                  <div className="thread__row">
                    <div className="text-text dark:text-text-dark font-bold">{u.name}</div>
                    <div className="thread__time text-sub dark:text-sub-dark">{formatTime(lastTimestamp(t))}</div>
                  </div>
                  <div className="thread__sub text-sub dark:text-sub-dark">
                    {t.last}
                    {t.unread && <span className="dot" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div> */}
      </aside>

      <section className="flex flex-col bg-transparent overflow-auto">
        <div className="sticky top-0 p-3 flex items-center justify-between bg-panel dark:bg-panel-dark border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2">{activeThread && <UserChip fullName={activeThread.participantId} avatar={""} handle={""} />}</div>
          <div className="flex items-center gap-2 text-sub dark:text-sub-dark">
            <Bell size={16} />
            <MoreHorizontal size={16} />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-2.5 bg-[linear-gradient(180deg,#dadada_0%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#12141a_0%,#090a0d_100%)]">
          {activeThread?.messages.map(m => {
            const mine = m.from === "me";
            return (
              <div key={m.id} className={clsx("max-w-[70%] py-2.5 px-3 text-sm rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.2)]", mine ? "self-end bg-accent text-white" : "self-start bg-muted dark:bg-muted-dark text-text dark:text-text-dark")}>
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                <time className="block mt-1 opacity-75 text-[10px]">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </div>
            );
          })}
          {typing && (
            <div className="max-w-[70%] py-2.5 px-3 text-sm rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.2)] self-end">
              <span className="inline-flex gap-1">
                <i className="w-1.5 h-1.5 rounded-full bg-[#bbb] inline-block animate-[blip_1s_infinite]"></i>
                <i className="w-1.5 h-1.5 rounded-full bg-[#bbb] inline-block animate-[blip_1s_infinite_0.15s]"></i>
                <i className="w-1.5 h-1.5 rounded-full bg-[#bbb] inline-block animate-[blip_1s_infinite_0.3s]"></i>
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="p-2.5 flex gap-2">
          <GenericButton className="inline-flex gap-2 items-center justify-center bg-transparent border-t border-border dark:border-border-dark text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark h-[40px] w-[40px] p-0 cursor-pointer" aria-label="attach">
            <Paperclip size={18} />
          </GenericButton>
          <GenericButton className="inline-flex gap-2 items-center justify-center bg-transparent text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark h-[40px] w-[40px] p-0 cursor-pointer" aria-label="emoji">
            <Smile size={18} />
          </GenericButton>
          <InputField
            className="input bg-muted dark:bg-muted-dark"
            placeholder="Message..."
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              setTyping(true);
              if (e.key === "Enter") {
                setTyping(false);
                sendMessage();
              }
            }}
            onBlur={() => setTyping(false)}
          />
          <GenericButton className="inline-flex gap-2 items-center justify-center h-9 px-3 bg-accent text-white cursor-pointer" onClick={sendMessage}>
            <Send size={16} /> Send
          </GenericButton>
        </div>
      </section>
    </div>
  );
}
