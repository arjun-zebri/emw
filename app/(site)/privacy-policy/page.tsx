import { LegalPage, legalMeta } from "@/components/legal/LegalPage";
import { privacyPolicy } from "@/data/legal";

export const metadata = legalMeta(privacyPolicy, "/privacy-policy");

export default function PrivacyPolicyPage() {
  return <LegalPage page={privacyPolicy} />;
}
