
'use client';

import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Archive, FileDown, Package, Truck, CheckCircle } from 'lucide-react';
import Image from 'next/image';

// Mock data for orders
const orders = [
  {
    id: 'ORD001',
    date: '2023-10-26',
    total: 289.98,
    paymentStatus: 'Paid',
    deliveryStatus: 'Shipped',
    items: [
      { id: '1', name: 'Urban Explorer Backpack', price: 89.99, quantity: 1, image: 'https://picsum.photos/seed/product-1/100/100' },
      { id: '2', name: 'AcousticBliss Headphones', price: 199.99, quantity: 1, image: 'https://picsum.photos/seed/product-2/100/100' },
    ],
    shippingAddress: '123 Main St, Anytown, CA 12345, USA',
    tracking: [
        { status: 'Order Placed', date: '2023-10-26', icon: <Package/> },
        { status: 'Processing', date: '2023-10-26', icon: <Package/> },
        { status: 'Shipped', date: '2023-10-27', icon: <Truck/> },
        { status: 'Out for Delivery', date: null, icon: <Truck/> },
        { status: 'Delivered', date: null, icon: <CheckCircle/> },
    ]
  },
  {
    id: 'ORD002',
    date: '2023-09-15',
    total: 130.00,
    paymentStatus: 'Paid',
    deliveryStatus: 'Delivered',
    items: [
      { id: '4', name: 'StrideMax Runners', price: 130.00, quantity: 1, image: 'https://picsum.photos/seed/product-4/100/100' },
    ],
    shippingAddress: '456 Oak Ave, Someville, TX 67890, USA',
    tracking: [
        { status: 'Order Placed', date: '2023-09-15', icon: <Package/> },
        { status: 'Processing', date: '2023-09-15', icon: <Package/> },
        { status: 'Shipped', date: '2023-09-16', icon: <Truck/> },
        { status: 'Out for Delivery', date: '2023-09-17', icon: <Truck/> },
        { status: 'Delivered', date: '2023-09-17', icon: <CheckCircle/> },
    ]
  },
  {
    id: 'ORD003',
    date: '2023-11-01',
    total: 39.95,
    paymentStatus: 'Pending',
    deliveryStatus: 'Processing',
    items: [
      { id: '6', name: 'AeroPress Coffee Maker', price: 39.95, quantity: 1, image: 'https://picsum.photos/seed/product-6/100/100' },
    ],
    shippingAddress: '789 Pine Ln, Anotherburg, FL 24680, USA',
    tracking: [
        { status: 'Order Placed', date: '2023-11-01', icon: <Package/> },
        { status: 'Processing', date: '2023-11-01', icon: <Package/> },
        { status: 'Shipped', date: null, icon: <Truck/> },
        { status: 'Out for Delivery', date: null, icon: <Truck/> },
        { status: 'Delivered', date: null, icon: <CheckCircle/> },
    ]
  },
];

const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'paid': return 'default';
        case 'pending': return 'secondary';
        case 'refunded': return 'outline';
        case 'processing': return 'secondary';
        case 'shipped': return 'default';
        case 'delivered': return 'default';
        case 'cancelled': return 'destructive';
        default: return 'secondary';
    }
}
const getDeliveryStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'delivered': return 'default';
        case 'shipped': return 'default';
        case 'processing': return 'secondary';
        case 'cancelled': return 'destructive';
        default: return 'secondary';
    }
};

const Stepper = ({ tracking }: { tracking: { status: string; date: string | null; icon: React.ReactNode }[] }) => {
    const activeIndex = tracking.slice().reverse().findIndex(t => t.date !== null);
    const currentStep = activeIndex !== -1 ? tracking.length - 1 - activeIndex : 0;

    return (
        <ol className="relative ml-4 border-l border-gray-200 dark:border-gray-700">                  
            {tracking.map((step, index) => (
                <li key={index} className={`mb-10 ml-6 ${index > currentStep ? 'opacity-50' : ''}`}>            
                    <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-white dark:ring-gray-900 ${index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        {step.icon}
                    </span>
                    <h3 className="flex items-center mb-1 text-base font-semibold text-gray-900 dark:text-white">{step.status}</h3>
                    {step.date && <time className="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">{new Date(step.date).toLocaleDateString()}</time>}
                </li>
            ))}
        </ol>
    )
}

export default function OrderHistoryPage() {
  if (orders.length === 0) {
    return (
      <Card className="text-center">
        <CardHeader>
            <div className="mx-auto rounded-full bg-secondary p-4">
                <Archive className="h-12 w-12 text-muted-foreground" />
            </div>
        </CardHeader>
        <CardContent>
          <h2 className="font-headline text-2xl font-semibold">No Orders Found</h2>
          <p className="mt-2 text-muted-foreground">
            You haven't placed any orders yet.
          </p>
          <Button asChild className="mt-6">
            <a href="/products">Start Shopping</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Order History</CardTitle>
        <CardDescription>View your past orders and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {orders.map((order) => (
            <AccordionItem value={order.id} key={order.id}>
              <AccordionTrigger>
                <div className="flex w-full items-center justify-between pr-4 text-sm">
                    <div className="flex flex-col items-start gap-1 text-left">
                        <span className="font-bold">Order #{order.id}</span>
                        <span className="text-muted-foreground">Date: {order.date}</span>
                    </div>
                    <div className="hidden flex-col items-end gap-1 text-right sm:flex">
                        <span className="font-bold">${order.total.toFixed(2)}</span>
                        <Badge variant={getDeliveryStatusVariant(order.deliveryStatus)}>{order.deliveryStatus}</Badge>
                    </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 p-4">
                <div>
                  <h4 className="font-semibold">Items Purchased</h4>
                  <Separator className="my-2"/>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-4">
                        <Image src={item.image} alt={item.name} width={64} height={64} className="rounded-md" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <Separator/>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <h4 className="mb-2 font-semibold">Order Summary</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>Shipping Address:</span><span className="text-right text-muted-foreground">{order.shippingAddress}</span></div>
                            <div className="flex justify-between"><span>Payment Status:</span><Badge variant={getStatusVariant(order.paymentStatus)}>{order.paymentStatus}</Badge></div>
                            <div className="flex justify-between font-bold"><span>Total:</span><span>${order.total.toFixed(2)}</span></div>
                        </div>
                        <Button variant="outline" className="mt-4 w-full md:w-auto"><FileDown className="mr-2"/>Download Invoice</Button>
                    </div>
                    <div>
                        <h4 className="mb-4 font-semibold">Order Tracking</h4>
                        <Stepper tracking={order.tracking} />
                    </div>
                </div>

              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
