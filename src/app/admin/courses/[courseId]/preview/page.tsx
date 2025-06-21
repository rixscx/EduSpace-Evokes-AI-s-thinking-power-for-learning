
"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Course, Module as ModuleType, Chapter as ChapterType, ContentBlock } from "@/types/platform";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { getCourseById } from "@/lib/mockCourses";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, Type, FileText as FileTextIconLucide, Image as ImageIcon, Video, Link as LinkIcon, File as FileIcon, ChevronDown, ChevronUp, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getIconForCategory } from "@/config/nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VideoPlayer } from "@/components/course/VideoPlayer";

const contentBlockIconMap: Record<ContentBlock['type'], LucideIcon> = {
  heading: Type,
  text: FileTextIconLucide,
  image: ImageIcon,
  video: Video,
  link: LinkIcon,
  file: FileIcon,
};

export default function AdminCoursePreviewPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const courseId = params.courseId;
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  const loadCourseData = useCallback(async () => {
    setIsLoading(true);
    try {
      const foundCourse = await getCourseById(courseId);
      if (foundCourse) {
        setCourse(foundCourse);
        if (foundCourse.modules && foundCourse.modules.length > 0) {
          setOpenAccordionItems([foundCourse.modules[0].id]);
        }
      } else {
        toast({ title: "Course Not Found", description: "The requested course was not found.", variant: "destructive" });
        router.push("/admin/courses");
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      toast({ title: "Error", description: "Could not load course data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, toast, router]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case "heading":
        const Tag = `h${(block.level || 3) + 1}` as keyof JSX.IntrinsicElements;
        return <Tag className={`font-semibold text-foreground my-2 ${block.level === 1 ? 'text-xl' : block.level === 2 ? 'text-lg' : 'text-md'}`}>{block.value}</Tag>;
      case "text":
        return <div className="prose prose-sm max-w-none text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_p]:mb-3" dangerouslySetInnerHTML={{ __html: block.value }} />;
      case "image":
        const imageUrl = block.value && block.value.startsWith('data:image')
            ? block.value // Display Base64 data URI directly
            : block.value || "https://placehold.co/800x400.png"; // Fallback to placeholder or existing URL
        return (
          <div className="my-3">
            <Image src={imageUrl} alt={block.altText || "Course image"} width={800} height={400} className="rounded-md border object-cover" data-ai-hint={block.dataAiHint} />
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
          return <div className="my-3"><VideoPlayer videoURL={block.value} title={block.altText || "Course Video"} /></div>;
        }
        return (
          <div className="my-3 p-3 border rounded-md bg-muted/50">
            <div className="flex items-center text-sm text-foreground">
              <Video className="h-4 w-4 mr-2 text-primary" />
              <span>Video Content:</span>
            </div>
            <p className="text-xs text-muted-foreground break-all block mt-1">
              {block.value === "PENDING_VIDEO_SUGGESTION" ? "Video suggestion pending from AI." : "No valid video URL or search query provided."}
            </p>
            {block.altText && <p className="text-xs text-muted-foreground mt-1">{block.altText}</p>}
          </div>
        );
      case "link":
        return (
           <div className="my-3 p-3 border rounded-md bg-muted/50">
            <div className="flex items-center text-sm text-foreground">
              <LinkIcon className="h-4 w-4 mr-2 text-primary" />
              <span>External Link:</span>
            </div>
            <a href={block.value || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all block mt-1">
              {block.altText || block.value || "No link URL provided."}
            </a>
          </div>
        );
      case "file":
         return (
          <div className="my-3 p-3 border rounded-md bg-muted/50">
            <div className="flex items-center text-sm text-foreground">
              <FileIcon className="h-4 w-4 mr-2 text-primary" />
              <span>File Resource:</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {block.fileName || block.altText || block.value}
              {block.fileSize && <span className="ml-2">({(block.fileSize / 1024).toFixed(1)}KB)</span>}
            </p>
             {block.value.startsWith("#UPLOAD_PENDING#") && <Badge variant="outline" className="mt-1 text-xs">Upload Pending</Badge>}
          </div>
        );
      default:
        return <p className="text-xs text-muted-foreground">Unsupported content block type.</p>;
    }
  };


  if (isLoading) {
    return (
      <DashboardLayout role="admin">
        <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
          <Skeleton className="h-8 w-1/4 mb-2" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-60 w-full rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return <DashboardLayout role="admin"><div className="text-center p-10">Course data could not be loaded.</div></DashboardLayout>;
  }

  const CategoryVisualIcon = getIconForCategory(course.category.name);


  return (
    <DashboardLayout role="admin">
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/courses')} className="mb-4 text-xs rounded-md">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Course Management
        </Button>

        <header className="space-y-2 pb-4 border-b">
          <div className="flex items-center gap-2">
             <Badge variant="secondary" className="text-xs"><CategoryVisualIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground"/>{course.category.name}</Badge>
             <Badge variant={course.isPublished ? "default" : "outline"} className={`text-xs ${course.isPublished ? "bg-green-100 text-green-700 border-green-300" : "border-yellow-400 text-yellow-700 bg-yellow-50"}`}>{course.isPublished ? "Published" : "Draft"}</Badge>
             <Badge variant={course.isApproved ? "default" : "outline"} className={`text-xs ${course.isApproved ? "bg-blue-100 text-blue-700 border-blue-300" : "border-orange-400 text-orange-700 bg-orange-50"}`}>{course.isApproved ? "Approved" : "Pending Approval"}</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">{course.title}</h1>
          {course.teacherName && (
             <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <Avatar className="h-7 w-7">
                    <AvatarImage src={course.teacherName[0] ? `https://placehold.co/40x40.png?text=${course.teacherName[0]}` : undefined} alt={course.teacherName} data-ai-hint="instructor avatar"/>
                    <AvatarFallback className="bg-muted text-xs">{course.teacherName[0]?.toUpperCase() || "T"}</AvatarFallback>
                </Avatar>
                <span>Taught by <span className="font-medium text-foreground">{course.teacherName}</span></span>
            </div>
          )}
        </header>

        {course.thumbnailImageURL && (
          <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-md border bg-muted">
            <Image src={course.thumbnailImageURL} alt={course.title + " thumbnail"} layout="fill" objectFit="cover" data-ai-hint={course.dataAiHint || "course image"} />
          </div>
        )}

        <Card className="shadow-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Course Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-foreground/90" dangerouslySetInnerHTML={{ __html: course.description }} />
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Difficulty</CardTitle></CardHeader>
                <CardContent><p className="text-md font-semibold text-foreground">{course.difficulty || 'N/A'}</p></CardContent>
            </Card>
            <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Est. Duration</CardTitle></CardHeader>
                <CardContent><p className="text-md font-semibold text-foreground">{course.durationMinutes ? `${course.durationMinutes} mins` : 'N/A'}</p></CardContent>
            </Card>
            <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completion Badge</CardTitle></CardHeader>
                <CardContent><p className="text-md font-semibold text-foreground">{course.badgeOnComplete || 'None'}</p></CardContent>
            </Card>
        </div>


        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground flex items-center">
            <BookOpen className="mr-2 h-6 w-6 text-primary"/> Course Content
          </h2>
          {course.modules && course.modules.length > 0 ? (
            <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems} className="w-full space-y-3">
              {course.modules.map((module) => (
                <AccordionItem value={module.id} key={module.id} className="border border-border/70 rounded-lg bg-card shadow-sm">
                  <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-lg font-semibold text-foreground hover:no-underline rounded-t-lg">
                    <div className="flex items-center">
                      <span className="mr-2">{openAccordionItems.includes(module.id) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</span>
                      {module.title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-background/30 p-4 border-t border-border/60 rounded-b-lg">
                    {module.description && <p className="text-sm text-muted-foreground italic mb-3">{module.description}</p>}
                    {module.chapters && module.chapters.length > 0 ? (
                      <div className="space-y-3">
                        {module.chapters.map((chapter, chapIdx) => (
                          <Card key={chapter.id} className="bg-muted/40 shadow-inner">
                            <CardHeader className="p-3">
                              <CardTitle className="text-md font-medium text-foreground">Chapter {chapIdx + 1}: {chapter.title}</CardTitle>
                               {chapter.estimatedMinutes && <p className="text-xs text-muted-foreground">{chapter.estimatedMinutes} min estimated</p>}
                            </CardHeader>
                            <CardContent className="p-3 space-y-2 border-t">
                              {chapter.contentBlocks && chapter.contentBlocks.length > 0 ? (
                                chapter.contentBlocks.map(block => (
                                  <div key={block.id} className="py-1">
                                    {renderContentBlock(block)}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground">No content blocks in this chapter.</p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No chapters in this module.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-6">No modules or content available for this course.</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
