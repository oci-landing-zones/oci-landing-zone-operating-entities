import type { ComponentProps } from 'react';
import { fieldErrorProps } from '../services/fieldErrors';
import FieldError from './FieldError';

export default function ValidatedInput({ id, error, helpId, ...props }: ComponentProps<'input'> & {
  id: string;
  error?: string | string[] | null;
  helpId?: string;
}) {
  return <div className="validated-input">
    <input id={id} {...props} {...fieldErrorProps(`${id}-error`, error, [helpId, props['aria-describedby']].filter(Boolean).join(' '))} />
    <FieldError id={`${id}-error`} error={error} />
  </div>;
}
