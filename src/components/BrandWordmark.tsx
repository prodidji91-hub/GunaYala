import React from 'react';

interface BrandWordmarkProps {
  variant?: 'water-hero' | 'light' | 'dark' | 'adaptive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  withWaterEffect?: boolean;
  withWaterReflection?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  variant = 'water-hero',
  size = 'lg',
  showSubtitle = false,
  withWaterEffect = true,
  withWaterReflection = true,
  className = '',
  onClick,
}) => {
  // Editorial typography sizing
  const sizeStyles = {
    sm: {
      title: 'text-lg sm:text-xl tracking-[0.32em]',
      sub: 'text-[8px] tracking-[0.3em] mt-1',
    },
    md: {
      title: 'text-xl sm:text-2xl lg:text-[28px] tracking-[0.36em]',
      sub: 'text-[9px] tracking-[0.34em] mt-1',
    },
    lg: {
      title: 'text-2xl sm:text-3xl lg:text-[35px] tracking-[0.40em]',
      sub: 'text-[10px] tracking-[0.38em] mt-1.5',
    },
    xl: {
      title: 'text-3xl sm:text-4xl lg:text-5xl tracking-[0.42em]',
      sub: 'text-xs tracking-[0.42em] mt-2',
    },
  };

  const fontSizeMap = {
    sm: '20px',
    md: '24px',
    lg: '30px',
    xl: '38px',
  };
  const titleFontSize = fontSizeMap[size] || '24px';
  const currentSize = sizeStyles[size];

  // Water-hero styling: Luxury fashion-editorial + calm ocean float & sunlight caustics reflection
  if (variant === 'water-hero') {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex flex-col items-center justify-center select-none ${
          withWaterEffect ? 'guna-yala-floating-mark' : ''
        } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {/* Main Wordmark Container */}
        <div className="relative flex flex-col items-center justify-center">

          {/* Subtle Champagne-Gold Warm Glow behind the letters */}
          {withWaterEffect && (
            <div
              aria-hidden="true"
              className="guna-yala-gold-glow pointer-events-none select-none absolute inset-x-[-15%] inset-y-[-20%] -z-10 rounded-full blur-xl"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(228, 209, 154, 0.14) 0%, rgba(201, 169, 110, 0.05) 50%, transparent 70%)',
              }}
            />
          )}
          
          {/* Base Solid Editorial Wordmark: Refined champagne-gold metallic finish */}
          <h1
            className={`font-brand uppercase leading-none tracking-[0.40em] guna-yala-champagne-text select-none`}
            style={{
              letterSpacing: '0.40em',
              paddingLeft: '0.40em', // Mathematically balances trailing letter-spacing
              fontSize: titleFontSize,
              fontWeight: 'normal',
              fontFamily: "'Bodoni Moda', serif",
              fontStyle: 'normal',
              WebkitTextStroke: '0.35px rgba(228, 209, 154, 0.7)',
              fontVariationSettings: "'opsz' 14, 'wght' 400",
            }}
          >
            GUNA YALA
          </h1>

          {/* Signature Sunlight Light-Sweep Layer (smooth reflection moving across polished champagne letters) */}
          {withWaterEffect && (
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none select-none flex items-center justify-center"
            >
              <span
                className={`font-brand uppercase leading-none tracking-[0.40em] guna-yala-light-sweep block`}
                style={{
                  letterSpacing: '0.40em',
                  paddingLeft: '0.40em',
                  fontSize: titleFontSize,
                  fontWeight: 'normal',
                  fontFamily: "'Bodoni Moda', serif",
                  fontStyle: 'normal',
                  WebkitTextStroke: '0.35px rgba(255, 255, 255, 0.5)',
                  fontVariationSettings: "'opsz' 14, 'wght' 400",
                }}
              >
                GUNA YALA
              </span>
            </div>
          )}

          {/* Understated Champagne-Gold Reflection beneath the wordmark */}
          {withWaterReflection && (
            <div
              aria-hidden="true"
              className="guna-yala-reflection pointer-events-none select-none absolute top-full left-0 right-0 -mt-1 origin-top overflow-hidden"
            >
              <span
                className={`font-brand uppercase leading-none tracking-[0.40em] block text-[#D6C08A]/25 filter blur-[1.2px]`}
                style={{
                  letterSpacing: '0.40em',
                  paddingLeft: '0.40em',
                  fontSize: titleFontSize,
                  fontWeight: 'normal',
                  fontFamily: "'Bodoni Moda', serif",
                  fontStyle: 'normal',
                  WebkitTextStroke: '0.35px rgba(214, 192, 138, 0.3)',
                  fontVariationSettings: "'opsz' 14, 'wght' 400",
                }}
              >
                GUNA YALA
              </span>
            </div>
          )}

          {/* Optional editorial subtitle */}
          {showSubtitle && (
            <div className="flex items-center gap-2 mt-2">
              <span className="h-px w-3 sm:w-4 bg-white/30" />
              <span
                className={`font-sans uppercase font-medium ${currentSize.sub} text-white/70 tracking-[0.32em]`}
                style={{ letterSpacing: '0.32em', paddingLeft: '0.32em' }}
              >
                SAN BLAS · PANAMA
              </span>
              <span className="h-px w-3 sm:w-4 bg-white/30" />
            </div>
          )}

        </div>
      </div>
    );
  }

  // Classic dark variant for footer or light backdrops
  return (
    <div
      onClick={onClick}
      className={`inline-flex flex-col items-center justify-center select-none group transition-all duration-300 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        <span
          className={`font-brand font-normal uppercase ${currentSize.title} ${
            variant === 'dark' ? 'text-[#06121e]' : 'text-white'
          } leading-none tracking-[0.36em]`}
          style={{ letterSpacing: '0.36em', paddingLeft: '0.36em' }}
        >
          GUNA YALA
        </span>
      </div>

      {showSubtitle && (
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`h-px w-3 sm:w-4 ${
              variant === 'dark' ? 'bg-[#06121e]/20' : 'bg-white/30'
            }`}
          />
          <span
            className={`font-sans uppercase font-medium ${currentSize.sub} ${
              variant === 'dark' ? 'text-[#06121e]/60' : 'text-white/70'
            }`}
            style={{ letterSpacing: '0.3em', paddingLeft: '0.3em' }}
          >
            SAN BLAS · PANAMA
          </span>
          <span
            className={`h-px w-3 sm:w-4 ${
              variant === 'dark' ? 'bg-[#06121e]/20' : 'bg-white/30'
            }`}
          />
        </div>
      )}
    </div>
  );
};
