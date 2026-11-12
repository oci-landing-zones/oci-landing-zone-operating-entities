import { useCallback, useEffect, useId, useRef } from 'react';
import { tagHelpPosition } from './tagHelpPosition';

const descriptions: Record<string, { description: string; defaults: string; configuration: string }> = {
  'tag-lz-platform': {
    description: 'Classifies resources by technical platform or service domain.',
    defaults: 'network, security, observability, iam and governance.',
    configuration: 'Additional values come from the workload extensions selected in your configuration. This list is inherited and cannot be edited here.',
  },
  'tag-lz-environment': {
    description: 'Identifies the environment to which a resource belongs.',
    defaults: 'shared is always available. New designs also start with prod and preprod.',
    configuration: 'Environment names are inherited from Foundations. Change them there; this list is read-only.',
  },
  'tag-lz-project': {
    description: 'Identifies the project associated with a resource.',
    defaults: 'notapplicable identifies resources outside projects.',
    configuration: 'Other values are inherited from the projects configured in Studio. This list is read-only.',
  },
  'tag-lz-cost-center': {
    description: 'Assigns resources to a cost center for cost allocation and budgets.',
    defaults: 'CC12345 covers the whole landing zone and belongs to IT in a new design.',
    configuration: 'Define customer cost centers and use Edit to select Platform, Environment and Project filters. Every resource must be covered, and each cost center must belong to one business unit.',
  },
  'tag-lz-business-unit': {
    description: 'Groups cost centers under the business unit responsible for their costs.',
    defaults: 'IT includes CC12345 in a new design.',
    configuration: 'Add customer business units and assign one or more cost centers to each. A cost center can belong to only one business unit.',
  },
  'tag-lz-owner': {
    description: 'Identifies the person or team responsible for the resources.',
    defaults: 'email.address@example.com is an example value.',
    configuration: 'Set the customer owner email. One email applies to all resources; per-resource owner overrides are outside Studio’s current scope.',
  },
};

export default function CostTagHelp({ name }: { name: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const help = descriptions[name];
  function cancelClose() { clearTimeout(timer.current); }
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    if (panel.current?.matches(':popover-open')) panel.current.hidePopover();
  }, []);
  function show() {
    cancelClose();
    const button = trigger.current;
    const tooltip = panel.current;
    if (!button || !tooltip) return;
    const anchor = button.getBoundingClientRect();
    const position = tagHelpPosition(anchor, window.innerWidth, window.innerHeight, 0);
    tooltip.style.width = `${position.width}px`;
    tooltip.style.left = `${position.left}px`;
    tooltip.showPopover();
    tooltip.style.top = `${tagHelpPosition(anchor, window.innerWidth, window.innerHeight, tooltip.getBoundingClientRect().height).top}px`;
  }
  function scheduleClose() {
    cancelClose();
    timer.current = setTimeout(() => {
      if (document.activeElement !== trigger.current && !panel.current?.matches(':hover')) hide();
    }, 180);
  }
  useEffect(() => {
    function closeOnScroll(event: Event) {
      if (!(event.target instanceof Node) || !panel.current?.contains(event.target)) hide();
    }
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', hide);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', hide);
    };
  }, [hide]);
  if (!help) return <code>{name}</code>;
  return <>
    <button ref={trigger} type="button" className="cost-tag-help-trigger" aria-describedby={id}
      onMouseEnter={show} onMouseLeave={scheduleClose} onFocus={show} onBlur={scheduleClose} onClick={show}
      onKeyDown={(event) => { if (event.key === 'Escape') { hide(); event.preventDefault(); } }}>
      <code>{name}</code>
    </button>
    <div ref={panel} id={id} popover="auto" role="tooltip" className="cost-tag-help-panel"
      onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <strong>{name}</strong>
      <p>{help.description}</p>
      <p><b>Default values</b><br />{help.defaults}</p>
      <p><b>Configuration</b><br />{help.configuration}</p>
    </div>
  </>;
}
