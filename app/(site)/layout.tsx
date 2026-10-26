import { MotionRuntime } from "@/components/motion/MotionRuntime";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

/** The public site: header, footer, smooth scrolling and reveals. The admin and sign-in pages sit outside it. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <MotionRuntime />
    </>
  );
}
