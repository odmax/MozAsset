import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  orgLogo?: string | null;
}

const SIZE_MAP = { sm: 'h-6 w-auto', md: 'h-8 w-auto', lg: 'h-11 w-auto', xl: 'h-14 w-auto' };

export function Logo({ size = 'md', className = '', orgLogo }: LogoProps) {
  const src = orgLogo || '/logo1.png';
  return (
    <img src={src} alt="MozAssets" className={`${SIZE_MAP[size]} ${className}`} />
  );
}

export function EmailLogo({ baseUrl }: { baseUrl: string }) {
  return `<img src="${baseUrl}/logo1.png" alt="MozAssets" style="height:28px;width:auto;vertical-align:middle;margin-right:8px;" />`;
}
