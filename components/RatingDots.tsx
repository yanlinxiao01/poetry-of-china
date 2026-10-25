const SIZES = {
  sm: { dot: 'h-2 w-2', gap: 'gap-1.5' },
  lg: { dot: 'h-[1.1rem] w-[1.1rem] md:h-5 md:w-5', gap: 'gap-2' },
  xs: { dot: 'h-1.5 w-1.5', gap: 'gap-1' },
} as const;

export default function RatingDots({
  value,
  size = 'sm',
  max = 6,
  variant = 'solid',
  className = '',
}: {
  value: number;
  size?: keyof typeof SIZES;
  max?: number;
  /** solid：空点为浅色填充；hollow：空点为描边（难度指示用） */
  variant?: 'solid' | 'hollow';
  className?: string;
}) {
  const { dot, gap } = SIZES[size];

  const emptyCls =
    variant === 'hollow' ? 'border border-accent/40 bg-transparent' : 'bg-accent/15';

  return (
    <span
      className={`inline-flex items-center ${gap} ${className}`}
      aria-label={`${value} out of ${max}`}
      role="img"
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full ${dot} ${i < value ? 'accent-gradient' : emptyCls}`}
        />
      ))}
    </span>
  );
}
