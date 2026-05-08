function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export default function BrandLogo({
  theme = 'light',
  size = 'md',
  className = '',
}) {
  const sizeClasses = {
    sm: 'text-[2rem] tracking-[-0.05em]',
    md: 'text-[2.2rem] tracking-[-0.055em]',
    lg: 'text-[2.8rem] tracking-[-0.06em]',
  };

  const colorClass = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <span className={cn('font-black leading-none', colorClass, sizeClasses[size] || sizeClasses.md, className)}>
      MajorFit
    </span>
  );
}
