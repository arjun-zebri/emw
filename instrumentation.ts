import type { Instrumentation } from "next";

/*
 * Every error Next catches on the server (a page that won't render, an API route, a server action,
 * the sign-in proxy) is reported through lib/observe. A page couples reach failing, or sign-in
 * failing, is urgent. Expected outcomes (not found, redirects) never arrive here.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { report } = await import("./lib/observe/report");
  const { isPublic, routeFromFile } = await import("./lib/observe/scrub");
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : undefined;
  if (digest?.startsWith("NEXT_")) return;
  const route = routeFromFile(context.routePath);
  const area = context.routeType === "render" ? "page" : context.routeType;
  const urgent = context.routeType === "proxy" || (isPublic(route) && context.routeType !== "route");
  await report(error, {
    area,
    severity: urgent ? "urgent" : "normal",
    route,
    method: request.method,
    digest,
    context: context.revalidateReason ? { revalidating: context.revalidateReason } : undefined,
  });
};
