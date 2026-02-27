
import { redirect } from 'next/navigation';

export default function AccountPage() {
  // Redirect to the profile page by default
  redirect('/account/profile');
}
