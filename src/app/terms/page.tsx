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
          Last updated: April 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using MozAssets ("the Service"), provided by Mozetech ("we", "our", or "us"), 
              you agree to be bound by these Terms of Service. If you disagree with any part of these terms, 
              do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              MozAssets is a cloud-based SaaS platform for tracking, managing, and maintaining 
              organizational assets. The Service includes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Asset registration and tracking</li>
              <li>User and role management</li>
              <li>Department and location organization</li>
              <li>Maintenance scheduling and tracking</li>
              <li>Asset assignment and transfer</li>
              <li>Reporting and analytics</li>
              <li>Financial depreciation tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground mb-4">
              To use MozAssets, you must create an account. When registering, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain a valid email address</li>
              <li>Verify your email address</li>
              <li>Be at least 18 years old or have legal authority to bind your organization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Account Security</h2>
            <p className="text-muted-foreground mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activities that occur under your account</li>
              <li>Ensuring users in your organization comply with these terms</li>
              <li>Promptly notifying us of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Organization Admin Responsibilities</h2>
            <p className="text-muted-foreground mb-4">
              Organization administrators ("Admins") have additional responsibilities:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Managing user access within their organization</li>
              <li>Ensuring proper role assignments</li>
              <li>Maintaining compliance with internal policies</li>
              <li>Acting as the primary contact for billing matters</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">
              You agree NOT to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Violate any laws or regulations of South Africa or your jurisdiction</li>
              <li>Infringe on intellectual property rights of Mozetech or third parties</li>
              <li>Upload or transmit malicious code, viruses, or malware</li>
              <li>Attempt to gain unauthorized access to our systems or other users' data</li>
              <li>Interfere with or disrupt the Service operation</li>
              <li>Collect or store personal data of other users without consent</li>
              <li>Resell or redistribute the Service without authorization</li>
              <li>Use the Service for any illegal purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Subscription Plans</h2>
            <p className="text-muted-foreground mb-4">
              MozAssets offers the following plans:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Free Plan:</strong> Up to 50 assets, 1 department, 1 location</li>
              <li><strong>Pro Plan:</strong> R149/month or R1,490/year - Up to 1,000 assets, unlimited departments and locations</li>
              <li><strong>Enterprise Plan:</strong> R599/month or R5,990/year - Unlimited assets, multi-branch support, API access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Billing and Payment</h2>
            <p className="text-muted-foreground mb-4">
              For paid subscriptions:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Billing cycles are monthly or annual, in advance</li>
              <li>Payments are processed securely via Payfast (South African payment processor)</li>
              <li>All prices are in South African Rand (ZAR)</li>
              <li>Fees are non-refundable except as required by South African law</li>
              <li>Prices may change with 30 days' written notice</li>
              <li>Unpaid accounts may be suspended after 14 days</li>
              <li>You may cancel at any time; access continues until end of billing period</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data and Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              <strong>Your Data:</strong> You retain ownership of all data you upload to MozAssets. 
              You grant us a license to host and process your data to provide the Service.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Our Property:</strong> The Service, including all software, features, and content, 
              is owned by Mozetech and protected by South African and international copyright laws.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>You may not copy, modify, reverse engineer, or distribute our software</li>
              <li>You may not resell the Service without written authorization</li>
              <li>"MozAssets" and the Mozetech logo are registered trademarks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND</li>
              <li>WE DISCLAIM ALL IMPLIED WARRANTIES INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
              <li>WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES</li>
              <li>OUR TOTAL LIABILITY IS LIMITED TO THE LESSER OF THE AMOUNT YOU PAID IN THE PAST 12 MONTHS OR R10,000</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Force Majeure</h2>
            <p className="text-muted-foreground">
              We will not be liable for failures due to causes beyond our reasonable control, 
              including but not limited to acts of God, natural disasters, war, terrorism, 
              riots, embargoes, acts of civil or military authorities, fire, floods, 
              epidemics, strikes, or failures of third-party telecommunications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="text-muted-foreground mb-4">
              <strong>By You:</strong> You may cancel your subscription at any time through your 
              dashboard or by contacting support. Your access continues until the end of your 
              current billing period.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>By Us:</strong> We may terminate or suspend your account immediately if you:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Violate these Terms of Service</li>
              <li>Fail to pay when due</li>
              <li>Engage in illegal or abusive behavior</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Upon termination, you lose access to your account and data. We retain your data for 30 days 
              after termination to allow data export requests.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless Mozetech, its officers, directors, 
              and employees from any claims, damages, losses, or expenses (including 
              reasonable legal fees) arising from your use of the Service or violation 
              of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of the Republic of South Africa. 
              Any disputes will be resolved in the courts of South Africa, and you consent 
              to the exclusive jurisdiction of South African courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may modify these Terms at any time. We will notify you of material 
              changes via email or through the Service. Continued use after changes 
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact{' '}
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