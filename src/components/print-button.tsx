'use client';
import { Printer } from 'lucide-react';
import { Button } from './ui/button';
export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <Button className="print-action" onClick={() => window.print()}>
      <Printer size={16} />
      {label}
    </Button>
  );
}
