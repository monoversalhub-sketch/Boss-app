"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth({ skip } = {}) {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (skip) { setLoading(false); return; }

    async function check() {
      try {
        const cached = localStorage.getItem("boss_admin_user");
        if (cached) {
          setAdmin(JSON.parse(cached));
          setLoading(false);
          return;
        }
        const { getBrowserClient } = await import("@/lib/db");
        const client = await getBrowserClient();
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          const { data: adminUser } = await client
            .from("admin_users")
            .select("id, email, name, role")
            .eq("email", user.email)
            .single();
          if (adminUser) {
            localStorage.setItem("boss_admin_user", JSON.stringify(adminUser));
            setAdmin(adminUser);
          }
        }
      } catch {
        // Not authenticated - show nothing, redirect will happen via router
      }
      setLoading(false);
    }
    check();
  }, [skip]);

  return { admin, loading };
}
