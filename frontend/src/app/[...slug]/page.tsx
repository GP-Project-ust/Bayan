import { notFound } from "next/navigation";
import catalog from "@/lib/screen-catalog.json";
import FeaturePage from "@/components/FeaturePage";

export default async function CatchAll({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const route = "/" + slug.join("/");
  if (!catalog.some(screen => screen.path === route)) notFound();
  return <FeaturePage route={route} />;
}

export function generateStaticParams() {
  return catalog
    .filter(x=>x.path!=="/"&&x.path!=="/admin"&&x.path!=="/admin/agent-traces"&&x.path!=="/admin/agent-traces/details"&&x.path!=="/admin/audit"&&x.path!=="/admin/audit/details"&&x.path!=="/admin/data-sources"&&x.path!=="/admin/data-sources/details"&&x.path!=="/admin/data-sources/new"&&x.path!=="/admin/roles"&&x.path!=="/admin/smart-views"&&x.path!=="/admin/smart-views/details"&&x.path!=="/admin/smart-views/new"&&x.path!=="/admin/users"&&x.path!=="/admin/users/details"&&x.path!=="/admin/users/new"&&x.path!=="/analytics"&&x.path!=="/analytics/outliers"&&x.path!=="/conversations"&&x.path!=="/conversations/details"&&x.path!=="/forbidden"&&x.path!=="/forgot-password"&&x.path!=="/login"&&x.path!=="/notifications"&&x.path!=="/platform/agents"&&x.path!=="/platform/health"&&x.path!=="/platform/models"&&x.path!=="/platform/onboarding"&&x.path!=="/platform/onboarding/history"&&x.path!=="/platform/organizations"&&x.path!=="/platform/settings"&&x.path!=="/profile"&&x.path!=="/reports"&&x.path!=="/reports/detail"&&x.path!=="/reports/new"&&x.path!=="/screens"&&x.path!=="/semantic-search"&&x.path!=="/settings"&&x.path!=="/sources"&&x.path!=="/sources/document"&&x.path!=="/sources/upload"&&x.path!=="/unavailable")
    .map(x => ({ slug: x.path.slice(1).split("/") }));
}
