import katex from 'katex';

/**
 * Render tiap segmen teks: segmen berawalan $ di-render KaTeX, sisanya teks polos.
 * Di-lazy-load agar bundel KaTeX hanya diunduh saat soal memang mengandung rumus.
 */
export default function KatexSegments({
  parts,
  className,
}: {
  parts: string[];
  className?: string;
}) {
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <span
              key={i}
              className="my-1 block text-center"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(part.slice(2, -2), {
                  throwOnError: false,
                  displayMode: true,
                }),
              }}
            />
          );
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(part.slice(1, -1), {
                  throwOnError: false,
                }),
              }}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
