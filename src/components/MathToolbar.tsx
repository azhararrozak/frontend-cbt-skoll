import { useCallback } from 'react';

interface MathSymbol {
  label: string;
  title: string;
  snippet: string;
}

/**
 * Snippet selalu dibungkus $...$ agar ter-render KaTeX.
 * Simbol sederhana bisa langsung karakter Unicode (tanpa LaTeX).
 */
const STRUCTURES: MathSymbol[] = [
  { label: 'xʸ', title: 'Pangkat', snippet: '$x^{2}$' },
  { label: 'xᵦ', title: 'Subscript', snippet: '$x_{1}$' },
  { label: 'a/b', title: 'Pecahan', snippet: '$\\frac{a}{b}$' },
  { label: '√x', title: 'Akar', snippet: '$\\sqrt{x}$' },
  { label: '∫', title: 'Integral', snippet: '$\\int_{a}^{b}$' },
  { label: '∑', title: 'Sigma', snippet: '$\\sum_{i=1}^{n}$' },
  { label: 'lim', title: 'Limit', snippet: '$\\lim_{x \\to \\infty}$' },
  { label: '(a,b)', title: 'Koordinat', snippet: '$(x, y)$' },
];

const SYMBOLS: MathSymbol[] = [
  { label: '+', title: 'Tambah', snippet: ' + ' },
  { label: '−', title: 'Kurang', snippet: ' − ' },
  { label: '×', title: 'Kali', snippet: ' × ' },
  { label: '÷', title: 'Bagi', snippet: ' ÷ ' },
  { label: '=', title: 'Sama dengan', snippet: ' = ' },
  { label: '≠', title: 'Tidak sama dengan', snippet: ' ≠ ' },
  { label: '≤', title: 'Kurang dari sama dengan', snippet: ' ≤ ' },
  { label: '≥', title: 'Lebih dari sama dengan', snippet: ' ≥ ' },
  { label: '±', title: 'Plus minus', snippet: ' ± ' },
  { label: 'π', title: 'Pi', snippet: ' π ' },
  { label: '°', title: 'Derajat', snippet: '°' },
  { label: '∞', title: 'Tak hingga', snippet: ' ∞ ' },
  { label: 'α', title: 'Alfa', snippet: ' α ' },
  { label: 'β', title: 'Beta', snippet: ' β ' },
  { label: 'θ', title: 'Theta', snippet: ' θ ' },
  { label: 'Δ', title: 'Delta', snippet: ' Δ ' },
];

const GROUP_STYLE =
  'flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5';

export function MathToolbar({
  onInsert,
}: {
  onInsert: (snippet: string) => void;
}) {
  const btn =
    'flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md px-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700';

  const renderGroup = useCallback(
    (items: MathSymbol[]) =>
      items.map((s) => (
        <button
          key={s.title}
          type="button"
          title={s.title}
          className={btn}
          onClick={(e) => {
            e.preventDefault();
            onInsert(s.snippet);
          }}
        >
          {s.label}
        </button>
      )),
    [onInsert],
  );

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5" data-toolbar="math">
      <span className="mr-1 text-xs font-medium text-slate-400">Simbol &amp; rumus:</span>
      <div className={GROUP_STYLE}>{renderGroup(STRUCTURES)}</div>
      <div className={GROUP_STYLE}>{renderGroup(SYMBOLS)}</div>
    </div>
  );
}
