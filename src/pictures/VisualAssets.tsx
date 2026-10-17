import React, { useState, useEffect } from 'react';
import gunaMolaImg from './Gunamola.jpg';
import molaCraftImg from './molacraft.jpg';
import gunaCommunityImg from './04 Learn about the Guna Community in San Blas.jpg';

/**
 * Image Registry for Guna Yala Panama Travel.
 * All visual assets are centralized here with local placeholder assets
 * in /pictures/placeholder/ and /pictures/hero/ so real client photos
 * (JPG/PNG/WEBP) can be dropped in and replaced directly at any time.
 */

export const ASSET_PATHS = {
  hero: {
    main: '/pictures/header1.jpg',
  },
  placeholder: {
    dayTrip: '/pictures/10 Boat Day Tour.jpg',
    overnight: '/pictures/04 Franklin.jpg',
    multiDay: '/pictures/multidaytravel.jpg',
    privateCustom: '/pictures/01 Boat Day Tour .jpg',
    sailing: '/pictures/09 Velero .jpg',
    catamaran: '/pictures/catamaran.jpg',
    snorkeling: '/pictures/placeholder/snorkeling.jpg',
    culture: gunaMolaImg,
    cayuco: molaCraftImg,
    community: gunaCommunityImg,
    about: '/pictures/placeholder/about.jpg',
    islands: '/pictures/placeholder/islands.jpg',
  },
  experiences: {
    dayTrip: '/pictures/10 Boat Day Tour.jpg',
    overnight: '/pictures/04 Franklin.jpg',
    multiDay: '/pictures/multidaytravel.jpg',
    private: '/pictures/01 Boat Day Tour .jpg',
    sailing: '/pictures/09 Velero .jpg',
    catamaran: '/pictures/catamaran.jpg',
    snorkeling: '/pictures/placeholder/snorkeling.jpg',
  },
  culture: {
    molaArt: gunaMolaImg,
    cayucoBoat: molaCraftImg,
    community: gunaCommunityImg,
  },
  about: {
    main: '/pictures/placeholder/about.jpg',
    petra: '/pictures/placeholder/about.jpg',
    abisua: '/pictures/placeholder/about.jpg',
  },
  destinations: {
    islands: '/pictures/placeholder/islands.jpg',
  },
};

export type VisualAssetVariant =
  | 'hero'
  | 'day-trip'
  | 'overnight'
  | 'multi-day'
  | 'private'
  | 'sailing'
  | 'catamaran'
  | 'culture'
  | 'cayuco'
  | 'community'
  | 'natural-pool'
  | 'snorkeling'
  | 'islands'
  | 'about'
  | 'petra'
  | 'abisua'
  | 'panama-city'
  | 'carti-port'
  | 'franklin'
  | 'perro-chico'
  | 'cayos-holandeses';

export interface VisualProps {
  className?: string;
  variant: VisualAssetVariant;
  src?: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  objectPosition?: string;
}

const VARIANT_IMAGE_MAP: Record<VisualAssetVariant, string> = {
  hero: '/pictures/hero/guna-yala-hero.jpg',
  'day-trip': '/pictures/10 Boat Day Tour.jpg',
  overnight: '/pictures/04 Franklin.jpg',
  'multi-day': '/pictures/multidaytravel.jpg',
  private: '/pictures/01 Boat Day Tour .jpg',
  sailing: '/pictures/09 Velero .jpg',
  catamaran: '/pictures/catamaran.jpg',
  culture: gunaMolaImg,
  cayuco: molaCraftImg,
  community: gunaCommunityImg,
  'natural-pool': '/pictures/piscinanat.jpg',
  snorkeling: '/pictures/placeholder/snorkeling.jpg',
  islands: '/pictures/placeholder/islands.jpg',
  about: '/pictures/placeholder/about.jpg',
  petra: '/pictures/about/petra.jpg',
  abisua: '/pictures/about/abisua.jpg',
  'panama-city': '/pictures/Panama City Skyline at Sunset.png',
  'carti-port': '/pictures/carti port Island.jpg',
  franklin: '/pictures/Franklin.jpg',
  'perro-chico': '/pictures/perrochico.jpg',
  'cayos-holandeses': '/pictures/cayouholandese.jpg',
};

const PUBLIC_FALLBACK_MAP: Partial<Record<VisualAssetVariant, string>> = {
  culture: '/pictures/Gunamola.jpg',
  cayuco: '/pictures/molacraft.jpg',
  community: '/pictures/04 Learn about the Guna Community in San Blas.jpg',
  catamaran: '/pictures/catamaran.jpg',
};

export const VisualAsset: React.FC<VisualProps> = ({
  className = '',
  variant,
  src: customSrc,
  alt,
  loading = 'lazy',
  objectPosition,
}) => {
  const initialSrc = customSrc || VARIANT_IMAGE_MAP[variant] || '/pictures/10 Boat Day Tour.jpg';
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setCurrentSrc(initialSrc);
    setHasTriedFallback(false);
    setImageError(false);
  }, [initialSrc]);

  const handleImageError = () => {
    if (!hasTriedFallback) {
      setHasTriedFallback(true);
      const publicFallback = PUBLIC_FALLBACK_MAP[variant];
      if (publicFallback && publicFallback !== currentSrc) {
        setCurrentSrc(publicFallback);
        return;
      }
      if (variant === 'culture' || initialSrc.includes('Gunamola')) {
        setCurrentSrc('/pictures/Gunamola.jpg');
        return;
      }
    }
    setImageError(true);
  };

  const isDayTrip = variant === 'day-trip' || currentSrc.includes('10 Boat Day Tour');
  const isCatamaran = variant === 'catamaran' || currentSrc.toLowerCase().includes('catamaran');
  const posClass = objectPosition || (isDayTrip ? 'object-[center_65%]' : isCatamaran ? 'object-center' : '');

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden select-none bg-[#e8e2d5] ${className}`}
    >
      {!imageError ? (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${posClass}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#dcd2be] text-[#52606d] text-xs font-mono p-4 text-center">
          {alt}
        </div>
      )}
    </div>
  );
};
