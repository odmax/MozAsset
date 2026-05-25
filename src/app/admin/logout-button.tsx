'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('mozassets-theme-admin');
      localStorage.removeItem('mozassets-theme-public');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.removeProperty('--theme-color');
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin-login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Button variant="outline" size="sm" type="button" onClick={handleLogout} className="text-white border-slate-600 hover:bg-slate-800">
      <LogOut className="h-4 w-4" />
    </Button>
  );
}