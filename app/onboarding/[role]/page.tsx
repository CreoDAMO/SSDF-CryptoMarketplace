'use client';
import { useState, use, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { HLE_PHRASES } from '@/lib/hle-phrases';
import useRegretBuffer from '@/hooks/useRegretBuffer';

export default function Onboarding({ params }: { params: Promise<{ role: 'buyer' | 'seller' }> }) {
  const { role } = use(params);
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [affirmations, setAffirmations] = useState({ escrow: false, disputes: false, finality: false });
  const [quizAnswers, setQuizAnswers] = useState({});
  const [attempts, setAttempts] = useState(0);
  const regretBuffer = useRegretBuffer(); // Hook for delays

  if (attempts >= 3) {
    // Cooldown: Use setTimeout or DB timestamp check
    return <div>Too many attempts. Try again in 5 minutes.</div>;
  }

  const handleAffirm = (key: keyof typeof affirmations) => setAffirmations((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleQuiz = async (qId: string, answer: string) => {
    setQuizAnswers((prev) => ({ ...prev, [qId]: answer }));
    // Submit to /api/onboarding/quiz (logs + checks correct)
    const res = await fetch('/api/onboarding/quiz', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qId, answer, isFinal: step === 3 }) 
    });
    if (!res.ok) {
      const data = await res.json();
      if (res.status === 429) {
        alert(data.error);
      }
      setAttempts((prev) => prev + 1);
      setStep(1); // Loop back on failure
    } else {
      nextStep();
    }
  };

  const completeOnboarding = async () => {
    if (regretBuffer.isBuffering) return;
    regretBuffer.start(5);
  };

  // Add confirmation logic for regret buffer
  useEffect(() => {
    if (regretBuffer.canConfirm) {
      const finalize = async () => {
        const res = await fetch('/api/onboarding/complete', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role })
        });
        if (res.ok) {
          window.location.href = '/dashboard';
        }
      };
      finalize();
    }
  }, [regretBuffer.canConfirm, role]);

  const nextStep = () => setStep((prev) => prev + 1);

  // Render modals per wireframe: Use steps to switch (e.g., if step === 1: Truth Modal)
  return (
    <div className="modal" style={{ padding: '2rem', maxWidth: '500px', margin: '2rem auto', background: '#1a1a2e', borderRadius: '12px', color: 'white' }}>
      {/* Step 1: Scrollable Truths */}
      {step === 1 && (
        <div>
          <h3>Foundational Truths</h3>
          <p style={{ margin: '1rem 0' }}>{HLE_PHRASES.TRUTH_1}</p>
          <p style={{ fontStyle: 'italic', opacity: 0.7 }}>{HLE_PHRASES.TRUTH_1_EXAMPLE}</p>
          <button onClick={nextStep} style={{ marginTop: '1.5rem', width: '100%' }}>I Understand</button>
        </div>
      )}
      {/* Step 2: Checkboxes */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3>Affirmations</h3>
          <label style={{ display: 'block' }}>
            <input type="checkbox" checked={affirmations.escrow} onChange={() => handleAffirm('escrow')} /> {HLE_PHRASES.AFFIRM_ESCROW}
          </label>
          <label style={{ display: 'block' }}>
            <input type="checkbox" checked={affirmations.disputes} onChange={() => handleAffirm('disputes')} /> {HLE_PHRASES.AFFIRM_DISPUTES}
          </label>
          <label style={{ display: 'block' }}>
            <input type="checkbox" checked={affirmations.finality} onChange={() => handleAffirm('finality')} /> {HLE_PHRASES.AFFIRM_FINALITY}
          </label>
          <button 
            onClick={nextStep} 
            disabled={!affirmations.escrow || !affirmations.disputes || !affirmations.finality}
            style={{ marginTop: '1rem' }}
          >
            Continue
          </button>
        </div>
      )}
      {/* Step 3: Quiz */}
      {step === 3 && (
        <div>
          <h3>Final Verification</h3>
          <p style={{ margin: '1rem 0' }}>{HLE_PHRASES.QUIZ_Q1}</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => handleQuiz('quiz', 'True')} style={{ flex: 1 }}>True</button>
            <button onClick={() => handleQuiz('quiz', 'False')} style={{ flex: 1 }}>False</button>
          </div>
        </div>
      )}
      {/* Step 4: Final Confirmation */}
      {step === 4 && (
        <div>
          <h3>Completion</h3>
          <p style={{ margin: '1rem 0' }}>Ready to finalize your onboarding as a {role}.</p>
          {regretBuffer.confirmModal}
          <button 
            onClick={completeOnboarding} 
            disabled={regretBuffer.isBuffering}
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {regretBuffer.isBuffering ? 'Wait...' : 'Complete Onboarding'}
          </button>
        </div>
      )}
    </div>
  );
}
