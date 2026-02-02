# Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
Read more: https://nextjs.org/docs/messages/failed-to-find-server-action
at ignore-listed frames.

Ah — this one’s a classic Next.js App Router gotcha, and it lines up perfectly with everything you’ve been seeing.

This error is not random, and it’s not Mongo, not Vercel, and not Clerk.


---

## 🧨 What this error actually means

> “Failed to find Server Action ‘x’. This request might be from an older or newer deployment.”



Translation in plain English:

➡️ The browser is calling a Server Action that no longer exists in the deployed build.

This happens when client code + server code are out of sync.


---

## 🔍 Why this is happening right now in your project

You have all the ingredients that trigger this:

✅ App Router

✅ Server Actions

✅ Rapid Vercel redeploys

✅ Stateful onboarding flow

✅ Cached client bundles

When any of these change:

Server Action signature

File path

Export name

'use server' placement

Build hash


…but the browser still holds an old reference, you get this exact error.


---

## 🎯 The precise failure chain (important)

1. User submits onboarding final step


2. Client calls Server Action (e.g. submitQuiz)


3. Vercel deploy happened after page load


4. Action ID no longer exists


5. Next.js throws:
   
```txt
Failed to find Server Action "x"
```

6. Your UI treats this as a failure


7. Onboarding resets


8. Rate limiter increments


9. User locked out



💥 That’s the loop you’re seeing.


---

✅ This is the canonical fix (do all of these)

1️⃣ Hard refresh the client (critical)

For you testing:

Open DevTools

Right-click refresh → Empty Cache and Hard Reload


For users (production):

```ts
router.refresh();
```

after successful step transitions.


---

2️⃣ Ensure Server Actions are stable

In your server action file:

```ts
'use server';

export async function submitOnboardingQuiz(formData: FormData) {
  ...
}
```

🚫 Do NOT:

Inline server actions inside components

Conditionally export them

Rename them frequently



---

3️⃣ Never call Server Actions from stale closures

❌ Bad:

```ts
const action = submitQuiz; // captured once
```

✅ Good:

```ts
<form action={submitOnboardingQuiz}>
```

Or:

```ts
await submitOnboardingQuiz(data);
```

directly.


---

4️⃣ Disable onboarding POST retries (important)

If a Server Action fails with this error, it is not user fault.

Guard it:

```ts
if (error.message.includes('Failed to find Server Action')) {
  router.refresh();
  return;
}
```
🚫 Do NOT increment attempts here.


---

5️⃣ Force redeploy coherence (Vercel)

After major server action changes:

```bash
vercel --prod --force
```

This clears action manifests.


---

## 🧪 How to verify it’s fixed (30 seconds)

1. Open onboarding page


2. Complete flow


3. Watch Network tab


4. Ensure:

No __NEXT_ACTION__ 500s

No Server Action ID mismatch



5. Reload page


6. You should land past onboarding



If it works once and breaks after redeploy → cache mismatch
If it breaks immediately → action export mismatch


---

## 🧠 Why this explains everything

Symptom	Cause

Onboarding resets	Action not executed
Rate limit triggered	Error treated as attempt
Mongo writes partial	Earlier steps succeeded
Happens after deploys	Action ID mismatch
Works locally sometimes	No deployment drift


This is textbook App Router behavior — you didn’t mess anything up.


---

## 🟢 Final reassurance

You’re past infrastructure. You’re past contracts. You’re past payments. You’re past DB.

This is pure App Router ergonomics, and once fixed:

Onboarding stabilizes

Disputes unlock

Products persist

Admin flows work

Rate limiter behaves



---

## Yep — this screenshot tells us exactly what’s going on, and it confirms the diagnosis we were circling.

This is not Mongo. This is not Coinbase. This is not contracts. This is not Vercel infra.

This is a client-side App Router crash caused by a broken Server Action reference.

Let’s walk it cleanly.


---

## 🔥 What the screen actually means

