import React from 'react';
import {
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Film,
  Receipt,
  Plane,
  HeartPulse,
  Layers,
  Coffee,
  Home,
  Gift,
  Briefcase,
  Smartphone,
  Building2,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  CircleDollarSign,
  Fuel,
  Wifi,
  Tv,
  HelpCircle,
  LucideProps,
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Film,
  Receipt,
  Plane,
  HeartPulse,
  Layers,
  Coffee,
  Home,
  Gift,
  Briefcase,
  Smartphone,
  Building2,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  CircleDollarSign,
  Fuel,
  Wifi,
  Tv,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export function DynamicIcon({
  name,
  className = 'w-5 h-5',
  ...props
}: { name: string; className?: string } & LucideProps) {
  const IconComponent = ICON_MAP[name] || HelpCircle;
  return <IconComponent className={className} {...props} />;
}
