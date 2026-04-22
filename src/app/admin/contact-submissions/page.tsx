'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Loader2, 
  Mail,
  Calendar,
  Check,
  X
} from 'lucide-react';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: string;
  createdAt: Date;
}

export default function AdminContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredSubs, setFilteredSubs] = useState<ContactSubmission[]>([]);

  useEffect(() => {
    fetch('/api/admin/contact-submissions')
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          redirect('/dashboard');
        }
        return res.json();
      })
      .then(data => {
        setSubmissions(data);
        setFilteredSubs(data);
      })
      .catch(() => redirect('/dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = submissions.filter(sub => 
        sub.name.toLowerCase().includes(search.toLowerCase()) ||
        sub.email.toLowerCase().includes(search.toLowerCase()) ||
        sub.company?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredSubs(filtered);
    } else {
      setFilteredSubs(submissions);
    }
  }, [search, submissions]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSubmissions(submissions.map(s => 
          s.id === id ? { ...s, status } : s
        ));
      }
    } catch (e) {
      console.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'CONTACTED':
        return <Badge className="bg-blue-100 text-blue-700">Contacted</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-green-100 text-green-700">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Submissions</h1>
        <p className="text-muted-foreground">Manage enterprise and sales inquiries</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Submissions ({filteredSubs.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubs.map((sub) => (
              <div key={sub.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-muted-foreground">{sub.email}</p>
                      {sub.company && (
                        <p className="text-sm text-muted-foreground">{sub.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(sub.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="bg-muted/50 rounded p-3 mb-3">
                  <p className="text-sm">{sub.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  {sub.status === 'PENDING' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateStatus(sub.id, 'CONTACTED')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Contacted
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUpdateStatus(sub.id, 'RESOLVED')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Resolved
                      </Button>
                    </>
                  )}
                  {sub.status === 'CONTACTED' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateStatus(sub.id, 'RESOLVED')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredSubs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No contact submissions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
