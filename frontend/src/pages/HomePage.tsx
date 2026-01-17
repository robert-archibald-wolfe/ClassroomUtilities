import { Link } from 'react-router-dom';
import { Container, Title, Text, Button, SimpleGrid, Paper, Group, Center } from '@mantine/core';
import { useAuthStore } from '../stores/authStore';

export default function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Container size="lg" py={80}>
      {/* Hero */}
      <Center>
        <div style={{ textAlign: 'center', maxWidth: 800 }}>
          <Title order={1} size="h1" mb="md">
            Teacher Tools
          </Title>
          <Text size="xl" c="dimmed" mb="xl">
            A privacy-first suite of classroom tools. Manage rosters, create
            seating charts, generate lesson plans, and more — all with your
            student data encrypted and secure.
          </Text>

          <Group justify="center" gap="md">
            {isAuthenticated ? (
              <Button component={Link} to="/dashboard" size="lg">
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button component={Link} to="/login" size="lg">
                  Get Started
                </Button>
                <Button component={Link} to="/timer" size="lg" variant="outline">
                  Try Timer (No Login)
                </Button>
              </>
            )}
          </Group>
        </div>
      </Center>

      {/* Features */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mt={80}>
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
      </SimpleGrid>
    </Container>
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
    <Paper withBorder p="md" radius="md">
      <Text fw={600} size="lg" mb="xs">
        {title}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Paper>
  );
}
