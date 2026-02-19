import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/utils";
import { getOrgSlug } from "@/lib/tenant/context";
import { resolveOrgBySlug } from "@/lib/tenant/resolve";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const slug = await getOrgSlug();
  if (!user) {
    redirect(slug ? `/login?tenant=${slug}` : "/login");
  }
  const org = slug ? await resolveOrgBySlug(slug) : null;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar orgName={org?.name ?? "SwagVault"} orgSlug={slug ?? ""} />
      <main className="flex-1 overflow-auto bg-background p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
