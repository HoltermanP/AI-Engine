export function isClerkConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')
  );
}

/** Client-safe check (alleen publishable key) */
export function isClerkConfiguredClient(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')
  );
}

export const DEMO_USER = {
  id: 'demo-user-001',
  naam: 'Patrick Holterman',
  email: 'patrick@netbeheer.nl',
  rol: 'beheerder' as const,
};

export const DEMO_ORGANISATIE = {
  id: 'demo-org-001',
  naam: 'Netbeheer Noord BV',
  clerkOrgId: 'org_demo',
};
