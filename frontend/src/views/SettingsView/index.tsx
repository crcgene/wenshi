// src/SettingsView.tsx
import React, { useState } from "react";
import * as Toolbar from "@radix-ui/react-toolbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import * as Icons from "lucide-react";
import SettingItem from "./components/SettingItem";

interface SettingsViewProps {
  switchToMain: () => void;
}

export default function SettingsView({ switchToMain }: SettingsViewProps) {
  const [test1, setTest1] = useState(false);
  const [test2, setTest2] = useState(false);

  return (
    <main className="flex flex-col h-screen w-screen bg-background text-foreground">
      <Toolbar.Root className="flex items-center border-b px-2 bg-background">
        <Button variant="ghost" onClick={switchToMain}>
          <Icons.ChevronLeft className="size-4 mr-2" />
          Вернуться
        </Button>
      </Toolbar.Root>

      <div className="flex-1 p-6 space-y-4">
        <SettingItem label="Тест1">
          <Switch checked={test1} onCheckedChange={setTest1} />
        </SettingItem>

        <SettingItem label="Тест2">
          <Switch checked={test2} onCheckedChange={setTest2} />
        </SettingItem>
      </div>
    </main>
  );
}
