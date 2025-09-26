import { useEffect, useRef, useState } from "react";
import { Search, Bell, MoreHorizontal, Paperclip, Smile, Send } from "lucide-react";
import { USERS } from "../../data/mock";
import { clsx, formatTime } from "../../utils";
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
  const [activeId, setActiveId] = useState<string>(threads[0]?.id ?? "");
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

  const lastTimestamp = (thread: Thread) => thread.messages[thread.messages.length - 1]?.ts ?? Date.now();

  return (
    <div className="dmShell">
      <aside className="sidebar">
        <div className="sidebar__search">
          <Search size={16} />
          <input className="input" placeholder="Search DMs" />
        </div>
        <div>
          {threads.map(t => {
            const u = USERS.find(x => x.id === t.participantId)!;
            return (
              <button
                key={t.id}
                className={clsx("thread", activeId === t.id && "thread--active")}
                onClick={() => setActiveId(t.id)}
              >
                <img className="avatar" src={u.avatar} alt={u.name} />
                <div className="thread__content">
                  <div className="thread__row">
                    <div className="thread__name">{u.name}</div>
                    <div className="thread__time">{formatTime(lastTimestamp(t))}</div>
                  </div>
                  <div className="thread__sub">
                    {t.last}
                    {t.unread && <span className="dot" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="chat">
        <div className="chat__top">
          <div className="row gap8">{activeThread && <UserChip userId={activeThread.participantId} />}</div>
          <div className="row gap8 muted">
            <Bell size={16} />
            <MoreHorizontal size={16} />
          </div>
        </div>
        <div className="chat__log">
          {activeThread?.messages.map(m => {
            const mine = m.from === "me";
            return (
              <div key={m.id} className={clsx("bubble", mine ? "bubble--me" : "bubble--them")}>
                <div className="bubble__text">{m.text}</div>
                <time>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </div>
            );
          })}
          {typing && (
            <div className="bubble bubble--them">
              <span className="typing">
                <i></i>
                <i></i>
                <i></i>
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="chat__composer">
          <button className="btn btn--ghost btn--circle" aria-label="attach">
            <Paperclip size={18} />
          </button>
          <button className="btn btn--ghost btn--circle" aria-label="emoji">
            <Smile size={18} />
          </button>
          <input
            className="input"
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
          <button className="btn" onClick={sendMessage}>
            <Send size={16} /> Send
          </button>
        </div>
      </section>
    </div>
  );
}
