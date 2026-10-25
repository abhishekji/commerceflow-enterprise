import { FormEvent, useEffect, useRef, useState } from "react";
import { IconName } from "../../common/enums";
import { aiService, type ChatMessage } from "../../services";
import { errorMessage } from "../../utils/errors";
import { Icon } from "../Icon";
import "./ChatAssistant.scss";

const MAX_HISTORY = 20;
const GREETING = "Hi! Ask me about products, stock levels or your order metrics.";

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, sending, open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError("");
    setSending(true);
    try {
      const { reply } = await aiService.chat(next.slice(-MAX_HISTORY));
      setMessages([...next, { role: "assistant", content: reply || "I couldn't come up with an answer." }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-assistant">
      {open && (
        <section className="chat-window" aria-label="AI assistant">
          <header>
            <strong><Icon name={IconName.Sparkle} size={15} /> AI Assistant</strong>
            <button type="button" className="icon-button" aria-label="Close assistant" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="chat-log" role="log" aria-live="polite">
            <p className="chat-bubble assistant">{GREETING}</p>
            {messages.map((message, index) => (
              <p className={`chat-bubble ${message.role}`} key={index}>{message.content}</p>
            ))}
            {sending && <p className="chat-bubble assistant" role="status">Thinking…</p>}
            {error && <p className="chat-error" role="alert">{error}</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send}>
            <input
              aria-label="Message"
              placeholder="Ask a question…"
              value={input}
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>Send</button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="chat-fab"
        aria-label={open ? "Hide AI assistant" : "Open AI assistant"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name={IconName.Sparkle} size={22} />
      </button>
    </div>
  );
}
