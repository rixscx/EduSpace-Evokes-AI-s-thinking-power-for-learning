
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { Save, FolderPlus, PlusCircle, ListOrdered, Palette, Sparkles, X, RotateCcw, ArrowUp, ArrowDown, FileUp, Trash2, FileText as FileTextIcon, GripVertical, Loader2, Eye, Edit3 as EditIcon, Award } from "lucide-react";
import { placeholderCourseCategories } from "@/config/nav";
import { generateQuiz, type GenerateQuizInput, type GenerateQuizOutput } from "@/ai/flows/generate-quiz";
import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import type { Course, Module as PlatformModule, Lesson as PlatformLessonType, LessonMaterial, ContentBlockType, ModuleInputState, ChapterInputState, ContentBlockInputState } from "@/types/platform";
import { getCourseById, updateCourseInFirestore } from "@/lib/mockCourses"; 
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { CourseStructurePreview } from "@/components/course/CourseStructurePreview";


const courseFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(120, "Title too long."),
  description: z.string().min(10, "Description needs more detail.").max(5000, "Description too long."),
  category: z.string().min(1, "Please select a category."),
  thumbnailFile: z.custom<File | null>((val) => val === null || val instanceof File, {
    message: "Please upload a valid image file for the thumbnail.",
  }).optional().nullable(),
  certificateFile: z.custom<File | null>((val) => val === null || val instanceof File, {
    message: "Please upload a valid image or PDF file for the certificate.",
  }).optional().nullable(),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  durationMinutes: z.coerce.number().int().positive("Duration must be a positive number.").optional(),
  badgeOnComplete: z.string().max(50, "Badge name too long.").optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;


