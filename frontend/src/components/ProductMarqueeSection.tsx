import React from 'react';
import { row1Products, row2Products } from '../data/products';
import { ProductCardItem } from '../presentation/loginTypes';

interface ProductCardProps {
  product: ProductCardItem;
  index: number;
}

function ProductCard({ product, index }: ProductCardProps) {
  return (
    <div
      id={`product-card-${product.id}-${index}`}
      className="w-[300px] h-[220px] flex-shrink-0 bg-white rounded-xl overflow-hidden shadow-md hover:scale-125 hover:shadow-2xl transition-all duration-300 cursor-pointer select-none group/card relative z-10 hover:z-50 border border-[#E2E8F0] origin-center"
    >
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center rounded-xl transition-transform duration-500 ease-out group-hover/card:scale-105"
      />
    </div>
  );
}

export default function ProductMarqueeSection() {
  return (
    <section
      id="products-marquee-section"
      className="relative py-24 sm:py-32 bg-gradient-to-b from-[#FBFBFA] via-[#F3F4F6] to-[#FBFBFA] border-t border-[#E2E8F0]/80 overflow-hidden w-full select-none"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 -left-20 w-96 h-96 rounded-full bg-[#1A9478]/5 blur-3xl" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-[#DE4A2A]/5 blur-3xl" />
      </div>

      {/* Tilted Marquee Container: rotate(-6deg) */}
      <div
        id="marquee-tilted-wrapper"
        className="relative w-full overflow-visible py-6"
        style={{
          transform: 'rotate(-6deg) scale(0.95)',
          transformOrigin: 'center center',
        }}
      >
        <div
          id="marquee-tracks-group"
          className="relative w-full space-y-6 sm:space-y-7 overflow-visible no-scrollbar"
        >
          {/* ROW 1: Slides from Right to Left (trượt ngang từ phải sang trái) */}
          <div className="relative w-full overflow-visible no-scrollbar py-2">
            <div className="flex w-max animate-marquee-left">
              {/* First Set of Row 1 Items */}
              <div className="flex items-center gap-5 sm:gap-6 pr-5 sm:pr-6">
                {row1Products.map((product, idx) => (
                  <ProductCard key={`r1-set1-${product.id}`} product={product} index={idx} />
                ))}
              </div>

              {/* Duplicate Set of Row 1 Items for Seamless Infinite Loop */}
              <div className="flex items-center gap-5 sm:gap-6 pr-5 sm:pr-6" aria-hidden="true">
                {row1Products.map((product, idx) => (
                  <ProductCard key={`r1-set2-${product.id}`} product={product} index={idx + 100} />
                ))}
              </div>
            </div>
          </div>

          {/* ROW 2: Slides in Reverse from Left to Right (trượt ngược chiều lại: từ trái sang phải) */}
          <div className="relative w-full overflow-visible no-scrollbar py-2">
            <div className="flex w-max animate-marquee-right">
              {/* First Set of Row 2 Items */}
              <div className="flex items-center gap-5 sm:gap-6 pr-5 sm:pr-6">
                {row2Products.map((product, idx) => (
                  <ProductCard key={`r2-set1-${product.id}`} product={product} index={idx} />
                ))}
              </div>

              {/* Duplicate Set of Row 2 Items for Seamless Infinite Loop */}
              <div className="flex items-center gap-5 sm:gap-6 pr-5 sm:pr-6" aria-hidden="true">
                {row2Products.map((product, idx) => (
                  <ProductCard key={`r2-set2-${product.id}`} product={product} index={idx + 100} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Fade gradients on edges to blend smoothly */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#FBFBFA] to-transparent z-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#FBFBFA] to-transparent z-20" />
    </section>
  );
}
