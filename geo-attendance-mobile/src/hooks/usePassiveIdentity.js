import { useEffect, useRef } from 'react';
import { api } from '../api/client';

/**
 * Custom hook to periodically trigger face identity pulses (Phase 4.4)
 */
export function usePassiveIdentity(session) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (session) {
      startIdentityPulses();
    } else {
      stopIdentityPulses();
    }

    return () => stopIdentityPulses();
  }, [session]);

  const startIdentityPulses = () => {
    // Pulse every 5 minutes
    intervalRef.current = setInterval(async () => {
      try {
        // In actual PROD, we would silently open camera for 500ms
        // For SIMULATION in this phase, we send a periodic pulse to keep trust high
        const mockEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
        await api.post('/user/biometric/verify', { embedding: mockEmbedding });
        console.log('✔ Passive Identity Pulse Sent');
      } catch (e) {
        console.log('✘ Passive Identity Pulse Failed:', e.message);
      }
    }, 5 * 60 * 1000);
  };

  const stopIdentityPulses = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}
