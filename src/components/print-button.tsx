'use client';
import { Printer } from 'lucide-react';
import { Button } from './ui/button';
export function PrintButton() {
  return (
    <Button className="print-action" onClick={() => window.print()}>
      <Printer size={16} />
      Print / Save as PDF
    </Button>
  );
}
