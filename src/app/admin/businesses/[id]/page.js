"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BusinessDetailRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => { router.replace(`/admin/users/${id}`); }, [id, router]);
  return null;
}
