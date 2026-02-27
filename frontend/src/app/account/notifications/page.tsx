
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Package, Tag, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const notifications = [
  { id: '1', type: 'order_shipped', message: 'Your order #ORD001 has been shipped.', date: '2023-10-27', read: false, icon: <Package className="h-5 w-5"/> },
  { id: '2', type: 'promotion', message: 'New user discount! Use code NEWUSER for 10% off.', date: '2023-10-26', read: false, icon: <Tag className="h-5 w-5"/> },
  { id: '3', type: 'order_delivered', message: 'Your order #ORD002 has been delivered.', date: '2023-09-17', read: true, icon: <Package className="h-5 w-5"/> },
  { id: '4', type: 'review_reminder', message: 'How was your StrideMax Runners? Leave a review!', date: '2023-09-24', read: true, icon: <Package className="h-5 w-5"/> },
];

const getTypeBgColor = (type: string) => {
    switch (type) {
        case 'order_shipped': return 'bg-blue-500';
        case 'promotion': return 'bg-purple-500';
        case 'order_delivered': return 'bg-green-500';
        case 'review_reminder': return 'bg-yellow-500';
        default: return 'bg-gray-500';
    }
}

export default function NotificationsPage() {

  const handleMarkAllRead = () => {
    // In a real app, you would update the state and call an API
    console.log('Marking all notifications as read');
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle className="font-headline text-2xl">Notifications</CardTitle>
            <CardDescription>Keep track of order updates and alerts.</CardDescription>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead}><CheckCheck className="mr-2"/> Mark all as read</Button>
      </CardHeader>
      <CardContent>
        {notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map(notification => (
              <div key={notification.id} className={cn(
                  "flex items-start gap-4 rounded-lg border p-4",
                  !notification.read && "bg-muted/50"
              )}>
                <div className={cn("mt-1 grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-white", getTypeBgColor(notification.type))}>
                  {notification.icon}
                </div>
                <div className="flex-grow">
                    <p className="font-medium">{notification.message}</p>
                    <p className="text-sm text-muted-foreground">{notification.date}</p>
                </div>
                {!notification.read && <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary"></div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">No New Notifications</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll let you know when there's something new for you.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
