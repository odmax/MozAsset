'use client';

import { useState } from 'react';
import { MessageCircle, X, Send, Check, ChevronRight, Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Link from 'next/link';

interface SupportOption {
  id: string;
  label: string;
  category: string;
  helpText: string;
}

const SUPPORT_OPTIONS: SupportOption[] = [
  { id: 'billing', label: 'Billing & Payments', category: 'billing', helpText: 'For billing questions, visit /dashboard/billing to view your plan and payment history. If you need to upgrade or modify your subscription, click "Upgrade" in the top right of your dashboard.' },
  { id: 'login', label: 'Login Issues', category: 'login', helpText: 'If you cannot log in: 1) Check your email for the correct address. 2) Use "Forgot Password" to reset. 3) Ensure your account is active - contact your organization admin.' },
  { id: 'assets', label: 'Managing Assets', category: 'assets', helpText: 'Add assets at /dashboard/assets/new. Edit or view assets by clicking on them. Use categories and locations to organize your assets.' },
  { id: 'reports', label: 'Reports & Export', category: 'reports', helpText: 'Generate reports at /dashboard/reports. Use filters to customize. Export data using the export buttons on each page.' },
  { id: 'other', label: 'Other Question', category: 'other', helpText: 'Describe your issue in detail and we will help you resolve it.' },
];

const FREE_MESSAGES = [
  "Hey friend! I'd love to spill all the support secrets, but premium chatbot help lives on PRO and Enterprise. Upgrade to PRO and let's talk properly!",
  "Oh, you found my secret hideout! 😄 The full support chatbot is waiting for PRO and Enterprise users. Worth the upgrade, I promise!",
  "We can't both use the premium support chatbot - it's invite-only! 😜 Upgrade to PRO and we'll be best friends.",
  "Nice try! The fancy support bot gets lonely on PRO. Want to set it free? Upgrade and say hello!",
  "You're this close to the good stuff! Premium support is only on PRO. Let's make it happen!",
];

interface SupportWidgetProps {
  userPlan: string;
}

export default function SupportWidget({ userPlan }: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'menu' | 'help' | 'ticket' | 'submitted' | 'locked'>('menu');
  const [selectedOption, setSelectedOption] = useState<SupportOption | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [randomMessage] = useState(() => FREE_MESSAGES[Math.floor(Math.random() * FREE_MESSAGES.length)]);

  const isProOrEnterprise = userPlan === 'PRO' || userPlan === 'ENTERPRISE';

  const handleOpen = () => {
    if (!isProOrEnterprise) {
      setStep('locked');
    }
    setIsOpen(true);
  };

  const handleOptionSelect = (option: SupportOption) => {
    setSelectedOption(option);
    setStep('help');
  };

  const handleSolved = () => {
    setIsOpen(false);
    setStep('menu');
    setSelectedOption(null);
  };

  const handleNotSolved = () => {
    setStep('ticket');
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: ticketSubject,
          category: selectedOption?.category || 'other',
          message: ticketMessage,
        }),
      });

      if (res.ok) {
        setTicketCreated(true);
        setStep('submitted');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('menu');
    setSelectedOption(null);
    setTicketSubject('');
    setTicketMessage('');
    setTicketCreated(false);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 'locked' ? 'Premium Support 🔒' : 'Support'}
            </DialogTitle>
            <DialogDescription>
              {step === 'locked' && 'Unlock Full Support'}
              {!isProOrEnterprise && step !== 'locked' && 'Select a category to get help'}
              {step === 'help' && selectedOption?.label}
              {step === 'ticket' && 'Create Support Ticket'}
              {step === 'submitted' && 'Ticket Created'}
            </DialogDescription>
          </DialogHeader>

          {step === 'locked' && (
            <div className="space-y-4">
              <div className="flex justify-center py-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                    <Lock className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm">{randomMessage}</p>
              </div>
              <Link href="/upgrade" onClick={() => setIsOpen(false)}>
                <Button className="w-full">
                  Upgrade to PRO
                </Button>
              </Link>
              <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
                Maybe Later
              </Button>
            </div>
          )}

          {step === 'menu' && isProOrEnterprise && (
            <div className="space-y-2">
              {SUPPORT_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleOptionSelect(option)}
                >
                  <span>{option.label}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ))}
            </div>
          )}

          {step === 'help' && selectedOption && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedOption.helpText}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleSolved}>
                  <Check className="h-4 w-4 mr-2" />
                  Yes, Solved
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleNotSolved}>
                  No, Create Ticket
                </Button>
              </div>
            </div>
          )}

          {step === 'ticket' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full min-h-[100px] p-3 border rounded-md"
                />
              </div>
              <Button className="w-full" onClick={handleSubmitTicket} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Ticket
              </Button>
            </div>
          )}

          {step === 'submitted' && (
            <div className="space-y-4 text-center py-4">
              <Check className="h-12 w-12 mx-auto text-green-500" />
              <p>Your support ticket has been created. Our team will respond within 24 hours.</p>
              <Button onClick={handleClose}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}