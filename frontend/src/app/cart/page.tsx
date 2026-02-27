'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CartPage() {
  const { cart, updateCartQuantity, removeFromCart, getCartTotal } = useStore();
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const { toast } = useToast();

  const subtotal = getCartTotal();

  const handleApplyCoupon = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const upperCaseCoupon = couponCode.toUpperCase();
    if (upperCaseCoupon === 'HAPPY') {
      setDiscount(subtotal * 0.05);
      setDiscountPercentage(5);
      toast({ title: 'Coupon applied!', description: 'You got a 5% discount.' });
    } else if (upperCaseCoupon === 'NEWUSER') {
      setDiscount(subtotal * 0.10);
      setDiscountPercentage(10);
      toast({ title: 'Coupon applied!', description: 'You got a 10% discount.' });
    } else {
      setDiscount(0);
      setDiscountPercentage(0);
      toast({ variant: 'destructive', title: 'Invalid Coupon', description: 'The coupon code you entered is not valid.' });
    }
  };

  const discountedSubtotal = subtotal - discount;
  const tax = discountedSubtotal * 0.08;
  const total = discountedSubtotal + tax;

  if (cart.length === 0) {
    return (
      <div className="container py-12 text-center">
        <h1 className="font-headline text-4xl font-bold">Your Cart is Empty</h1>
        <p className="mt-4 text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
        <Button asChild className="mt-8">
          <Link href="/products">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="font-headline text-4xl font-bold">Shopping Cart</h1>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cart.map(item => (
            <Card key={item.productId} className="flex items-center overflow-hidden">
                <div className="relative aspect-square h-32 w-32 flex-shrink-0">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                </div>
              <CardContent className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <Link href={`/products/${item.slug}`} className="font-semibold hover:text-primary">{item.name}</Link>
                  <p className="text-lg font-bold">${item.price.toFixed(2)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border">
                    <Button variant="ghost" size="icon" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId)}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Discount ({discountPercentage}%)</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Taxes (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
               <Separator />
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <Label htmlFor="coupon">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input 
                    id="coupon" 
                    placeholder="Enter coupon" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <Button type="submit">Apply</Button>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button asChild size="lg" className="w-full">
                <Link href="/checkout">Proceed to Checkout <ArrowRight className="ml-2" /></Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
