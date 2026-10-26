"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";

export function Newsletter() {
  const [sent, setSent] = useState(false);

  if (sent) return <p className="text-paper/80">Thank you, you&apos;re on the list.</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="flex items-center border-b border-paper/25 transition-colors focus-within:border-paper"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="Email address"
        className="w-full bg-transparent py-3 text-paper placeholder:text-paper/35 focus:outline-none"
      />
      <button type="submit" aria-label="Subscribe" className="p-2 text-paper/70 transition-colors hover:text-paper">
        <Icon name="arrow" className="size-4" />
      </button>
    </form>
  );
}
