
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { FinalQuizAttempt, QuizQuestion } from "@/types/platform";
import {
  getFinalQuizAttemptById,
  updateFinalQuizAttempt,
  awardUserBadge,
  createCertificateRecord,
  incrementUserCoursesCompleted,
} from "@/lib/mockCourses";
import { serverTimestamp } from "firebase/firestore";
import { ArrowLeft, ArrowRight, CheckCircle, Lightbulb, SendHorizonal, AlertCircle, Loader2, RotateCcw } from "lucide-react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


export default function QuizAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authIsLoading } = useAuth();

  const [attempt, setAttempt] = useState<FinalQuizAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, number | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const courseId = params.courseId as string;
  const attemptId = params.attemptId as string;

  const loadAttempt = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!attemptId) {
        toast({ title: "Error", description: "Quiz attempt ID is missing.", variant: "destructive" });
        router.push(`/student/courses/${courseId}`);
        return;
      }
      const fetchedAttempt = await getFinalQuizAttemptById(attemptId);
      if (fetchedAttempt) {
        if (fetchedAttempt.userId !== user?.uid) {
             toast({ title: "Unauthorized", description: "You are not authorized to take this quiz.", variant: "destructive" });
             router.push(`/student/courses/${courseId}`);
             return;
        }
        if (fetchedAttempt.submittedAt) {
             toast({ title: "Quiz Already Submitted", description: "This quiz attempt has already been completed.", variant: "default" });
             router.replace(`/student/courses/${courseId}?refresh=${Date.now()}`);
             return;
        }
        setAttempt(fetchedAttempt);
        // Initialize answers state
        const initialAnswers: Record<string, number | null> = {};
        fetchedAttempt.questions.forEach(q => {
            initialAnswers[q.id] = null;
        });
        setStudentAnswers(initialAnswers);
      } else {
        toast({ title: "Quiz Not Found", description: "The requested quiz attempt could not be found.", variant: "destructive" });
        router.push(`/student/courses/${courseId}`);
      }
    } catch (error) {
      console.error("Error loading quiz attempt:", error);
      toast({ title: "Error", description: "Failed to load the quiz.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, courseId, router, toast, user?.uid]);


  useEffect(() => {
    if (!authIsLoading && user) {
        loadAttempt();
    }
  }, [authIsLoading, user, loadAttempt]);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setStudentAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleNext = () => {
    if (attempt && currentQuestionIndex < attempt.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!attempt || !user) return;
    setIsSubmitting(true);
    
    let score = 0;
    const answersForFirestore = attempt.questions.map(q => {
        const selectedOptionIndex = studentAnswers[q.id];
        const isCorrect = selectedOptionIndex === q.correctAnswerIndex;
        if(isCorrect) {
            score += q.marks;
        }
        return {
            questionId: q.id,
            answer: selectedOptionIndex,
            isCorrect: isCorrect,
        };
    });

    const totalMarks = attempt.totalMarks || attempt.questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passed = percentage >= 70;

    const nextAttemptDate = new Date();
    nextAttemptDate.setDate(nextAttemptDate.getDate() + 1); // 24-hour cooldown

    const updates: Partial<FinalQuizAttempt> = {
        studentAnswers: answersForFirestore,
        score,
        totalMarks,
        passed,
        submittedAt: serverTimestamp(),
        nextAttemptAllowedAt: !passed ? nextAttemptDate : undefined,
    };

    try {
        await updateFinalQuizAttempt(attemptId, updates);
        
        if (passed) {
             toast({
                title: "Quiz Passed!",
                description: `Congratulations! You scored ${score}/${totalMarks}. Your certificate is being processed.`,
                variant: "default",
                duration: 7000,
            });
            // These operations are important but shouldn't block user feedback.
            // In a production app, these might be handled by a cloud function triggered by the quiz submission.
            Promise.all([
                attempt.badgeOnComplete ? awardUserBadge(user.uid, courseId, attempt.courseTitle, attempt.badgeOnComplete) : Promise.resolve(),
                incrementUserCoursesCompleted(user.uid),
                createCertificateRecord({
                    userId: user.uid,
                    studentName: user.displayName || "Student",
                    courseId: courseId,
                    courseTitle: attempt.courseTitle,
                    finalScore: score,
                    totalMarks: totalMarks,
                })
            ]).catch(err => {
                console.error("Error in post-quiz actions (badge/cert):", err);
                // Non-critical error, so we don't show a user-facing toast. Log for monitoring.
            });
        } else {
             toast({
                title: "Quiz Submitted",
                description: `You scored ${score}/${totalMarks}. You need 70% to pass. You can retake the quiz in 24 hours.`,
                variant: "destructive",
                duration: 7000,
            });
        }
        // Redirect back to the course page with a param to force a refresh
        router.replace(`/student/courses/${courseId}?refresh=${Date.now()}`);

    } catch (error) {
        console.error("Error submitting quiz:", error);
        toast({ title: "Submission Failed", description: "There was an error submitting your quiz.", variant: "destructive" });
        setIsSubmitting(false);
    }
  };

  if (isLoading || authIsLoading) {
    return (
        <DashboardLayout role="student">
            <div className="max-w-3xl mx-auto animate-fade-in space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        </DashboardLayout>
    );
  }

  if (!attempt) {
    return (
      <DashboardLayout role="student">
        <div className="text-center p-10">Quiz could not be loaded.</div>
      </DashboardLayout>
    );
  }

  const currentQuestion: QuizQuestion = attempt.questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / attempt.questions.length) * 100;
  const allQuestionsAnswered = Object.values(studentAnswers).every(answer => answer !== null);


  return (
    <DashboardLayout role="student">
        <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
            <header>
                <p className="text-sm font-medium text-primary">{attempt.courseTitle}</p>
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">{attempt.quizTitle || 'Final Quiz'}</h1>
            </header>
            
             <Card key={currentQuestion.id} className="shadow-lg border-border/80">
                <CardHeader className="p-4 sm:p-5 border-b">
                     <div className="flex justify-between items-center mb-2">
                        <CardTitle className="text-lg font-semibold text-foreground">
                            Question {currentQuestionIndex + 1}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">{currentQuestion.marks} Mark{currentQuestion.marks !== 1 && 's'}</Badge>
                     </div>
                     <Progress value={progressPercentage} className="h-1.5" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                     <p className="text-md font-medium text-foreground mb-4">{currentQuestion.questionText}</p>
                     {currentQuestion.questionType === 'mcq' && currentQuestion.options && (
                        <RadioGroup
                            value={studentAnswers[currentQuestion.id]?.toString()}
                            onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
                            className="space-y-3"
                        >
                          {currentQuestion.options.map((option, index) => (
                            <Label key={index} htmlFor={`q${currentQuestionIndex}-opt${index}`} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/70 has-[:checked]:border-primary transition-colors cursor-pointer">
                                <RadioGroupItem value={index.toString()} id={`q${currentQuestionIndex}-opt${index}`} />
                                <span className="text-sm font-normal text-foreground/90">{option}</span>
                            </Label>
                          ))}
                        </RadioGroup>
                     )}
                </CardContent>
                <CardFooter className="p-4 sm:p-5 flex justify-between">
                    <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0 || isSubmitting}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    {currentQuestionIndex < attempt.questions.length - 1 ? (
                        <Button onClick={handleNext} disabled={isSubmitting}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={!allQuestionsAnswered || isSubmitting} variant="default" className="bg-green-600 hover:bg-green-700">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SendHorizonal className="mr-2 h-4 w-4" />}
                                    {isSubmitting ? "Submitting..." : "Submit Quiz"}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Ready to Submit?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to submit your quiz. This action cannot be undone. Make sure you have reviewed all your answers.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Review Answers</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSubmitQuiz} className="bg-primary hover:bg-primary/90">Confirm Submission</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </CardFooter>
            </Card>

             <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <AlertTitle className="font-semibold text-sm">Remember</AlertTitle>
                <AlertDescription className="text-xs">
                    Read each question carefully before selecting your answer. There is no time limit, so take your time.
                </AlertDescription>
            </Alert>
        </div>
    </DashboardLayout>
  );
}
