import { Suspense } from "react";
import ClientRedirect from "./client";

export default function BusinessRedirect({ params }) {
  return (
    <Suspense fallback={null}>
      <ClientRedirect id={params.id} />
    </Suspense>
  );
}
