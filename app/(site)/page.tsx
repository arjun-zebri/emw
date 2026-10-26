import { Categories } from "@/components/home/Categories";
import { Featured } from "@/components/home/Featured";
import { Hero } from "@/components/home/Hero";
import { Journal } from "@/components/home/Journal";
import { Languages } from "@/components/home/Languages";
import { Statement } from "@/components/home/Statement";
import { PageTransition } from "@/components/motion/PageTransition";

export default function Home() {
  return (
    <PageTransition>
      <div>
        <Hero />
        <Statement />
        <Featured />
        <Categories />
        <Languages />
        <Journal />
      </div>
    </PageTransition>
  );
}
