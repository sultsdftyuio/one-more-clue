"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="coral" className="w-full" disabled={pending}>
      {pending ? "One moment…" : label}
    </Button>
  );
}
