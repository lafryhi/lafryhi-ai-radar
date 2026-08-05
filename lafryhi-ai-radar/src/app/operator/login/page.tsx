import { login } from "../actions";
import { BrandLogo } from "@/components/brand-logo";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <section className="narrow"><BrandLogo className="page-brand-logo" priority /><p className="eyebrow">Human Verification access</p><h1>Operator sign in</h1><p className="lede">Enter the protected Intelligence Operations workspace. This environment-token guard is not full production authentication.</p>{params.error && <p className="error">Invalid access token.</p>}<form action={login} className="panel form"><label>Operator access token<input name="token" type="password" minLength={20} required /></label><button>Enter Decision Center</button></form></section>;
}
