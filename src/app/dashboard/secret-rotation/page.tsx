import { SecretRotationDashboard } from "@/src/components/dashboard/SecretRotationDashboard";

export const metadata = { title: "Secret Rotation", description: "Database credential and API key rotation dashboard" };

export default function SecretRotationPage() {
  return <SecretRotationDashboard />;
}
