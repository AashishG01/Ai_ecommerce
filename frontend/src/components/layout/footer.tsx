import Link from 'next/link';
import { Sparkles, Mail, Github, Twitter, Instagram } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* ─── Brand ──────────────────── */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">EStoreFront</span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Premium shopping experience powered by AI. Curated products, intelligent recommendations.
            </p>
            <div className="flex gap-3">
              <Link href="#" className="rounded-lg border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Twitter className="h-4 w-4" />
              </Link>
              <Link href="#" className="rounded-lg border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Instagram className="h-4 w-4" />
              </Link>
              <Link href="#" className="rounded-lg border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <Github className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ─── Shop ───────────────────── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products?category=apparel" className="text-muted-foreground transition-colors hover:text-foreground">Apparel</Link></li>
              <li><Link href="/products?category=electronics" className="text-muted-foreground transition-colors hover:text-foreground">Electronics</Link></li>
              <li><Link href="/products?category=accessories" className="text-muted-foreground transition-colors hover:text-foreground">Accessories</Link></li>
              <li><Link href="/products?category=home-goods" className="text-muted-foreground transition-colors hover:text-foreground">Home Goods</Link></li>
              <li><Link href="/products" className="text-muted-foreground transition-colors hover:text-foreground">All Products</Link></li>
            </ul>
          </div>

          {/* ─── Company ────────────────── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">About Us</Link></li>
              <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Careers</Link></li>
              <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Contact</Link></li>
              <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>

          {/* ─── Newsletter ─────────────── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider">Stay Updated</h4>
            <p className="text-sm text-muted-foreground">
              Weekly updates on new products and exclusive deals.
            </p>
            <form className="flex gap-2">
              <Input type="email" placeholder="you@email.com" className="rounded-full bg-background px-4 text-sm" />
              <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label="Subscribe">
                <Mail className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* ─── Bottom Bar ──────────────── */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} EStoreFront. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Powered by AI <Sparkles className="h-3 w-3 text-primary" />
          </p>
        </div>
      </div>
    </footer>
  );
}
