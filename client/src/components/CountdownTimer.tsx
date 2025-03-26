import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
}

const CountdownTimer = ({ initialSeconds, onComplete }: CountdownTimerProps) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="text-sm text-neutral-600">
      Please wait {minutes > 0 ? `${minutes}m ` : ''}{remainingSeconds}s before trying again
    </div>
  );
};

export default CountdownTimer; 