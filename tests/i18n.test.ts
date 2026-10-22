import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { translations, translate, isLanguage, formatMoney, formatDate } from '../src/lib/i18n';
import { validationMessage } from '../src/lib/validation-i18n';
describe('Staff workspace localization', () => {
  it('has both RTL languages for each source message', () => {
    for (const key of Object.keys(translations.en)) {
      expect(translations.ar[key], `Arabic: ${key}`).toBeTypeOf('string');
      expect(translations.ckb[key], `Sorani: ${key}`).toBeTypeOf('string');
    }
  });
  it('interpolates record counts without assuming English word order', () => {
    const text = translate('ar', 'Showing {from}–{to} of {total} records', {
      from: 1,
      to: 10,
      total: 24,
    });
    expect(text).toContain('24');
    expect(text).toContain('عرض');
    expect(text).not.toMatch(/\{\w+\}/);
    expect(translate('ckb', '{count} ticket invoices', { count: 12 })).toBe('12 پسووڵەی بلیت');
  });
  it('validates language cookies and preserves unknown user content', () => {
    expect(isLanguage('ckb')).toBe(true);
    expect(isLanguage('invalid')).toBe(false);
    expect(isLanguage(null)).toBe(false);
    expect(translate('ckb', 'Ari Barzan')).toBe('Ari Barzan');
  });
  it('formats money and dates for the chosen locale', () => {
    expect(formatMoney('1234.56', 'USD', 'en')).toBe('$1,234.56');
    expect(formatMoney('1234.56', 'USD', 'ar')).not.toBe(formatMoney('1234.56', 'USD', 'en'));
    expect(formatDate('2026-10-21T12:00:00Z', 'ckb')).not.toBe(
      formatDate('2026-10-21T12:00:00Z', 'en'),
    );
    expect(formatDate(null, 'ar')).toBe('—');
    expect(formatDate('2026-10-21T12:00:00Z', 'ckb')).toContain('تشرین١');
  });
  it('localizes validation fields and messages while retaining constraints', () => {
    const result = z.object({ password: z.string().min(12) }).safeParse({ password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = validationMessage(result.error, 'ar');
      expect(message).toContain('12');
      expect(message).toContain('كلمة المرور');
      expect(message).not.toContain('Too small');
    }
  });
});
