
// src/ai/flows/generate-quiz.ts
'use server';
/**
 * @fileOverview A quiz generator AI agent.
 *
 * - generateQuiz - A function that handles the quiz generation process.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  lessonTitle: z.string().describe('The title of the lesson.'),
  lessonTextContent: z.string().describe('The text content of the lesson.'),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(
    z.object({
      question: z.string().describe('The quiz question.'),
      options: z.array(z.string()).describe('The possible answers to the question. There should be exactly 4 options.'),
      correctAnswerIndex: z
        .number()
        .min(0)
        .max(3) // Ensure index is within 0-3 for 4 options
        .describe('The index of the correct answer in the options array.'),
    })
  ).describe('The generated quiz for the lesson. It should consist of 10 questions.'),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are an expert teacher, skilled at generating quizzes for lessons.

  Given the title and content of a lesson, you will generate a quiz with multiple choice questions.
  Each question should have exactly 4 possible answers, and one correct answer.

  The quiz should have 10 questions.

  Lesson Title: {{{lessonTitle}}}
  Lesson Content: {{{lessonTextContent}}}
  `,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
