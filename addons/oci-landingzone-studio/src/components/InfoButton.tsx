import { useId, type ReactNode } from 'react';

export default function InfoButton({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return <>
    <button type="button" className="studio-info-button" aria-label={`About ${title}`} aria-haspopup="dialog" popoverTarget={id}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="m9 9 1.5-.5-1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10.5" cy="5.75" r=".9" fill="currentColor" />
      </svg>
    </button>
    <div id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className="studio-info-popover">
      <div className="studio-info-popover-heading">
        <h3 id={`${id}-title`}>{title}</h3>
        <button type="button" className="studio-info-close" popoverTarget={id} popoverTargetAction="hide" aria-label={`Close ${title}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="studio-info-copy">{children}</div>
    </div>
  </>;
}
