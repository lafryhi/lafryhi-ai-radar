import { login } from "../actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <section className="narrow"><p className="eyebrow">Temporary Phase 1 access</p><h1>Operator sign in</h1><p className="lede">This environment-token guard is not full production authentication.</p>{params.error && <p className="error">Invalid access token.</p>}<form action={login} className="panel form"><label>Operator access token<input name="token" type="password" minLength={20} required /></label><button>Enter review console</button></form></section>;
}
