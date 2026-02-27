import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mail, Truck, Shield, RotateCcw, Headphones, Sparkles, TrendingUp, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import ProductCard from '@/components/product-card';
import { getTrendingProducts, getFeaturedCategories, allProducts } from '@/lib/mock-data';
import { placeholderImages } from '@/lib/placeholder-images.json';

const heroImage = placeholderImages.find(p => p.id === 'hero-banner-1');

const trustBadges = [
  { icon: Truck, label: 'Free Shipping', desc: 'On orders over $50' },
  { icon: Shield, label: 'Secure Payment', desc: '100% protected' },
  { icon: RotateCcw, label: 'Easy Returns', desc: '30-day guarantee' },
  { icon: Headphones, label: 'AI Support', desc: '24/7 assistant' },
];

export default function Home() {
  const trendingProducts = getTrendingProducts();
  const featuredCategories = getFeaturedCategories();
  const newArrivals = allProducts.slice(-8);

  return (
    <div className="space-y-0">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover scale-105"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        <div className="relative z-10 flex h-full flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-white/90">New Collection 2026</span>
            </div>

            <h1 className="font-headline text-5xl font-bold leading-[1.1] text-white md:text-7xl">
              Elevate Your
              <span className="block bg-gradient-to-r from-amber-400 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                Style Game
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
              Discover curated collections that blend timeless elegance with modern trends.
              Premium quality, exceptional design.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="rounded-full bg-white px-8 text-black hover:bg-white/90">
                <Link href="/products">Shop Collection <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 px-8 text-white hover:bg-white/10">
                <Link href="/products?category=apparel">Explore Apparel</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 flex gap-8 border-t border-white/10 pt-8">
              <div>
                <p className="text-2xl font-bold text-white">50+</p>
                <p className="text-sm text-white/50">Products</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">4.7★</p>
                <p className="text-sm text-white/50">Avg Rating</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">24/7</p>
                <p className="text-sm text-white/50">AI Assistant</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TRUST BADGES ═══════════════ */}
      <section className="border-b border-border/50 bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:gap-8">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <badge.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{badge.label}</p>
                <p className="text-xs text-muted-foreground">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ FEATURED CATEGORIES ═══════════════ */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Browse</p>
          <h2 className="font-headline mt-2 text-3xl font-bold md:text-4xl">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {featuredCategories.map((category, index) => {
            const categoryImage = placeholderImages.find(p => p.id === `category-${index + 1}`);
            return (
              <Link href={`/products?category=${category.slug}`} key={category.id}>
                <Card className="group overflow-hidden border-0 shadow-lg">
                  <CardContent className="relative h-72 p-0 md:h-80">
                    {categoryImage && (
                      <Image
                        src={categoryImage.imageUrl}
                        alt={category.name}
                        fill
                        className="object-cover transition-all duration-500 group-hover:scale-110"
                        data-ai-hint={categoryImage.imageHint}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-all duration-300 group-hover:from-black/80" />
                    <div className="relative z-10 flex h-full flex-col items-center justify-end pb-6">
                      <h3 className="font-headline text-xl font-bold text-white md:text-2xl">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-sm text-white/60 transition-all duration-300 group-hover:text-white/90">
                        Explore →
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ TRENDING PRODUCTS ═══════════════ */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium uppercase tracking-widest text-primary">Hot Right Now</p>
              </div>
              <h2 className="font-headline mt-2 text-3xl font-bold md:text-4xl">Trending Products</h2>
            </div>
            <Button asChild variant="outline" className="hidden rounded-full md:flex">
              <Link href="/products">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <Carousel opts={{ align: 'start', loop: true }} className="w-full">
            <CarouselContent>
              {trendingProducts.map((product) => (
                <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <div className="p-1">
                    <ProductCard product={product} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
          <div className="mt-6 text-center md:hidden">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/products">View All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ NEW ARRIVALS GRID ═══════════════ */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mb-10 text-center">
          <div className="mx-auto flex items-center justify-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Just Landed</p>
          </div>
          <h2 className="font-headline mt-2 text-3xl font-bold md:text-4xl">New Arrivals</h2>
          <p className="mt-2 text-muted-foreground">The latest additions to our collection</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ═══════════════ AI ASSISTANT BANNER ═══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary/90 via-primary to-primary/80 py-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="text-sm font-medium text-white">Powered by AI</span>
          </div>
          <h2 className="font-headline mt-6 text-3xl font-bold text-white md:text-4xl">
            Meet Your AI Shopping Assistant
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
            Click the chat bubble in the bottom right corner. Tell it what you need —
            it&apos;ll find the perfect products for you in seconds.
          </p>
          <p className="mt-6 text-sm text-white/50 italic">
            Try: &ldquo;I need a gift for my sister&rdquo; or &ldquo;Show me running shoes under $150&rdquo;
          </p>
        </div>
      </section>

      {/* ═══════════════ NEWSLETTER ═══════════════ */}
      <section className="bg-card py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-headline text-3xl font-bold">Stay in the Loop</h2>
          <p className="mt-2 text-muted-foreground">
            Get exclusive deals, new arrivals, and style tips straight to your inbox.
          </p>
          <form className="mx-auto mt-8 flex max-w-md gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              className="rounded-full bg-background px-5"
              aria-label="Email for newsletter"
            />
            <Button type="submit" className="rounded-full px-6">
              Subscribe <Mail className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </section>
    </div>
  );
}