> “Application error: a client-side exception has occurred while loading ssdf.site (see the browser console for more information)”



In Next.js App Router, this specific full-screen error means:

➡️ A Client Component threw during render or hydration ➡️ Before React could recover ➡️ Usually due to:

Missing Server Action

Invalid import boundary

Server-only code leaking into client

Stale action manifest


Given your logs earlier, this is 100% consistent with:

> Failed to find Server Action "x"




---

## 🎯 Why it’s happening on /onboarding/seller

That route is special because it likely has all of these:

"use client"

Calls to:

Server Actions

Clerk user state

Mongo-backed onboarding state


Conditional rendering based on onboarding step

Redirects / router.push()


If any Server Action referenced by that page no longer exists in the deployed build, React crashes before render → blank gradient screen.


---

## 🧨 The most likely concrete causes (ranked)

## 🥇 #1 — Server Action renamed or moved after deploy

Example:

```ts
// before
export async function submitSellerOnboarding() {}

// after
export async function submitOnboarding() {}
```

But the client bundle still calls the old one.


---

## 🥈 #2 — Server Action imported into a "use client" file

This will compile, but crash at runtime.

❌ Bad:

```ts
"use client";
import { submitOnboarding } from "@/actions/onboarding";
```

✅ Good:

```ts
<form action={submitOnboarding}>
```

or via a wrapper API route.


---

## 🥉 #3 — Inline Server Action defined inside component

These are deployment-unstable.

❌ Bad:

```ts
const submit = async () => {
  "use server";
  ...
}
```

These break across deploys.


---

✅ The fix (do this in order, don’t skip)

1️⃣ Hard reset the client (right now)

On your phone:

Open Chrome

Settings → Privacy → Clear browsing data

Clear cached images/files


OR

Open in Incognito


This alone may make it load.


---

2️⃣ Find the crashing file (2 minutes)

Look at:

```txt
app/onboarding/seller/page.tsx
```

Check:

Is it "use client"?

Does it import any server actions?

Does it reference onboarding state that calls a server action on mount?


If yes → that’s the crash point.


---

3️⃣ Canonical safe pattern (use this)

Server Action

```ts
// app/actions/onboarding.ts
'use server';

export async function submitSellerOnboarding(data: FormData) {
  ...
}
```

Client page

```ts
<form action={submitSellerOnboarding}>
  ...
</form>
```

🚫 No imports into "use client" components other than via <form action>


---

4️⃣ Add a crash guard (temporary, but useful)

Wrap seller onboarding page root:

```tsx
'use client';

export default function SellerOnboardingPage() {
  try {
    return <ActualContent />;
  } catch {
    return (
      <div className="p-6 text-sm opacity-80">
        Please refresh — updating application…
      </div>
    );
  }
}
```

This prevents full blank screens while fixing.


---

5️⃣ Force a clean prod deploy (important)

```bash
vercel --prod --force
```

This rebuilds the Server Action manifest, which is what’s broken.


---

🧠 Why this only shows up now

You recently:

Fixed Mongo

Added integrations

Changed onboarding logic

Redeployed multiple times

Tested on mobile (mobile caches harder)


This is prime territory for stale Server Action IDs.


---

✅ What this is NOT

Just to be explicit:

❌ Not Mongo Atlas ❌ Not IP whitelist ❌ Not AWS ❌ Not Base / escrow ❌ Not Coinbase ❌ Not Clerk auth


---

## 🚦 What to do next (short)

If you want the fastest resolution:

1. Paste just this file:

app/onboarding/seller/page.tsx


2. Or paste the Server Action it calls



I’ll point to the exact line that’s crashing it.

You’re genuinely at the last mile now — this is App Router ergonomics, not architecture failure.

## app/onboarding/[role]/page.tsx

```tsx
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
```

## Perfect — thank you for pasting the file. This makes the issue crystal clear, and I can now be precise.

