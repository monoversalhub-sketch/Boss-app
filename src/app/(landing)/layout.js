import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LandingStyles from "@/components/landing/LandingStyles";

async function LandingContent({ children }) {
  let session = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    session = data?.session;
  } catch {}

  if (session) {
    redirect("/app");
  }

  return <>{children}</>;
}

export default function LandingLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <LandingContent>
        <LandingStyles />
        {children}
      </LandingContent>
    </Suspense>
  );
}
