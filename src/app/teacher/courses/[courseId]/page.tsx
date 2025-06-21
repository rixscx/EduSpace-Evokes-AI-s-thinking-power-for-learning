
"use client";

import Image from "next/image";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, BookOpen, Clock, Users, Edit3, ShieldCheck, BarChart2, ChevronDown, ChevronUp, Trash2, Eye, RotateCcw, ListOrdered, MessageSquare, Send, AlertCircle, Award, BadgeCheck, XCircle } from "lucide-react";
import type { Course, Feedback as FeedbackType, Module as ModuleType, Chapter as ChapterType, CourseSuggestion, CourseSuggestionReply, Review, CertificateRecord } from "@/types/platform";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { getCourseById, deleteCourseFromFirestore, updateCourseInFirestore, getCourseEnrollmentCount, getCourseSuggestionsForTeacher, addReplyToSuggestion, markSuggestionAsReadByTeacher, getCourseSuggestionById, getCourseReviews, getCertificateRecordsForCourse, updateCertificateRecordStatus } from "@/lib/mockCourses";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export default function TeacherCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);

  const [suggestionThreads, setSuggestionThreads] = useState<CourseSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSuggestionChatOpen, setIsSuggestionChatOpen] = useState(false);
  const [activeChatThread, setActiveChatThread] = useState<CourseSuggestion | null>(null);
  const [newReplyMessage, setNewReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [courseReviewsList, setCourseReviewsList] = useState<Review[]>([]);
  const [isLoadingCourseReviews, setIsLoadingCourseReviews] = useState(true);

  const [certificateRecords, setCertificateRecords] = useState<CertificateRecord[]>([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(true);
  const [isUpdatingCertStatus, setIsUpdatingCertStatus] = useState<string | null>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [activeChatThread?.replies, activeChatThread?.initialMessage]);

  const loadCourseData = useCallback(async () => {
    if (courseId && user) {
      setIsLoading(true);
      setIsLoadingSuggestions(true);
      setIsLoadingCourseReviews(true);
      setIsLoadingCertificates(true);
      try {
        const foundCourse = await getCourseById(courseId);
        if (foundCourse) {
          if (foundCourse.teacherId !== user.uid) {
            toast({ title: "Unauthorized", description: "You cannot view this course.", variant: "destructive" });
            router.push('/teacher/courses');
            return;
          }
          setCourse(foundCourse);
           if (foundCourse.modules && foundCourse.modules.length > 0 && openAccordionItems.length === 0) {
             setOpenAccordionItems([foundCourse.modules[0].id]);
          }
          const count = await getCourseEnrollmentCount(courseId);
          setEnrollmentCount(count);

          const threads = await getCourseSuggestionsForTeacher(courseId, user.uid);
          setSuggestionThreads(threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));

          const reviews = await getCourseReviews(courseId);
          setCourseReviewsList(reviews);

          const certs = await getCertificateRecordsForCourse(courseId);
          setCertificateRecords(certs);

        } else {
          toast({ title: "Course Not Found", description: "The requested course could not be found.", variant: "destructive" });
          router.push('/teacher/courses');
        }
      } catch (error) {
        console.error("Error fetching course data:", error);
        toast({ title: "Error", description: "Could not load course data, suggestions, or reviews.", variant: "destructive" });
      } finally {
        setIsLoading(false);
        setIsLoadingSuggestions(false);
        setIsLoadingCourseReviews(false);
        setIsLoadingCertificates(false);
      }
    } else if (!user && !authLoading) {
        toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
        router.push('/teacher/login');
    }
  }, [courseId, router, toast, openAccordionItems.length, user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        loadCourseData();
    }
  }, [authLoading, loadCourseData]);

  const handleOpenSuggestionChatCallback = useCallback(
    async (thread: CourseSuggestion) => {
      setActiveChatThread(thread);
      setIsSuggestionChatOpen(true);
      if (!thread.isReadByTeacher) {
        try {
          await markSuggestionAsReadByTeacher(thread.id);
          setSuggestionThreads(prevThreads =>
            prevThreads.map(t => t.id === thread.id ? { ...t, isReadByTeacher: true } : t)
          );
        } catch (error) {
          console.error("Error marking suggestion as read:", error);
        }
      }
    },
    []
  );


  useEffect(() => {
    const tab = searchParams.get('tab');
    const suggestionIdToOpen = searchParams.get('suggestionId');
    if (tab === 'suggestions' && suggestionIdToOpen && suggestionThreads.length > 0 && !isSuggestionChatOpen) {
      const threadToOpen = suggestionThreads.find(t => t.id === suggestionIdToOpen);
      if (threadToOpen) {
        handleOpenSuggestionChatCallback(threadToOpen);
      }
    }
  }, [searchParams, suggestionThreads, isSuggestionChatOpen, handleOpenSuggestionChatCallback]);


  const totalChapters = useMemo(() => {
    return course?.modules?.reduce((acc, module) => acc + (module.chapters?.length || 0), 0) || 0;
  }, [course]);

  const handleTogglePublish = async () => {
    if (!course) return;
    const newPublishStatus = !course.isPublished;
    try {
      await updateCourseInFirestore(course.id, { isPublished: newPublishStatus, isApproved: newPublishStatus ? false : course.isApproved });
      setCourse(prevCourse => prevCourse ? { ...prevCourse, isPublished: newPublishStatus, isApproved: newPublishStatus ? false: prevCourse.isApproved } : null);
      toast({
        title: `Course ${newPublishStatus ? "Published" : "Unpublished"}!`,
        description: `"${course.title}" is now ${newPublishStatus ? "live" : "a draft"}. ${newPublishStatus ? 'It will require admin approval to be visible to students.' : ''}`,
      });
    } catch (error) {
        console.error("Error toggling publish status:", error);
        toast({ title: "Error", description: "Could not update course publish status.", variant: "destructive" });
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    try {
      await deleteCourseFromFirestore(course.id);
      toast({
        title: "Course Deleted",
        description: `"${course.title}" has been permanently removed.`,
        variant: "destructive",
      });
      router.push("/teacher/courses");
    } catch (error) {
        console.error("Error deleting course:", error);
        toast({ title: "Error", description: "Could not delete course.", variant: "destructive" });
    }
  };


  const handleSendTeacherReply = async () => {
    if (!activeChatThread || !user || !user.uid || !newReplyMessage.trim() || !course) return;
    setIsSendingReply(true);
    const messageToSend = newReplyMessage.trim();

    const optimisticReply: CourseSuggestionReply = {
      id: `temp-${Date.now()}`,
      senderId: user.uid,
      senderName: user.displayName || "Teacher",
      message: messageToSend,
      createdAt: new Date(),
    };

    setActiveChatThread(prevThread => {
      if (!prevThread) return null;
      return {
        ...prevThread,
        replies: [...(prevThread.replies || []), optimisticReply],
        isReadByTeacher: true,
      };
    });
    setNewReplyMessage("");

    try {
      await addReplyToSuggestion(
        activeChatThread.id,
        user.uid,
        user.displayName || "Teacher",
        messageToSend,
        activeChatThread.adminId,
        activeChatThread.teacherId,
        activeChatThread.courseTitle,
        activeChatThread.courseId
      );

      const updatedThread = await getCourseSuggestionById(activeChatThread.id);
      if (updatedThread) {
        setActiveChatThread(updatedThread);
        setSuggestionThreads(prevThreads =>
          prevThreads.map(t => t.id === updatedThread.id ? updatedThread : t)
                     .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
      }
      toast({ title: "Reply Sent!", description: "Your reply has been sent to the admin." });
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({ title: "Error Sending Reply", description: "Could not save your reply.", variant: "destructive" });
       if (activeChatThread?.id) {
          const refreshedThread = await getCourseSuggestionById(activeChatThread.id);
          setActiveChatThread(refreshedThread);
       }
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCertificateStatusUpdate = async (recordId: string, newStatus: 'approved' | 'rejected') => {
    if (!user) return;
    setIsUpdatingCertStatus(recordId);
    try {
      await updateCertificateRecordStatus(recordId, newStatus, user.uid);
      setCertificateRecords(prev => prev.map(cert => cert.id === recordId ? {...cert, status: newStatus} : cert));
      toast({title: `Certificate ${newStatus}`, description: `The certificate has been successfully ${newStatus}.`});
    } catch (error) {
       console.error(`Error updating certificate status for ${recordId}:`, error);
       toast({title: "Update Failed", description: "Could not update certificate status.", variant: "destructive"});
    } finally {
      setIsUpdatingCertStatus(null);
    }
  };


  if (authLoading || isLoading) {
    return (
        <DashboardLayout role="teacher">
            <div className="animate-fade-in space-y-8">
                <header className="bg-card p-6 md:p-8 rounded-lg shadow-sm border">
                    <div className="grid md:grid-cols-3 gap-6 items-start">
                        <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-8 w-3/4 mb-1" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
                        <div className="md:col-span-1 space-y-3"><Skeleton className="h-11 w-full rounded-md" /><Skeleton className="h-11 w-full rounded-md" /></div>
                    </div>
                </header>
                 <Skeleton className="h-10 w-full rounded-md mb-6" />
                 <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            </div>
        </DashboardLayout>
    );
  }

  if (!course) {
    return <DashboardLayout role="teacher"><div className="text-center p-10 animate-fade-in">Course not found or you do not have permission to view it.</div></DashboardLayout>;
  }

  const defaultTab = searchParams.get('tab') || 'overview';


  return (
    <DashboardLayout role="teacher">
      <div className="animate-fade-in space-y-8">
        <header className="bg-card p-6 md:p-8 rounded-lg shadow-sm border border-border/80 animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '50ms'}}>
            <div className="grid md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-primary">{course.category.name.toUpperCase()}</p>
                        <div className="flex items-center gap-1">
                            <Link href={`/teacher/courses/${course.id}/edit`} passHref>
                                <Button variant="outline" size="sm" className="rounded-md text-xs">
                                    <Edit3 className="mr-1.5 h-3.5 w-3.5"/> Edit
                                </Button>
                            </Link>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="rounded-md text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50">
                                      <Trash2 className="mr-1.5 h-3.5 w-3.5"/> Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Course: {course.title}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone and will permanently remove the course.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteCourse} className="bg-destructive hover:bg-destructive/90">
                                      Confirm Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                        </div>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{course.title}</h1>
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.description.replace(/<[^>]*>?/gm, '').substring(0,150)}...</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={course.teacherName && course.teacherName[0] ? `https://placehold.co/40x40.png?text=${course.teacherName[0]}`: undefined} alt={course.teacherName} data-ai-hint="instructor portrait"/>
                            <AvatarFallback className="bg-muted text-xs">{course.teacherName?.[0]?.toUpperCase() || "T"}</AvatarFallback>
                        </Avatar>
                        <span>Taught by <span className="font-medium text-foreground">{course.teacherName}</span></span>
                    </div>
                     <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                        <span className="flex items-center"><Star className="h-3.5 w-3.5 mr-1 text-yellow-500 fill-yellow-500" /> ({courseReviewsList.length > 0 ? `${(courseReviewsList.reduce((acc, r) => acc + r.rating, 0) / courseReviewsList.length).toFixed(1)}/5` : 'No ratings'})</span>
                        <span className="flex items-center"><Users className="h-3.5 w-3.5 mr-1" /> {enrollmentCount} Student{enrollmentCount !== 1 && 's'}</span>
                        <Badge variant={course.isPublished ? "default" : "secondary"} className={`text-xs font-normal rounded-full py-0.5 px-2 ${course.isPublished ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}`}>
                            {course.isPublished ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant={course.isApproved ? "default" : "destructive"} className={`text-xs font-normal rounded-full py-0.5 px-2 ${course.isApproved ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-orange-100 text-orange-700 border-orange-300"}`}>
                            {course.isApproved ? "Approved" : "Pending Approval"}
                        </Badge>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-3">
                     <Button
                        size="lg"
                        className={`w-full text-base h-11 rounded-md ${course.isPublished ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"}`}
                        onClick={handleTogglePublish}
                     >
                         {course.isPublished ? "Unpublish Course" : "Publish Course"}
                    </Button>
                    <Button variant="outline" size="lg" className="w-full text-base h-11 rounded-md" asChild>
                        <Link href={`/admin/courses/${courseId}/preview`} target="_blank">
                             <Eye className="mr-2 h-5 w-5"/> View Preview
                        </Link>
                    </Button>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 animate-slide-in-up" style={{ animationDelay: '150ms'}}>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6 bg-muted p-1 rounded-md shadow-sm">
                <TabsTrigger value="overview" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">Overview</TabsTrigger>
                <TabsTrigger value="chapters" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">Chapters ({totalChapters})</TabsTrigger>
                <TabsTrigger value="certificates" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">Certs ({certificateRecords.filter(c => c.status === 'pending_validation').length})</TabsTrigger>
                <TabsTrigger value="suggestions" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">
                    Suggestions
                    {suggestionThreads.some(t => !t.isReadByTeacher) && <span className="ml-1.5 h-2 w-2 rounded-full bg-primary animate-pulse"></span>}
                </TabsTrigger>
                <TabsTrigger value="reviews" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">Reviews ({courseReviewsList.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-6 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
                <h2 className="text-xl font-semibold mb-3 text-foreground">About this course</h2>
                <div
                    className="prose prose-sm max-w-none text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:mb-1 [&_p]:mb-3 [&_h3]:font-semibold [&_h3]:text-md [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                />
              </TabsContent>

              <TabsContent value="chapters" className="bg-card rounded-lg shadow-sm border border-border/80 overflow-hidden hover:shadow-md transition-all-smooth">
                <div className="p-4 border-b border-border/70 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Course Content</h3>
                        <p className="text-sm text-muted-foreground">Manage chapters and content blocks.</p>
                    </div>
                     <Link href={`/teacher/courses/${course.id}/edit`} passHref>
                        <Button variant="outline" size="sm" className="rounded-md text-xs">
                            <Edit3 className="mr-1.5 h-3.5 w-3.5"/> Manage Content
                        </Button>
                    </Link>
                </div>
                 {course.modules && course.modules.length > 0 ? (
                    <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems} className="w-full">
                      {course.modules.map((module) => (
                        <AccordionItem value={module.id} key={module.id} className="border-b-0">
                          <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-md font-medium text-foreground hover:no-underline transition-colors duration-150 ease-in-out">
                             <div className="flex items-center">
                              <span className="mr-2">{openAccordionItems.includes(module.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                              {module.title}
                              <span className="ml-2 text-xs text-muted-foreground">({module.chapters?.length || 0} chapter{module.chapters?.length !== 1 ? 's' : ''})</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="bg-background/30">
                            {module.chapters?.map((chapter, chapterIndex) => (
                                <div key={chapter.id} className="flex items-center p-3.5 border-b border-border/60 last:border-b-0 text-sm hover:bg-muted/40 transition-colors">
                                    <ListOrdered className="h-5 w-5 mr-3 shrink-0 text-muted-foreground" />
                                    <span className="font-medium text-foreground">{chapterIndex + 1}. {chapter.title || "(Untitled Chapter)"}</span>
                                </div>
                            ))}
                             {(!module.chapters || module.chapters.length === 0) && <p className="text-xs text-muted-foreground px-4 py-3">No chapters in this module yet.</p>}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">No modules or chapters created yet.
                        <Link href={`/teacher/courses/${course.id}/edit`} className="text-primary hover:underline ml-1"> Add content now.</Link>
                    </p>
                )}
              </TabsContent>

              <TabsContent value="certificates" className="p-6 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
                 <h2 className="text-xl font-semibold text-foreground mb-4">Certificate Validation</h2>
                 {isLoadingCertificates ? (
                    <div className="space-y-3">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
                    </div>
                 ) : certificateRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <BadgeCheck className="h-12 w-12 mx-auto opacity-40 mb-3"/>
                        <p className="text-sm">No certificates are currently pending validation for this course.</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                        {certificateRecords.map(cert => (
                            <Card key={cert.id} className={cn("transition-shadow", cert.status === 'pending_validation' && 'bg-amber-50 border-amber-300')}>
                                <CardContent className="p-3 flex justify-between items-center">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-sm">{cert.studentName}</p>
                                      <p className="text-xs text-muted-foreground">Score: {cert.finalScore}/{cert.totalMarks} ({((cert.finalScore!/cert.totalMarks!)*100).toFixed(0)}%) | Submitted: {format(new Date(cert.issuedDate), "MMM d, yyyy")}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {cert.status === 'pending_validation' ? (
                                          <>
                                            <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleCertificateStatusUpdate(cert.id!, 'rejected')} disabled={isUpdatingCertStatus === cert.id}>
                                                {isUpdatingCertStatus === cert.id ? <RotateCcw className="h-3.5 w-3.5 animate-spin"/> : <XCircle className="h-3.5 w-3.5"/>}
                                            </Button>
                                            <Button size="sm" variant="default" className="text-xs bg-green-600 hover:bg-green-700" onClick={() => handleCertificateStatusUpdate(cert.id!, 'approved')} disabled={isUpdatingCertStatus === cert.id}>
                                                {isUpdatingCertStatus === cert.id ? <RotateCcw className="h-3.5 w-3.5 animate-spin"/> : <BadgeCheck className="h-3.5 w-3.5"/>}
                                            </Button>
                                          </>
                                        ) : (
                                          <Badge variant={cert.status === 'approved' ? 'default' : 'destructive'} className={cn('capitalize text-xs', cert.status === 'approved' && 'bg-green-100 text-green-700 border-green-300')}>{cert.status}</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 )}
              </TabsContent>

              <TabsContent value="suggestions" className="p-6 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
                 <h2 className="text-xl font-semibold text-foreground mb-4">Admin Suggestions</h2>
                 {isLoadingSuggestions ? (
                    <div className="space-y-3">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
                    </div>
                 ) : suggestionThreads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto opacity-40 mb-3"/>
                        <p className="text-sm">No suggestions received for this course yet.</p>
                    </div>
                 ) : (
                    <div className="space-y-3">
                        {suggestionThreads.map(thread => (
                            <Card key={thread.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenSuggestionChatCallback(thread)}>
                                <CardContent className="p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">From: {thread.adminName}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                                                {thread.replies && thread.replies.length > 0 ?
                                                    `"${thread.replies[thread.replies.length - 1].message.substring(0,50)}..."` :
                                                    `"${thread.initialMessage.substring(0,50)}..."`
                                                }
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            {!thread.isReadByTeacher && <Badge variant="destructive" className="text-xs mb-1">New</Badge>}
                                            <p className="text-xs text-muted-foreground">{format(new Date(thread.updatedAt), "MMM d, h:mm a")}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 )}
              </TabsContent>

              <TabsContent value="reviews" className="p-6 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
                <h2 className="text-xl font-semibold text-foreground mb-4">Student Feedback</h2>
                 {isLoadingCourseReviews ? (
                    <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i} className="p-4 bg-muted/50 animate-pulse">
                                <div className="flex items-center gap-2 mb-1"><Skeleton className="h-5 w-5 rounded-full" /><Skeleton className="h-4 w-24" /></div>
                                <Skeleton className="h-3 w-16 mb-2" />
                                <Skeleton className="h-12 w-full" />
                            </Card>
                        ))}
                    </div>
                ) : courseReviewsList.length > 0 ? (
                    <div className="space-y-4">
                        {courseReviewsList.map((review) => (
                            <Card key={review.id} className="p-4 bg-muted/50">
                                <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-7 w-7">
                                    <AvatarImage src={`https://placehold.co/40x40.png?text=${review.studentName[0]}`} alt={review.studentName} data-ai-hint="student avatar"/>
                                    <AvatarFallback className="text-xs bg-background">{review.studentName[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <h4 className="font-semibold text-sm text-foreground">{review.studentName}</h4>
                                </div>
                                <div className="flex items-center mb-1.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`h-4 w-4 ${
                                        review.rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/50'
                                        }`}
                                    />
                                    ))}
                                </div>
                                {review.comment && <p className="text-sm text-foreground/80 mb-1">{review.comment}</p>}
                                <p className="text-xs text-muted-foreground">{format(new Date(review.updatedAt || review.createdAt), "MMM d, yyyy")}</p>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm py-8 text-center">No reviews yet for this course.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border-border/80 bg-card rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '200ms'}}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-foreground">Course Stats</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p className="flex justify-between"><span>Enrolled Students:</span> <span className="font-semibold">{enrollmentCount}</span></p>
                    <p className="flex justify-between"><span>Completion Rate:</span> <span className="font-semibold">N/A</span></p>
                    <p className="flex justify-between"><span>Average Rating:</span> <span className="font-semibold">{courseReviewsList.length > 0 ? `${(courseReviewsList.reduce((acc, r) => acc + r.rating, 0) / courseReviewsList.length).toFixed(1)}/5` : 'N/A'}</span></p>
                     <p className="flex justify-between"><span>Total Modules:</span> <span className="font-semibold">{course.modules.length}</span></p>
                    <p className="flex justify-between"><span>Total Chapters:</span> <span className="font-semibold">{totalChapters}</span></p>
                    <p className="flex justify-between"><span>Certificate:</span> <span className="font-semibold">{course.certificateFileName ? 'Uploaded' : 'None'}</span></p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/80 bg-card rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '250ms'}}>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full rounded-md text-sm" disabled>View Student List</Button>
                    <Button variant="outline" size="sm" className="w-full rounded-md text-sm" disabled>Send Announcement</Button>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {activeChatThread && course && user && (
        <Dialog open={isSuggestionChatOpen} onOpenChange={setIsSuggestionChatOpen}>
          <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="text-lg">Suggestion for: {course.title}</DialogTitle>
              <DialogDescription>
                Conversation with {activeChatThread.adminName} (Admin)
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="space-y-3">
                  <div className={cn(
                    "flex w-full max-w-xs md:max-w-md p-3 rounded-lg",
                    "mr-auto bg-muted text-muted-foreground"
                  )}>
                    <div>
                      <p className="text-xs font-semibold mb-0.5">{activeChatThread.adminName} (Admin)</p>
                      <p className="text-sm">{activeChatThread.initialMessage}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(activeChatThread.createdAt), "MMM d, h:mm a")}</p>
                    </div>
                  </div>

                  {activeChatThread.replies?.map((reply) => (
                     <div key={reply.id} className={cn(
                        "flex w-full max-w-xs md:max-w-md p-3 rounded-lg",
                        reply.senderId === user.uid ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted text-muted-foreground"
                     )}>
                      <div>
                        <p className="text-xs font-semibold mb-0.5">{reply.senderName} {reply.senderId === user.uid ? "(You)" : "(Admin)"}</p>
                        <p className="text-sm">{reply.message}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(reply.createdAt), "MMM d, h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex items-start space-x-2">
                <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "Teacher"} />
                    <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || "T"}</AvatarFallback>
                </Avatar>
                <Textarea
                  value={newReplyMessage}
                  onChange={(e) => setNewReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  className="flex-grow rounded-md text-sm min-h-[60px] resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSendingReply && newReplyMessage.trim()) {
                         handleSendTeacherReply();
                      }
                    }
                  }}
                />
                <Button
                    type="button"
                    onClick={handleSendTeacherReply}
                    disabled={isSendingReply || !newReplyMessage.trim()}
                    className="h-auto py-2 px-3 self-end"
                    size="sm"
                >
                  {isSendingReply ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send Reply</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
