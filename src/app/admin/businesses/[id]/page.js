import { Suspense } from "react";
import ClientRedirect from "./client";

export default async function BusinessRedirect({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ClientRedirect id={id} />
    </Suspense>
  );
}
