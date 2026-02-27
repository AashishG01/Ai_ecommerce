
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const settingsSchema = z.object({
  emailNotifications: z.boolean(),
  orderUpdates: z.boolean(),
  promotionalOffers: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      emailNotifications: true,
      orderUpdates: true,
      promotionalOffers: false,
      theme: 'dark',
      language: 'en',
    },
  });
  
  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      form.reset(JSON.parse(savedSettings));
    }
    setIsMounted(true);
  }, [form]);

  // Apply theme and save settings to localStorage
  useEffect(() => {
    if(!isMounted) return;
    const subscription = form.watch((value, { name }) => {
      if (name === 'theme') {
        const theme = value.theme;
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme!);
        }
      }
      localStorage.setItem('app-settings', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form, isMounted]);


  const onSubmit = (data: SettingsForm) => {
    console.log('Settings saved:', data);
    localStorage.setItem('app-settings', JSON.stringify(data));
    toast({
      title: 'Preferences Saved',
      description: 'Your settings have been updated.',
    });
  };

  if (!isMounted) {
      return null; // Or a loading skeleton
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Account Settings</CardTitle>
        <CardDescription>Manage your app-level and notification settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <h3 className="mb-4 font-headline text-lg font-medium">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates and news via email.</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={form.watch('emailNotifications')}
                  onCheckedChange={(checked) => form.setValue('emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="orderUpdates" className="text-base">Order Updates</Label>
                  <p className="text-sm text-muted-foreground">Get notified about your order status.</p>
                </div>
                 <Switch
                  id="orderUpdates"
                  checked={form.watch('orderUpdates')}
                  onCheckedChange={(checked) => form.setValue('orderUpdates', checked)}
                />
              </div>
               <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="promotionalOffers" className="text-base">Promotional Offers</Label>
                  <p className="text-sm text-muted-foreground">Receive special deals and discounts.</p>
                </div>
                 <Switch
                  id="promotionalOffers"
                  checked={form.watch('promotionalOffers')}
                  onCheckedChange={(checked) => form.setValue('promotionalOffers', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />
          
          <div>
            <h3 className="mb-4 font-headline text-lg font-medium">Appearance</h3>
            <div className="space-y-4">
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Theme</Label>
                        <p className="text-sm text-muted-foreground">Select your preferred color scheme.</p>
                    </div>
                     <Select
                        value={form.watch('theme')}
                        onValueChange={(value: 'light' | 'dark' | 'system') => form.setValue('theme', value)}
                      >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label className="text-base">Language</Label>
                        <p className="text-sm text-muted-foreground">Choose your preferred language.</p>
                    </div>
                     <Select
                        defaultValue={form.watch('language')}
                        onValueChange={(value) => form.setValue('language', value)}
                      >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit">Save Preferences</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
