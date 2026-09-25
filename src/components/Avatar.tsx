import type { User } from '../types';

const palette = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
];

export function Avatar({ user, size = 'md' }: { user: User | null; size?: 'sm' | 'md' }) {
  if (!user) return null;
  const initial = user.name.charAt(0).toUpperCase();
  const color = palette[user.id % palette.length];
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${color}`}
      title={`${user.name} (${user.role})`}
    >
      {initial}
    </div>
  );
}