export default function EditCoursePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const { user, isLoading: authLoading } = useAuth();

  const [initialCourseData, setInitialCourseData] = useState<Course | null>(null); 
  const [modules, setModules] = useState<ModuleInputState[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");

  const [currentModuleIdForAddingChapter, setCurrentModuleIdForAddingChapter] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<string | null>(null); 
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFileName, setThumbnailFileName] = useState<string | null>(null); 
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | undefined>(undefined);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  
  const [certificateFileName, setCertificateFileName] = useState<string | null>(null);
  const [existingCertificateUrl, setExistingCertificateUrl] = useState<string | undefined>(undefined);

  const [isPreviewMode, setIsPreviewMode] = useState(false);


  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { title: "", description: "", category: "", thumbnailFile: null, certificateFile: null },
  });

  const loadCourseData = useCallback(async () => {
    if (courseId && user) { 
      setIsLoadingCourse(true);
      try {
        const courseToEdit = await getCourseById(courseId);
        if (courseToEdit) {
          if (courseToEdit.teacherId !== user.uid) {
            toast({ title: "Unauthorized", description: "You are not authorized to edit this course.", variant: "destructive" });
            router.push("/teacher/courses");
            return;
          }
          setInitialCourseData(courseToEdit); 
          form.reset({
            title: courseToEdit.title,
            description: courseToEdit.description,
            category: courseToEdit.category.name, 
            thumbnailFile: null, 
            certificateFile: null,
            difficulty: courseToEdit.difficulty || "Beginner",
            durationMinutes: courseToEdit.durationMinutes || undefined,
            badgeOnComplete: courseToEdit.badgeOnComplete || "",
          });
          setExistingThumbnailUrl(courseToEdit.thumbnailImageURL);
          setThumbnailFileName(courseToEdit.thumbnailFileName || null); 
          
          setExistingCertificateUrl(courseToEdit.certificateTemplateUrl);
          setCertificateFileName(courseToEdit.certificateFileName || null);

          setModules(courseToEdit.modules.map(m => ({
            id: m.id,
            title: m.title,
            description: m.description || undefined,
            chapters: m.chapters.map(c => ({
              id: c.id,
              title: c.title,
              estimatedMinutes: c.estimatedMinutes || undefined,
              contentBlocks: c.contentBlocks.map(cb => ({
                id: cb.id,
                type: cb.type,
                value: cb.value,
                altText: cb.altText || undefined,
                level: cb.level || undefined,
                dataAiHint: cb.dataAiHint || undefined,
                fileName: cb.fileName || undefined,
                fileSize: cb.fileSize || undefined,
                fileType: cb.fileType || undefined,
              }))
            }))
          })));
        } else {
          toast({ title: "Course Not Found", description: "The course you are trying to edit does not exist.", variant: "destructive" });
          router.push("/teacher/courses");
        }
      } catch (error) {
        console.error("Error fetching course for edit:", error);
        toast({ title: "Error", description: "Could not load course data from Firestore.", variant: "destructive" });
      } finally {
        setIsLoadingCourse(false);
      }
    } else if (!user && !authLoading) { 
        toast({ title: "Authentication Required", description: "Please log in to edit courses.", variant: "destructive" });
        router.push("/teacher/login");
    }
  }, [courseId, form, router, toast, user, authLoading]);

  useEffect(() => {
    if (!authLoading) { 
        loadCourseData();
    }
  }, [authLoading, loadCourseData]);


  async function onSubmit(data: CourseFormValues) { 
    if (!courseId) {
        toast({ title: "Error", description: "Course ID not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    if (!user || !user.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    
    let finalThumbnailImageURL = existingThumbnailUrl;
    let finalThumbnailFileNameDetermined = thumbnailFileName;

    if (data.thumbnailFile) { 
        finalThumbnailFileNameDetermined = data.thumbnailFile.name;
        finalThumbnailImageURL = `https://placehold.co/600x338.png?text=${encodeURIComponent(finalThumbnailFileNameDetermined.substring(0,10))}`;
    } else if (thumbnailFileName === null && initialCourseData?.thumbnailFileName) {
      finalThumbnailImageURL = undefined; 
      finalThumbnailFileNameDetermined = null;
    }

    let finalCertificateTemplateUrl = existingCertificateUrl;
    let finalCertificateFileNameDetermined = certificateFileName;

    if (data.certificateFile) {
        finalCertificateFileNameDetermined = data.certificateFile.name;
        finalCertificateTemplateUrl = `https://placehold.co/1169x827.png?text=Cert:${encodeURIComponent(finalCertificateFileNameDetermined.substring(0,10))}`;
    } else if (certificateFileName === null && initialCourseData?.certificateFileName) {
      finalCertificateTemplateUrl = undefined;
      finalCertificateFileNameDetermined = null;
    }


    const updatedCourseData: Partial<Omit<Course, 'id' | 'teacherId' | 'createdAt'>> = {
        title: data.title,
        description: data.description,
        category: { id: data.category.toLowerCase().replace(/\s+/g, '-'), name: data.category },
        thumbnailImageURL: finalThumbnailImageURL,
        thumbnailFileName: finalThumbnailFileNameDetermined || undefined,
        certificateTemplateUrl: finalCertificateTemplateUrl,
        certificateFileName: finalCertificateFileNameDetermined || undefined,
        difficulty: data.difficulty || undefined,
        durationMinutes: (data.durationMinutes && data.durationMinutes > 0) ? data.durationMinutes : undefined,
        badgeOnComplete: data.badgeOnComplete && data.badgeOnComplete.trim() !== "" ? data.badgeOnComplete.trim() : undefined,
        modules: modules.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description && m.description.trim() !== "" ? m.description.trim() : undefined,
          chapters: m.chapters.map(c => ({
            id: c.id,
            title: c.title,
            estimatedMinutes: c.estimatedMinutes && c.estimatedMinutes > 0 ? c.estimatedMinutes : undefined,
            contentBlocks: c.contentBlocks.map(cb => ({
              id: cb.id,
              type: cb.type,
              value: cb.file ? `#UPLOAD_PENDING#${cb.fileName || cb.file.name}` : cb.value,
              altText: cb.altText || undefined,
              level: cb.level || undefined,
              dataAiHint: cb.dataAiHint || undefined,
              fileName: cb.fileName || (cb.file ? cb.file.name : undefined),
              fileSize: cb.fileSize || (cb.file ? cb.file.size : undefined),
              fileType: cb.fileType || (cb.file ? cb.file.type : undefined),
            })),
          })),
        })),
    };
    
    try {
      await updateCourseInFirestore(courseId, updatedCourseData);
      toast({ title: "Course Updated!", description: `Changes to "${data.title}" have been saved to Firestore.` });
      router.push(`/teacher/courses/${courseId}`); 
    } catch (error) {
      console.error("Error updating course:", error);
      toast({ title: "Update Failed", description: "Could not save changes to Firestore.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleAddModule = () => {
    const trimmedTitle = newModuleTitle.trim();
    if (trimmedTitle !== "") {
      setModules(prevModules => [...prevModules, {
        id: `module-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: trimmedTitle,
        description: newModuleDescription.trim() || undefined,
        chapters: []
      }]);
      setNewModuleTitle("");
      setNewModuleDescription("");
    } else {
        toast({ title: "Module Title Required", description: "Please enter a title for the module.", variant: "destructive" });
    }
  };

  const handleRemoveModule = (moduleId: string) => {
    setModules(prevModules => prevModules.filter(m => m.id !== moduleId));
  };

  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    setModules(prevModules => {
      const newModules = [...prevModules];
      const moduleToMove = newModules[index];
      newModules.splice(index, 1);
      if (direction === 'up') {
        newModules.splice(Math.max(0, index - 1), 0, moduleToMove);
      } else {
        newModules.splice(Math.min(newModules.length, index + 1), 0, moduleToMove);
      }
      return newModules;
    });
  };

  const handleAddChapterToModule = () => {
    const trimmedChapterTitle = newChapterTitle.trim();
    if (currentModuleIdForAddingChapter && trimmedChapterTitle !== "") {
      setModules(prevModules => prevModules.map(m =>
        m.id === currentModuleIdForAddingChapter
          ? { ...m, chapters: [...m.chapters, {
              id: `chapter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: trimmedChapterTitle,
              contentBlocks: []
            }] }
          : m
      ));
      setNewChapterTitle("");
      setCurrentModuleIdForAddingChapter(null);
    } else if (currentModuleIdForAddingChapter && !trimmedChapterTitle) {
        toast({ title: "Chapter Title Required", description: "Please enter a title for the chapter.", variant: "destructive" });
    }
  };

  const handleRemoveChapter = (moduleId: string, chapterId: string) => {
    setModules(prevModules => prevModules.map(m =>
      m.id === moduleId ? { ...m, chapters: m.chapters.filter(c => c.id !== chapterId) } : m
    ));
  };

  const handleMoveChapter = (moduleId: string, chapterIndex: number, direction: 'up' | 'down') => {
     setModules(prevModules => prevModules.map(m => {
      if (m.id === moduleId) {
        const newChapters = [...m.chapters];
        const chapterToMove = newChapters[chapterIndex];
        newChapters.splice(chapterIndex, 1);
        if (direction === 'up') {
          newChapters.splice(Math.max(0, chapterIndex - 1), 0, chapterToMove);
        } else {
          newChapters.splice(Math.min(newChapters.length, chapterIndex + 1), 0, chapterToMove);
        }
        return { ...m, chapters: newChapters };
      }
      return m;
    }));
  };

  const handleAddContentBlock = (moduleId: string, chapterId: string, type: ContentBlockType) => {
    setModules(prevModules => prevModules.map(m =>
      m.id === moduleId
        ? { ...m, chapters: m.chapters.map(c =>
            c.id === chapterId
              ? { ...c, contentBlocks: [...c.contentBlocks, {
                  id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  type,
                  value: type === 'heading' ? "New Heading" : (type === 'image' ? 'https://placehold.co/800x400.png' : ''),
                  level: type === 'heading' ? 3 : undefined,
                  altText: type === 'image' ? 'Placeholder image' : undefined,
                  dataAiHint: type === 'image' ? 'abstract concept' : undefined,
                }]
              }
              : c
          )}
        : m
    ));
  };

  const handleContentBlockChange = (moduleId: string, chapterId: string, blockId: string, field: keyof ContentBlockInputState, newValue: any) => {
    setModules(prevModules => prevModules.map(m =>
      m.id === moduleId
        ? { ...m, chapters: m.chapters.map(c =>
            c.id === chapterId
              ? { ...c, contentBlocks: c.contentBlocks.map(cb =>
                  cb.id === blockId ? { ...cb, [field]: newValue } : cb
                )}
              : c
          )}
        : m
    ));
  };

  const handleContentBlockFileChange = (event: React.ChangeEvent<HTMLInputElement>, moduleId: string, chapterId: string, blockId: string) => {
    const file = event.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setModules(prevModules => prevModules.map(m =>
        m.id === moduleId
          ? { ...m, chapters: m.chapters.map(c =>
              c.id === chapterId
                ? { ...c, contentBlocks: c.contentBlocks.map(cb =>
                    cb.id === blockId ? {
                      ...cb,
                      file,
                      fileName: file.name,
                      fileSize: file.size,
                      fileType: file.type,
                      value: `#UPLOAD_PENDING#${file.name}`,
                      localFilePreviewUrl: cb.type === 'image' ? localUrl : undefined,
                    } : cb
                  )}
                : c
            )}
          : m
      ));
    }
  };

  const handleRemoveContentBlock = (moduleId: string, chapterId: string, blockId: string) => {
    setModules(prevModules => prevModules.map(m =>
      m.id === moduleId
        ? { ...m, chapters: m.chapters.map(c =>
            c.id === chapterId
              ? { ...c, contentBlocks: c.contentBlocks.filter(cb => {
                  if (cb.id === blockId && cb.localFilePreviewUrl) {
                    URL.revokeObjectURL(cb.localFilePreviewUrl);
                  }
                  return cb.id !== blockId;
                }) }
              : c
          )}
        : m
    ));
  };

  const handleMoveContentBlock = (moduleId: string, chapterId: string, blockIndex: number, direction: 'up' | 'down') => {
    setModules(prevModules => prevModules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          chapters: m.chapters.map(c => {
            if (c.id === chapterId) {
              const newContentBlocks = [...c.contentBlocks];
              const blockToMove = newContentBlocks[blockIndex];
              newContentBlocks.splice(blockIndex, 1);
              if (direction === 'up') {
                newContentBlocks.splice(Math.max(0, blockIndex - 1), 0, blockToMove);
              } else {
                newContentBlocks.splice(Math.min(newContentBlocks.length, blockIndex + 1), 0, blockToMove);
              }
              return { ...c, contentBlocks: newContentBlocks };
            }
            return c;
          })
        };
      }
      return m;
    }));
  };

  const handleThumbnailFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
        setThumbnailPreviewUrl(null);
    }
    if (file) {
      form.setValue("thumbnailFile", file); 
      setThumbnailFileName(file.name); 
      setThumbnailPreviewUrl(URL.createObjectURL(file));
    } else {
      form.setValue("thumbnailFile", null);
      setThumbnailFileName(initialCourseData?.thumbnailFileName || null); // Revert to original if file cleared
      setThumbnailPreviewUrl(null); // Clear preview
    }
  };
  
  const handleCertificateFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("certificateFile", file);
      setCertificateFileName(file.name);
    } else {
      form.setValue("certificateFile", null);
      setCertificateFileName(null);
    }
  };

  useEffect(() => {
    // Cleanup object URLs on component unmount
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
      modules.forEach(module => {
        module.chapters.forEach(chapter => {
          chapter.contentBlocks.forEach(block => {
            if (block.localFilePreviewUrl) URL.revokeObjectURL(block.localFilePreviewUrl);
          });
        });
      });
    };
  }, [modules, thumbnailPreviewUrl]);

  const handleGenerateQuizForLesson = async (lesson: ContentBlockInputState) => {
    // This function expects a LessonInputState but the current structure is chapter -> contentBlocks.
    // For now, this is a placeholder if it was meant for the old Lesson structure.
    // To generate a quiz for a chapter's content, you'd aggregate text from its contentBlocks.
    toast({ title: "Quiz Generation", description: "Quiz generation for content blocks is not yet fully implemented in this editor view.", variant: "default" });
  };

  
  if (authLoading || isLoadingCourse) {
    return (
        <DashboardLayout role="teacher">
            <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
                 <header className="animate-slide-in-up">
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </header>
                <Card><CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-1/3 mb-1"/><Skeleton className="h-9 w-full"/>
                    <Skeleton className="h-6 w-1/3 mb-1 mt-3"/><Skeleton className="h-20 w-full"/>
                    <div className="grid md:grid-cols-2 gap-5"><Skeleton className="h-9 w-full"/><Skeleton className="h-9 w-full"/></div>
                </CardContent></Card>
                 <Card><CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-1/4 mb-1"/><Skeleton className="h-9 w-full"/>
                 </CardContent></Card>
            </div>
        </DashboardLayout>
    );
  }
  if (!user) {
    return <DashboardLayout role="teacher"><div className="text-center p-10">Please log in to manage courses.</div></DashboardLayout>;
  }


  const contentBlockIconMap: Record<ContentBlockType, LucideIcon> = {
    heading: Type,
    text: FileTextIcon,
    image: ImageIcon,
    video: Video,
    link: LinkIcon,
    file: FileIconProp,
  };

  return (
    <DashboardLayout role="teacher">
      <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-slide-in-up" style={{ animationDelay: '50ms'}}>
            <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Edit Course: {initialCourseData?.title || form.getValues().title}</h1>
                <p className="text-md text-muted-foreground mt-0.5">Update modules, chapters, and course information.</p>
            </div>
             <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="text-sm h-9 rounded-md"
                disabled={isSubmitting}
            >
                {isPreviewMode ? <EditIcon className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {isPreviewMode ? "Back to Editor" : "Preview Course"}
            </Button>
        </header>
        
         {isPreviewMode ? (
            <CourseStructurePreview
                courseTitle={form.watch("title")}
                courseDescription={form.watch("description")}
                modules={modules}
                categoryName={form.watch("category")}
                difficulty={form.watch("difficulty")}
                durationMinutes={form.watch("durationMinutes")}
                badgeOnComplete={form.watch("badgeOnComplete")}
                thumbnailPreviewUrl={thumbnailPreviewUrl || existingThumbnailUrl}
                certificateFileName={certificateFileName || undefined}
            />
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up" style={{ animationDelay: '100ms'}}>
                <CardHeader className="p-4 sm:p-5">
                    <CardTitle className="text-lg font-semibold text-foreground">Course Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-4 sm:p-5">
                    <FormField control={form.control} name="title" render={({ field }) => ( <FormItem> <FormLabel className="text-sm font-medium">Title</FormLabel><FormControl><Input placeholder="e.g., Introduction to Quantum Physics" {...field} className="h-9 rounded-md text-sm"/></FormControl><FormMessage className="text-xs"/> </FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel className="text-sm font-medium">Description</FormLabel><FormControl><Textarea placeholder="Describe your course in detail..." rows={4} {...field} className="rounded-md text-sm"/></FormControl><FormMessage className="text-xs"/> </FormItem> )} />
                    <div className="grid md:grid-cols-3 gap-4 items-end">
                        <FormField control={form.control} name="difficulty" render={({ field }) => ( <FormItem> <FormLabel className="text-sm font-medium">Difficulty</FormLabel> <Select onValueChange={field.onChange} value={field.value || "Beginner"}> <FormControl><SelectTrigger className="h-9 rounded-md text-sm"><SelectValue placeholder="Select difficulty" /></SelectTrigger></FormControl> <SelectContent className="bg-card rounded-md shadow-lg border-border"><SelectItem value="Beginner" className="text-sm">Beginner</SelectItem><SelectItem value="Intermediate" className="text-sm">Intermediate</SelectItem><SelectItem value="Advanced" className="text-sm">Advanced</SelectItem></SelectContent> </Select> <FormMessage className="text-xs"/> </FormItem> )} />
                        <FormField control={form.control} name="durationMinutes" render={({ field }) => ( <FormItem> <FormLabel className="text-sm font-medium">Est. Duration (minutes)</FormLabel><FormControl><Input type="number" placeholder="e.g., 60" {...field} value={field.value || ''}  onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)} className="h-9 rounded-md text-sm"/></FormControl><FormMessage className="text-xs"/> </FormItem> )} />
                        <FormField control={form.control} name="badgeOnComplete" render={({ field }) => ( <FormItem> <FormLabel className="text-sm font-medium">Badge on Complete (optional)</FormLabel><FormControl><Input placeholder="e.g., Quantum Leap Achieved" {...field} className="h-9 rounded-md text-sm"/></FormControl><FormMessage className="text-xs"/> </FormItem> )} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel className="text-sm font-medium">Category</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger className="h-9 rounded-md text-sm"><Palette className="mr-2 h-4 w-4 text-muted-foreground"/> <SelectValue placeholder="Select category" /></SelectTrigger></FormControl> <SelectContent className="bg-card rounded-md shadow-lg border-border">{placeholderCourseCategories.map(cat => (<SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>))}</SelectContent> </Select> <FormMessage className="text-xs"/> </FormItem> )} />
                    <FormField control={form.control} name="thumbnailFile" render={({ field }) => ( <FormItem> <FormLabel className="text-sm font-medium">Thumbnail</FormLabel><FormControl><Input type="file" accept="image/*" onChange={handleThumbnailFileChange} className="text-sm h-9 file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/></FormControl>{thumbnailFileName && <FormDescription className="text-xs">Current/Selected: {thumbnailFileName}</FormDescription>}{!thumbnailFileName && existingThumbnailUrl && <FormDescription className="text-xs">Using existing image. Upload to change.</FormDescription>}<FormMessage className="text-xs"/></FormItem> )} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="certificateFile"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-sm font-medium flex items-center"><Award className="mr-1.5 h-4 w-4 text-muted-foreground"/>Certificate Template (Optional)</FormLabel>
                                  <FormControl>
                                      <Input type="file" accept="image/*,.pdf" onChange={handleCertificateFileChange} className="text-sm h-9 file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                                  </FormControl>
                                  {certificateFileName && <FormDescription className="text-xs">Current/Selected: {certificateFileName}</FormDescription>}
                                  {!certificateFileName && existingCertificateUrl && <FormDescription className="text-xs">Using existing certificate. Upload to change.</FormDescription>}
                                  <FormMessage className="text-xs"/>
                              </FormItem>
                          )}
                      />
                    </div>
                </CardContent>
                </Card>

                <Card className="shadow-sm border-border/80 rounded-lg animate-slide-in-up" style={{ animationDelay: '150ms'}}>
                <CardHeader className="p-4 sm:p-5">
                    <CardTitle className="text-lg font-semibold text-foreground">Course Structure</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">Manage modules, chapters, and content for this course.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-4 sm:p-5">
                    <div className="space-y-3 p-3 border border-dashed border-border/70 rounded-md bg-muted/30">
                        <Label htmlFor="new-module-title" className="text-sm font-medium">New Module</Label>
                        <Input id="new-module-title" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} placeholder="Module Title (e.g., Core Concepts)" className="h-9 rounded-md text-sm"/>
                        <Textarea value={newModuleDescription} onChange={(e) => setNewModuleDescription(e.target.value)} placeholder="Module description (optional)" rows={2} className="rounded-md text-sm"/>
                        <Button type="button" onClick={handleAddModule} variant="outline" size="sm" className="h-9 text-xs rounded-md"><FolderPlus className="mr-1.5 h-4 w-4"/>Add Module</Button>
                    </div>
                    <Separator />
                    {modules.length > 0 ? (
                    <div className="space-y-4">
                        <Label className="text-xs font-medium text-muted-foreground">Course Modules ({modules.length})</Label>
                        {modules.map((module, moduleIndex) => (
                        <Card key={module.id} className="bg-card shadow-inner border-border/70 rounded-lg animate-slide-in-up" style={{animationDelay: `${100 + moduleIndex * 50}ms`}}>
                            <CardHeader className="p-3 flex flex-row justify-between items-center border-b border-border/60">
                                <div className="flex items-center gap-1.5">
                                    <GripVertical className="h-5 w-5 text-muted-foreground/70 cursor-grab" />
                                    <CardTitle className="text-md font-semibold text-foreground">{moduleIndex + 1}. {module.title}</CardTitle>
                                </div>
                            <div className="flex items-center">
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveModule(moduleIndex, 'up')} disabled={moduleIndex === 0} className="h-7 w-7"><ArrowUp className="h-4 w-4"/></Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveModule(moduleIndex, 'down')} disabled={moduleIndex === modules.length - 1} className="h-7 w-7"><ArrowDown className="h-4 w-4"/></Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveModule(module.id)} className="text-destructive/80 h-7 w-7"><Trash2 className="h-4 w-4"/></Button>
                            </div>
                            </CardHeader>
                            <CardContent className="p-3 space-y-3">
                            {module.description && <p className="text-xs text-muted-foreground italic mb-2 px-1">{module.description}</p>}
                            {module.chapters.map((chapter, chapterIndex) => (
                                <Card key={chapter.id} className="bg-background/70 border-border/60 rounded-md shadow-sm">
                                <CardHeader className="p-2.5 flex flex-row justify-between items-center border-b border-border/50">
                                    <div className="flex items-center gap-1.5">
                                        <GripVertical className="h-4 w-4 text-muted-foreground/60 cursor-grab" />
                                        <CardTitle className="text-sm font-medium text-foreground">Chapter {chapterIndex + 1}: {chapter.title}</CardTitle>
                                    </div>
                                    <div className="flex items-center">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveChapter(module.id, chapterIndex, 'up')} disabled={chapterIndex === 0} className="h-7 w-7"><ArrowUp className="h-3.5 w-3.5"/></Button>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveChapter(module.id, chapterIndex, 'down')} disabled={chapterIndex === module.chapters.length - 1} className="h-7 w-7"><ArrowDown className="h-3.5 w-3.5"/></Button>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveChapter(module.id, chapter.id)} className="text-destructive/70 h-7 w-7"><X className="h-4 w-4"/></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-2.5 space-y-2">
                                    {chapter.contentBlocks.map((block, blockIndex) => {
                                    const BlockIcon = contentBlockIconMap[block.type];
                                    return (
                                    <div key={block.id} className="p-2 border border-border/50 rounded-md bg-muted/30 space-y-1.5">
                                        <div className="flex justify-between items-center">
                                        <Label className="text-xs capitalize text-muted-foreground flex items-center"><BlockIcon className="mr-1.5 h-3.5 w-3.5"/>{block.type} Block</Label>
                                        <div className="flex items-center">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveContentBlock(module.id, chapter.id, blockIndex, 'up')} disabled={blockIndex === 0} className="h-6 w-6"><ArrowUp className="h-3 w-3"/></Button>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleMoveContentBlock(module.id, chapter.id, blockIndex, 'down')} disabled={blockIndex === chapter.contentBlocks.length - 1} className="h-6 w-6"><ArrowDown className="h-3 w-3"/></Button>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveContentBlock(module.id, chapter.id, block.id)} className="text-destructive/60 h-6 w-6"><Trash2 className="h-3.5 w-3.5"/></Button>
                                        </div>
                                        </div>
                                        {block.type === 'heading' &&
                                        <div className="flex items-center gap-2">
                                            <Select value={block.level?.toString() || "3"} onValueChange={(val) => handleContentBlockChange(module.id, chapter.id, block.id, 'level', parseInt(val) as ContentBlockInputState['level'])}>
                                            <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue/></SelectTrigger>
                                            <SelectContent><SelectItem value="1">H1</SelectItem><SelectItem value="2">H2</SelectItem><SelectItem value="3">H3</SelectItem><SelectItem value="4">H4</SelectItem><SelectItem value="5">H5</SelectItem><SelectItem value="6">H6</SelectItem></SelectContent>
                                            </Select>
                                            <Input value={block.value} onChange={(e) => handleContentBlockChange(module.id, chapter.id, block.id, 'value', e.target.value)} placeholder="Heading text" className="h-8 text-sm"/>
                                        </div>
                                        }
                                        {block.type === 'text' && <Textarea value={block.value} onChange={(e) => handleContentBlockChange(module.id, chapter.id, block.id, 'value', e.target.value)} placeholder="Paragraph text..." rows={3} className="text-sm"/>}
                                        {(block.type === 'image' || block.type === 'file') && (
                                        <div className="space-y-1.5">
                                            <Input type="file" onChange={(e) => handleContentBlockFileChange(e, module.id, chapter.id, block.id)} className="text-xs h-8 file:mr-1 file:py-0.5 file:px-1.5 file:text-xs"/>
                                            {block.file && <p className="text-xs text-muted-foreground">Selected: {block.fileName} ({(block.fileSize || 0 / 1024).toFixed(1)}KB)</p>}
                                            {!block.file && block.value && block.value.startsWith('https://placehold.co') && block.type === 'image' && <p className="text-xs text-muted-foreground">Current: Placeholder Image</p>}
                                            {!block.file && block.value && !block.value.startsWith('https://placehold.co') && !block.value.startsWith('#UPLOAD_PENDING#') && <p className="text-xs text-muted-foreground">Current: {block.value}</p>}
                                            {!block.file && block.fileName && block.value.startsWith('#UPLOAD_PENDING#') && <p className="text-xs text-muted-foreground">Current: {block.fileName} (Upload Pending)</p>}

                                            {block.type === 'image' && <Input value={block.altText || ""} onChange={(e) => handleContentBlockChange(module.id, chapter.id, block.id, 'altText', e.target.value)} placeholder="Image Alt Text (important for accessibility)" className="mt-1 h-8 text-sm"/>}
                                            {block.type === 'image' && <Input value={block.dataAiHint || ""} onChange={(e) => handleContentBlockChange(module.id, chapter.id, block.id, 'dataAiHint', e.target.value)} placeholder="Image Keywords (e.g., nature sunset)" className="mt-1 h-8 text-sm"/>}
                                            {block.type === 'file' && <Input value={block.altText || ""} onChange={(e) => handleContentBlockChange(module.id, chapter.id, block.id, 'altText', e.target.value)} placeholder="File Description / Link Text" className="mt-1 h-8 text-sm"/>}
                                        </div>
                                        )}
                                        {(block.type === 'video' || block.type === 'link') && <Input value={block.value} onChange={(e) => handleContentBlockChange(module.id, chapter.id, block.id, 'value', e.target.value)} placeholder={`${block.type === 'video' ? 'Video Embed URL (YouTube, Vimeo)' : 'Full Link URL (https://...)'}`} className="h-8 text-sm"/>}
                                        {(block.type === 'video' || block.type === 'link') && <Input value={block.altText || ""} onChange={(e) => handleContentBlockChange(module.id, chapter.id, block.id, 'altText', e.target.value)} placeholder={`${block.type === 'video' ? 'Video Title/Description' : 'Link Text/Description'}`} className="mt-1 h-8 text-sm"/>}
                                    </div>
                                    )})}
                                    <div className="pt-2 flex flex-wrap gap-1.5">
                                    {(Object.keys(contentBlockIconMap) as ContentBlockType[]).map(type => {
                                        const Icon = contentBlockIconMap[type];
                                        return <Button key={type} type="button" variant="outline" size="xs" onClick={() => handleAddContentBlock(module.id, chapter.id, type)} className="text-xs h-7 rounded-md"><Icon className="mr-1 h-3.5 w-3.5"/> Add {type}</Button>
                                    })}
                                    </div>
                                </CardContent>
                                </Card>
                            ))}
                            {currentModuleIdForAddingChapter === module.id ? (
                                <div className="mt-2 p-2.5 border border-dashed border-border/60 rounded-md bg-card">
                                <Label htmlFor={`new-chapter-title-${module.id}`} className="text-sm font-medium">New Chapter Title for "{module.title}"</Label>
                                <Input id={`new-chapter-title-${module.id}`} value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} placeholder="Chapter Title" className="my-1.5 h-9 text-sm rounded-md"/>
                                <div className="flex gap-2 justify-end pt-1">
                                    <Button type="button" onClick={() => setCurrentModuleIdForAddingChapter(null)} variant="ghost" size="sm" className="text-xs h-8 rounded-md">Cancel</Button>
                                    <Button type="button" onClick={handleAddChapterToModule} variant="outline" size="sm" className="text-xs h-8 rounded-md">Add Chapter</Button>
                                </div>
                                </div>
                            ) : (
                                <Button type="button" onClick={() => setCurrentModuleIdForAddingChapter(module.id)} variant="outline" size="sm" className="mt-2 text-xs h-9 rounded-md"><PlusCircle className="mr-1.5 h-4 w-4"/> Add Chapter to this Module</Button>
                            )}
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                    ) : (
                    <p className="text-sm text-center text-muted-foreground py-4">No modules exist for this course. Start by adding a module.</p>
                    )}
                </CardContent>
                </Card>
            </form>
            </Form>
        )}

        <div className="flex justify-end gap-3 pt-2 animate-slide-in-up" style={{ animationDelay: '250ms'}}>
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-9 rounded-md text-sm" disabled={isSubmitting}>
                Cancel
            </Button>
            <Button type="button" onClick={form.handleSubmit(onSubmit)} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9 rounded-md" disabled={isSubmitting || authLoading || !user || isPreviewMode}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                ) : (
                    <Save className="mr-1.5 h-4 w-4"/>
                )}
                {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
