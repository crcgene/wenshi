import React from "react";
import * as Toolbar from "@radix-ui/react-toolbar";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";

interface MainToolbarProps {
  infoVisible: boolean;
  onToggleInfo: () => void;
  showInvisibleChars: boolean;
  onToggleInvisibleChars: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  switchToSettings: () => void;
}

export default function MainToolbar({
  infoVisible,
  onToggleInfo,
  showInvisibleChars,
  onToggleInvisibleChars,
  onOpenFile,
  onSaveFile,
  onSaveAsFile,
  switchToSettings,
}: MainToolbarProps) {
  return (
    <Toolbar.Root className="flex items-center gap-1 border-b px-2 bg-background">
      <Button
        variant="ghost"
        size="icon"
        title="Открыть файл"
        onClick={onOpenFile}
      >
        <Icons.FolderOpen className="size-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title="Сохранить"
        onClick={onSaveFile}
      >
        <Icons.Save className="size-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title="Сохранить как..."
        onClick={onSaveAsFile}
      >
        <Icons.SaveAll className="size-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="ml-auto"
        title={showInvisibleChars ? "Скрыть служебные символы" : "Показать служебные символы"}
        onClick={onToggleInvisibleChars}
      >
        {showInvisibleChars ? <Icons.EyeOff className="size-5" /> : <Icons.Eye className="size-5" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title="Настройки"
        onClick={switchToSettings}
      >
        <Icons.Settings className="size-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title={infoVisible ? "Скрыть информационную панель" : "Показать информационную панель"}
        onClick={onToggleInfo}
      >
        <Icons.PanelRightClose className="size-5" />
      </Button>
    </Toolbar.Root>
  );
}
