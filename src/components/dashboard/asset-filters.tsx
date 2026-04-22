'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface AssetFiltersProps {
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  canManage: boolean;
}

export function AssetFilters({ categories, departments, canManage }: AssetFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [condition, setCondition] = useState(searchParams.get('condition') || 'all');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || 'all');
  const [departmentId, setDepartmentId] = useState(searchParams.get('departmentId') || 'all');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (condition && condition !== 'all') params.set('condition', condition);
      if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId);
      if (departmentId && departmentId !== 'all') params.set('departmentId', departmentId);
      router.push(`/dashboard/assets?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, status, condition, categoryId, departmentId, router]);

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setCondition('all');
    setCategoryId('all');
    setDepartmentId('all');
  };

  const hasFilters = search || status !== 'all' || condition !== 'all' || categoryId !== 'all' || departmentId !== 'all';

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <div className="relative col-span-6 md:col-span-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="AVAILABLE">Available</SelectItem>
          <SelectItem value="ASSIGNED">Assigned</SelectItem>
          <SelectItem value="IN_REPAIR">In Repair</SelectItem>
          <SelectItem value="RETIRED">Retired</SelectItem>
          <SelectItem value="DISPOSED">Disposed</SelectItem>
          <SelectItem value="LOST">Lost</SelectItem>
        </SelectContent>
      </Select>
      <Select value={condition} onValueChange={setCondition}>
        <SelectTrigger>
          <SelectValue placeholder="Condition" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Conditions</SelectItem>
          <SelectItem value="EXCELLENT">Excellent</SelectItem>
          <SelectItem value="GOOD">Good</SelectItem>
          <SelectItem value="FAIR">Fair</SelectItem>
          <SelectItem value="POOR">Poor</SelectItem>
          <SelectItem value="NEEDS_REPAIR">Needs Repair</SelectItem>
        </SelectContent>
      </Select>
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={departmentId} onValueChange={setDepartmentId}>
        <SelectTrigger>
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
