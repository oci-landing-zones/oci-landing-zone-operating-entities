import { describe, expect, it } from 'vitest';
import { notificationEmailError, validateNotificationEmails } from './notificationEmails';

describe('observability recipients', () => {
  const blankTopics = { cloudguard: '', iam: '', network: '', security: '' };
  it('requires at least one address', () => {
    for (const value of [undefined, '', '   ']) expect(notificationEmailError(value)).toBeTruthy();
  });
  it('rejects malformed addresses and empty list entries', () => {
    for (const value of ['ops', 'ops@', '@example.com', 'ops@example', 'ops @example.com', 'ops@example.com,', 'ops@example.com;bad',
      '.ops@example.com', 'ops..team@example.com', 'ops@example..com', 'ops@-example.com', 'ops@exam!ple.com']) {
      expect(notificationEmailError(value)).toBeTruthy();
    }
  });
  it('accepts trimmed addresses with supported separators', () => {
    expect(notificationEmailError(' ops+lz@example.com, noc@example.org; alerts@example.net\nteam@example.com ')).toBeNull();
  });
  it('requires only the shared field in shared mode', () => {
    expect(validateNotificationEmails({ ...blankTopics, useSingleRecipient: true, default: 'ops@example.com', iam: 'invalid' })).toEqual([]);
    expect(validateNotificationEmails({ ...blankTopics, useSingleRecipient: true, default: '' })).toHaveLength(1);
  });
  it('requires every topic in separate mode and ignores the hidden shared value', () => {
    expect(validateNotificationEmails({ ...blankTopics, useSingleRecipient: false, default: 'ops@example.com' })).toHaveLength(4);
    expect(validateNotificationEmails({ useSingleRecipient: false, default: 'invalid', cloudguard: 'cg@example.com',
      iam: 'iam@example.com', network: 'net@example.com', security: 'sec@example.com' })).toEqual([]);
  });
});
