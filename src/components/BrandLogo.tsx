import React from 'react';

interface BrandLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 36,
  showText = true,
  className = '',
  glow = true,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Grid & Logic Logo from public/logos */}
      <img
        src="/logos/Grid & Logic (LOGO).svg"
        alt="Grid & Logic Logo"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: glow ? 'drop-shadow(0 0 14px rgba(0, 240, 255, 0.24))' : undefined,
          borderRadius: '50%',
        }}
        className="transition-transform hover:scale-105"
      />

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-base sm:text-lg tracking-wider text-[#00f0ff]">
              Grid & Logic
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
