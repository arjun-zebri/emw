import { LegalPage, legalMeta } from "@/components/legal/LegalPage";
import { termsAndConditions } from "@/data/legal";

export const metadata = legalMeta(termsAndConditions, "/terms-and-conditions");

export default function TermsPage() {
  return <LegalPage page={termsAndConditions} />;
}
