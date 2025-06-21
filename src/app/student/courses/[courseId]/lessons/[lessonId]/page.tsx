
"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/course/VideoPlayer";
import { QuizPlayer } from "@/components/course/QuizPlayer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Lightbulb, ArrowLeft, ArrowRight, BookOpen, Star, Download, Paperclip, RotateCcw } from "lucide-react";
import type { Course, Module as ModuleType, Chapter as ChapterType, ContentBlock, LessonMaterial } from "@/types/platform";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getCourseById } from "@/lib/mockCourses";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Type as TypeIcon, FileText as FileTextIconLucide, Image as ImageIconLucide, Video as VideoIcon, Link as LinkIconProp, File as FileIconProp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const contentBlockIconMapStudent: Record<ContentBlock['type'], LucideIcon> = {
  heading: TypeIcon,
  text: FileTextIconLucide,
  image: ImageIconLucide,
  video: VideoIcon,
  link: LinkIconProp,
  file: FileIconProp,
};

export default function LessonDetailPage() {
  const params = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const courseId = params.courseId;
  const chapterIdFromUrl = params.lessonId;
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [currentChapter, setCurrentChapter] = useState<ChapterType | null>(null); 
  const [currentModule, setCurrentModule] = useState<ModuleType | null>(null);
  const [nextLessonLink, setNextLessonLink] = useState<string | null>(null);
  const [prevLessonLink, setPrevLessonLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  const loadLessonData = useCallback(async () => {
    setIsLoading(true);
    try {
      const foundCourse = await getCourseById(courseId);
      if (foundCourse && foundCourse.isPublished && foundCourse.isApproved) {
        setCourse(foundCourse);
        let targetChapter: ChapterType | undefined;
        let chapterModule: ModuleType | undefined;

        for (const module of foundCourse.modules) {
          targetChapter = module.chapters.find(ch => ch.id === chapterIdFromUrl);
          if (targetChapter) {
            chapterModule = module;
            break;
          }
        }

        if (targetChapter && chapterModule) {
          setCurrentModule(chapterModule);
          setCurrentChapter(targetChapter); 

          const allChaptersFlat = foundCourse.modules.flatMap(m =>
            m.chapters.map(ch => ({ id: ch.id, moduleId: m.id }))
          );
          const currentIndex = allChaptersFlat.findIndex(ch => ch.id === chapterIdFromUrl);

          if (currentIndex !== -1) {
            setPrevLessonLink(currentIndex > 0 ? `/student/courses/${courseId}/lessons/${allChaptersFlat[currentIndex - 1].id}` : null);
            setNextLessonLink(currentIndex < allChaptersFlat.length - 1 ? `/student/courses/${courseId}/lessons/${allChaptersFlat[currentIndex + 1].id}` : null);
          }

        } else {
          toast({ title: "Chapter Not Found", description: "The requested chapter does not exist in this course.", variant: "destructive" });
          router.push(`/student/courses/${courseId}`);
        }
      } else if (foundCourse && (!foundCourse.isPublished || !foundCourse.isApproved)) {
         toast({ title: "Course Not Available", description: "This course is not currently available to students.", variant: "destructive" });
         router.push("/student/courses");
      } else {
        toast({ title: "Course Not Found", description: "The requested course was not found.", variant: "destructive" });
        router.push("/student/courses");
      }
    } catch (error) {
      console.error("Error fetching chapter data:", error);
      toast({ title: "Error", description: "Could not load chapter data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [courseId, chapterIdFromUrl, toast, router]);

  useEffect(() => {
    loadLessonData();
  }, [loadLessonData]);


  useEffect(() => {
    if (currentChapter) { 
      const storedCompletion = typeof window !== "undefined" ? localStorage.getItem(`lesson-${currentChapter.id}-completed`) : null;
      setIsCompleted(storedCompletion === "true");
    }
  }, [currentChapter]);

  const handleMarkComplete = () => {
    if (!currentChapter) return;
    setIsCompleted(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`lesson-${currentChapter.id}-completed`, "true");
    }
    toast({
      title: "Chapter Completed!",
      description: `Great job on finishing "${currentChapter.title}".`,
      variant: "default",
      action: (
        nextLessonLink ? (
          <Link href={nextLessonLink}>
            <Button variant="outline" size="sm" className="rounded-md text-xs">Next Chapter <ArrowRight className="ml-1.5 h-3.5 w-3.5"/></Button>
          </Link>
        ) : <Link href={`/student/courses/${courseId}`}><Button variant="outline" size="sm" className="rounded-md text-xs">Back to Course</Button></Link>
      )
    });
  };

  const handleQuizComplete = (score: number, totalQuestions: number) => {
    if (!currentChapter) return;
    const percentage = (score / totalQuestions) * 100;
    toast({
      title: "Quiz Finished!",
      description: `You scored ${score}/${totalQuestions} (${percentage.toFixed(0)}%).`,
    });
    if (percentage >= 70 && !isCompleted) {
        handleMarkComplete();
    }
  };
  
  const renderStudentContentBlock = (block: ContentBlock) => {
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
                <VideoIcon className="h-4 w-4 mr-2 text-primary" />
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
              <VideoIcon className="h-4 w-4 mr-2 text-primary" />
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
              <LinkIconProp className="h-4 w-4 mr-2 text-primary" />
              <span>External Link:</span>
            </div>
            <a href={block.value || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all block mt-1">
              {block.altText || block.value || "No link URL provided."}
            </a>
          </div>
        );
      case "file":
        const isUploadPending = block.value?.startsWith("#UPLOAD_PENDING#");
        const material: LessonMaterial = { 
             id: block.id,
             name: block.fileName || block.altText || "Downloadable File",
             url: block.value,
             type: block.fileType,
             size: block.fileSize,
        };
         return (
          <div className="my-3">
              <Button
                variant="outline"
                size="sm"
                asChild={!isUploadPending}
                className="rounded-md text-xs hover:bg-muted w-full sm:w-auto justify-start h-auto py-1.5 px-2.5"
                disabled={isUploadPending}
                title={isUploadPending ? "File upload is pending" : `Download ${material.name}`}
              >
                {isUploadPending ? (
                  <span className="flex items-center w-full">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    <span className="flex flex-col items-start">
                      <span className="truncate max-w-[150px] sm:max-w-xs">{material.name}</span>
                      <span className="text-muted-foreground/80 text-[0.7rem]">
                        {material.type ? `${material.type}, ` : ''}
                        {material.size ? `${(material.size / 1024).toFixed(1)}KB` : ''}
                      </span>
                    </span>
                    <Badge variant="secondary" className="ml-auto text-[0.65rem] px-1.5 py-0.5 self-center">Pending</Badge>
                  </span>
                ) : (
                  <a href={material.url || "#"} download={material.name} target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                      <span className="flex flex-col items-start">
                        <span className="truncate max-w-[150px] sm:max-w-xs">{material.name}</span>
                        <span className="text-muted-foreground/80 text-[0.7rem]">
                          {material.type ? `${material.type}, ` : ''}
                          {material.size ? `${(material.size / 1024).toFixed(1)}KB` : ''}
                        </span>
                      </span>
                  </a>
                )}
              </Button>
          </div>
        );
      default:
        return <p className="text-xs text-muted-foreground">Unsupported content block type.</p>;
    }
  };

  if (isLoading) {
    return (
        <DashboardLayout role="student">
            <div className="max-w-3xl mx-auto animate-fade-in space-y-8">
                 <div className="mb-1"><Skeleton className="h-4 w-1/3 mb-2" /><Skeleton className="h-6 w-1/2 mb-1" /><Skeleton className="h-8 w-3/4" /></div>
                 <Skeleton className="aspect-video w-full rounded-lg" />
                 <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
                 <Card><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            </div>
        </DashboardLayout>
    );
  }

  if (!course || !currentChapter || !currentModule) {
    return <DashboardLayout role="student"><div className="text-center p-10">Chapter or course data could not be loaded.</div></DashboardLayout>;
  }
  
  const firstImageBlockForHeader = currentChapter.contentBlocks.find(cb => cb.type === 'image' && cb.value && !cb.value.startsWith('PENDING'));
  const firstVideoBlockForPlayer = currentChapter.contentBlocks.find(cb => cb.type === 'video' && cb.value && !cb.value.startsWith("PENDING_VIDEO_SUGGESTION") && !cb.value.startsWith("search:"));
  const firstVideoSearchQueryBlock = currentChapter.contentBlocks.find(cb => cb.type === 'video' && cb.value && cb.value.startsWith("search:"));
  
  const hasQuiz = false; // Placeholder: Quiz logic would need to identify a quiz block type or other quiz data source


  return (
    <DashboardLayout role="student">
      <div className="max-w-3xl mx-auto animate-fade-in space-y-8">

        <div className="mb-1 animate-slide-in-up" style={{animationDelay: '0ms'}}>
            <Link href={`/student/courses/${course.id}`} className="inline-flex items-center text-xs text-primary hover:underline mb-2 font-body transition-colors">
                <BookOpen className="h-3.5 w-3.5 mr-1" /> Back to: {course.title || "Course Overview"}
            </Link>
            <p className="text-sm text-muted-foreground">Module: {currentModule.title}</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{currentChapter.title}</h1>
            {firstImageBlockForHeader && (
              <div className="relative h-48 sm:h-56 w-full rounded-lg overflow-hidden shadow-sm border border-border/70 mt-3">
                <Image
                  src={firstImageBlockForHeader.value.startsWith('data:image') ? firstImageBlockForHeader.value : (firstImageBlockForHeader.value || 'https://placehold.co/800x400.png')}
                  alt={firstImageBlockForHeader.altText || currentChapter.title + " header image"}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={firstImageBlockForHeader.dataAiHint || currentChapter.title.substring(0,20)}
                  priority
                />
              </div>
            )}
        </div>

        {firstVideoBlockForPlayer && (
          <section className="animate-slide-in-up" style={{animationDelay: '100ms'}}>
            <VideoPlayer videoURL={firstVideoBlockForPlayer.value} title={firstVideoBlockForPlayer.altText || currentChapter.title} />
          </section>
        )}
        {firstVideoSearchQueryBlock && !firstVideoBlockForPlayer && ( 
           <div className="my-3 p-3 border rounded-md bg-muted/50 animate-slide-in-up" style={{animationDelay: '100ms'}}>
              <div className="flex items-center text-sm text-foreground">
                <VideoIcon className="h-4 w-4 mr-2 text-primary" />
                <span>Suggested Video Search:</span>
              </div>
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(firstVideoSearchQueryBlock.value.substring(7))}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline break-all block mt-1">
                Search YouTube for: "{firstVideoSearchQueryBlock.value.substring(7)}"
              </a>
              {firstVideoSearchQueryBlock.altText && <p className="text-xs text-muted-foreground mt-1">{firstVideoSearchQueryBlock.altText}</p>}
          </div>
        )}

        <section className="p-5 sm:p-6 bg-card rounded-lg shadow-sm border border-border/70 animate-slide-in-up hover:shadow-md transition-all-smooth" style={{animationDelay: '200ms'}}>
          <h2 className="text-xl font-semibold mb-3 text-foreground flex items-center"><FileTextIconLucide className="mr-2 h-5 w-5 text-primary"/>Chapter Content</h2>
          <div className="space-y-2">
            {currentChapter.contentBlocks.map(block => (
              <div key={block.id} className="py-1">
                {renderStudentContentBlock(block)}
              </div>
            ))}
            {currentChapter.contentBlocks.length === 0 && <p className="text-sm text-muted-foreground">No content in this chapter yet.</p>}
          </div>
        </section>

        {hasQuiz && ( 
          <section className="animate-slide-in-up" style={{animationDelay: '300ms'}}>
            <Separator className="my-6"/>
            <h2 className="text-xl font-semibold mb-3 text-foreground text-center">Check Your Understanding</h2>
            {/* <QuizPlayer quizData={associatedQuizData} onQuizComplete={handleQuizComplete} /> */}
            <p className="text-center text-muted-foreground">Quiz functionality to be integrated here.</p>
          </section>
        )}

        <Alert className="mb-6 bg-muted/70 border-border/80 shadow-sm animate-slide-in-up rounded-lg hover:shadow-md transition-all-smooth" style={{animationDelay: '400ms'}}>
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold text-sm text-foreground">Pro Tip!</AlertTitle>
          <AlertDescription className="font-body text-xs text-muted-foreground">
            Revisit key concepts often. Repetition aids retention.
          </AlertDescription>
        </Alert>

        <Card className="shadow-sm border-border/70 bg-card rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{animationDelay: '500ms'}}>
          <CardHeader className="p-4 sm:p-5">
             <CardTitle className="text-md font-semibold text-foreground">Chapter Status & Navigation</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {!isCompleted ? (
              <Button onClick={handleMarkComplete} size="default" className="w-full text-sm py-2.5 rounded-md">
                <CheckCircle className="mr-1.5 h-4.5 w-4.5"/> Mark as Complete
              </Button>
            ) : (
              <div className="text-center p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-1" />
                <p className="font-medium text-green-700 text-sm">Chapter Completed!</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between gap-2.5">
              {prevLessonLink ? (
                <Link href={prevLessonLink} passHref>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto rounded-md text-xs">
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5"/> Previous
                  </Button>
                </Link>
              ) : <div className="flex-1"/>}
              {nextLessonLink ? (
                <Link href={nextLessonLink} passHref>
                  <Button variant="default" size="sm" className="w-full sm:w-auto rounded-md text-xs">
                    Next <ArrowRight className="ml-1.5 h-3.5 w-3.5"/>
                  </Button>
                </Link>
              ) : <div className="flex-1"/>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
