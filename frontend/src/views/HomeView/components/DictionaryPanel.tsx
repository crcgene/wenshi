// src/DictionaryPanel.tsx
import React from "react";
import { Textarea } from "@/components/ui/textarea";

export default function DictionaryPanel() {
  return (
    <Textarea
      readOnly
      value="Панель словаря\nЗдесь будут определения..."
      className="w-full h-full resize-none rounded-none border-0 border-t bg-muted"
    />
  );
}
