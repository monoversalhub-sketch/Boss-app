"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientRedirect({ id }) {
  const router = useRouter();
  useEffect(() => { router.replace(`/admin/users/${id}`); }, [id]);
  return null;
}
