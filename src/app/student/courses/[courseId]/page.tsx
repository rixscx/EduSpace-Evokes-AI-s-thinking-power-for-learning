
"use client";
import Image from "next/image";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LessonItem } from "@/components/course/LessonItem";
import { Star, BookOpen, Users, PlayCircle, Award, ChevronDown, ChevronUp, RotateCcw, CheckCircle, MessageSquare, Edit2, SendHorizonal, AlertTriangle, HelpCircle, FileSignature, ListChecks, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import type { Course, Module as ModuleType, Review, Chapter as ChapterType, ChapterDisplayInfo, BadgeAward, FinalQuizAttempt, CertificateRecord, QuizQuestion } from "@/types/platform";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCourseById, isStudentEnrolled, addEnrollment, getCourseEnrollmentCount, addCourseReview, getCourseReviews, getStudentReviewForCourse, updateCourseReview, awardUserBadge, checkIfBadgeAwarded, incrementUserCoursesCompleted, getLatestQuizAttemptForCourse, saveFinalQuizAttempt, getCertificateForUserAndCourse, updateFinalQuizAttempt, getFinalQuizAttemptById } from "@/lib/mockCourses";
import { generateFinalCourseQuiz } from "@/ai/flows/generate-final-course-quiz";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { serverTimestamp } from "firebase/firestore";


