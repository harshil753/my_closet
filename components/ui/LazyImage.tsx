/**
 * Lazy loading image component with performance optimization
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLazyImage, ImageOptimizer } from '@/lib/utils/performance';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  sizes = '100vw',
  priority = false,
  quality = 75,
  blurDataURL,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate responsive sources
  const responsiveSources = ImageOptimizer.generateWebPSources(src);

  // Use lazy loading hook
  const {
    imgRef: lazyRef,
    imageSrc,
    isInView,
    handleLoad: handleLazyLoad,
    handleError: handleLazyError,
  } = useLazyImage(src, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  // Preload critical images
  useEffect(() => {
    if (priority && src) {
      ImageOptimizer.preloadImage(src);
    }
  }, [priority, src]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  };

  // Update current source when lazy loading triggers
  useEffect(() => {
    if (imageSrc) {
      setCurrentSrc(imageSrc);
    }
  }, [imageSrc]);

  // Merge refs
  useEffect(() => {
    if (imgRef.current && lazyRef.current) {
      imgRef.current = lazyRef.current;
    }
  }, [lazyRef]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder/Blur */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 flex animate-pulse items-center justify-center bg-gray-200"
          style={{ width, height }}
        >
          {blurDataURL && (
            <img
              src={blurDataURL}
              alt=""
              className="h-full w-full object-cover blur-sm filter"
              style={{ width, height }}
            />
          )}
          {placeholder && (
            <div className="text-sm text-gray-400">{placeholder}</div>
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          style={{ width, height }}
        >
          <div className="text-center text-sm text-gray-400">
            <div className="mb-2">⚠️</div>
            <div>Failed to load image</div>
          </div>
        </div>
      )}

      {/* Main image */}
      {currentSrc && !hasError && (
        <picture>
          {/* WebP source for modern browsers */}
          <source
            srcSet={responsiveSources.webp}
            sizes={sizes}
            type="image/webp"
          />

          {/* Fallback source */}
          <source
            srcSet={responsiveSources.fallback}
            sizes={sizes}
            type="image/jpeg"
          />

          {/* Image element */}
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            className={`transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </picture>
      )}
    </div>
  );
}

/**
 * Optimized image gallery component
 */
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function LazyImageGallery({
  images,
  className = '',
  onImageClick,
}: ImageGalleryProps) {
  return (
    <div
      className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {images.map((image, index) => (
        <LazyImage
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="cursor-pointer transition-opacity hover:opacity-90"
          onClick={() => onImageClick?.(index)}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      ))}
    </div>
  );
}

/**
 * Progressive image component with blur-to-sharp transition
 */
interface ProgressiveImageProps extends LazyImageProps {
  lowQualitySrc?: string;
  showBlur?: boolean;
}

export function ProgressiveImage({
  lowQualitySrc,
  showBlur = true,
  ...props
}: ProgressiveImageProps) {
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);

  return (
    <div className="relative">
      {/* Low quality placeholder */}
      {showBlur && lowQualitySrc && !highQualityLoaded && (
        <LazyImage
          {...props}
          src={lowQualitySrc}
          className={`${props.className} blur-sm filter`}
          onLoad={() => setHighQualityLoaded(true)}
        />
      )}

      {/* High quality image */}
      <LazyImage
        {...props}
        className={`${props.className} ${
          highQualityLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-500`}
        onLoad={() => {
          setHighQualityLoaded(true);
          props.onLoad?.();
        }}
      />
    </div>
  );
}
