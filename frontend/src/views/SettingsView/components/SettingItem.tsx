// src/components/SettingItem.tsx
import React, { useId, ReactElement } from "react";
import { Label } from "@/components/ui/label";

interface SettingItemProps {
  label: string;
  children: ReactElement;
  className?: string;
}

export default function SettingItem({
  label,
  children,
  className = ""
}: SettingItemProps) {
  const id = useId();

  return (
    <div className={`flex items-center justify-between py-2 ${className}`}>
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
      {React.cloneElement(children, { id } as any)}
    </div>
  );
}
