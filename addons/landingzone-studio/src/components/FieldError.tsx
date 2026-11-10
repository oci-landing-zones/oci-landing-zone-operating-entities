import type { ReactNode } from 'react';

export default function FieldError({ id, error }: { id: string; error?: string | string[] | null }) {
  const messages = (Array.isArray(error) ? error : [error]).filter(Boolean);
  if (!messages.length) return null;
  return <div id={id} className="field-error" aria-live="polite">
    {messages.map((message, index) => <div key={index}>{message}</div>)}
  </div>;
}

export function ErrorNotice({ title, children }: { title?: string; children: ReactNode }) {
  return <div className="error-notice" role="alert">
    {title && <strong className="error-notice-title">{title}</strong>}
    {typeof children === 'string' ? children.trim() : children}
  </div>;
}
