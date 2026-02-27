
import { redirect } from 'next/navigation';

export default function OldWishlistPage() {
  // This page is obsolete, redirect to the new account wishlist page.
  redirect('/account/wishlist');
}
