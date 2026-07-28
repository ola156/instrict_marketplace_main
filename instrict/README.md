This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



Great progress — you've built the entire vendor side. Here's how I'd think about next steps:
The most important missing piece right now is the student-facing side. Here's why — without it, vendors have a dashboard but zero orders coming in. You can't test the kitchen queue, wallet, or notifications properly. Everything is built but nothing is connected end to end.
My recommended order:
1. Student onboarding — quick, just a profile form (name, hostel, matric number). Students need a profile before they can place orders.
2. Student store browsing — list of open vendors, filter by category, view a vendor's menu.
3. Cart + checkout — add items, select extras, choose pickup or delivery, pay via Paystack.
4. Order tracking — student sees their order status updating in real time.
At that point you have a complete working loop — student orders → vendor gets notified → vendor processes → student sees update. Everything you've built so far becomes testable and real.
Then after that:
5. Rider dashboard — only makes sense once real orders exist to assign.
6. Admin dashboard — monitor everything once there's activity to monitor.
7. Rate limiting + security hardening — do this before launch, not before you have a working product.