import Link from 'next/link';
import { Package, Shield, Lock, Eye, Server, FileText, AlertTriangle } from 'lucide-react';

export default function SecurityPage() {
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
        <h1 className="text-4xl font-bold mb-8">Security Policy</h1>
        
        <p className="text-muted-foreground mb-8">
          Last updated: April 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Our Commitment to Security</h2>
            <p className="text-muted-foreground mb-4">
              At Mozetech, we take the security of your data seriously. MozAssets is built with 
              security-first principles to protect your organization's sensitive asset information.
            </p>
            <p className="text-muted-foreground">
              This document outlines our security measures and responsibilities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data Protection</h2>
            <p className="text-muted-foreground mb-4">
              We implement multiple layers of protection:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Encryption at Rest:</strong> All data is encrypted when stored in our database</li>
              <li><strong>Encryption in Transit:</strong> All data is encrypted during transmission using TLS 1.2+</li>
              <li><strong>Database Security:</strong> PostgreSQL database with firewall and access controls</li>
              <li><strong>Secure Backups:</strong> Encrypted backups stored in separate locations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Access Controls</h2>
            <p className="text-muted-foreground mb-4">
              We use role-based access control (RBAC):
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Organization Admin:</strong> Full access to manage organization settings</li>
              <li><strong>Manager:</strong> Manage assets, users, and create reports</li>
              <li><strong>User:</strong> View and update assigned assets</li>
              <li><strong>Viewer:</strong> Read-only access to specified areas</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Admins can assign appropriate roles to their organization users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Authentication</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Secure session management with automatic timeouts</li>
              <li>Email-based verification for new accounts</li>
              <li>Password strength requirements enforced</li>
              <li>Failed login attempt monitoring</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Infrastructure Security</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Cloud Hosting:</strong> Hosted on secure cloud infrastructure (Vercel)</li>
              <li><strong>Database:</strong> Managed PostgreSQL (Neon) with encryption</li>
              <li><strong>Firewall:</strong> Network-level protection</li>
              <li><strong>Uptime:</strong> 99.9% uptime SLA for Enterprise</li>
              <li><strong>CDN:</strong> Content delivery network for fast access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Audit Logging</h2>
            <p className="text-muted-foreground mb-4">
              We maintain comprehensive audit logs:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>All user logins and logouts</li>
              <li>Asset creation, modification, and deletion</li>
              <li>User management actions</li>
              <li>Configuration changes</li>
              <li>Data exports</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Organization Admins can view relevant audit logs in their dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Payment Security</h2>
            <p className="text-muted-foreground mb-4">
              All payments are processed securely via Payfast, South Africa's leading payment gateway:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>PCI DSS compliant payment processing</li>
              <li>No credit card data stored on our servers</li>
              <li>Secure API integration</li>
              <li>Transaction verification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Incident Response</h2>
            <p className="text-muted-foreground mb-4">
              In case of a security incident:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Detection:</strong> Automated monitoring systems</li>
              <li><strong>Assessment:</strong> Security team evaluates impact</li>
              <li><strong>Notification:</strong> Affected users notified within 72 hours</li>
              <li><strong>Resolution:</strong> Immediate action to remediate</li>
              <li><strong>Prevention:</strong> Measures implemented to prevent recurrence</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Vulnerability Management</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Regular security assessments</li>
              <li>Automated dependency scanning</li>
              <li>Third-party penetration testing</li>
              <li>Timely security patches and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. User Responsibilities</h2>
            <p className="text-muted-foreground mb-4">
              For optimal security, we recommend users and organizations:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Use strong, unique passwords</li>
              <li>Enable two-factor authentication (when available)</li>
              <li>Regularly review user access and remove inactive accounts</li>
              <li>Assign minimum necessary permissions to users</li>
              <li>Report suspicious activity to security@mozetech.com</li>
              <li>Keep contact information current for notifications</li>
              <li>Train users on security best practices</li>
              <li>Never share login credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Compliance</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>POPIA (Protection of Personal Information Act) compliant</li>
              <li>PCI DSS for payment processing</li>
              <li>GDPR-ready data handling</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Reporting Security Issues</h2>
            <p className="text-muted-foreground mb-4">
              If you discover a security vulnerability or have security concerns:
            </p>
            <p className="text-muted-foreground">
              Contact <strong>security@mozetech.com</strong> immediately. 
              We appreciate responsible disclosure and will work with you to address any issues.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact</h2>
            <p className="text-muted-foreground">
              For security-related questions, contact{' '}
              <strong>security@mozetech.com</strong>
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