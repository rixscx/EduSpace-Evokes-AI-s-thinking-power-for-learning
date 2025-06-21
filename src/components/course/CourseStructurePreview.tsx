
"use client";

import type { ModuleInputState, ChapterInputState, ContentBlockInputState } from '@/types/platform';
import Image from 'next/image';
import { VideoPlayer } from './VideoPlayer';
import { FileText, Image as ImageIcon, Video, Link as LinkIcon, File as FileIconProp, Type, BookOpen, Palette, Activity, Award as AwardIconLucide, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import type { ContentBlockType, Course } from '@/types/platform';


interface CourseStructurePreviewProps {
  courseTitle: string;
  courseDescription: string;
  modules: ModuleInputState[];
  categoryName?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  durationMinutes?: number;
  badgeOnComplete?: string;
  thumbnailPreviewUrl?: string | null;
  certificateFileName?: string;
}

const contentBlockIconMapPreview: Record<ContentBlockType, LucideIcon> = {
  heading: Type,
  text: FileText,
  image: ImageIcon,
  video: Video,
  link: LinkIcon,
  file: FileIconProp,
};

export function CourseStructurePreview({
  courseTitle,
  courseDescription,
  modules,
  categoryName,
  difficulty,
  durationMinutes,
  badgeOnComplete,
  thumbnailPreviewUrl,
  certificateFileName,
}: CourseStructurePreviewProps) {

  const renderContentBlock = (block: ContentBlockInputState, index: number) => {
    switch (block.type) {
      case "heading":
        const Tag = `h${(block.level || 3) + 1}` as keyof JSX.IntrinsicElements;
        return <Tag className={`font-semibold text-foreground my-3 ${block.level === 1 ? 'text-xl' : block.level === 2 ? 'text-lg' : 'text-md'}`}>{block.value || "Untitled Heading"}</Tag>;
      case "text":
        return <div className="prose prose-sm max-w-none text-foreground/90 my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_p]:mb-3" dangerouslySetInnerHTML={{ __html: block.value || "<p>No text content provided.</p>" }} />;
      case "image":
        let imageUrl = "https://placehold.co/800x400.png?text=Image+Not+Available";
        if (block.value && block.value.startsWith('data:image')) { // AI Generated image data URI
            imageUrl = block.value;
        } else if (block.localFilePreviewUrl) { // User uploaded image preview
            imageUrl = block.localFilePreviewUrl;
        } else if (block.value && block.value !== "PENDING_IMAGE_GENERATION") { // Existing URL from edit mode
            imageUrl = block.value;
        }

        return (
          <div className="my-3">
            <Image
                src={imageUrl}
                alt={block.altText || "Course image preview"}
                width={600} height={300}
                className="rounded-md border object-cover"
                data-ai-hint={block.dataAiHint || "course element"}
            />
            {block.altText && <p className="text-xs text-muted-foreground mt-1 text-center italic">{block.altText}</p>}
          </div>
        );
      case "video":
        if (block.value && block.value.startsWith("search:")) {
          const searchQuery = block.value.substring(7);
          return (
            <div className="my-3 p-3 border rounded-md bg-muted/50">
              <div className="flex items-center text-sm text-foreground">
                <Video className="h-4 w-4 mr-2 text-primary" />
                <span>Suggested Video Search:</span>
              </div>
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all block mt-1">
                Search YouTube for: "{searchQuery}"
              </a>
              {block.altText && <p className="text-xs text-muted-foreground mt-1">{block.altText}</p>}
            </div>
          );
        } else if (block.value && block.value !== "PENDING_VIDEO_SUGGESTION") {
          return <div className="my-3"><VideoPlayer videoURL={block.value} title={block.altText || 'Video Preview'} /></div>;
        }
         return (
            <div className="my-3 p-3 border rounded-md bg-muted/50">
                <div className="flex items-center text-sm text-foreground"><Video className="h-4 w-4 mr-2 text-primary" />Video Link:</div>
                <p className="text-xs text-muted-foreground break-all block mt-1">
                  {block.value === "PENDING_VIDEO_SUGGESTION" ? "Video suggestion pending..." : "No valid video URL or search query provided."}
                </p>
                {block.altText && <p className="text-xs text-muted-foreground mt-1">{block.altText}</p>}
            </div>
        );
      case "link":
        return (
           <div className="my-3 p-3 border rounded-md bg-muted/50">
            <div className="flex items-center text-sm text-foreground"><LinkIcon className="h-4 w-4 mr-2 text-primary" />External Link:</div>
            <a href={block.value || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all block mt-1">
              {block.altText || block.value || "No link URL provided"}
            </a>
          </div>
        );
      case "file":
         return (
          <div className="my-3 p-3 border rounded-md bg-muted/50">
            <div className="flex items-center text-sm text-foreground"><FileIconProp className="h-4 w-4 mr-2 text-primary" />File Resource:</div>
            <p className="text-xs text-muted-foreground mt-1">
              {block.fileName || block.altText || block.value || "No file details"}
              {block.fileSize && <span className="ml-2">({(block.fileSize / 1024).toFixed(1)}KB)</span>}
            </p>
             {block.value.startsWith("#UPLOAD_PENDING#") && <Badge variant="outline" className="mt-1 text-xs">Upload Pending</Badge>}
          </div>
        );
      default:
        return <p className="text-xs text-muted-foreground my-2">Unsupported content block type.</p>;
    }
  };

  return (
    <div className="p-1 sm:p-2 md:p-4 bg-card rounded-lg shadow-xl border border-border/60 space-y-6 animate-fade-in">
      <header className="space-y-3 pb-4 border-b border-border/70">
        {thumbnailPreviewUrl && (
            <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-md border bg-muted">
            <Image src={thumbnailPreviewUrl} alt={courseTitle + " thumbnail preview"} layout="fill" objectFit="cover" data-ai-hint="course thumbnail"/>
            </div>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{courseTitle || "Untitled Course"}</h1>
        {categoryName && <Badge variant="secondary" className="text-xs"><Palette className="h-3.5 w-3.5 mr-1 text-muted-foreground"/>{categoryName}</Badge>}
        {courseDescription && (
          <div className="prose prose-sm max-w-none text-foreground/90" dangerouslySetInnerHTML={{ __html: courseDescription }} />
        )}
      </header>

      {(difficulty || durationMinutes || badgeOnComplete || certificateFileName) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm py-3">
            {difficulty && <Card className="shadow-sm border-border/80"><CardHeader className="pb-1 pt-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center"><Activity className="h-3.5 w-3.5 mr-1.5"/>Difficulty</CardTitle></CardHeader><CardContent className="pb-3"><p className="text-sm font-semibold text-foreground">{difficulty}</p></CardContent></Card>}
            {durationMinutes && <Card className="shadow-sm border-border/80"><CardHeader className="pb-1 pt-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5"/>Est. Duration</CardTitle></CardHeader><CardContent className="pb-3"><p className="text-sm font-semibold text-foreground">{durationMinutes} mins</p></CardContent></Card>}
            {badgeOnComplete && <Card className="shadow-sm border-border/80"><CardHeader className="pb-1 pt-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center"><AwardIconLucide className="h-3.5 w-3.5 mr-1.5"/>Completion Badge</CardTitle></CardHeader><CardContent className="pb-3"><p className="text-sm font-semibold text-foreground">{badgeOnComplete}</p></CardContent></Card>}
            {certificateFileName && <Card className="shadow-sm border-border/80"><CardHeader className="pb-1 pt-3"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center"><FileText className="h-3.5 w-3.5 mr-1.5"/>Certificate</CardTitle></CardHeader><CardContent className="pb-3"><p className="text-sm font-semibold text-foreground truncate">{certificateFileName}</p></CardContent></Card>}
        </div>
      )}


      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center">
          <BookOpen className="mr-2 h-5 w-5 text-primary"/> Course Content Preview
        </h2>
        {modules && modules.length > 0 ? (
          <div className="space-y-4">
            {modules.map((module, moduleIndex) => (
              <details key={module.id} open className="border border-border/70 rounded-lg bg-muted/20 shadow-sm overflow-hidden">
                <summary className="px-4 py-3 text-lg font-semibold text-foreground cursor-pointer hover:bg-muted/40 rounded-t-lg list-none flex justify-between items-center transition-colors">
                  <span>Module {moduleIndex + 1}: {module.title || "Untitled Module"}</span>
                  <span className="text-muted-foreground text-sm details-arrow transform transition-transform duration-200">&#9662;</span>
                </summary>
                <div className="p-4 border-t border-border/60 rounded-b-lg bg-background/70">
                  {module.description && <p className="text-sm text-muted-foreground italic mb-4 p-2 bg-muted/30 rounded-md">{module.description}</p>}
                  {module.chapters && module.chapters.length > 0 ? (
                    <div className="space-y-3">
                      {module.chapters.map((chapter, chapIdx) => (
                        <div key={chapter.id} className="bg-card p-3 rounded-md shadow-inner border border-border/50">
                          <h3 className="text-md font-semibold text-primary mb-2 border-b pb-1.5">
                            Chapter {chapIdx + 1}: {chapter.title || "Untitled Chapter"}
                          </h3>
                          {chapter.estimatedMinutes && <p className="text-xs text-muted-foreground mb-2">Est. {chapter.estimatedMinutes} mins</p>}
                          {chapter.contentBlocks && chapter.contentBlocks.length > 0 ? (
                            chapter.contentBlocks.map((block, blockIdx) => (
                              <div key={block.id} className={cn(
                                "py-2 my-2 border-l-2 pl-3",
                                block.type === 'heading' ? 'border-transparent -ml-3' : 'border-primary/20',
                              )}>
                                {renderContentBlock(block, blockIdx)}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No content blocks defined for this chapter.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">No chapters defined for this module.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">No modules or content defined yet to preview.</p>
        )}
      </section>
      <style jsx global>{`
        details summary::-webkit-details-marker {
            display: none;
        }
        details[open] .details-arrow {
            transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}
