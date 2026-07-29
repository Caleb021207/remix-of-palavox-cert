// Shared CORS handling — origin allowlist instead of '*'
// Additional origins can be supplied via the ALLOWED_ORIGINS secret (comma separated).

const STATIC_ALLOWED = [
  "https://id-preview--c8babb73-e18d-47d9-ac3b-f2393353b65b.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function allowedOrigins(): string[] {
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...STATIC_ALLOWED, ...extra];
}

function isAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedOrigins().includes(origin)) return true;
  // Allow this project's own Lovable preview/published subdomains only.
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovableproject.com"))
    );
  } catch {
    return false;
  }
}

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

/** CORS headers scoped to the requesting origin (only if allowlisted). */
export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers = { ...BASE_HEADERS };
  if (isAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin!;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else {
    headers["Access-Control-Allow-Origin"] = STATIC_ALLOWED[0];
  }
  return headers;
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsFor(req) });
  }
  return null;
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}
