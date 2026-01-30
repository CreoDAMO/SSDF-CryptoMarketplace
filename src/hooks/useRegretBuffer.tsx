import { useState, useEffect } from 'react';
import { HLE_PHRASES } from '@/lib/hle-phrases';

export default function useRegretBuffer() {
  const [isBuffering, setIsBuffering] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const start = (seconds: number) => {
    setIsBuffering(true);
    setTimer(seconds);
  };

  useEffect(() => {
    if (timer > 0) {
      const id = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(id);
    } else if (timer === 0 && isBuffering) {
      setShowConfirm(true); // Show secondary modal
    }
  }, [timer, isBuffering]);

  const confirm = async () => {
    // Log confirmation; proceed with action
    setShowConfirm(false);
    setIsBuffering(false);
  };

  const reset = () => {
    setIsBuffering(false);
    setTimer(0);
    setShowConfirm(false);
  };

  return { 
    start, 
    isBuffering, 
    canConfirm: showConfirm, 
    reset,
    confirmModal: showConfirm ? (
      <div className="confirm-modal">
        <p>{HLE_PHRASES.REGRET_CONFIRM}</p>
        <button onClick={confirm}>Confirm</button>
        <button onClick={() => setIsBuffering(false)}>Cancel</button>
      </div>
    ) : null
  };
}
