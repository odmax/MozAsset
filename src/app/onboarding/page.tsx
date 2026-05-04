'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Building2, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  SkipForward,
  Home,
  LogOut
} from 'lucide-react';

interface StepProps {
  onNext: () => void;
  onSkip?: () => void;
}

function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Welcome to MozAssets</h2>
        <p className="text-muted-foreground mt-2">
          Let's set up your account in just a few minutes.
        </p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
        <p><strong>Here's what we'll do:</strong></p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>Set up your organization</li>
          <li>Add your first department</li>
          <li>Add a location</li>
          <li>(Optional) Add your first asset</li>
        </ul>
      </div>
      <Button onClick={onNext} className="w-full">
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function OrganizationStep({ onNext }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Name Your Organization</h2>
        <p className="text-muted-foreground mt-2">
          What should we call your company or team?
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization Name</Label>
          <Input id="orgName" placeholder="Acme Corporation" />
        </div>
      </div>
      <Button onClick={onNext} className="w-full">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function DepartmentStep({ onNext, onSkip }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Create Your First Department</h2>
        <p className="text-muted-foreground mt-2">
          Departments help you organize assets by team or location.
        </p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deptName">Department Name</Label>
            <Input id="deptName" placeholder="Engineering" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deptCode">Code (optional)</Label>
            <Input id="deptCode" placeholder="ENG" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deptDesc">Description (optional)</Label>
          <Input id="deptDesc" placeholder="Software development team" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onSkip} className="flex-1">
          Skip
          <SkipForward className="ml-2 h-4 w-4" />
        </Button>
        <Button type="button" onClick={onNext} className="flex-1">
          Create
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LocationStep({ onNext, onSkip }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">Add Your First Location</h2>
        <p className="text-muted-foreground mt-2">
          Where are your assets located?
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="locName">Location Name</Label>
          <Input id="locName" placeholder="Headquarters" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locAddress">Address (optional)</Label>
          <Input id="locAddress" placeholder="123 Main St, City" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="locBuilding">Building</Label>
            <Input id="locBuilding" placeholder="A" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locFloor">Floor</Label>
            <Input id="locFloor" placeholder="1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locRoom">Room</Label>
            <Input id="locRoom" placeholder="101" />
          </div>
        </div>
      </div>
<div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onSkip} className="flex-1">
          Skip
          <SkipForward className="ml-2 h-4 w-4" />
        </Button>
        <Button type="button" onClick={onNext} className="flex-1">
          Add
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AssetStep({ onNext, onSkip }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="h-6 w-6 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold">Add Your First Asset</h2>
        <p className="text-muted-foreground mt-2">
          Get started by adding an asset to track.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="assetName">Asset Name</Label>
          <Input id="assetName" placeholder="MacBook Pro 16inch" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assetSerial">Serial Number</Label>
            <Input id="assetSerial" placeholder="SN123456789" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assetBrand">Brand</Label>
            <Input id="assetBrand" placeholder="Apple" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Button type="button" onClick={onNext} className="w-full">
          Add Asset
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="w-full">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function CompletionStep({ onNext }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">You're All Set!</h2>
        <p className="text-muted-foreground mt-2">
          Your account is ready. Start managing your assets!
        </p>
      </div>
      <div className="bg-slate-50 rounded-lg p-4 text-sm">
        <p><strong>Next steps:</strong></p>
        <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
          <li>Add more departments and locations</li>
          <li>Import existing assets via CSV</li>
          <li>Assign assets to team members</li>
          <li>Set up maintenance schedules</li>
        </ul>
      </div>
      <Button type="button" onClick={onNext} className="w-full" size="lg">
        Go to Dashboard
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

const steps = [
  { component: WelcomeStep, title: 'Welcome' },
  { component: OrganizationStep, title: 'Organization' },
  { component: DepartmentStep, title: 'Department' },
  { component: LocationStep, title: 'Location' },
  { component: AssetStep, title: 'Asset' },
  { component: CompletionStep, title: 'Complete' },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    organization: '',
    department: { name: '', code: '', description: '' },
    location: { name: '', address: '', building: '', floor: '', room: '' },
    asset: { name: '', serial: '', brand: '' },
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/onboarding/complete', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          window.location.href = '/dashboard';
          return;
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const nextStep = currentStep + 1;
    
    // Step 1: Create organization
    if (currentStep === 1 && formData.organization) {
      await fetch('/api/onboarding/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.organization }),
      });
    }
    
    if (currentStep === 2 && formData.department.name) {
      await fetch('/api/onboarding/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.department),
      });
    }
    
    if (currentStep === 3 && formData.location.name) {
      await fetch('/api/onboarding/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.location),
      });
    }
    
    if (currentStep === 4 && formData.asset.name) {
      await fetch('/api/onboarding/asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.asset),
      });
    }

    setIsLoading(false);
    setCurrentStep(nextStep);
  };

  const handleSkip = async () => {
    if (currentStep === steps.length - 2) {
      setCurrentStep(steps.length - 1);
    } else if (currentStep === steps.length - 1) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/onboarding/complete', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          window.location.href = '/dashboard';
          return;
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Package className="h-6 w-6 text-primary" />
              <span>MozAssets</span>
            </Link>
          </div>
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
          <CardTitle className="mt-4">{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent 
            onNext={handleNext} 
            onSkip={handleSkip}
          />
        </CardContent>
        {currentStep > 0 && currentStep < steps.length - 1 && (
          <div className="flex justify-center pb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}