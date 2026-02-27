'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { allCategories, allBrands } from '@/lib/mock-data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );
  
  const handleMultiSelectChange = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentValues = params.getAll(name);
    if (currentValues.includes(value)) {
        params.delete(name);
        currentValues.filter(v => v !== value).forEach(v => params.append(name, v));
    } else {
        params.append(name, value);
    }
    router.push(`/products?${params.toString()}`);
  }

  const handlePriceChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const minPrice = formData.get('minPrice') as string;
    const maxPrice = formData.get('maxPrice') as string;
    
    let params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set('minPrice', minPrice); else params.delete('minPrice');
    if (maxPrice) params.set('maxPrice', maxPrice); else params.delete('maxPrice');

    router.push(`/products?${params.toString()}`);
  }


  return (
    <div className="space-y-6">
        <div>
            <Label htmlFor="sort" className="font-headline text-lg font-semibold">Sort by</Label>
            <Select
                value={searchParams.get('sort') || 'trending'}
                onValueChange={(value) => router.push(`/products?${createQueryString('sort', value)}`)}
            >
                <SelectTrigger id="sort" className="mt-2">
                <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
            </Select>
        </div>
      <Accordion type="multiple" defaultValue={['category', 'brand', 'price']} className="w-full">
        <AccordionItem value="category">
          <AccordionTrigger className="font-headline text-lg">Category</AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            {allCategories.map(category => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${category.id}`}
                  checked={searchParams.getAll('category').includes(category.slug)}
                  onCheckedChange={() => handleMultiSelectChange('category', category.slug)}
                />
                <Label htmlFor={`cat-${category.id}`} className="font-normal">{category.name}</Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="brand">
          <AccordionTrigger className="font-headline text-lg">Brand</AccordionTrigger>
          <AccordionContent className="space-y-2 pt-2">
            {allBrands.map(brand => (
              <div key={brand.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand.id}`}
                  checked={searchParams.getAll('brand').includes(brand.slug)}
                  onCheckedChange={() => handleMultiSelectChange('brand', brand.slug)}
                />
                <Label htmlFor={`brand-${brand.id}`} className="font-normal">{brand.name}</Label>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="price">
          <AccordionTrigger className="font-headline text-lg">Price</AccordionTrigger>
          <AccordionContent className="pt-2">
            <form onSubmit={handlePriceChange} className="space-y-4">
                <div className="flex items-center gap-2">
                    <Input id="minPrice" name="minPrice" type="number" placeholder="Min" defaultValue={searchParams.get('minPrice') || ''} className="w-full" />
                    <span>-</span>
                    <Input id="maxPrice" name="maxPrice" type="number" placeholder="Max" defaultValue={searchParams.get('maxPrice') || ''} className="w-full" />
                </div>
                <Button type="submit" className="w-full">Apply</Button>
            </form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
