import { useState, useEffect, useCallback } from 'react';

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
  const [customMinutes, setCustomMinutes] = useState('5');

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
    const minutes = parseInt(customMinutes, 10);
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
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* Mode toggle */}
      <div className="mb-8 flex gap-2">
        <button
          onClick={() => {
            setMode('countdown');
            setTimeLeft(initialTime);
            setIsRunning(false);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'countdown'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Countdown
        </button>
        <button
          onClick={() => {
            setMode('stopwatch');
            setTimeLeft(0);
            setIsRunning(false);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'stopwatch'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Stopwatch
        </button>
      </div>

      {/* Timer display */}
      <div className="relative mb-8">
        {/* Progress ring (countdown only) */}
        {mode === 'countdown' && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#374151"
              strokeWidth="8"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
        )}

        {/* Time display */}
        <div className="w-48 h-48 flex items-center justify-center">
          <span
            className={`text-6xl font-mono font-bold ${
              timeLeft === 0 && mode === 'countdown'
                ? 'text-red-500 animate-pulse'
                : 'text-white'
            }`}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            Pause
          </button>
        )}
        <button
          onClick={handleReset}
          className="bg-gray-600 hover:bg-gray-500 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Presets (countdown mode) */}
      {mode === 'countdown' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                onClick={() => handlePreset(preset.seconds)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  initialTime === preset.seconds
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom time */}
          <div className="flex items-center gap-2 justify-center">
            <input
              type="number"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="w-20 px-3 py-2 bg-gray-700 text-white rounded-lg text-center"
              min="1"
              max="999"
            />
            <span className="text-gray-400">minutes</span>
            <button
              onClick={handleCustomTime}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen hint */}
      <p className="mt-8 text-gray-500 text-sm">
        Press F11 for fullscreen
      </p>
    </div>
  );
}
