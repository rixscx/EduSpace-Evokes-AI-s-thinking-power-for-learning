
'use server';
/**
 * @fileOverview Populates video content blocks in a course structure
 * by finding relevant YouTube videos (embed URLs or search queries) and alt text.
 *
 * - populateCourseVideos - Function to enrich course structure with video suggestions.
 * - PopulateCourseVideosInput - Input type (the course structure itself).
 * - PopulateCourseVideosOutput - Output type (the enriched course structure).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateCourseTextStructureOutputAI } from './generate-course-text-structure'; // Use the same structure type

export type PopulateCourseVideosInput = GenerateCourseTextStructureOutputAI;
export type PopulateCourseVideosOutput = GenerateCourseTextStructureOutputAI;

const VideoDetailsSchema = z.object({
  videoUrl: z.string().describe("A YouTube embed URL (e.g., https://www.youtube.com/embed/VIDEO_ID) or a YouTube search query prefixed with 'search:' (e.g., 'search:explanation of quantum physics')."),
  altText: z.string().describe("A concise title or description for the suggested video."),
});

const videoFinderPrompt = ai.definePrompt({
    name: 'findVideoDetailsPrompt',
    input: { schema: z.object({ topic: z.string(), chapterTitle: z.string(), courseTitle: z.string() }) },
    output: { schema: VideoDetailsSchema },
    model: 'googleai/gemini-2.0-flash', // Standard text model
    config: {
        temperature: 0.3, // More factual for finding URLs
    },
    prompt: `
    Context:
    Course Title: "{{courseTitle}}"
    Chapter Title: "{{chapterTitle}}"
    Video Topic: "{{topic}}"

    Task:
    Find a relevant educational YouTube video for the "Video Topic".
    1. Prioritize providing a direct YouTube embed URL (e.g., https://www.youtube.com/embed/VIDEO_ID_HERE).
    2. If a specific embeddable video cannot be readily found, provide a YouTube search query string prefixed with 'search:' (e.g., "search:Best explanation of {{topic}}").
    3. Provide a concise and descriptive title for this video (altText). Max 20 words.

    Output Format (ensure your response is ONLY this JSON object):
    {
      "videoUrl": "Generated video URL or search query here",
      "altText": "Generated alt text here"
    }
    `,
});


export async function populateCourseVideos(
  courseStructure: PopulateCourseVideosInput
): Promise<PopulateCourseVideosOutput> {
  const updatedStructure = JSON.parse(JSON.stringify(courseStructure)) as PopulateCourseVideosOutput; // Deep clone

  for (const module of updatedStructure.modules) {
    for (const chapter of module.chapters) {
      for (const block of chapter.contentBlocks) {
        if (block.type === 'video' && block.value === 'PENDING_VIDEO_SUGGESTION') {
          try {
            const videoTopic = block.topic || `Video for ${chapter.title}`;
            console.log(`Finding video for topic: ${videoTopic} in chapter ${chapter.title}`);

            const { output } = await videoFinderPrompt({
              topic: videoTopic,
              chapterTitle: chapter.title,
              courseTitle: courseStructure.title,
            });
            
            if (output) {
              block.value = output.videoUrl;
              // Post-process to ensure embed URL if a watch URL was given
              if (block.value.includes("youtube.com/watch?v=")) {
                const videoId = block.value.split("watch?v=")[1]?.split('&')[0];
                if (videoId) block.value = `https://www.youtube.com/embed/${videoId}`;
              } else if (block.value.includes("youtu.be/")) {
                 const videoId = block.value.split("youtu.be/")[1]?.split('?')[0];
                 if (videoId) block.value = `https://www.youtube.com/embed/${videoId}`;
              }
              block.altText = output.altText;
              console.log(`Successfully found video for topic: ${videoTopic}. URL/Query: ${block.value}, Alt: ${block.altText}`);
            } else {
              console.warn(`Video finding failed or returned incomplete data for topic: ${videoTopic}. Using placeholder search.`);
              block.value = `search:${videoTopic}`;
              block.altText = `Video about ${videoTopic}`;
            }
          } catch (error: any) {
            console.error(`Error finding video for topic "${block.topic}" in chapter "${chapter.title}":`, error);
            block.value = `search:Error finding video for ${block.topic || chapter.title}`;
            block.altText = `Error finding video for: ${block.topic || chapter.title}`;
          }
        }
      }
    }
  }
  return updatedStructure;
}
