'use client';

import { useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Landmark, Wallet } from 'lucide-react';

export default function CheckoutPage() {
    const { cart, getCartTotal } = useStore();
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('card');
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
    const shipping = discountedSubtotal > 50 ? 0 : 5;
    const tax = discountedSubtotal * 0.08;
    const total = discountedSubtotal + shipping + tax;

    if (cart.length === 0) {
        return (
          <div className="container py-12 text-center">
            <h1 className="font-headline text-4xl font-bold">Your Cart is Empty</h1>
            <p className="mt-4 text-muted-foreground">You can't checkout without any items in your cart.</p>
            <Button asChild className="mt-8">
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        );
      }
      
  return (
    <div className="container py-8">
      <h1 className="font-headline text-4xl font-bold">Checkout</h1>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Shipping & Payment</CardTitle>
                </CardHeader>
                <CardContent>
                <Accordion type="single" defaultValue="shipping" collapsible className="w-full">
                    <AccordionItem value="shipping">
                        <AccordionTrigger className="font-headline text-lg">Shipping Address</AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <form className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" placeholder="John Doe" />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input id="address" placeholder="123 Main St" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input id="city" placeholder="Anytown" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <Input id="state" placeholder="CA" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="zip">ZIP Code</Label>
                                    <Input id="zip" placeholder="12345" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input id="country" placeholder="USA" />
                                </div>
                            </form>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="payment">
                        <AccordionTrigger className="font-headline text-lg">Payment Method</AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                              <Label htmlFor="card" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <RadioGroupItem value="card" id="card" className="sr-only" />
                                <CreditCard className="mb-3 h-6 w-6" />
                                Card
                              </Label>
                              <Label htmlFor="upi" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <RadioGroupItem value="upi" id="upi" className="sr-only" />
                                <Landmark className="mb-3 h-6 w-6" />
                                UPI
                              </Label>
                              <Label htmlFor="cod" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                <RadioGroupItem value="cod" id="cod" className="sr-only" />
                                <Wallet className="mb-3 h-6 w-6" />
                                Cash on Delivery
                              </Label>
                            </RadioGroup>
                            
                            {paymentMethod === 'card' && (
                                <form className="mt-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="card-number">Card Number</Label>
                                        <Input id="card-number" placeholder="**** **** **** 1234" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="expiry-date">Expiry</Label>
                                            <Input id="expiry-date" placeholder="MM/YY" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cvc">CVC</Label>
                                            <Input id="cvc" placeholder="123" />
                                        </div>
                                    </div>
                                </form>
                            )}
                            {paymentMethod === 'upi' && (
                                <div className="mt-6">
                                    <Label htmlFor="upi-id">UPI ID</Label>
                                    <Input id="upi-id" placeholder="yourname@bank" className="mt-2" />
                                </div>
                            )}
                             {paymentMethod === 'cod' && (
                                <div className="mt-6 rounded-md border bg-muted p-4 text-center text-muted-foreground">
                                    <p>You will pay when your order is delivered.</p>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {cart.map(item => (
                    <div key={item.productId} className="flex items-center gap-4">
                        <div className="relative h-16 w-16 flex-shrink-0 rounded-md border">
                            <Image src={item.image} alt={item.name} fill className="object-cover rounded-md"/>
                            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{item.quantity}</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                        </div>
                        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                ))}
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Discount ({discountPercentage}%)</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{shipping > 0 ? `$${shipping.toFixed(2)}` : 'Free'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Taxes</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
               <Separator />
               <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2">
                <Label htmlFor="coupon-checkout">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input 
                    id="coupon-checkout" 
                    placeholder="Enter coupon" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <Button type="submit">Apply</Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <Button size="lg" className="mt-4 w-full">Place Order</Button>
        </div>
      </div>
    </div>
  );
}
