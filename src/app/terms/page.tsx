import Link from 'next/link';
import { Package } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Package className="h-6 w-6 text-primary" />
              <span>MozAssets</span>
            </Link>
            <Link href="/" className="text-sm text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <p className="text-muted-foreground mb-8">
          Last updated: January 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using MozAssets, you agree to be bound by these Terms of Service. 
              If you disagree with any part, do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              MozAssets is a cloud-based platform for tracking, managing, and maintaining 
              organizational assets. We provide tools for asset registration, assignment, 
              maintenance scheduling, and reporting.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground mb-4">
              When you create an account, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Promptly update any changes</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malicious code or viruses</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Interfere with service operation</li>
              <li>Collect user data without consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-muted-foreground">
              The service, including all content and functionality, is owned by Mozetech 
              and is protected by copyright and other intellectual property laws. 
              You may not copy, modify, or distribute our service without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Payment Terms</h2>
            <p className="text-muted-foreground mb-4">
              For paid plans:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Billing is monthly or annual in advance</li>
              <li>Fees are non-refundable unless required by law</li>
              <li>Prices may change with 30 days notice</li>
              <li>Unpaid accounts may be suspended</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account if you violate these terms. 
              You may cancel your subscription at any time. Upon termination, 
              you lose access to your account and data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES. WE DISCLAIM ALL IMPLIED WARRANTIES 
              INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. 
              OUR TOTAL LIABILITY IS LIMITED TO THE AMOUNT PAID FOR OUR SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold us harmless from any claims arising from 
              your use of the service or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms are governed by the laws of the State of Delaware. 
              Any disputes will be resolved in Delaware courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may modify these terms at any time. Continued use after changes constitutes 
              acceptance of new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these terms, contact{' '}
              <strong>legal@mozetech.com</strong>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground text-center">
            © 2026 MozAssets by Mozetech. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}