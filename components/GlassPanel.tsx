import type { ElementType, ReactNode } from 'react';

export function GlassPanel({
  children, className = '', as: Tag = 'div', hoverable = false, ...rest
}: { children: ReactNode; className?: string; as?: ElementType; hoverable?: boolean; [k: string]: unknown }) {
  return (
    <Tag className={`glass ${hoverable ? 'hoverable' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
