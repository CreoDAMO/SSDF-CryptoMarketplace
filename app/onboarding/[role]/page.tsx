'use client';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { HLE_PHRASES } from '@/lib/hle-phrases';
import useRegretBuffer from '@/hooks/useRegretBuffer'; // See below

export default function Onboarding({ params: { role } }: { params: { role: 'buyer' | 'seller' } }) {
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
    const res = await fetch('/api/onboarding/quiz', { method: 'POST', body: JSON.stringify({ qId, answer }) });
    if (!res.ok) {
      setAttempts((prev) => prev + 1);
      setStep(1); // Loop back on failure
    }
  };

  const completeOnboarding = async () => {
    if (regretBuffer.isBuffering) return; // Enforce delay
    regretBuffer.start(5); // 5s Regret Buffer
    // On confirm: POST to /api/onboarding/complete → Set DB flag, redirect to dashboard
  };

  // Render modals per wireframe: Use steps to switch (e.g., if step === 1: Truth Modal)
  return (
    <div className="modal"> {/* Tailwind styled */}
      {/* Step 1: Scrollable Truths */}
      {step === 1 && <div>{HLE_PHRASES.TRUTH_1} {/* + Examples */}</div>}
      {/* Step 2: Checkboxes */}
      {step === 2 && (
        <>
          <label><input type="checkbox" onChange={() => handleAffirm('escrow')} /> {HLE_PHRASES.AFFIRM_ESCROW}</label>
          {/* Similar for others */}
        </>
      )}
      {/* Step 3: Timeline - Use SVG or simple divs for interactive */}
      {step === 3 && <div className="timeline">{/* Clickable steps per wireframe */}</div>}
      {/* Step 4: Quiz */}
      {step === 4 && (
        <>
          <p>{HLE_PHRASES.QUIZ_Q1}</p>
          <button onClick={() => handleQuiz('q1', 'False')}>False</button>
          {/* On wrong: Increment attempts */}
        </>
      )}
      <button onClick={completeOnboarding} disabled={!regretBuffer.canConfirm}>Complete</button>
    </div>
  );
}
