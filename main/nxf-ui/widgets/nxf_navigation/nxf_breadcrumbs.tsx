import React from 'react';
import Link from 'next/link';

interface NxfBreadcrumbsProps {
  items: { label: string; href?: string }[];
}

export const NxfBreadcrumbs: React.FC<NxfBreadcrumbsProps> = ({ items }) => (
  <nav className="text-sm mb-4 text-gray-500">
    {items.map((item, idx) => (
      <span key={idx}>
        {item.href ? (
          <Link href={item.href} className="text-blue-600 hover:underline">
            {item.label}
          </Link>
        ) : (
          <span>{item.label}</span>
        )}
        {idx < items.length - 1 && ' / '}
      </span>
    ))}
  </nav>
);
