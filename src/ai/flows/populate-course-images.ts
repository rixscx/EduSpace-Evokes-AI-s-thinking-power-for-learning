
'use server';
/**
 * @fileOverview Populates image content blocks in a course structure
 * by generating an image, alt text, and dataAiHint using an AI model.
 * The image value will be set to a Base64 data URI.
 *
 * - populateCourseImages - Function to enrich course structure.
 * - PopulateCourseImagesInput - Input type (the course structure itself).
 * - PopulateCourseImagesOutput - Output type (the enriched course structure).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateCourseTextStructureOutputAI } from './generate-course-text-structure'; // Use the same structure type

export type PopulateCourseImagesInput = GenerateCourseTextStructureOutputAI;
export type PopulateCourseImagesOutput = GenerateCourseTextStructureOutputAI;

// Schema for the expected output from the image generation prompt (text part)
const ImageDetailsAndHintSchema = z.object({
  altText: z.string().describe("Concise and descriptive alt text for the generated image. Max 15 words."),
  dataAiHint: z.string().describe("1-2 specific keywords (e.g., 'abstract data' or 'historical map') related to the image, suitable for categorization or as fallback search terms."),
});

const imageGenerationAndMetadataPrompt = ai.definePrompt({
    name: 'generateImageAndMetadataPrompt',
    input: { schema: z.object({ topic: z.string(), chapterTitle: z.string(), courseTitle: z.string() }) },
    output: { schema: ImageDetailsAndHintSchema },
    model: 'googleai/gemini-2.0-flash-exp', // Image capable model
    config: {
        temperature: 0.7, // Allow for some creativity in image generation
        responseModalities: ['IMAGE', 'TEXT'], // Expect both image and text
    },
    prompt: `
    Context:
    Course Title: "{{courseTitle}}"
    Chapter Title: "{{chapterTitle}}"
    Requested Image Topic: "{{topic}}"

    Task:
    1. Generate an image that visually represents the "Requested Image Topic" within the given course and chapter context.
    2. Provide concise and descriptive alt text for the generated image (max 15 words).
    3. Provide 1-2 specific keywords (dataAiHint) related to the generated image, suitable for categorization or as fallback search terms (e.g., 'neural network diagram', 'roman colosseum illustration').

    For the text part of your response, ensure it is ONLY a JSON object matching this schema:
    {
      "altText": "Generated alt text here",
      "dataAiHint": "keywordOne keywordTwo"
    }
    The image will be the primary generated media.
    `,
});


export async function populateCourseImages(
  courseStructure: PopulateCourseImagesInput
): Promise<PopulateCourseImagesOutput> {
  const updatedStructure = JSON.parse(JSON.stringify(courseStructure)) as PopulateCourseImagesOutput; // Deep clone

  for (const module of updatedStructure.modules) {
    for (const chapter of module.chapters) {
      for (const block of chapter.contentBlocks) {
        if (block.type === 'image' && block.value === 'PENDING_IMAGE_GENERATION') {
          try {
            const imageTopic = block.topic || `Image for ${chapter.title}`;
            console.log(`Generating image and metadata for topic: ${imageTopic} in chapter ${chapter.title}`);

            const { media, output: textOutput } = await imageGenerationAndMetadataPrompt({
              topic: imageTopic,
              chapterTitle: chapter.title,
              courseTitle: courseStructure.title,
            });
            
            if (media && media.url && textOutput) {
              block.value = media.url; // This will be the data:image/... URI
              block.altText = textOutput.altText;
              // Ensure dataAiHint is max two words, and not overly long.
              block.dataAiHint = textOutput.dataAiHint.split(' ').slice(0, 2).join(' ').substring(0, 50);
              console.log(`Successfully generated image and metadata for topic: ${imageTopic}. Alt: ${block.altText}, Hint: ${block.dataAiHint}`);
            } else {
              console.warn(`Image generation or metadata extraction failed for topic: ${imageTopic}. Using placeholder.`);
              block.value = `https://placehold.co/800x400.png?text=AI+Error`;
              block.altText = `Placeholder image for ${imageTopic} (AI generation failed)`;
              block.dataAiHint = imageTopic.split(" ").slice(0,2).join(" ").substring(0,50) || "topic visual";
            }
          } catch (error: any) {
            console.error(`Error generating image for topic "${block.topic}" in chapter "${chapter.title}":`, error);
            block.value = `https://placehold.co/800x400.png?text=Gen+Error`;
            block.altText = `Error generating image for: ${block.topic || chapter.title}`;
            block.dataAiHint = (block.topic || chapter.title).split(" ").slice(0,2).join(" ").substring(0,50) || "error fallback";
          }
        } else if (block.type === 'image' && block.value && block.value.startsWith('https://placehold.co')) {
            // If a placeholder exists (e.g., user didn't opt for AI image gen, or it failed before), keep it.
            // Or, we could attempt to generate for it here too if a topic exists.
            // For now, we'll only generate if value is PENDING_IMAGE_GENERATION.
             if (!block.altText) block.altText = `Placeholder image for ${block.topic || chapter.title}`;
             if (!block.dataAiHint) block.dataAiHint = (block.topic || chapter.title).split(" ").slice(0,2).join(" ").substring(0,50) || "placeholder image";
        }
      }
    }
  }
  return updatedStructure;
}

