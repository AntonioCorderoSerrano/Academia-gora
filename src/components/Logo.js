import Image from 'next/image';
import Link from 'next/link';

/**
 * Logo de Academia Ágora. Archivo en /public/logo.svg (o .png).
 * Tamaños: sm | md | lg. Variantes: dark (por defecto) | light.
 */
export default function Logo({
  size = 'md',
  variant = 'dark',
  href = '/',
  showText = true,
  className = '',
}) {
  const sizes = {
    sm: { img: 28, text: 'text-base sm:text-lg', gap: 'gap-2' },
    md: { img: 34, text: 'text-lg sm:text-xl md:text-2xl', gap: 'gap-2 sm:gap-2.5' },
    lg: { img: 44, text: 'text-xl sm:text-2xl md:text-3xl', gap: 'gap-2.5 sm:gap-3' },
  };
  const s = sizes[size] || sizes.md;

  const textColor = variant === 'light' ? 'text-ink-50' : 'text-ink-900';
  const accentColor = variant === 'light' ? 'text-accent-soft' : 'text-accent-deep';

  const content = (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <Image
        src="/logo.svg"
        alt="Academia Ágora"
        width={s.img}
        height={s.img}
        priority
        className="shrink-0"
      />
      {showText && (
        <span className={`font-display ${s.text} leading-none tracking-tight ${textColor} whitespace-nowrap`}>
          Academia <em className={`not-italic font-normal italic ${accentColor}`}>Ágora</em>
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return <Link href={href} className="inline-flex">{content}</Link>;
}
