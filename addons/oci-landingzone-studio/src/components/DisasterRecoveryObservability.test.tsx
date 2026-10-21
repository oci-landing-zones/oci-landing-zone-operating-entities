import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DisasterRecoveryObservability from './DisasterRecoveryObservability';

describe('DR observability recipients', () => {
  const notifications = { default: 'home@example.com', cloudguard: 'cg@example.com', iam: 'iam@example.com', network: 'net@example.com', security: 'sec@example.com' };
  it('shows the inherited shared recipients', () => {
    const html = renderToStaticMarkup(<DisasterRecoveryObservability notifications={{ ...notifications, useSingleRecipient: true }} onChange={() => {}} />);
    expect(html).toContain('value="home@example.com"');
    expect(html).toContain('Notification emails');
    expect(html).not.toContain('id="dr-observability-network"');
  });
  it('allows separate topics and validates their email addresses', () => {
    const html = renderToStaticMarkup(<DisasterRecoveryObservability notifications={{ ...notifications, useSingleRecipient: false, network: 'invalid' }} onChange={() => {}} />);
    for (const topic of ['cloudguard', 'iam', 'network', 'security']) expect(html).toContain(`id="dr-observability-${topic}"`);
    expect(html).toContain('Enter valid email addresses separated by commas.');
    expect(html).not.toContain('id="dr-observability-default"');
  });
});
