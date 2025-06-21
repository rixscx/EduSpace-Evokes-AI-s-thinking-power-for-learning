
'use server';
/**
 * @fileOverview Generates the textual structure of a course, including modules, chapters,
 * headings, and text paragraphs. It creates placeholders for image and video content,
 * along with a topic hint for subsequent AI flows to populate them.
 *
 * - generateCourseTextStructure - A function to generate the course's textual structure.
 * - GenerateCourseTextStructureInput - Input type for the flow.
 * - GenerateCourseTextStructureOutputAI - Output type for the AI flow (maps to part of Course type).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ContentBlockType as PlatformContentBlockType } from '@/types/platform';

// Input Schema
const GenerateCourseTextStructureInputSchema = z.object({
  courseTitle: z.string().describe('The main title of the course to be generated.'),
  targetAudience: z.string().optional().describe('Optional: Describe the target audience (e.g., beginners, advanced developers).'),
  numberOfModules: z.number().min(1).max(10).optional().describe('Optional: Preferred number of modules (e.g., 3, 4, 5). AI will aim for this if specified, up to a system maximum of 10.'),
});
export type GenerateCourseTextStructureInput = z.infer<typeof GenerateCourseTextStructureInputSchema>;

// Output Schema for AI - to match the new structure
const ContentBlockAISchema = z.object({
  type: z.enum(["heading", "text", "image", "video", "link", "file"] as [PlatformContentBlockType, ...PlatformContentBlockType[]]).describe("Type of content block."),
  value: z.string().describe("The primary data for the block. E.g., text. For images, use 'PENDING_IMAGE_GENERATION'. For videos, use 'PENDING_VIDEO_SUGGESTION'."),
  altText: z.string().optional().describe("Alternative text for images, or descriptive text for links/videos. Leave empty for images/videos at this stage."),
  level: z.number().min(1).max(6).optional().describe("Heading level (1-6) if type is 'heading'."),
  dataAiHint: z.string().optional().describe("For image blocks: Leave empty at this stage."),
  topic: z.string().optional().describe("For image/video blocks: A brief description of the desired content/subject matter for this media element, derived from chapter context. E.g., 'Illustration of a neural network' or 'Explanation of photosynthesis process'. This will be used by other AI agents to generate/find the actual media."),
});

const ChapterAISchema = z.object({
  title: z.string().describe('The title of the chapter.'),
  contentBlocks: z.array(ContentBlockAISchema).min(1).describe('An array of content blocks for this chapter. Focus on headings and text. For images and videos, create placeholders with a relevant topic.'),
  estimatedMinutes: z.number().optional().describe("Estimated duration for this chapter in minutes."),
});

const ModuleAISchema = z.object({
  title: z.string().describe('The title of the module.'),
  description: z.string().optional().describe('A brief (1-2 sentences) description of what the module covers.'),
  chapters: z.array(ChapterAISchema).min(1).describe('An array of chapters for this module. Aim for 2-4 chapters per module.'),
});

const GenerateCourseTextStructureOutputAISchema = z.object({
  title: z.string().describe('The main title of the generated course (should match the input courseTitle).'),
  description: z.string().describe('A concise and engaging overall description of the course (2-4 sentences).'),
  categoryName: z.string().describe('A suggested category for the course (e.g., "Web Development", "Data Science", "History"). Choose from common educational topics.'),
  estimatedDurationMinutes: z.number().optional().describe('An estimated total duration for the course in minutes (e.g., 120 for 2 hours). Based on content generated.'),
  difficultyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).describe('The difficulty level of the course.'),
  badgeOnComplete: z.string().optional().describe("A suggested short, catchy badge name for course completion (e.g., 'Code Master', 'History Buff'). Max 3-4 words."),
  modules: z.array(ModuleAISchema).min(1).describe('An array of modules, each containing a title, description, and an array of chapters focusing on textual content.'),
});
export type GenerateCourseTextStructureOutputAI = z.infer<typeof GenerateCourseTextStructureOutputAISchema>;


export async function generateCourseTextStructure(
  input: GenerateCourseTextStructureInput
): Promise<GenerateCourseTextStructureOutputAI> {
  const processedInput = { ...input };
  if (processedInput.numberOfModules && processedInput.numberOfModules > 10) {
    console.warn(`AI Course Text Structure Generation: numberOfModules (${processedInput.numberOfModules}) exceeded schema maximum of 10. Clamping to 10.`);
    processedInput.numberOfModules = 10;
  }

  const result = await generateCourseTextStructureFlow(processedInput);
  return result;
}

const prompt = ai.definePrompt({
  name: 'generateCourseTextStructurePrompt',
  input: {schema: GenerateCourseTextStructureInputSchema},
  output: {schema: GenerateCourseTextStructureOutputAISchema},
  prompt: `You are an expert instructional designer AI. Your task is to generate a comprehensive textual course structure based on the provided details, formatted for a block-based content editor. The content should cover topics from a beginner to an advanced level suitable for the course title.

Course Title: "{{courseTitle}}"
Target Audience: {{#if targetAudience}}{{targetAudience}}{{else}}general learners{{/if}}
{{#if numberOfModules}}Number of Modules: Generate exactly {{numberOfModules}} modules (this is a strict requirement, up to the system maximum of 10).{{else}}Number of Modules: Generate around 3-5 modules.{{/if}}

Please generate the full course details strictly adhering to the output JSON schema.

**Overall Course Details Instructions:**
- **title:** Use the provided "{{courseTitle}}".
- **description:** Write a concise (2-4 sentences) and engaging overview of the course, highlighting its scope from foundational concepts to more advanced topics.
- **categoryName:** Suggest a broad category (e.g., "Web Development", "Business", "Creative Arts").
- **estimatedDurationMinutes:** Estimate a total course duration in minutes. Consider about 15-25 minutes per chapter, aiming for substantial content.
- **difficultyLevel:** Assign 'Beginner', 'Intermediate', or 'Advanced'. If the course spans multiple levels, choose the primary starting level (e.g., for a 'Beginner to Intermediate' course, choose 'Beginner').
- **badgeOnComplete (optional):** Suggest a short, catchy badge name (3-4 words) upon course completion.
- **modules:** Generate a set of modules. {{#if numberOfModules}}You **MUST** create exactly {{numberOfModules}} modules (or 10 if {{numberOfModules}} is greater than 10). Do not generate fewer.{{else}}Aim for 3-5 modules.{{/if}} Ensure modules progress logically from foundational to more complex topics.

**Module Instructions (For each module):**
- **title:** Create a clear and descriptive module title reflecting its content and progression.
- **description (optional):** Provide a brief (1-2 sentences) description of what this module covers and its learning objectives.
- **chapters:** Generate an array of 2-5 chapters for this module. Chapters should build upon each other.

**Chapter Instructions (For each chapter within a module):**
- **title:** Create a specific and informative chapter title.
- **estimatedMinutes (optional):** Estimate duration for this chapter (aim for 15-25 minutes of solid content).
- **contentBlocks (array):** Generate a sequence of 4-7 content blocks for this chapter.
    - **Always start with a 'heading' block:**
      { "type": "heading", "level": 3, "value": "Concise Subheading for the Chapter Topic" }
    - **Follow with multiple 'text' blocks:**
      { "type": "text", "value": "Detailed educational textual content for the chapter. This should be substantial, equivalent to several well-developed paragraphs or a comprehensive set of bullet points with explanations. Cover concepts thoroughly and provide examples where appropriate. Ensure content progresses in complexity. Format as simple HTML if necessary for structure (use <p>, <h3>, <h4>, <ul>, <li>, <strong>, <em>, <code>)." }
      Ensure that the text content provides significant learning value and detail, going beyond superficial explanations.
    - **Optionally, include ONE 'image' block placeholder per chapter:**
      If an image seems highly appropriate for the chapter's content to illustrate a key concept:
      { "type": "image", "value": "PENDING_IMAGE_GENERATION", "topic": "A 3-7 word detailed description of the image needed, clearly related to a core concept in this chapter, e.g., 'Diagram of a Python list comprehension' or 'Architectural sketch of a Roman aqueduct showing arches'." }
      (Do NOT set altText or dataAiHint here. Only set type, value, and a very descriptive topic).
    - **Optionally, include ONE 'video' block placeholder per chapter:**
      If a video could significantly enhance understanding of a chapter's topic:
      { "type": "video", "value": "PENDING_VIDEO_SUGGESTION", "topic": "A 3-7 word detailed description of the video content needed, e.g., 'Tutorial on implementing Python decorators' or 'Documentary clip on the Battle of Thermopylae tactics'." }
      (Do NOT set altText here. Only set type, value, and a very descriptive topic).
    - **Optionally, a 'link' block for external resources:**
      { "type": "link", "value": "https://relevant-resource.com", "altText": "Description of external resource (e.g., Official Python Documentation on Lists)" }
    - **Optionally, a 'file' block placeholder for downloadable materials:**
      { "type": "file", "value": "Placeholder: Worksheet on [Specific Chapter Topic].pdf", "altText": "Downloadable worksheet on [Specific Chapter Topic]" } (Do not provide actual file URLs.)

**Important Considerations:**
- **Content Depth & Progression:** The primary goal is to generate rich, detailed textual content that truly spans from beginner to advanced levels appropriate for the course title. Modules and chapters should logically build on one another.
- For image and video blocks, only generate the placeholder 'type', 'value' (as specified above), and a concise, descriptive 'topic'. These will be populated by other AI agents later.
- Ensure educational value, clarity, and engagement.
- Adhere strictly to the types and structures defined in the output schema.
- The 'text' content blocks are CRUCIAL and should be very informative and well-developed. Aim for depth over breadth if necessary within a single chapter, but ensure overall course coverage.

Generate the complete course structure as a single JSON object.
`,
});

const generateCourseTextStructureFlow = ai.defineFlow(
  {
    name: 'generateCourseTextStructureFlow',
    inputSchema: GenerateCourseTextStructureInputSchema,
    outputSchema: GenerateCourseTextStructureOutputAISchema,
  },
  async (input) => {
    try {
      const promptInput = {
        ...input,
        targetAudience: input.targetAudience || "general learners",
      };

      const {output} = await prompt(promptInput);
      if (!output) {
        throw new Error('AI did not return course content.');
      }
      // Basic validation/sanitization (can be expanded)
      if (output.categoryName && output.categoryName.length > 50) {
        output.categoryName = output.categoryName.substring(0, 50);
      }
      if (output.modules.length === 0) {
        throw new Error('AI did not generate any modules for the course.');
      }
      output.modules.forEach(module => {
        if (module.chapters.length === 0) {
          throw new Error(`Module "${module.title}" has no chapters.`);
        }
        module.chapters.forEach(chapter => {
          if (chapter.contentBlocks.length === 0) {
            throw new Error(`Chapter "${chapter.title}" in module "${module.title}" has no content blocks.`);
          }
          chapter.contentBlocks.forEach(block => {
            if (block.type === 'image' && block.value !== "PENDING_IMAGE_GENERATION") {
              console.warn(`Image block in "${chapter.title}" has incorrect placeholder value: "${block.value}". Correcting.`);
              block.value = "PENDING_IMAGE_GENERATION";
            }
            if (block.type === 'video' && block.value !== "PENDING_VIDEO_SUGGESTION") {
              console.warn(`Video block in "${chapter.title}" has incorrect placeholder value: "${block.value}". Correcting.`);
              block.value = "PENDING_VIDEO_SUGGESTION";
            }
             // Ensure topic exists if it's an image or video block, even if AI forgot.
            if ((block.type === 'image' || block.type === 'video') && (!block.topic || block.topic.trim() === '')) {
                console.warn(`Missing topic for ${block.type} block in chapter "${chapter.title}". Adding generic topic.`);
                block.topic = `${block.type === 'image' ? 'Visual for' : 'Video about'} ${chapter.title || 'chapter content'}`;
            }
          });
        });
      });

      return output;
    } catch (error: any) {
      console.error('Error in generateCourseTextStructureFlow:', error);
      let detailedMessage = `Failed to generate course text structure: ${error.message || 'Unknown AI error'}`;
      if (error.details && typeof error.details === 'string' && error.details.includes('The model is overloaded.')) {
        detailedMessage = 'The AI model is currently overloaded. Please try again in a few moments.';
      } else if (error.message && error.message.includes('429 Too Many Requests')) {
        detailedMessage = 'AI generation failed due to API rate limits. Please try again after a minute.';
      }
      throw new Error(detailedMessage);
    }
  }
);
