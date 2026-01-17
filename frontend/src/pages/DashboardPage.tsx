import { Link } from 'react-router-dom';
import { Title, SimpleGrid, Paper, Text, Badge, Group } from '@mantine/core';
import { useAuthStore } from '../stores/authStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div>
      <Title order={1} mb="xl">
        Welcome back, {user?.name || 'Teacher'}!
      </Title>

      {/* Quick actions */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
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
      </SimpleGrid>

      {/* Recent activity placeholder */}
      <div style={{ marginTop: 60 }}>
        <Title order={2} size="h3" mb="md">
          Recent Activity
        </Title>
        <Paper withBorder p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed">No recent activity yet.</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Get started by creating a roster or generating a lesson plan!
          </Text>
        </Paper>
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
    <Paper
      component={Link}
      to={to}
      withBorder
      p="lg"
      radius="md"
      style={{
        textDecoration: 'none',
        transition: 'box-shadow 0.2s',
        position: 'relative',
      }}
      className="hover-card"
    >
      {badge && (
        <Badge
          variant="light"
          color="blue"
          style={{ position: 'absolute', top: 12, right: 12 }}
        >
          {badge}
        </Badge>
      )}
      <Group gap="md" align="flex-start">
        <Text size="xl" style={{ fontSize: '2rem' }}>
          {icon}
        </Text>
        <div>
          <Text fw={600} size="lg">
            {title}
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            {description}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}
