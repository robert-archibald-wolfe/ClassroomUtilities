import { useState, useEffect, useCallback } from 'react';
import { Button, Group, NumberInput, SegmentedControl, RingProgress, Text, Center, Stack } from '@mantine/core';

type TimerMode = 'countdown' | 'stopwatch';

const PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '25 min', seconds: 1500 },
];

export default function TimerPage() {
  const [mode, setMode] = useState<TimerMode>('countdown');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
  const [initialTime, setInitialTime] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<string | number>(5);

  // Timer logic
  useEffect(() => {
    let interval: number | undefined;

    if (isRunning) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (mode === 'countdown') {
            if (prev <= 1) {
              setIsRunning(false);
              // Play sound
              playAlert();
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode]);

  const playAlert = useCallback(() => {
    // Simple beep using Web Audio API
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // Audio not supported
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'countdown' ? initialTime : 0);
  };

  const handlePreset = (seconds: number) => {
    setIsRunning(false);
    setInitialTime(seconds);
    setTimeLeft(seconds);
    setMode('countdown');
  };

  const handleCustomTime = () => {
    const minutes = typeof customMinutes === 'number' ? customMinutes : parseInt(customMinutes, 10);
    if (!isNaN(minutes) && minutes > 0) {
      const seconds = minutes * 60;
      setInitialTime(seconds);
      setTimeLeft(seconds);
      setMode('countdown');
      setIsRunning(false);
    }
  };

  const progress =
    mode === 'countdown' && initialTime > 0
      ? ((initialTime - timeLeft) / initialTime) * 100
      : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#1a1b1e', padding: '2rem' }}>
      <Center>
        <Stack gap="xl" align="center">
          {/* Mode toggle */}
          <SegmentedControl
            value={mode}
            onChange={(value) => {
              const newMode = value as TimerMode;
              setMode(newMode);
              setTimeLeft(newMode === 'countdown' ? initialTime : 0);
              setIsRunning(false);
            }}
            data={[
              { label: 'Countdown', value: 'countdown' },
              { label: 'Stopwatch', value: 'stopwatch' },
            ]}
            size="lg"
          />

          {/* Timer display */}
          <div style={{ position: 'relative', width: 300, height: 300 }}>
            {mode === 'countdown' ? (
              <Center style={{ width: '100%', height: '100%' }}>
                <RingProgress
                  size={300}
                  thickness={16}
                  sections={[{ value: progress, color: timeLeft === 0 ? 'red' : 'blue' }]}
                  label={
                    <Center>
                      <Text
                        size="4rem"
                        fw={700}
                        c={timeLeft === 0 ? 'red' : 'white'}
                        style={{ fontFamily: 'monospace' }}
                      >
                        {formatTime(timeLeft)}
                      </Text>
                    </Center>
                  }
                />
              </Center>
            ) : (
              <Center style={{ width: '100%', height: '100%' }}>
                <Text
                  size="4rem"
                  fw={700}
                  c="white"
                  style={{ fontFamily: 'monospace' }}
                >
                  {formatTime(timeLeft)}
                </Text>
              </Center>
            )}
          </div>

          {/* Controls */}
          <Group gap="md">
            {!isRunning ? (
              <Button onClick={handleStart} size="xl" color="green">
                Start
              </Button>
            ) : (
              <Button onClick={handlePause} size="xl" color="yellow">
                Pause
              </Button>
            )}
            <Button onClick={handleReset} size="xl" color="gray">
              Reset
            </Button>
          </Group>

          {/* Presets (countdown mode) */}
          {mode === 'countdown' && (
            <Stack gap="md" align="center">
              <Group gap="xs">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.seconds}
                    onClick={() => handlePreset(preset.seconds)}
                    variant={initialTime === preset.seconds ? 'filled' : 'default'}
                  >
                    {preset.label}
                  </Button>
                ))}
              </Group>

              {/* Custom time */}
              <Group gap="xs">
                <NumberInput
                  value={customMinutes}
                  onChange={setCustomMinutes}
                  min={1}
                  max={999}
                  style={{ width: 100 }}
                />
                <Text c="dimmed">minutes</Text>
                <Button onClick={handleCustomTime}>Set</Button>
              </Group>
            </Stack>
          )}

          {/* Fullscreen hint */}
          <Text c="dimmed" size="sm">
            Press F11 for fullscreen
          </Text>
        </Stack>
      </Center>
    </div>
  );
}