export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authIsLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [isProcessingEnrollment, setIsProcessingEnrollment] = useState(false);

  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [studentHasReviewed, setStudentHasReviewed] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState<number>(0);
  const [newReviewComment, setNewReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  const [badgeEarned, setBadgeEarned] = useState<string | null>(null);
  const [hasBeenAwardedBadge, setHasBeenAwardedBadge] = useState<boolean | null>(null);

  // State for Final Quiz and Certificate
  const [latestQuizAttempt, setLatestQuizAttempt] = useState<FinalQuizAttempt | null>(null);
  const [isLoadingQuizAttempt, setIsLoadingQuizAttempt] = useState(false);
  const [certificateRecord, setCertificateRecord] = useState<CertificateRecord | null>(null);
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);


  const allLessonsCompleted = useMemo(() => {
    if (typeof window === 'undefined' || !course) return false;
    const allChaptersFlat = course.modules.flatMap(m => m.chapters?.map(ch => ch.id) || []).filter(id => id);
    if (allChaptersFlat.length === 0) return false; // No lessons to complete
    return allChaptersFlat.every(chapterId => localStorage.getItem(`lesson-${chapterId}-completed`) === 'true');
  }, [course]);


  const loadCourseAndDependentData = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingReviews(true);
    setIsLoadingQuizAttempt(true);
    setIsLoadingCertificate(true);

    try {
      const foundCourse = await getCourseById(courseId);
      if (foundCourse && foundCourse.isPublished && foundCourse.isApproved) {
        setCourse(foundCourse);
        if (foundCourse.modules && foundCourse.modules.length > 0 && openAccordionItems.length === 0) {
          setOpenAccordionItems([foundCourse.modules[0].id]);
        }

        const count = await getCourseEnrollmentCount(courseId);
        setEnrollmentCount(count);
        const fetchedReviews = await getCourseReviews(courseId);
        setReviewsList(fetchedReviews);
        setIsLoadingReviews(false);

        if (user) {
          const enrolledStatus = await isStudentEnrolled(user.uid, courseId);
          setIsEnrolled(enrolledStatus);
          const existingReview = await getStudentReviewForCourse(user.uid, courseId);
          if (existingReview) {
            setUserReview(existingReview);
            setStudentHasReviewed(true);
            setNewReviewRating(existingReview.rating);
            setNewReviewComment(existingReview.comment || "");
          } else {
            setUserReview(null);
            setStudentHasReviewed(false);
            setNewReviewRating(0);
            setNewReviewComment("");
          }
          
          if (foundCourse.badgeOnComplete) {
            const awarded = await checkIfBadgeAwarded(user.uid, courseId);
            setHasBeenAwardedBadge(awarded);
            if (awarded) {
              setBadgeEarned(foundCourse.badgeOnComplete);
            }
          } else {
            setHasBeenAwardedBadge(false); // No badge defined for the course
          }
          
          if (enrolledStatus) {
            const attempt = await getLatestQuizAttemptForCourse(user.uid, courseId);
            setLatestQuizAttempt(attempt);
            if (attempt?.passed) {
              const cert = await getCertificateForUserAndCourse(user.uid, courseId);
              setCertificateRecord(cert);
            }
          }
        } else {
            setUserReview(null);
            setStudentHasReviewed(false);
            setNewReviewRating(0);
            setNewReviewComment("");
            setBadgeEarned(null);
            setHasBeenAwardedBadge(false);
            setLatestQuizAttempt(null);
            setCertificateRecord(null);
        }
      } else if (foundCourse && (!foundCourse.isPublished || !foundCourse.isApproved)) {
        toast({ title: "Course Not Available", description: "This course is not currently available to students.", variant: "destructive" });
        router.push("/student/courses");
      } else {
        toast({ title: "Course Not Found", description: "The requested course was not found.", variant: "destructive" });
        router.push("/student/courses");
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
      toast({ title: "Error", description: "Could not load course details, enrollment or reviews.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsLoadingReviews(false); 
      setIsLoadingQuizAttempt(false);
      setIsLoadingCertificate(false);
    }
  }, [courseId, router, toast, user, openAccordionItems.length]);


  useEffect(() => {
    if (!authIsLoading) {
        loadCourseAndDependentData();
    }
  }, [authIsLoading, loadCourseAndDependentData, searchParams]);

  const allChaptersForDisplay = useMemo(() => {
    if (!course || !course.modules) return [];
    return course.modules.flatMap(module =>
        module.chapters?.map(chapter => {
            const videoBlock = chapter.contentBlocks?.find(cb => cb.type === 'video');
            const lessonTextContentFromBlocks = chapter.contentBlocks
              .filter(cb => cb.type === 'text' || cb.type === 'heading')
              .map(cb => {
                if (cb.type === 'heading' && cb.level) {
                  return `<h${cb.level + 2}>${cb.value}</h${cb.level + 2}>`;
                }
                return `<p>${cb.value}</p>`;
              })
              .join("") || "<p>No textual content for this chapter.</p>";

            return {
                id: chapter.id,
                moduleId: module.id,
                lessonTitle: chapter.title,
                videoURL: videoBlock?.value || undefined,
                lessonTextContent: lessonTextContentFromBlocks,
                quiz: [],
                materials: chapter.contentBlocks?.filter(cb => cb.type === 'file').map(fb => ({
                    id: fb.id,
                    name: fb.fileName || fb.altText || "Downloadable File",
                    url: fb.value,
                    type: fb.fileType,
                    size: fb.fileSize,
                })) || [],
                imageQuery: chapter.contentBlocks?.find(cb => cb.type === 'image')?.dataAiHint,
            } as ChapterDisplayInfo;
        }) || []
    ).filter(l => l && l.id);
  }, [course]);


  const mockStudentProgress = useMemo(() => {
    if (!course || !allChaptersForDisplay.length) return { completedLessons: [], totalLessons: 0, percentage: 0 };

    const completedLessonsFromStorage = typeof window !== 'undefined'
        ? allChaptersForDisplay
            .filter(l => l && l.id && localStorage.getItem(`lesson-${l.id}-completed`) === 'true')
            .map(l => l.id)
        : [];
    const totalLessons = allChaptersForDisplay.length;
    const percentage = totalLessons > 0 ? (completedLessonsFromStorage.length / totalLessons) * 100 : 0;
    return {
      completedLessons: completedLessonsFromStorage,
      totalLessons,
      percentage,
    };
  }, [allChaptersForDisplay, course]);

 useEffect(() => {
    const awardAndNotify = async () => {
      if (course && user && allLessonsCompleted && !latestQuizAttempt && course.badgeOnComplete && hasBeenAwardedBadge === false) {
        toast({
          title: "Lessons Completed!",
          description: `You've completed all lessons for "${course.title}". The final quiz is now available. Pass it to earn your badge and certificate!`,
          variant: "default",
          duration: 7000,
        });
      }
    };

    if (hasBeenAwardedBadge !== null) { 
        awardAndNotify();
    }
  }, [allLessonsCompleted, course, user, hasBeenAwardedBadge, toast, latestQuizAttempt]);


  const getFirstLessonLink = (): string | null => {
    if (course && course.modules && course.modules.length > 0 &&
        course.modules[0].chapters && course.modules[0].chapters.length > 0) {
      return `/student/courses/${course.id}/lessons/${course.modules[0].chapters[0].id}`;
    }
    return null;
  };

  const hasLessons = useMemo(() => allChaptersForDisplay.length > 0, [allChaptersForDisplay]);

  const handleEnrollOrViewCourse = async () => {
    if (!course || !user) {
      toast({
        title: "Login Required",
        description: "Please log in to enroll or view the course.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessingEnrollment(true);
    if (isEnrolled) {
      const firstLessonLink = getFirstLessonLink();
      if (hasLessons && firstLessonLink) {
        router.push(firstLessonLink);
      } else {
        toast({ title: "Course Content", description: "No lessons available yet in this course.", variant: "default" });
      }
      setIsProcessingEnrollment(false);
    } else {
      try {
        await addEnrollment(user.uid, course.id);
        setIsEnrolled(true);
        setEnrollmentCount(prev => prev + 1);
        toast({
          title: "Successfully Enrolled!",
          description: `You are now enrolled in "${course.title}".`,
        });
        const firstLessonLink = getFirstLessonLink();
        if (hasLessons && firstLessonLink) {
          router.push(firstLessonLink);
        }
      } catch (error) {
        console.error("Error enrolling in course:", error);
        toast({ title: "Enrollment Failed", description: "Could not enroll in the course. Please try again.", variant: "destructive" });
      } finally {
        setIsProcessingEnrollment(false);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !course) return;
    if (newReviewRating === 0) {
      toast({ title: "Rating Required", description: "Please select a star rating.", variant: "destructive"});
      return;
    }
    if (!newReviewComment.trim()) {
        toast({ title: "Comment Required", description: "Please write a comment for your review.", variant: "destructive"});
        return;
    }
    setIsSubmittingReview(true);
    try {
      if (userReview && userReview.id) { 
        await updateCourseReview(userReview.id, {
          rating: newReviewRating,
          comment: newReviewComment.trim(),
        });
        toast({ title: "Review Updated!", description: "Your feedback has been updated." });
      } else { 
        const reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'> = {
          courseId: course.id,
          studentId: user.uid,
          studentName: user.displayName || "Anonymous Student",
          rating: newReviewRating,
          comment: newReviewComment.trim(),
        };
        await addCourseReview(reviewData);
        toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
      }
      await loadCourseAndDependentData();
    } catch (error) {
      console.error("Error submitting/updating review:", error);
      toast({ title: "Review Submission Failed", description: "Could not save your review. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!course || !user) return;
    setIsGeneratingQuiz(true);
    try {
      toast({title: "Generating Final Quiz...", description: "This may take a moment. Please wait."});
      const quizContent = await generateFinalCourseQuiz({
        courseId: course.id,
        cacheBuster: `user-${user.uid}-time-${Date.now()}`,
      });
      const attemptData: Omit<FinalQuizAttempt, 'id'> = {
        userId: user.uid,
        courseId: course.id,
        courseTitle: course.title,
        badgeOnComplete: course.badgeOnComplete,
        quizGeneratedAt: serverTimestamp(),
        questions: quizContent.questions,
        totalMarks: quizContent.totalMarks,
      };
      const attemptId = await saveFinalQuizAttempt(attemptData);
      const newAttempt = await getFinalQuizAttemptById(attemptId);
      if (newAttempt) {
        setLatestQuizAttempt(newAttempt);
      }
      toast({
        title: "Quiz Ready!",
        description: `Your final quiz for "${course.title}" has been generated. Click "Start Quiz" to begin.`,
        duration: 7000
      });
    } catch (error: any) {
      console.error("Error generating final quiz:", error);
      toast({ title: "Quiz Generation Failed", description: error.message || "Could not generate the final quiz.", variant: "destructive" });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleStartQuizAttempt = async () => {
    if (!latestQuizAttempt || !latestQuizAttempt.id) return;
    setIsStartingQuiz(true);
    try {
        await updateFinalQuizAttempt(latestQuizAttempt.id, { attemptedAt: serverTimestamp() });
        router.push(`/student/courses/${courseId}/quiz/${latestQuizAttempt.id}`);
    } catch (error: any) {
        console.error("Error starting quiz attempt:", error);
        toast({ title: "Error", description: "Could not start the quiz. Please try again.", variant: "destructive" });
        setIsStartingQuiz(false);
    }
  };

  const handleRetakeQuiz = () => {
    handleGenerateQuiz();
  };


  if (authIsLoading || isLoading) {
    return (
      <DashboardLayout role="student">
        <div className="animate-fade-in space-y-8">
            <header className="bg-card p-6 md:p-8 rounded-lg shadow-sm border">
                <div className="grid md:grid-cols-3 gap-6 items-start">
                    <div className="md:col-span-2 space-y-2"><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-8 w-3/4 mb-1" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
                    <div className="md:col-span-1 space-y-3"><Skeleton className="h-11 w-full rounded-md" /></div>
                </div>
                <div className="mt-6"><Skeleton className="h-4 w-1/4 mb-1" /><Skeleton className="h-1.5 w-full rounded-full"/></div>
            </header>             
             <Skeleton className="h-10 w-full rounded-md mb-6" />
             <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
             <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
             <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return <DashboardLayout role="student"><div className="text-center p-10">Course not found or is not available.</div></DashboardLayout>;
  }

  let lessonCounter = 0;
  const quizSectionLocked = !isEnrolled || !allLessonsCompleted;
  const quizIsInProgress = latestQuizAttempt && latestQuizAttempt.attemptedAt && !latestQuizAttempt.submittedAt;
  const canGenerateNewQuiz = !latestQuizAttempt || (latestQuizAttempt?.submittedAt && latestQuizAttempt.nextAttemptAllowedAt && isPast(new Date(latestQuizAttempt.nextAttemptAllowedAt)));
  const quizIsGeneratedNotStarted = latestQuizAttempt && !latestQuizAttempt.attemptedAt;
  const certificateSectionLocked = !latestQuizAttempt?.passed;
  const courseCompleted = latestQuizAttempt?.passed || false;


  return (
    <DashboardLayout role="student">
      <div className="animate-fade-in space-y-8">
        <header className="bg-card p-6 md:p-8 rounded-lg shadow-sm border border-border/80 animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '50ms'}}>
            <div className="grid md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-2">
                    <p className="text-sm font-medium text-primary">{course.category.name.toUpperCase()}</p>
                    <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{course.title}</h1>
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.description.replace(/<[^>]*>?/gm, '').substring(0,150)}...</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={`https://placehold.co/40x40.png?text=${course.teacherName?.substring(0,1)}`} alt={course.teacherName} data-ai-hint="instructor portrait"/>
                            <AvatarFallback className="bg-muted text-xs">{course.teacherName?.substring(0,1).toUpperCase() || "I"}</AvatarFallback>
                        </Avatar>
                        <span>Taught by <span className="font-medium text-foreground">{course.teacherName}</span></span>
                    </div>
                     <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                        <span className="flex items-center"><Star className="h-3.5 w-3.5 mr-1 text-yellow-500 fill-yellow-500" /> ({reviewsList.length > 0 ? `${(reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)}/5` : 'No ratings'})</span>
                        <span className="flex items-center"><Users className="h-3.5 w-3.5 mr-1" /> {enrollmentCount} Student{enrollmentCount !== 1 && 's'}</span>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-3">
                    <Button
                        size="lg"
                        className="w-full text-base h-11 rounded-md"
                        onClick={handleEnrollOrViewCourse}
                        disabled={isProcessingEnrollment || !user || authIsLoading}
                    >
                        {isProcessingEnrollment ? (
                            <RotateCcw className="mr-2 h-5 w-5 animate-spin"/>
                        ) : isEnrolled ? (
                            <CheckCircle className="mr-2 h-5 w-5"/>
                        ) : (
                            <PlayCircle className="mr-2 h-5 w-5"/>
                        )}
                        {isProcessingEnrollment ? (isEnrolled ? "Processing..." : "Enrolling...") : (isEnrolled ? "Go to Course" : "Enroll in Course")}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                         {!isEnrolled && (hasLessons ? "Enroll to start learning today." : "Enroll now and get notified when lessons are added.")}
                         {isEnrolled && (hasLessons ? "You are enrolled. Continue learning!" : "You are enrolled. Awaiting course content.")}
                    </p>
                </div>
            </div>
            {mockStudentProgress.totalLessons > 0 && isEnrolled && (
                <div className="mt-6 animate-slide-in-up" style={{ animationDelay: '100ms'}}>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                        <span>Your Progress</span>
                        <span className="font-semibold text-primary">{Math.round(mockStudentProgress.percentage)}%</span>
                    </div>
                    <Progress value={mockStudentProgress.percentage} aria-label="Course progress" className="h-1.5 rounded-full"/>
                </div>
            )}
             {courseCompleted && badgeEarned && (
                <Alert variant="default" className="mt-6 bg-green-50 border-green-300 text-green-700 animate-fade-in">
                    <Award className="h-5 w-5 text-green-600" />
                    <AlertTitle className="font-semibold">Course Completed & Badge Earned!</AlertTitle>
                    <AlertDescription>
                        Congratulations! You've earned the &quot;{badgeEarned}&quot; badge.
                    </AlertDescription>
                </Alert>
            )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 animate-slide-in-up" style={{ animationDelay: '150ms'}}>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted p-1 rounded-md shadow-sm">
                <TabsTrigger value="overview" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">Overview</TabsTrigger>
                <TabsTrigger value="lessons" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">Lessons ({mockStudentProgress.totalLessons})</TabsTrigger>
                <TabsTrigger value="reviews" className="py-2 text-sm data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-[0.25rem]">Reviews ({reviewsList.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-6 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
                <h2 className="text-xl font-semibold mb-3 text-foreground">About this course</h2>
                <div
                    className="prose prose-sm max-w-none text-foreground/90 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:mb-1 [&_p]:mb-3 [&_h3]:font-semibold [&_h3]:text-md [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                />
              </TabsContent>

              <TabsContent value="lessons" className="bg-card rounded-lg shadow-sm border border-border/80 overflow-hidden hover:shadow-md transition-all-smooth">
                <div className="p-4 border-b border-border/70">
                    <h3 className="text-lg font-semibold text-foreground">Course Content</h3>
                </div>
                 {course.modules && course.modules.length > 0 ? (
                    <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems} className="w-full">
                      {course.modules.map((module) => {
                        const moduleChapters = module.chapters || [];
                        return (
                            <AccordionItem value={module.id} key={module.id} className="border-b-0">
                            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-md font-medium text-foreground hover:no-underline transition-colors duration-150 ease-in-out">
                                <div className="flex items-center">
                                <span className="mr-2">{openAccordionItems.includes(module.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                                {module.title}
                                <span className="ml-2 text-xs text-muted-foreground">({moduleChapters.length} lessons)</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="bg-background/30">
                                {moduleChapters.map((chapter, chapIdx) => {
                                const lessonForListItem: ChapterDisplayInfo | undefined = allChaptersForDisplay.find(lcd => lcd.id === chapter.id);
                                if (!lessonForListItem) return null;

                                const currentGlobalIndex = allChaptersForDisplay.findIndex(c => c.id === chapter.id);
                                const isChapterLocked = !isEnrolled || (currentGlobalIndex > 0 && !mockStudentProgress.completedLessons.includes(allChaptersForDisplay[currentGlobalIndex - 1]?.id));

                                lessonCounter++;
                                return (
                                    <LessonItem
                                    key={chapter.id}
                                    lesson={lessonForListItem}
                                    courseId={course.id}
                                    isCompleted={mockStudentProgress.completedLessons.includes(chapter.id)}
                                    isLocked={isChapterLocked}
                                    index={lessonCounter -1 }
                                    />
                                );
                                })}
                                {moduleChapters.length === 0 && (
                                    <p className="text-center text-muted-foreground text-xs px-4 py-3">No lessons in this module yet. Content coming soon!</p>
                                )}
                            </AccordionContent>
                            </AccordionItem>
                        );
                      })}
                    </Accordion>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">No lessons available in this course yet. Content coming soon!</p>
                  )}
              </TabsContent>

              <TabsContent value="reviews" className="p-6 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Student Feedback</h2>
                </div>
                {isLoadingReviews ? (
                     <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                            <Card key={i} className="p-4 bg-muted/50 animate-pulse">
                                <div className="flex items-center gap-2 mb-1"><Skeleton className="h-5 w-5 rounded-full" /><Skeleton className="h-4 w-24" /></div>
                                <Skeleton className="h-3 w-16 mb-2" />
                                <Skeleton className="h-12 w-full" />
                            </Card>
                        ))}
                    </div>
                ) : (
                    <>
                    {user && isEnrolled && (
                        studentHasReviewed && userReview ? (
                            <Card className="mb-6 p-4 bg-primary/10 border-primary/30">
                                <CardTitle className="text-md font-semibold text-primary mb-1 flex items-center"><Edit2 className="mr-2 h-4 w-4"/>Your Review</CardTitle>
                                <div className="flex items-center mb-1.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`h-5 w-5 cursor-pointer ${
                                        newReviewRating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/50'
                                        }`}
                                        onClick={() => setNewReviewRating(star)}
                                    />
                                    ))}
                                </div>
                                <Textarea
                                    value={newReviewComment}
                                    onChange={(e) => setNewReviewComment(e.target.value)}
                                    placeholder="Edit your comment..."
                                    rows={3}
                                    className="text-sm mb-2 bg-card"
                                />
                                <Button onClick={handleSubmitReview} size="sm" className="text-xs rounded-md" disabled={isSubmittingReview || newReviewRating === 0 || !newReviewComment.trim()}>
                                    {isSubmittingReview ? <RotateCcw className="h-4 w-4 animate-spin mr-1.5"/> : <SendHorizonal className="h-4 w-4 mr-1.5"/>}
                                    Update Review
                                </Button>
                            </Card>
                        ) : (
                            <Card className="mb-6 p-4 bg-background border-dashed">
                                <CardTitle className="text-md font-semibold text-foreground mb-2">Leave a Review</CardTitle>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-medium mb-1 block">Your Rating:</Label>
                                        <div className="flex items-center">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`h-6 w-6 cursor-pointer transition-colors ${
                                                newReviewRating >= star ? 'text-yellow-400 fill-yellow-400 hover:text-yellow-500' : 'text-muted-foreground/40 hover:text-muted-foreground/70'
                                                }`}
                                                onClick={() => setNewReviewRating(star)}
                                            />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="review-comment" className="text-sm font-medium">Your Comment:</Label>
                                        <Textarea
                                            id="review-comment"
                                            value={newReviewComment}
                                            onChange={(e) => setNewReviewComment(e.target.value)}
                                            placeholder="Share your thoughts about the course..."
                                            rows={4}
                                            className="text-sm mt-1"
                                        />
                                    </div>
                                    <Button onClick={handleSubmitReview} size="sm" className="text-xs rounded-md" disabled={isSubmittingReview || newReviewRating === 0 || !newReviewComment.trim()}>
                                        {isSubmittingReview ? <RotateCcw className="h-4 w-4 animate-spin mr-1.5"/> : <SendHorizonal className="h-4 w-4 mr-1.5"/>}
                                        Submit Review
                                    </Button>
                                </div>
                            </Card>
                        )
                    )}
                    {!user && (
                        <Card className="mb-6 p-4 bg-muted/60 border-border/70 text-center">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2"/>
                            <p className="text-sm text-muted-foreground">
                                Please <Link href={`/student/login?redirect=/student/courses/${courseId}`} className="text-primary hover:underline">log in</Link> to leave a review.
                            </p>
                        </Card>
                    )}
                    {reviewsList.length > 0 ? (
                        <div className="space-y-4">
                        {reviewsList.filter(r => !user || r.studentId !== user.uid).map((review) => (
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
                    ) : !studentHasReviewed && (
                        <p className="text-muted-foreground text-sm py-8 text-center">No reviews yet for this course. Be the first to share your thoughts!</p>
                    )}
                    </>
                )}
              </TabsContent>
            </Tabs>

            {/* Final Quiz Section */}
            <Card className="mt-8 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center text-foreground">
                  <HelpCircle className="mr-2 h-5 w-5 text-primary" /> Final Quiz
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingQuizAttempt ? (
                  <Skeleton className="h-20 w-full" />
                ) : quizSectionLocked ? (
                  <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-700">
                    <AlertTriangle className="h-5 w-5 text-amber-600"/>
                    <AlertTitle>Quiz Locked</AlertTitle>
                    <AlertDescription>
                      {!isEnrolled ? "You must enroll in the course to access the final quiz." : "Complete all lessons in this course to unlock the final quiz."}
                    </AlertDescription>
                  </Alert>
                ) : latestQuizAttempt?.passed ? (
                  <Alert variant="default" className="bg-green-50 border-green-300 text-green-700">
                    <CheckCircle className="h-5 w-5 text-green-600"/>
                    <AlertTitle>Quiz Passed!</AlertTitle>
                    <AlertDescription>
                      Congratulations! You scored {latestQuizAttempt.score}/{latestQuizAttempt.totalMarks} ({( (latestQuizAttempt.score || 0) / (latestQuizAttempt.totalMarks || 1) * 100).toFixed(0)}%). Your certificate is being processed.
                    </AlertDescription>
                  </Alert>
                ) : quizIsInProgress ? (
                  <div>
                    <Alert variant="default" className="mb-4 bg-blue-50 border-blue-300 text-blue-700">
                        <ListChecks className="h-5 w-5 text-blue-600"/>
                        <AlertTitle>Quiz In Progress</AlertTitle>
                        <AlertDescription>
                            You have already started this quiz. Continue where you left off.
                        </AlertDescription>
                    </Alert>
                    <Button onClick={() => router.push(`/student/courses/${courseId}/quiz/${latestQuizAttempt.id}`)} className="w-full">
                        <PlayCircle className="mr-2 h-4 w-4"/>
                        Continue Quiz
                    </Button>
                  </div>
                ) : quizIsGeneratedNotStarted ? (
                  <div>
                    <Alert variant="default" className="mb-4 bg-blue-50 border-blue-300 text-blue-700">
                      <ListChecks className="h-5 w-5 text-blue-600"/>
                      <AlertTitle>Your Quiz is Ready!</AlertTitle>
                      <AlertDescription>
                        It has {latestQuizAttempt.questions.length} questions for a total of {latestQuizAttempt.totalMarks} marks. Good luck!
                      </AlertDescription>
                    </Alert>
                    <Button onClick={handleStartQuizAttempt} disabled={isStartingQuiz} className="w-full">
                      {isStartingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlayCircle className="mr-2 h-4 w-4"/>}
                      {isStartingQuiz ? "Starting..." : "Start Quiz Now"}
                    </Button>
                  </div>
                ) : canGenerateNewQuiz ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3 text-center">
                        {latestQuizAttempt ? 'You can retake the quiz to improve your score.' : 'You are ready to take the final assessment.'}
                    </p>
                    <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz} className="w-full">
                      {isGeneratingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (latestQuizAttempt ? <RotateCcw className="mr-2 h-4 w-4"/> : <PlayCircle className="mr-2 h-4 w-4"/>)}
                      {isGeneratingQuiz ? "Generating..." : (latestQuizAttempt ? "Generate New Quiz (Retake)" : "Generate Final Quiz")}
                    </Button>
                  </div>
                ) : latestQuizAttempt && latestQuizAttempt.nextAttemptAllowedAt && !isPast(new Date(latestQuizAttempt.nextAttemptAllowedAt)) ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-5 w-5"/>
                    <AlertTitle>Retake Locked</AlertTitle>
                    <AlertDescription>
                      You scored {latestQuizAttempt.score}/{latestQuizAttempt.totalMarks}.
                      You can retake the quiz after {format(new Date(latestQuizAttempt.nextAttemptAllowedAt), 'PPp')} ({formatDistanceToNowStrict(new Date(latestQuizAttempt.nextAttemptAllowedAt), { addSuffix: true })}).
                    </AlertDescription>
                  </Alert>
                ) : (
                   <Alert variant="default">
                      <AlertTriangle className="h-5 w-5"/>
                      <AlertTitle>Quiz Status</AlertTitle>
                      <AlertDescription>
                           An attempt is in progress or its status is currently unavailable.
                      </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Certificate Section */}
            <Card className="mt-8 bg-card rounded-lg shadow-sm border border-border/80 hover:shadow-md transition-all-smooth">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center text-foreground">
                  <FileSignature className="mr-2 h-5 w-5 text-primary" /> Course Certificate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingCertificate ? (
                  <Skeleton className="h-16 w-full" />
                ) : certificateSectionLocked ? (
                   <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-700">
                        <AlertTriangle className="h-5 w-5 text-amber-600"/>
                        <AlertTitle>Certificate Locked</AlertTitle>
                        <AlertDescription>
                        Pass the final quiz with a score of 70% or more to unlock your certificate.
                        </AlertDescription>
                  </Alert>
                ) : certificateRecord?.status === 'approved' ? (
                  <Alert variant="default" className="bg-green-50 border-green-300 text-green-700">
                    <CheckCircle className="h-5 w-5 text-green-600"/>
                    <AlertTitle>Certificate Earned!</AlertTitle>
                    <AlertDescription>
                      Your certificate for "{course.title}" has been approved and is available.
                    </AlertDescription>
                     <Button size="sm" variant="link" className="p-0 h-auto mt-2 text-green-700 hover:text-green-800" asChild>
                        <Link href={`/student/profile?tab=certificates&highlight=${certificateRecord.id}`}>View Certificate <ExternalLink className="ml-1.5 h-3.5 w-3.5"/></Link>
                    </Button>
                  </Alert>
                ) : certificateRecord?.status === 'pending_validation' ? (
                   <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700">
                        <ListChecks className="h-5 w-5 text-blue-600"/>
                        <AlertTitle>Certificate Pending Validation</AlertTitle>
                        <AlertDescription>
                        Your certificate is pending validation by the instructor. You will be notified once it's approved.
                        </AlertDescription>
                  </Alert>
                ) : certificateRecord?.status === 'rejected' ? (
                  <Alert variant="destructive">
                        <AlertCircle className="h-5 w-5"/>
                        <AlertTitle>Certificate Not Approved</AlertTitle>
                        <AlertDescription>
                        Unfortunately, your certificate request was not approved at this time. Please contact your instructor for more details.
                        </AlertDescription>
                  </Alert>
                ) : (
                     <Alert variant="default">
                        <AlertTriangle className="h-5 w-5"/>
                        <AlertTitle>Certificate Status</AlertTitle>
                        <AlertDescription>
                           Certificate information is currently unavailable or not yet generated. This may mean you haven't passed the quiz yet, or an admin hasn't processed it.
                        </AlertDescription>
                    </Alert>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm border-border/80 bg-card rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '200ms'}}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-foreground">Instructor</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://placehold.co/80x80.png?text=${course.teacherName?.substring(0,1)}`} alt={course.teacherName} data-ai-hint="instructor photo"/>
                    <AvatarFallback className="bg-muted text-lg">{course.teacherName?.substring(0,1).toUpperCase() || "I"}</AvatarFallback>
                    </Avatar>
                    <div>
                    <h3 className="font-semibold text-sm text-primary">{course.teacherName}</h3>
                    <p className="text-xs text-muted-foreground">Lead Educator, EduSpace</p>
                    </div>
                </CardContent>
            </Card>

             <Card className="shadow-sm border-border/80 bg-card rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '250ms'}}>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Course Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-foreground/90">
                    <p><strong>Total Modules:</strong> {course.modules.length}</p>
                    <p><strong>Total Lessons:</strong> {mockStudentProgress.totalLessons}</p>
                    <p><strong>Estimated Duration:</strong> {course.durationMinutes ? `${course.durationMinutes} minutes` : 'N/A'}</p>
                    <p><strong>Difficulty:</strong> {course.difficulty || 'N/A'}</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border/80 bg-card rounded-lg animate-slide-in-up hover:shadow-md transition-all-smooth" style={{ animationDelay: '300ms'}}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center text-foreground">
                    <Award className="mr-2 h-5 w-5 text-primary"/> Certificate of Completion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Pass the final quiz to earn a shareable certificate for this course.</p>
                 <Button variant="outline" size="sm" className="w-full rounded-md text-sm" disabled={certificateSectionLocked || certificateRecord?.status !== 'approved'}>
                  {latestQuizAttempt?.passed && certificateRecord?.status === 'approved' ? 'View Your Certificate' : 'Certificate Locked'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
