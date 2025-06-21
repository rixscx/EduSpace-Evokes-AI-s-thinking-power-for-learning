
interface VideoPlayerProps {
  videoURL: string;
  title: string;
}

export function VideoPlayer({ videoURL, title }: VideoPlayerProps) {
  let videoId = "";
  try {
    const url = new URL(videoURL);
    if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") {
      // Handles standard /watch?v=VIDEO_ID and /embed/VIDEO_ID URLs
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/embed/")[1].split("?")[0];
      } else {
        videoId = url.searchParams.get("v") || "";
      }
      if (!videoId && url.pathname.length > 1) { // Fallback for URLs like /VIDEO_ID
         const pathParts = url.pathname.split("/");
         // Basic check for YouTube ID length, actual validation is more complex
         if (pathParts.length > 0 && pathParts[pathParts.length-1].length === 11) { 
            videoId = pathParts[pathParts.length-1];
         }
      }

    } else if (url.hostname === "youtu.be") {
      videoId = url.pathname.substring(1).split("?")[0];
    }
  } catch (e) {
    console.error("Invalid video URL or error parsing URL:", videoURL, e);
  }

  if (!videoId) {
    console.warn("Could not extract videoId from URL:", videoURL);
    return (
      <div className="aspect-video w-full bg-muted flex items-center justify-center rounded-lg shadow-sm border border-border/70">
        <p className="text-destructive text-sm font-medium p-4 text-center">
          Invalid or unsupported video URL. Unable to extract video ID.
        </p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&color=white&showinfo=0&iv_load_policy=3`;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg shadow-md border border-border/70 bg-black">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      ></iframe>
    </div>
  );
}
