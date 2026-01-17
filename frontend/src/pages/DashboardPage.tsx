import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome back, {user?.name || 'Teacher'}!
      </h1>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickAction
          to="/rosters"
          title="Rosters"
          description="Manage your class rosters"
          icon="👥"
        />
        <QuickAction
          to="/seating"
          title="Seating Charts"
          description="Create and edit seating arrangements"
          icon="🪑"
        />
        <QuickAction
          to="/timer"
          title="Timer"
          description="Classroom timer and stopwatch"
          icon="⏱️"
        />
        <QuickAction
          to="/bellringers"
          title="Bellringers"
          description="Generate warm-up activities"
          icon="🔔"
          badge="AI"
        />
        <QuickAction
          to="/lessons"
          title="Lesson Plans"
          description="Create standards-aligned lessons"
          icon="📝"
          badge="AI"
        />
        <QuickAction
          to="/rubrics"
          title="Rubrics"
          description="Build assessment rubrics"
          icon="📊"
          badge="AI"
        />
      </div>

      {/* Recent activity placeholder */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="card text-center text-gray-500 py-8">
          <p>No recent activity yet.</p>
          <p className="text-sm mt-2">
            Get started by creating a roster or generating a lesson plan!
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  title,
  description,
  icon,
  badge,
}: {
  to: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      className="card hover:shadow-md transition-shadow relative group"
    >
      {badge && (
        <span className="absolute top-3 right-3 bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded">
          {badge}
        </span>
      )}
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </Link>
  );
}
