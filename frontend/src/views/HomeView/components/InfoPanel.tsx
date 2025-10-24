// src/InfoPanel.tsx
import React from "react";
import { Textarea } from "@/components/ui/textarea";

interface InfoPanelProps {
  text: string;
}

export default function InfoPanel({ text }: InfoPanelProps) {
  return (
    <Textarea
      readOnly
      value={text}
      className="w-full h-full resize-none rounded-none border-0 border-l bg-muted"
    />
  );
}

