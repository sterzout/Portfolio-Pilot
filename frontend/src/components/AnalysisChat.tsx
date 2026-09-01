import { useState } from 'react';
import type { AnalysisResult, AnalysisSession, ChatMessage } from '../types/analysis';

interface AnalysisChatProps {
  session: AnalysisSession | null;
  chatLoading: boolean;
  onSendMessage: (message: string) => void;
}

function AnalysisResultBubble({ result }: { result: AnalysisResult }) {
  return (
    <>
      <h4>Summary</h4>
      <p>{result.summary}</p>

      <h4>Matched skills</h4>
      <div className="tags">
        {result.matchedSkills.map((skill, i) => (
          <span
            key={i}
            className="tag tag-match"
            style={{ '--tag-delay': `${i * 40}ms` } as React.CSSProperties}
          >
            {skill}
          </span>
        ))}
      </div>

      <h4>Missing skills</h4>
      <div className="tags">
        {result.missingSkills.map((skill, i) => (
          <span
            key={i}
            className="tag tag-missing"
            style={{ '--tag-delay': `${i * 40}ms` } as React.CSSProperties}
          >
            {skill}
          </span>
        ))}
      </div>

      <h4>Suggested project</h4>
      <p>
        <strong>{result.suggestedProject.title}</strong>
        <br />
        {result.suggestedProject.description}
      </p>
      {result.suggestedProject.skillsItCovers.length > 0 && (
        <div className="tags">
          {result.suggestedProject.skillsItCovers.map((skill, i) => (
            <span
              key={i}
              className="tag"
              style={{ '--tag-delay': `${i * 40}ms` } as React.CSSProperties}
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`message message-${isUser ? 'user' : 'assistant'}`}>
      <div className={`bubble bubble-${isUser ? 'user' : 'assistant'}`}>
        {message.analysisResult ? (
          <AnalysisResultBubble result={message.analysisResult} />
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </div>
  );
}

export default function AnalysisChat({ session, chatLoading, onSendMessage }: AnalysisChatProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || chatLoading || !session) return;
    onSendMessage(trimmed);
    setInput('');
  };

  return (
    <section className="card analysis-chat-card" style={{ '--delay': '560ms' } as React.CSSProperties}>
      <h2 className="card-title">Continue the conversation</h2>
      <p className="chat-subtitle">
        Ask follow-up questions about your resume match, job requirements, or repository analysis.
      </p>

      <div className="chat-thread">
        {!session && (
          <div className="chat-placeholder">
            Select an analysis from the sidebar or run a new one to start chatting.
          </div>
        )}

        {session?.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {chatLoading && (
          <div className="loading-row">
            <div className="loading-bubble">
              <div className="loading-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="input chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            session
              ? 'Ask about skill gaps, portfolio projects, repo structure…'
              : 'Select or create an analysis first'
          }
          disabled={!session || chatLoading}
        />
        <button
          type="submit"
          className={`btn btn-primary${chatLoading ? ' btn-loading' : ''}`}
          disabled={!session || !input.trim() || chatLoading}
        >
          Send
        </button>
      </form>
    </section>
  );
}
