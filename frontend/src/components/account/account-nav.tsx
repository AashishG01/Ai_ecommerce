
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Package, MapPin, Heart, Star, Settings, Bell, LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

const navLinks = [
  { href: '/account/profile', label: 'Profile', icon: <User /> },
  { href: '/account/orders', label: 'Orders', icon: <Package /> },
  { href: '/account/addresses', label: 'Addresses', icon: <MapPin /> },
  { href: '/account/wishlist', label: 'Wishlist', icon: <Heart /> },
  { href: '/account/reviews', label: 'My Reviews', icon: <Star /> },
  { href: '/account/settings', label: 'Settings', icon: <Settings /> },
  { href: '/account/notifications', label: 'Notifications', icon: <Bell /> },
];

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <Card>
      <CardContent className="p-2">
        <nav className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link href={link.href} key={link.href}>
                <Button
                    variant={pathname === link.href ? 'default' : 'ghost'}
                    className="w-full justify-start gap-3"
                >
                    <span className="w-6 h-6">{link.icon}</span>
                    <span>{link.label}</span>
                </Button>
            </Link>
          ))}
          <hr className="my-2" />
          <Button variant="ghost" className="w-full justify-start gap-3">
             <span className="w-6 h-6"><LogOut /></span>
             <span>Logout</span>
          </Button>
        </nav>
      </CardContent>
    </Card>
  );
}
