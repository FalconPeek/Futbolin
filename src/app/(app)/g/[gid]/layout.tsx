import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/layout/bottom-nav";

interface GroupLayoutProps {
  params: Promise<{ gid: string }>;
  children: React.ReactNode;
}

export default async function GroupLayout({
  params,
  children,
}: GroupLayoutProps) {
  const { gid } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(gid)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", gid)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  return (
    <div className="pb-nav">
      {children}
      <BottomNav groupId={gid} />
    </div>
  );
}
