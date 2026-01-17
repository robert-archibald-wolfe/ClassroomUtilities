import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Alert,
  Anchor,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/client';
import { cryptoManager } from '../crypto';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isLogin
        ? await authApi.login({ email, password })
        : await authApi.register({ email, password, name });

      const { user, tokens } = response.data.data;

      // Initialize crypto manager with password
      // In production, salt would be stored/retrieved from server
      await cryptoManager.initialize(password);

      // Set auth state
      setAuth(user, tokens.access_token, tokens.refresh_token);

      // Show success notification
      notifications.show({
        title: 'Success',
        message: isLogin ? 'Welcome back!' : 'Account created successfully!',
        color: 'green',
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" mb="md">
        <Anchor component={Link} to="/" c="blue" underline="never">
          Teacher Tools
        </Anchor>
      </Title>

      <Text c="dimmed" size="sm" ta="center" mt={5} mb="xl">
        {isLogin ? 'Sign in to your account' : 'Create your account'}
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md">
        {error && (
          <Alert color="red" mb="md" title="Error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {!isLogin && (
              <TextInput
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                required={!isLogin}
              />
            )}

            <TextInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              type="email"
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              minLength={8}
              description={
                !isLogin
                  ? 'Your password is used to encrypt student data. If you forget it, your data cannot be recovered.'
                  : undefined
              }
            />

            <Button type="submit" fullWidth mt="md" loading={loading}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </Stack>
        </form>

        <Text c="dimmed" size="sm" ta="center" mt="md">
          <Anchor
            component="button"
            type="button"
            c="blue"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Anchor>
        </Text>
      </Paper>
    </Container>
  );
}
