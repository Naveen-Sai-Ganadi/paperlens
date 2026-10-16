import { connection } from "next/server";
import { assertLocalCaller, cliStatus, LOCAL_MODE } from "@/lib/cli";

/** Tells the connect dialog whether subscription sign-in is possible on this machine. */
export async function GET(req: Request) {
  await connection(); // depends on this machine at request time; never prerender
  if (!LOCAL_MODE) return Response.json({ local: false });
  try {
    assertLocalCaller(req);
  } catch {
    return Response.json({ local: false });
  }
  const [claude, codex] = await Promise.all([cliStatus("claude-code"), cliStatus("codex")]);
  return Response.json({ local: true, "claude-code": claude, codex });
}
