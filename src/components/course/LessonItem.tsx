import Link from "next/link";
import { CheckCircle2, PlayCircle, Lock, FileText, Puzzle, LucideIcon, ListOrdered } from "lucide-react";
import type { ChapterDisplayInfo } from "@/types/platform";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LessonItemProps {
  lesson: ChapterDisplayInfo;
  courseId: string;
  isCompleted?: boolean;
  isLocked?: boolean;
  index: number;
  viewRole?: 'student' | 'teacher';
}

export function LessonItem({
  lesson,
  courseId,
  isCompleted = false,
  isLocked = false,
  index,
  viewRole = 'student'
}: LessonItemProps) {

  let ItemIcon: LucideIcon;
  let iconColorClass: string;

  if (viewRole === 'teacher') {
    ItemIcon = ListOrdered; // Generic icon for teacher view
    iconColorClass = "text-muted-foreground";
  } else { // Student view
    ItemIcon = isCompleted ? CheckCircle2 : isLocked ? Lock : PlayCircle;
    iconColorClass = isCompleted ? "text-green-600" : isLocked ? "text-muted-foreground/70" : "text-primary";
  }

  const lessonTitleDisplay = lesson.lessonTitle || "(Untitled Lesson)";

  const lessonContentIndicators: { icon: LucideIcon; label: string }[] = [];
  if (lesson.videoURL) lessonContentIndicators.push({ icon: PlayCircle, label: "Video" });
  if (lesson.lessonTextContent && lesson.lessonTextContent.length > 50) lessonContentIndicators.push({ icon: FileText, label: "Reading" });
  if (lesson.quiz && lesson.quiz.length > 0) lessonContentIndicators.push({ icon: Puzzle, label: `Quiz (${lesson.quiz.length})` });
  if (lesson.materials && lesson.materials.length > 0) {
    lessonContentIndicators.push({ icon: FileText, label: `Material (${lesson.materials.length})` });
  }

  const baseItemClasses = "flex items-center justify-between p-3.5 border-b border-border/60 last:border-b-0 transition-colors duration-150 ease-in-out text-sm";
  const interactiveItemClasses = "hover:bg-muted/60 cursor-pointer group";
  const lockedItemClasses = "opacity-70 cursor-not-allowed bg-muted/30 hover:bg-muted/30";

  const itemContent = (
    <>
      <div className="flex items-center flex-grow min-w-0">
        <ItemIcon className={cn("h-5 w-5 mr-3 shrink-0", iconColorClass)} />
        <div className="flex-grow min-w-0">
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {index + 1}. {lessonTitleDisplay}
          </h4>
          {lessonContentIndicators.length > 0 && (
            <div className="flex items-center gap-x-1.5 mt-1 flex-wrap">
              {lessonContentIndicators.map(indicator => (
                   <Badge key={indicator.label} variant="outline" className="text-xs font-normal py-0.5 px-1.5 border-border/70 bg-card group-hover:border-primary/30 rounded-full">
                      <indicator.icon className="h-3 w-3 mr-1 text-muted-foreground group-hover:text-primary/80"/> {indicator.label}
                   </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      {viewRole === 'student' && !isLocked && <PlayCircle className="h-4.5 w-4.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" />}
    </>
  );

  if (viewRole === 'student' && isLocked) {
    return (
      <div className={cn(baseItemClasses, lockedItemClasses)} aria-disabled="true" title="Complete previous lessons to unlock">
        {itemContent}
      </div>
    );
  }

  if (viewRole === 'teacher') {
    return (
      <div className={cn(baseItemClasses)}>
        {itemContent}
      </div>
    );
  }

  // Default: Student view, not locked
  return (
    <Link href={`/student/courses/${courseId}/lessons/${lesson.id}`} className="block">
      <div className={cn(baseItemClasses, interactiveItemClasses)}>
        {itemContent}
      </div>
    </Link>
  );
}
