import AdminShell from "@/components/admin/AdminShell";

export const metadata = {
  title: "BOSS Admin — Mission Control",
  robots: "noindex, nofollow",
};

export default function Layout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
