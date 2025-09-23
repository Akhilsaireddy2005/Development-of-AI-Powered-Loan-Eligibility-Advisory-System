# Loan Mentor AI – Frontend

An elegant React + Vite app that guides users through a loan pre‑eligibility flow with a conversational UI, secure document uploads, a live debit card preview, and clear, lender‑style eligibility rules.

## Quick start

Requirements: Node.js 18+ and npm.

```sh
# 1) Install
npm i

# 2) Run dev server (Vite)
npm run dev

# 3) Build for production
npm run build

# 4) Preview production build
npm run preview
```

## App overview

- Pages: `src/pages/Index.tsx` renders the main chatbot in `src/components/ChatBot.tsx`.
- UI: shadcn-ui + Tailwind; design tokens are defined in `src/index.css` with HSL CSS variables.
- Routing: React Router.
- State/async: Local React state and `@tanstack/react-query` provider scaffolded.

## Key features

- Conversational step-by-step intake (name, age, income, loan type, amount, EMIs, credit score, PAN).
- Document uploads with status (Salary Slip, Aadhaar).
- Debit card details with live, secure card preview and masking in the summary.
- Gradient/glassmorphism UI, progress bar, and editable summary rows with quick “Edit” jump-to-step.
- Eligibility banner and detailed reasons after analysis.

## Eligibility rules (simplified, lender‑style)

Rules are evaluated in `ChatBot.tsx` inside `evaluateEligibility` and combine general and loan‑type specific checks:

- Age: 21–60 (Home Loan up to 65).
- Input sanity: income and loan amount must be positive numbers.
- Type-specific minimums:
  - Personal Loan: income ≥ ₹15,000; credit ≥ 720; DTI ≤ 45%; suggested max ≈ 24× monthly income.
  - Home Loan: income ≥ ₹25,000; credit ≥ 700; DTI ≤ 50%; suggested max ≈ 60× monthly income.
  - Car Loan: income ≥ ₹20,000; credit ≥ 700; DTI ≤ 50%; suggested max ≈ 36× monthly income.
  - Business Loan: income ≥ ₹30,000; credit ≥ 750; DTI ≤ 45%; suggested max ≈ 48× monthly income.
- DTI (Debt-to-Income) = Existing EMIs ÷ Monthly Income. Compared against the max for the selected loan type.
- Suggested maximum loan is displayed for guidance; it’s a heuristic, not a bank offer.

The chat surfaces eligibility with DTI and reasons; the right panel shows an eligibility badge and a reasons list when ineligible.

## File map

- `src/components/ChatBot.tsx` – main flow, UI, validation, eligibility logic, and summary.
- `src/components/ui/*` – shadcn-ui components (Select, Card, Progress, etc.).
- `src/index.css` – Tailwind base layers and HSL variables for the design system.
- `tailwind.config.ts` – Tailwind setup and theme extensions.

## Customization

- Colors/gradients/shadows: edit CSS variables in `src/index.css` (e.g., `--primary`, `--accent`, `--shadow-glow`).
- Eligibility policy: tweak `evaluateEligibility` in `ChatBot.tsx` to change thresholds or add new factors.
- Steps: modify the `steps` array in `ChatBot.tsx` to add/remove questions.

## Security & privacy notes

- Sensitive fields (card number, CVV) are masked in the UI summary and never sent anywhere by this frontend. Integrate a PCI‑compliant backend/tokenization provider if you plan to accept payments.
- Client-side checks are indicative only; real underwriting needs server-side verification, KYC, and bureau data.

## Tech stack

- Vite, React, TypeScript
- Tailwind CSS, shadcn-ui, Radix Primitives
- React Router, @tanstack/react-query (provider ready)

## Contributing / editing

You can edit locally with any IDE or use GitHub Codespaces.

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
```

## Deploy

Deploy with any static host (Vercel, Netlify, GitHub Pages) or your preferred platform. Build with `npm run build` and serve the `dist/` directory.
