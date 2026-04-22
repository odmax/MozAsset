import Link from 'next/link';
import { Package } from 'lucide-react';

export default function CookiesPage() {
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
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        
        <p className="text-muted-foreground mb-8">
          Last updated: January 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small text files stored on your device when you visit websites. 
              They help remember your preferences and improve your experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Authentication:</strong> Keep you logged in</li>
              <li><strong>Preferences:</strong> Remember your settings</li>
              <li><strong>Analytics:</strong> Understand how people use our service</li>
              <li><strong>Security:</strong> Protect against fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Essential Cookies</h3>
                <p className="text-muted-foreground text-sm">
                  Required for the service to work. Cannot be disabled.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Analytics Cookies</h3>
                <p className="text-muted-foreground text-sm">
                  Help us understand how visitors interact with our service.
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Marketing Cookies</h3>
                <p className="text-muted-foreground text-sm">
                  Used to deliver relevant advertisements.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="text-muted-foreground mb-4">
              You can control or disable cookies in your browser settings:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Chrome: Settings → Privacy → Cookies</li>
              <li>Firefox: Options → Privacy & Security</li>
              <li>Safari: Preferences → Privacy</li>
              <li>Edge: Settings → Cookies and site permissions</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Disabling essential cookies may limit functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Cookies</h2>
            <p className="text-muted-foreground">
              We use third-party services (like analytics) that may set their own cookies. 
              We don't control these cookies. Check the third-party policies for more information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Updates to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy periodically. Changes take effect when posted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              Questions about this policy? Contact us at{' '}
              <strong>privacy@assetmanager.io</strong>
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