import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Teacher Tools
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A privacy-first suite of classroom tools. Manage rosters, create
            seating charts, generate lesson plans, and more — all with your
            student data encrypted and secure.
          </p>

          <div className="flex justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-primary">
                  Get Started
                </Link>
                <Link to="/timer" className="btn-secondary">
                  Try Timer (No Login)
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            title="Privacy First"
            description="Student data is encrypted in your browser before it ever reaches our servers. We can't read it even if we wanted to."
          />
          <FeatureCard
            title="AI-Powered"
            description="Generate bellringers, lesson plans, and rubrics using AI — all running on our secure, self-hosted infrastructure."
          />
          <FeatureCard
            title="Embeddable Tools"
            description="Use timers and other tools directly in Google Slides or Canva. No login required for public tools."
          />
          <FeatureCard
            title="Random Groups"
            description="Create fair, randomized student groups with constraints like keeping certain students together or apart."
          />
          <FeatureCard
            title="Seating Charts"
            description="Visual drag-and-drop seating chart editor with multiple layout templates."
          />
          <FeatureCard
            title="Standards Aligned"
            description="Lesson plans and rubrics automatically aligned to your state or national standards."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
