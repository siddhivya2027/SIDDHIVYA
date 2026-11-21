import { DEMO_MODE } from "@/config/brand";
/** Live mode = NEXT_PUBLIC_DEMO_MODE=false in Vercel. Real logins, real data in the database, no sample sellers or numbers. */
export const LIVE = !DEMO_MODE;