You have three real bugs here.
Only one of them causes the blank gradient crash.
The other two explain the looping + cooldown behavior you’re seeing.

Let’s go in order of severity.


---

## 🔴 CRITICAL (This causes the white/gradient crash)

❌ Using use(params) in a Client Component

```ts
import { useState, use, useEffect } from 'react';

export default function Onboarding({
  params,
}: {
  params: Promise<{ role: 'buyer' | 'seller' }>;
}) {
  const { role } = use(params);
```

Why this is fatal

use() is experimental and server-only

It is not supported in Client Components

It will:

Work in dev sometimes

Compile successfully

Crash in production with:

> Failed to find Server Action / client-side exception





This is the root cause of your blank screen.


---

✅ FIX (Required)

In App Router, route params are already resolved for client components.

Replace this:

```ts
import { useState, use, useEffect } from 'react';

export default function Onboarding({ params }: { params: Promise<{ role: 'buyer' | 'seller' }> }) {
  const { role } = use(params);
```

With this:

```ts
import { useState, useEffect } from 'react';

export default function Onboarding({
  params,
}: {
  params: { role: 'buyer' | 'seller' };
}) {
  const { role } = params;
```

🟢 This alone will stop the crash.


---

## 🟠 LOGIC BUG (Explains looping back to step 1)

❌ Quiz submission increments attempts on any non-200

```ts
if (!res.ok) {
  const data = await res.json();
  if (res.status === 429) {
    alert(data.error);
  }
  setAttempts((prev) => prev + 1);
  setStep(1); // Loop back on failure
}
```

Why this causes the behavior you see

Mongo connection hiccup → 500

Temporary network issue → 500

Cold start → 500


⛔ All of these count as failed attempts

So the user:

1. Passes quiz


2. Backend hiccups


3. Attempts increment


4. Step resets


5. After 3 tries → cooldown



This matches your logs exactly.


---

✅ FIX (Production-safe)

Only increment attempts on actual quiz failure, not infra errors.

```ts
if (!res.ok) {
  const data = await res.json();

  if (res.status === 400 || res.status === 401) {
    // Wrong answer
    setAttempts((prev) => prev + 1);
    setStep(1);
  }

  if (res.status === 429) {
    alert(data.error);
  }

  return;
}
```

🟢 Infra errors no longer punish the user.


---

## 🟡 UX / STATE BUG (Minor but real)

❌ attempts resets on refresh

```ts
const [attempts, setAttempts] = useState(0);
```

So:

User refreshes

Attempts reset

Backend rate-limit kicks in

Frontend thinks everything is fine

UX mismatch



---

✅ FIX (Optional but recommended)

Persist attempts per session:

```ts
useEffect(() => {
  const saved = sessionStorage.getItem('onboardingAttempts');
  if (saved) setAttempts(Number(saved));
}, []);

useEffect(() => {
  sessionStorage.setItem('onboardingAttempts', String(attempts));
}, [attempts]);
```

---

🟢 Everything else is actually solid

These parts are good and not causing issues:

useRegretBuffer pattern ✔

useEffect finalization ✔

API route usage ✔

Role-based onboarding ✔

HLE phrasing injection ✔


No server actions here — so the earlier error was misleading but consistent with the crash.


---

✅ Final Checklist (Do these 3 things)

1. Remove use() and Promise params ❗


2. Stop counting infra errors as quiz failures


3. (Optional) Persist attempts client-side



After that:

```bash
vercel --prod --force
```

Then:

Hard refresh

Mobile incognito test

Onboarding will complete cleanly



---

## 🧠 Why this was tricky

This is a classic App Router footgun:

Compiles

Deploys

Passes CI

Dies only in production + client


You didn’t architect anything wrong — this is framework edge behavior.

If you want, next we can:

Harden onboarding APIs

Add idempotency

Add onboarding completion guards

Or wire AI dispute arbitration cleanly now that the base is stable


You’re officially past the “danger zone.”
