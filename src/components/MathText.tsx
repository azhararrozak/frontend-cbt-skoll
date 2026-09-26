import { Suspense, lazy, useMemo } from 'react';

const KatexSegments = lazy(() => import('./KatexSegments'));

/**
 * Render teks yang boleh mengandung rumus LaTeX:
 * - $...$   : rumus inline
 * - $$...$$ : rumus blok (tengah)
 *
 * Teks tanpa rumus sama sekali tidak memuat bundel KaTeX (hemat untuk spek rendah).
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    if (!text) return [];
    return text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).filter((p) => p !== '');
  }, [text]);

  const hasMath = parts.some((p) => p.startsWith('$'));
  if (!hasMath) {
    return <span className={className}>{parts.join('')}</span>;
  }

  return (
    <Suspense fallback={<span className={className}>{text}</span>}>
      <KatexSegments parts={parts} className={className} />
    </Suspense>
  );
}
