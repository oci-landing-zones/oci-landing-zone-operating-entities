export function fieldErrorProps(errorId: string, error?: string | string[] | null, helpId?: string) {
  const invalid = Array.isArray(error) ? error.length > 0 : Boolean(error);
  return {
    'aria-invalid': invalid || undefined,
    'aria-describedby': [helpId, invalid ? errorId : undefined].filter(Boolean).join(' ') || undefined,
  };
}

export function configKeyError(value: string, otherKeys: string[], maxLength?: number): string | null {
  const key = value.trim().toLowerCase();
  if (!key) return 'Enter a name.';
  if (otherKeys.some((other) => other.trim().toLowerCase() === key)) return 'This name is already used. Enter a unique name.';
  if (maxLength && value.trim().length > maxLength) return `Use ${maxLength} characters or fewer.`;
  return null;
}
