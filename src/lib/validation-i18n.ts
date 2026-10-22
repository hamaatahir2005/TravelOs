import type { ZodError } from 'zod';
import { translate, type Language } from './i18n';
export function validationMessage(error: ZodError, language: Language) {
  return error.issues
    .map((issue) => {
      let message = translate(language, issue.message);
      if (issue.code === 'too_small')
        message = translate(language, 'Enter at least {minimum} characters or a larger value.', {
          minimum: String(issue.minimum),
        });
      else if (issue.code === 'too_big')
        message = translate(language, 'Use at most {maximum} characters or a smaller value.', {
          maximum: String(issue.maximum),
        });
      else if (issue.code === 'invalid_type')
        message = translate(language, 'This field is required or has an invalid type.');
      else if (issue.code === 'invalid_format')
        message = translate(language, 'Enter a valid value.');
      else if (issue.code === 'invalid_value')
        message = translate(language, 'Select a supported value.');
      const path = issue.path
        .map((p) => (typeof p === 'number' ? String(p + 1) : translate(language, String(p))))
        .join(' · ');
      return path ? `${path}: ${message}` : message;
    })
    .join('; ');
}
