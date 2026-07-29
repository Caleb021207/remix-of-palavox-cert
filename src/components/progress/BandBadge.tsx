import React from 'react';
import { bandText, bandTone } from '@/lib/growth';

/**
 * Level display. Always renders a text label alongside the colour tone —
 * colour is never the only carrier of meaning (WCAG 1.4.1).
 */
const BandBadge: React.FC<{
  row: { wida_level: number | null; wida_low?: number | null; wida_high?: number | null; cefr_band?: string | null };
  className?: string;
}> = ({ row, className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${bandTone(row.wida_level)} ${className}`}
  >
    {bandText(row)}
  </span>
);

export default BandBadge;
