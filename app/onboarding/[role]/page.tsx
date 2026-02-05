'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { HLE_PHRASES } from '@/lib/hle-phrases';
import useRegretBuffer from '@/hooks/useRegretBuffer';

export default function Onboarding({ params }: { params: { role: 'buyer' | 'seller' } }) {
  const { role } = params;
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [affirmations, setAffirmations] = useState({ escrow: false, disputes: false, finality: false });
  const [quizAnswers, setQuizAnswers] = useState({});
  const [attempts, setAttempts] = useState(0);
  const regretBuffer = useRegretBuffer();

  useEffect(() => {
    const saved = sessionStorage.getItem('onboardingAttempts');
    if (saved) setAttempts(Number(saved));
  }, []);

  useEffect(() => {
    sessionStorage.setItem('onboardingAttempts', String(attempts));
  }, [attempts]);

  if (attempts >= 3) {
    return <div>Too many attempts. Try again in 5 minutes.</div>;
  }

  const handleAffirm = (key: keyof typeof affirmations) => setAffirmations((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleQuiz = async (qId: string, answer: boolean) => {
    console.log('Quiz submitted:', { qId, answer });
    
    try {
      const res = await fetch('/api/onboarding/quiz', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }) 
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Verification failed. Please try again.');
        return;
      }
      
      setStep(4);
    } catch (error) {
      console.error('Quiz error:', error);
      alert('Network error. Please try again.');
    }
  };

  const completeOnboarding = async () => {
    if (regretBuffer.isBuffering) return;
    regretBuffer.start(5);
  };

  useEffect(() => {
    if (regretBuffer.canConfirm) {
      const finalize = async () => {
        try {
          const res = await fetch('/api/onboarding/complete', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          });
          
          if (res.ok) {
            sessionStorage.removeItem('onboardingAttempts');
            // Mandatory reload per Clerk best practices for metadata propagation
            await user?.reload();
            window.location.href = '/dashboard';
          } else {
            const data = await res.json();
            alert(data.error || 'Finalization failed.');
          }
        } catch (error) {
          console.error('Finalization error:', error);
          alert('Network error during finalization.');
        }
      };
      finalize();
    }
  }, [regretBuffer.canConfirm, role, user]);

  const nextStep = () => setStep((prev) => prev + 1);

  return (
    <div className="modal" style={{ padding: '2rem', maxWidth: '500px', margin: '2rem auto', background: '#1a1a2e', borderRadius: '12px', color: 'white' }}>
      {step === 1 && (
        <div>
          <h3>Foundational Truths</h3>
          <p style={{ margin: '1rem 0' }}>{HLE_PHRASES.TRUTH_1}</p>
          <p style={{ fontStyle: 'italic', opacity: 0.7 }}>{HLE_PHRASES.TRUTH_1_EXAMPLE}</p>
          <button onClick={nextStep} style={{ marginTop: '1.5rem', width: '100%' }}>I Understand</button>
        </div>
      )}
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
      {step === 3 && (
        <div>
          <h3>Final Verification</h3>
          <p style={{ margin: '1rem 0' }}>{HLE_PHRASES.QUIZ_Q1}</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => handleQuiz('QUIZ_Q1', true)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: '#3b82f6', color: 'white' }}>True</button>
            <button onClick={() => handleQuiz('QUIZ_Q1', false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: '#3b82f6', color: 'white' }}>False</button>
          </div>
        </div>
      )}
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
