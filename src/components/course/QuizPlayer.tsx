
"use client";

import type { Quiz } from "@/types/platform";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, ChevronRight, RotateCcw } from "lucide-react";

interface QuizPlayerProps {
  quizData: Quiz[];
  onQuizComplete: (score: number, totalQuestions: number) => void;
}

export function QuizPlayer({ quizData, onQuizComplete }: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(Array(quizData.length).fill(null));
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const currentQuestion = quizData[currentQuestionIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newSelectedAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      let currentScore = 0;
      selectedAnswers.forEach((answer, index) => {
        if (answer === quizData[index].correctAnswerIndex) {
          currentScore++;
        }
      });
      setScore(currentScore);
      setShowResults(true);
      onQuizComplete(currentScore, quizData.length);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(Array(quizData.length).fill(null));
    setShowResults(false);
    setScore(0);
  };
  
  if (!isClient) {
    return (
       <Card className="w-full max-w-xl mx-auto shadow-sm border border-border/70 bg-card rounded-lg">
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="text-lg font-semibold text-foreground">Quiz Loading...</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="h-32 bg-muted rounded-md animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }


  if (showResults) {
    return (
      <Card className="w-full max-w-xl mx-auto shadow-sm border border-border/70 bg-card rounded-lg animate-fade-in">
        <CardHeader className="text-center p-4 sm:p-5">
          <CardTitle className="text-xl font-semibold text-primary">Quiz Completed!</CardTitle>
          <CardDescription className="font-body text-md text-muted-foreground mt-1">
            You scored {score} out of {quizData.length}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3">
          {quizData.map((question, index) => (
            <div key={index} className="p-3 border border-border/60 rounded-md bg-background/50 text-sm">
              <p className="font-medium text-foreground">{index + 1}. {question.question}</p>
              <p className={`mt-1 ${selectedAnswers[index] === question.correctAnswerIndex ? 'text-green-600' : 'text-red-600'}`}>
                Your answer: {question.options[selectedAnswers[index]!] || "Not answered"} -
                {selectedAnswers[index] === question.correctAnswerIndex ? 
                    <CheckCircle className="inline h-3.5 w-3.5 ml-1 mr-0.5" /> : 
                    <XCircle className="inline h-3.5 w-3.5 ml-1 mr-0.5" />
                }
                Correct: {question.options[question.correctAnswerIndex]}
              </p>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-4 sm:p-5">
          <Button onClick={handleRetakeQuiz} variant="outline" size="sm" className="w-full rounded-md text-xs">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Retake Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <Card className="w-full max-w-xl mx-auto shadow-sm border border-border/70 bg-card rounded-lg">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">No quiz questions available.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-sm border border-border/70 bg-card rounded-lg animate-fade-in">
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="text-lg font-semibold text-foreground">
          Question {currentQuestionIndex + 1} of {quizData.length}
        </CardTitle>
        <CardDescription className="text-md pt-1.5 text-muted-foreground">{currentQuestion.question}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <RadioGroup
          value={selectedAnswers[currentQuestionIndex]?.toString()}
          onValueChange={(value) => handleAnswerSelect(parseInt(value))}
          className="space-y-2.5"
        >
          {currentQuestion.options.map((option, index) => (
            <Label 
              key={index} 
              htmlFor={`option-${index}`} 
              className="flex items-center space-x-2.5 p-3 border border-input rounded-md hover:bg-muted/70 transition-colors cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary/70 text-sm"
            >
              <RadioGroupItem value={index.toString()} id={`option-${index}`} className="border-primary/60 text-primary focus:ring-primary h-4 w-4"/>
              <span className="font-body text-foreground flex-1">{option}</span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="p-4 sm:p-5">
        <Button 
            onClick={handleNextQuestion} 
            disabled={selectedAnswers[currentQuestionIndex] === null}
            size="sm"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs py-2 h-9"
        >
          {currentQuestionIndex < quizData.length - 1 ? "Next Question" : "Finish Quiz"}
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
