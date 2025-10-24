import React, { useState, useRef } from "react";
import InfoPanel from "./components/InfoPanel";
import DictionaryPanel from "./components/DictionaryPanel";
import MainToolbar from "./components/MainToolbar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import Annotator, { AnnotatorMethods } from "@/components/Annotator";
import {
  OpenFileDialog,
  SaveFileDialog,
  ReadFile,
  WriteFile,
  ValidateTxtFile,
  ParseWenFile,
  SerializeWenFile
} from "wailsjs/go/main/App";

interface HomeViewProps {
  switchToSettings: () => void;
}

interface FileState {
  path: string;
  hasUnsavedChanges: boolean;
  metadata: {
    ver: string;
    createdAt: string;
    modifiedAt: string;
  } | null;
}

export default function HomeView({ switchToSettings }: HomeViewProps) {
  const [infoVisible, setInfoVisible] = useState(true);
  const [showInvisibleChars, setShowInvisibleChars] = useState(false);
  const [annotatedText, setAnnotatedText] = useState("");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const annotatorRef = useRef<AnnotatorMethods>(null);

  const [fileState, setFileState] = useState<FileState>({
    path: '',
    hasUnsavedChanges: false,
    metadata: null
  });

  const proceedWithOpenFile = async () => {
    try {
      // Open file dialog
      const filepath = await OpenFileDialog();
      if (!filepath) {
        return; // User cancelled
      }

      // Read file content
      const content = await ReadFile(filepath);

      // Determine file type from extension
      const isWenFile = filepath.toLowerCase().endsWith('.wen');

      if (isWenFile) {
        // Parse .wen file
        const data = await ParseWenFile(content);

        // Set content in editor
        if (annotatorRef.current) {
          annotatorRef.current.setContent(data.content);
        }
        setAnnotatedText(data.content);

        // Update state
        setFileState({
          path: filepath,
          hasUnsavedChanges: false,
          metadata: {
            ver: data.ver,
            createdAt: data.createdAt,
            modifiedAt: data.modifiedAt
          }
        });
      } else {
        // Validate .txt file
        const validationResult = await ValidateTxtFile(content);
        if (!validationResult.isValid) {
          alert(`Ошибка валидации файла: ${validationResult.errorMessage}`);
          return;
        }

        // Set content in editor
        if (annotatorRef.current) {
          annotatorRef.current.setContent(content);
        }
        setAnnotatedText(content);

        // Update state
        setFileState({
          path: filepath,
          hasUnsavedChanges: false,
          metadata: null
        });
      }
    } catch (error) {
      alert(`Ошибка при открытии файла: ${error}`);
    }
  };

  const handleOpenFile = () => {
    if (fileState.hasUnsavedChanges) {
      pendingActionRef.current = proceedWithOpenFile;
      setShowUnsavedDialog(true);
    } else {
      proceedWithOpenFile();
    }
  };

  const handleSaveFile = async () => {
    try {
      // Get content from editor
      const content = annotatorRef.current?.getContent() || annotatedText;

      let savePath = fileState.path;

      // If new file, show save dialog
      if (!savePath) {
        savePath = await SaveFileDialog("untitled.wen");
        if (!savePath) {
          return; // User cancelled
        }
      }

      // Determine file type
      const isWenFile = savePath.toLowerCase().endsWith('.wen');

      if (isWenFile) {
        // Serialize as .wen file
        let createdAt = '';
        let modifiedAt = new Date().toISOString();

        if (fileState.metadata) {
          // Use existing createdAt, update modifiedAt
          createdAt = fileState.metadata.createdAt;
        } else {
          // New file - both timestamps are current time
          createdAt = modifiedAt;
        }

        const serializedContent = await SerializeWenFile(content, createdAt, modifiedAt);
        await WriteFile(savePath, serializedContent);

        // Update state
        setFileState({
          path: savePath,
          hasUnsavedChanges: false,
          metadata: {
            ver: "1.0",
            createdAt,
            modifiedAt
          }
        });
      } else {
        // Save as .txt file
        // Check if losing metadata
        if (fileState.metadata) {
          const confirmed = window.confirm("Сохранение как .txt файл приведет к потере метаданных. Продолжить?");
          if (!confirmed) {
            return;
          }
        }

        // Validate content
        const validationResult = await ValidateTxtFile(content);
        if (!validationResult.isValid) {
          alert(`Ошибка валидации: ${validationResult.errorMessage}`);
          return;
        }

        await WriteFile(savePath, content);

        // Update state
        setFileState({
          path: savePath,
          hasUnsavedChanges: false,
          metadata: null
        });
      }
    } catch (error) {
      alert(`Ошибка при сохранении файла: ${error}`);
    }
  };

  const handleSaveAsFile = async () => {
    try {
      // Get content from editor
      const content = annotatorRef.current?.getContent() || annotatedText;

      // Suggest filename
      let suggestedFilename = "untitled.wen";
      if (fileState.path) {
        const pathParts = fileState.path.split(/[/\\]/);
        let filename = pathParts[pathParts.length - 1];

        // Remove .txt extension if present, keep .wen
        if (filename.toLowerCase().endsWith('.txt')) {
          filename = filename.slice(0, -4) + '.wen';
        }

        suggestedFilename = filename;
      }

      // Show save dialog
      const savePath = await SaveFileDialog(suggestedFilename);
      if (!savePath) {
        return; // User cancelled
      }

      // Determine file type
      const isWenFile = savePath.toLowerCase().endsWith('.wen');

      if (isWenFile) {
        // Serialize as .wen file
        let createdAt = '';
        let modifiedAt = new Date().toISOString();

        if (fileState.metadata) {
          // Use existing createdAt, update modifiedAt
          createdAt = fileState.metadata.createdAt;
        } else {
          // New file - both timestamps are current time
          createdAt = modifiedAt;
        }

        const serializedContent = await SerializeWenFile(content, createdAt, modifiedAt);
        await WriteFile(savePath, serializedContent);

        // Update state
        setFileState({
          path: savePath,
          hasUnsavedChanges: false,
          metadata: {
            ver: "1.0",
            createdAt,
            modifiedAt
          }
        });
      } else {
        // Save as .txt file
        // Check if losing metadata
        if (fileState.metadata) {
          const confirmed = window.confirm("Сохранение как .txt файл приведет к потере метаданных. Продолжить?");
          if (!confirmed) {
            return;
          }
        }

        // Validate content
        const validationResult = await ValidateTxtFile(content);
        if (!validationResult.isValid) {
          alert(`Ошибка валидации: ${validationResult.errorMessage}`);
          return;
        }

        await WriteFile(savePath, content);

        // Update state
        setFileState({
          path: savePath,
          hasUnsavedChanges: false,
          metadata: null
        });
      }
    } catch (error) {
      alert(`Ошибка при сохранении файла: ${error}`);
    }
  };

  const handleContentChange = (content: string) => {
    setAnnotatedText(content);
    setFileState(prev => ({
      ...prev,
      hasUnsavedChanges: true
    }));
  };

  return (
    <>
      <main className="h-screen w-screen flex flex-col bg-background text-foreground">
        <MainToolbar
          infoVisible={infoVisible}
          onToggleInfo={() => setInfoVisible((v) => !v)}
          showInvisibleChars={showInvisibleChars}
          onToggleInvisibleChars={() => setShowInvisibleChars((v) => !v)}
          onOpenFile={handleOpenFile}
          onSaveFile={handleSaveFile}
          onSaveAsFile={handleSaveAsFile}
          switchToSettings={switchToSettings}
        />

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={60} minSize={20} className="flex flex-col overflow-hidden">
                <Annotator
                  ref={annotatorRef}
                  initialContent={annotatedText}
                  onChange={handleContentChange}
                  editable={true}
                  showInvisibleChars={showInvisibleChars}
                />
              </ResizablePanel>

              <ResizableHandle />

              <ResizablePanel defaultSize={40} minSize={15}>
                <DictionaryPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {infoVisible && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={50} minSize={15}>
                <InfoPanel text={annotatedText}/>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </main>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogDescription>
            У вас есть несохраненные изменения. Продолжить без сохранения?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedDialog(false);
                if (pendingActionRef.current) {
                  pendingActionRef.current();
                  pendingActionRef.current = null;
                }
              }}
            >
              Продолжить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
