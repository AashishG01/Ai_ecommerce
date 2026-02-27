
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Home, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const addressSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(2, 'Full name is required.'),
  phone: z.string().min(10, 'A valid phone number is required.'),
  addressLine1: z.string().min(5, 'Address is required.'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required.'),
  state: z.string().min(2, 'State is required.'),
  pinCode: z.string().min(5, 'Pin code is required.'),
  country: z.string().min(2, 'Country is required.'),
});

type Address = z.infer<typeof addressSchema>;

// Mock data
const initialAddresses: Address[] = [
  {
    id: '1',
    fullName: 'John Doe',
    phone: '123-456-7890',
    addressLine1: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    pinCode: '12345',
    country: 'USA',
  },
  {
    id: '2',
    fullName: 'John Doe',
    phone: '098-765-4321',
    addressLine1: '456 Oak Ave',
    addressLine2: 'Apt 4B',
    city: 'Someville',
    state: 'TX',
    pinCode: '67890',
    country: 'USA',
  },
];

export default function AddressBookPage() {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [defaultAddressId, setDefaultAddressId] = useState('1');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const { toast } = useToast();

  const form = useForm<Address>({
    resolver: zodResolver(addressSchema),
  });

  const onSubmit = (data: Address) => {
    if (editingAddress) {
      // Edit address
      setAddresses(addresses.map(addr => addr.id === editingAddress.id ? { ...data, id: addr.id } : addr));
      toast({ title: 'Address Updated' });
    } else {
      // Add new address
      setAddresses([...addresses, { ...data, id: String(Date.now()) }]);
      toast({ title: 'Address Added' });
    }
    setIsFormOpen(false);
    setEditingAddress(null);
    form.reset();
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    form.reset({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pinCode: '',
        country: '',
    });
    setIsFormOpen(true);
  };
  
  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    form.reset(address);
    setIsFormOpen(true);
  }

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter(addr => addr.id !== id));
    toast({ title: 'Address Removed', variant: 'destructive' });
  }

  const handleSetDefault = (id: string) => {
    setDefaultAddressId(id);
    toast({ title: 'Default Address Set' });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle className="font-headline text-2xl">Address Book</CardTitle>
            <CardDescription>Manage your saved delivery addresses.</CardDescription>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleAddNew}><Plus className="mr-2"/>Add New</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" {...form.register('fullName')} />
                        {form.formState.errors.fullName && <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>}
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" {...form.register('phone')} />
                         {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="addressLine1">Address Line 1</Label>
                        <Input id="addressLine1" {...form.register('addressLine1')} />
                         {form.formState.errors.addressLine1 && <p className="text-sm text-destructive">{form.formState.errors.addressLine1.message}</p>}
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                        <Input id="addressLine2" {...form.register('addressLine2')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" {...form.register('city')} />
                         {form.formState.errors.city && <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" {...form.register('state')} />
                         {form.formState.errors.state && <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="pinCode">Pin Code</Label>
                        <Input id="pinCode" {...form.register('pinCode')} />
                         {form.formState.errors.pinCode && <p className="text-sm text-destructive">{form.formState.errors.pinCode.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" {...form.register('country')} />
                         {form.formState.errors.country && <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>}
                    </div>
                    <DialogFooter className="col-span-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Address</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {addresses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {addresses.map((address) => (
              <Card key={address.id} className={cn("flex flex-col", defaultAddressId === address.id && "border-primary")}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{address.fullName}</h3>
                  </div>
                  {defaultAddressId === address.id && <Badge><Star className="mr-1 h-3 w-3"/>Default</Badge>}
                </CardHeader>
                <CardContent className="flex-grow space-y-1 text-sm text-muted-foreground">
                  <p>{address.phone}</p>
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>{address.city}, {address.state} {address.pinCode}</p>
                  <p>{address.country}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  {defaultAddressId !== address.id && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(address.id!)}>Set as Default</Button>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(address)}><Edit className="h-4 w-4" /></Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Address?</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete this address? This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(address.id!)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                <Home className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">No Addresses Saved</h3>
                <p className="mt-2 text-sm text-muted-foreground">Add a new address to get started with faster checkouts.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
