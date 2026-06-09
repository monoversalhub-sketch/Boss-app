"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FraudRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/fraud-risk"); }, [router]);
  return null;
}
