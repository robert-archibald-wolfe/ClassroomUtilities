import { Link, useNavigate } from 'react-router-dom';
import { AppShell, Group, Button, Text, NavLink as MantineNavLink, Container } from '@mantine/core';
import { useAuthStore } from '../stores/authStore';
import { cryptoManager } from '../crypto';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    cryptoManager.clear();
    navigate('/login');
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          {/* Logo & Navigation */}
          <Group>
            <Text
              component={Link}
              to="/dashboard"
              size="xl"
              fw={700}
              c="blue"
              style={{ textDecoration: 'none' }}
            >
              Teacher Tools
            </Text>

            <Group gap="xs" visibleFrom="sm">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/rosters">Rosters</NavLink>
              <NavLink to="/seating">Seating</NavLink>
              <NavLink to="/timer">Timer</NavLink>
              <NavLink to="/bellringers">Bellringers</NavLink>
              <NavLink to="/lessons">Lessons</NavLink>
              <NavLink to="/rubrics">Rubrics</NavLink>
            </Group>
          </Group>

          {/* User menu */}
          <Group gap="md">
            <Text size="sm" c="dimmed">
              {user?.name || user?.email}
            </Text>
            <Button variant="subtle" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">{children}</Container>
      </AppShell.Main>
    </AppShell>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <MantineNavLink
      component={Link}
      to={to}
      label={children}
      style={{ padding: '0.5rem 0.75rem' }}
    />
  );
}
