import type { OneOeNotifications } from '../model/types';

export function notificationEmailError(value: string | undefined): string | null {
  if (!value?.trim()) return 'Enter at least one notification email address.';
  const addresses = value.split(/[,;\n]/).map((address) => address.trim());
  const invalid = addresses.find((address) => {
    const [local] = address.split('@');
    return address.length > 254 || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')
      || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(address);
  });
  if (invalid !== undefined) return 'Enter valid email addresses separated by commas.';
  return null;
}

export function validateNotificationEmails(notifications: OneOeNotifications | undefined, regional = false): string[] {
  const single = notifications?.useSingleRecipient ?? Boolean(notifications?.default);
  const topics = single ? ['default'] as const : ['cloudguard', 'iam', 'network', 'security'] as const;
  return topics.filter((topic) => !regional || topic === 'default' || topic === 'network' || topic === 'security').flatMap((topic) => {
    const error = notificationEmailError(notifications?.[topic]);
    return error ? [`Observability (${topic === 'default' ? 'all notifications' : topic}): ${error}`] : [];
  });
}
