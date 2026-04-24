import Link from 'next/link';
import { Package } from 'lucide-react';

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <p className="text-muted-foreground mb-8">
          Last updated: 24 April 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              MozAssets ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and protect your information 
              when you use our asset management platform, provided by Mozetech.
            </p>
            <p className="text-muted-foreground">
              By using MozAssets, you consent to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect the following types of information:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Account Information:</strong> Name, email address, company/organization name, phone number</li>
              <li><strong>Organization Data:</strong> Departments, locations, and branches you create</li>
              <li><strong>Asset Data:</strong> Asset details including serial numbers, purchase dates, values, locations, assignments, and maintenance history</li>
              <li><strong>User Data:</strong> Names, email addresses, roles, and permissions of users in your organization</li>
              <li><strong>Usage Data:</strong> Features used, login times, and interaction patterns</li>
              <li><strong>Device Information:</strong> Browser type, IP address, device details, and operating system</li>
              <li><strong>Payment Information:</strong> Billing address and payment history (processed via Payfast, South Africa)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your subscription and payments</li>
              <li>Track and manage your assets, users, departments, and locations</li>
              <li>Schedule and record maintenance activities</li>
              <li>Generate reports and analytics for your organization</li>
              <li>Send you important account notifications and updates</li>
              <li>Respond to your support requests</li>
              <li>Protect against fraud and unauthorized access</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Processing</h2>
            <p className="text-muted-foreground mb-4">
              Your data is stored on secure servers. By using MozAssets, you consent to the transfer of your data to and storage in South Africa for hosting purposes.
            </p>
            <p className="text-muted-foreground">
              We use cloud hosting services with industry-leading security to ensure your data is protected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
            <p className="text-muted-foreground mb-4">
              We do NOT sell your personal information or your organization's data. We may share data only with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Service Providers:</strong> Companies that help us operate the Service (hosting, database, email, analytics)</li>
              <li><strong>Payment Processors:</strong> Payfast for processing subscriptions in South African Rand</li>
              <li><strong>Legal Requirements:</strong> When required by South African law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In case of merger, sale, or acquisition (your data would be transferred with consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Cookies and Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar tracking technologies:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Essential Cookies:</strong> Required for login and session management</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how our Service is used</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can manage cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Payfast (South Africa):</strong> Payment processing</li>
              <li><strong>Neon (PostgreSQL):</strong> Database hosting</li>
              <li><strong>Vercel:</strong> Cloud hosting and CDN</li>
              <li><strong>Next.js:</strong> Application framework</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Encryption at rest and in transit (TLS/SSL)</li>
              <li>Role-based access controls</li>
              <li>Regular security audits</li>
              <li>Secure database hosting with firewall protection</li>
              <li>Multi-factor authentication support</li>
              <li>Audit logging of all data access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              Under South African data protection laws, you have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data ("right to be forgotten")</li>
              <li>Export your data in a machine-readable format</li>
              <li>Object to processing for direct marketing</li>
              <li>Lodge a complaint with the Information Regulator</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact <strong>privacy@mozetech.com</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We retain your data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>As long as your account is active</li>
              <li>For 30 days after account closure (for data export requests)</li>
              <li>Longer if required by law or for legitimate business purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
            <p className="text-muted-foreground">
              MozAssets is intended for business use and is not directed to children under 18. 
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your data is primarily stored and processed in South Africa. If data is transferred 
              internationally, we ensure adequate protection is in place.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy periodically. We will notify you of material changes 
              via email or through the Service. The date at the top indicates the last update.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact{' '}
              <strong>privacy@mozetech.com</strong>
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