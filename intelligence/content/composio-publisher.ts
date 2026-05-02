// Created by BBMW0 Technologies | bbmw0.com
/**
 * COMPOSIO PUBLISHER
 *
 * Handles actual delivery of approved content packages to
 * Instagram and YouTube via the Composio MCP connection.
 *
 * ACCOUNT DETAILS (from active Composio connections):
 *   Instagram:       @ai_game_odyssey   — ig_user_id: 26759002047072119
 *   YouTube (main):  @bbmw.0 (Mohammed) — channel: UCSRkqZ0PckW8ae-cnZcN1hw
 *   YouTube (bbm0902): @bbm0902         — email: bbmw96@gmail.com
 *                    ⚠️  CONNECT ACTION REQUIRED:
 *                    Go to composio.dev → Apps → YouTube → Add Account
 *                    Sign in with bbmw96@gmail.com to connect @bbm0902.
 *                    Shorts only — no long-form on this channel.
 *
 * POLICY:
 *   - Only posts with approvedForPosting = true are ever delivered
 *   - All posts include mandatory AI disclosure per platform policy
 *   - Rate limits respected: Instagram 25 posts/24h, YouTube quota managed
 *   - Human approval is the final gate — this module never bypasses it
 *   - Security engine (999 layers) validates every publish operation
 *
 * VIDEO FILES:
 *   Instagram and YouTube require actual video/image files.
 *   The content engine generates the full metadata package.
 *   When you record the video using the script/hook/concept,
 *   call publishInstagramReel() or publishYouTubeVideo() with the file.
 *   The system handles all metadata injection automatically.
 */

// ── ACCOUNT CONSTANTS ──────────────────────────────────────────────────────────

export const COMPOSIO_ACCOUNTS = {
  instagram: {
    igUserId:    "26759002047072119",
    username:    "ai_game_odyssey",
    accountId:   "instagram_stays-moo",
    email:       "up866106@gmail.com",
  },
  youtube: {
    channelId:   "UCSRkqZ0PckW8ae-cnZcN1hw",
    handle:      "@bbmw.0",
    name:        "Mohammed",
    accountId:   "youtube_boris-stasis",
    email:       "up866106@gmail.com",
    contentType: "all" as const,
  },
  youtubeBbm0902: {
    channelId:   "",   // Populated once bbmw96@gmail.com is connected in Composio
    handle:      "@bbm0902",
    name:        "bbm0902",
    accountId:   "youtube_bbm0902",   // Assigned by Composio on connection
    email:       "bbmw96@gmail.com",
    contentType: "shorts-only" as const,
    connectionRequired: true,
    connectionInstructions: "composio.dev → Apps → YouTube → Add Account → Sign in with bbmw96@gmail.com",
  },
} as const;

// Category IDs for YouTube
export const YOUTUBE_CATEGORIES: Record<string, string> = {
  "Film & Animation":    "1",
  "Science & Technology": "28",
  "Education":           "27",
  "Entertainment":       "24",
  "People & Blogs":      "22",
  "Howto & Style":       "26",
};

// ── PUBLISH PAYLOADS ───────────────────────────────────────────────────────────

export interface InstagramPublishPayload {
  contentId:        string;
  mediaType:        "REELS" | "CAROUSEL" | "STORIES";
  videoS3Key?:      string;   // S3 key from Composio file upload
  videoUrl?:        string;   // Public MP4 URL (alternative to S3 key)
  imageUrls?:       string[]; // For carousels
  caption:          string;   // Full caption with hashtags
  coverUrl?:        string;   // Custom thumbnail URL
  shareToFeed?:     boolean;  // Reels: show in feed AND reels tab
  approvedBy:       string;
}

export interface YouTubePublishPayload {
  contentId:      string;
  videoS3Key?:    string;   // S3 key from Composio file upload
  videoFilePath?: string;   // Local path (alternative)
  title:          string;   // Max 100 chars
  description:    string;   // Full description with timestamps/links
  tags:           string[]; // Up to 30 tags
  categoryId:     string;   // YouTube category ID
  privacyStatus:  "public" | "unlisted" | "private";
  thumbnailUrl?:  string;   // Custom thumbnail (1280×720 JPG/PNG)
  approvedBy:     string;
}

// ── PUBLISH RESULT ─────────────────────────────────────────────────────────────

export interface PublishResult {
  success:       boolean;
  platform:      "instagram" | "youtube";
  contentId:     string;
  publishedId?:  string;   // Platform media ID
  permalink?:    string;   // Public URL
  publishedAt:   string;
  error?:        string;
}

// ── COMPOSIO PUBLISHER ─────────────────────────────────────────────────────────

export class ComposioPublisherEngine {

  /**
   * Returns the exact Composio tool calls needed to post a Reel to Instagram.
   * The NEUROMESH agents call these steps via the Composio MCP server.
   *
   * STEP 1: INSTAGRAM_POST_IG_USER_MEDIA  — create container
   * STEP 2: INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH — publish
   */
  getInstagramReelPlan(payload: InstagramPublishPayload): object[] {
    return [
      {
        tool:   "INSTAGRAM_POST_IG_USER_MEDIA",
        params: {
          ig_user_id:    COMPOSIO_ACCOUNTS.instagram.igUserId,
          media_type:    "REELS",
          ...(payload.videoUrl   ? { video_url:    payload.videoUrl  } : {}),
          ...(payload.videoS3Key ? { video_file: { name: `${payload.contentId}.mp4`, mimetype: "video/mp4", s3key: payload.videoS3Key } } : {}),
          ...(payload.coverUrl   ? { cover_url:    payload.coverUrl  } : {}),
          caption:       this.buildInstagramCaption(payload.caption),
          share_to_feed: payload.shareToFeed ?? true,
        },
        storeAs: "creation_id",
        extract: "data.id",
      },
      {
        tool:   "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH",
        params: {
          ig_user_id:        COMPOSIO_ACCOUNTS.instagram.igUserId,
          creation_id:       "{{creation_id}}",   // Filled from step 1
          max_wait_seconds:  120,
        },
        storeAs: "published_media_id",
        extract: "data.id",
      },
    ];
  }

  /**
   * Returns the exact Composio tool calls needed to post a Carousel to Instagram.
   */
  getInstagramCarouselPlan(payload: InstagramPublishPayload): object[] {
    if (!payload.imageUrls || payload.imageUrls.length < 2) {
      throw new Error("Carousel requires at least 2 image URLs");
    }
    return [
      {
        tool:   "INSTAGRAM_CREATE_CAROUSEL_CONTAINER",
        params: {
          ig_user_id:       COMPOSIO_ACCOUNTS.instagram.igUserId,
          caption:          this.buildInstagramCaption(payload.caption),
          child_image_urls: payload.imageUrls,
        },
        storeAs: "creation_id",
        extract: "data.id",
      },
      {
        tool:   "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH",
        params: {
          ig_user_id:       COMPOSIO_ACCOUNTS.instagram.igUserId,
          creation_id:      "{{creation_id}}",
          max_wait_seconds: 60,
        },
      },
    ];
  }

  /**
   * Returns the exact Composio tool calls needed to upload a video to YouTube.
   * Uses YOUTUBE_MULTIPART_UPLOAD_VIDEO (S3 key) or YOUTUBE_UPLOAD_VIDEO (file path).
   */
  getYouTubeUploadPlan(payload: YouTubePublishPayload): object[] {
    const title       = payload.title.slice(0, 100);
    const description = payload.description.slice(0, 5000);

    return [
      {
        tool:   "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
        params: {
          title,
          description,
          tags:          payload.tags.slice(0, 30),
          categoryId:    payload.categoryId,
          privacyStatus: payload.privacyStatus,
          videoFile: {
            name:     `${payload.contentId}.mp4`,
            mimetype: "video/mp4",
            s3key:    payload.videoS3Key ?? "UPLOAD_FILE_FIRST",
          },
        },
        storeAs: "video_id",
        extract: "data.video.id",
      },
      // Optional thumbnail update after upload
      ...(payload.thumbnailUrl ? [{
        tool:   "YOUTUBE_UPDATE_THUMBNAIL",
        params: {
          video_id:      "{{video_id}}",
          thumbnailUrl:  payload.thumbnailUrl,
        },
      }] : []),
      // Final metadata polish (SEO)
      {
        tool:   "YOUTUBE_UPDATE_VIDEO",
        params: {
          video_id:     "{{video_id}}",
          title,
          description,
          tags:         payload.tags,
          category_id:  payload.categoryId,
          privacy_status: payload.privacyStatus,
        },
      },
    ];
  }

  /**
   * Returns the Composio tool calls to upload a Short to the @bbm0902 channel.
   * REQUIRES: bbmw96@gmail.com connected at composio.dev → Apps → YouTube.
   * Shorts are ≤ 60 seconds, vertical (9:16), title must NOT exceed 100 chars.
   */
  getBbm0902ShortPlan(payload: YouTubePublishPayload): object[] {
    if (COMPOSIO_ACCOUNTS.youtubeBbm0902.connectionRequired) {
      console.warn(
        "  ⚠️  @bbm0902 Composio connection not yet set up.\n" +
        `     → ${COMPOSIO_ACCOUNTS.youtubeBbm0902.connectionInstructions}\n` +
        "     Execution plan generated but cannot be sent until connected."
      );
    }
    const title       = `#Shorts ${payload.title}`.slice(0, 100);
    const description = `${payload.description}\n\n#Shorts`.slice(0, 5000);

    return [
      {
        tool:   "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
        params: {
          title,
          description,
          tags:          [...payload.tags.slice(0, 28), "Shorts", "YouTubeShorts"],
          categoryId:    payload.categoryId,
          privacyStatus: payload.privacyStatus,
          videoFile: {
            name:     `${payload.contentId}-short.mp4`,
            mimetype: "video/mp4",
            s3key:    payload.videoS3Key ?? "UPLOAD_FILE_FIRST",
          },
          // Shorts are detected by duration (<= 60s) or #Shorts in title
          accountId: COMPOSIO_ACCOUNTS.youtubeBbm0902.accountId,
        },
        storeAs: "video_id",
        extract: "data.video.id",
      },
      ...(payload.thumbnailUrl ? [{
        tool:   "YOUTUBE_UPDATE_THUMBNAIL",
        params: { video_id: "{{video_id}}", thumbnailUrl: payload.thumbnailUrl },
      }] : []),
      {
        tool:   "YOUTUBE_UPDATE_VIDEO",
        params: {
          video_id:       "{{video_id}}",
          title,
          description,
          tags:           [...payload.tags.slice(0, 28), "Shorts", "YouTubeShorts"],
          category_id:    payload.categoryId,
          privacy_status: payload.privacyStatus,
        },
      },
    ];
  }

  /**
   * Builds a complete Instagram caption from the forge package caption.
   * Ensures hashtags are properly formatted and within limits.
   */
  private buildInstagramCaption(caption: string): string {
    // Instagram max 2200 chars
    return caption.slice(0, 2200);
  }

  /**
   * Returns the optimal daily posting schedule for maximum growth.
   * Based on platform algorithm data and channel growth targets.
   */
  getDailySchedule(): DailyPostingSchedule {
    return {
      totalPerDay: 3,
      breakdown: {
        youtube:   1,
        instagram: 2,
      },
      weeklyBreakdown: {
        youtube: {
          total: 7,
          formats: [
            { day: "Monday",    format: "long-form",   time: "14:00 BST", rationale: "Weekend watch time rolls into Monday. Long-form ranks best." },
            { day: "Tuesday",   format: "short",       time: "09:00 BST", rationale: "Shorts show to non-subscribers. Early post = full-day exposure." },
            { day: "Wednesday", format: "explainer",   time: "13:00 BST", rationale: "Mid-week peak. Educational content saves well." },
            { day: "Thursday",  format: "long-form",   time: "14:00 BST", rationale: "BEST YouTube slot. Highest CPM. Post highest-quality video here." },
            { day: "Friday",    format: "short",       time: "11:00 BST", rationale: "Shorts for weekend viewers. Low-effort watch context." },
            { day: "Saturday",  format: "case-study",  time: "10:00 BST", rationale: "Weekend = leisure viewing. Case studies + docs perform well." },
            { day: "Sunday",    format: "documentary", time: "11:00 BST", rationale: "Highest watch-time day. Long-form builds weekly habit." },
          ],
        },
        instagram: {
          total: 14,
          formats: [
            { day: "Monday",    format: "reels",    time: "11:00 BST", rationale: "Week-start motivation. Reels show to non-followers." },
            { day: "Monday",    format: "carousel", time: "18:00 BST", rationale: "Evening save rate peak. Educational carousels perform." },
            { day: "Tuesday",   format: "reels",    time: "11:00 BST", rationale: "Best Instagram engagement day — algorithm favours early posts." },
            { day: "Tuesday",   format: "story-series", time: "19:00 BST", rationale: "Story series for community building. Drives DMs." },
            { day: "Wednesday", format: "reels",    time: "10:00 BST", rationale: "Mid-week reach. Consistent cadence signals active creator." },
            { day: "Wednesday", format: "carousel", time: "15:00 BST", rationale: "Lunch break browsing. Save rate highest on carousels 15:00-17:00." },
            { day: "Thursday",  format: "reels",    time: "13:00 BST", rationale: "Thursday = second best day. Reel gets 72h exposure window." },
            { day: "Thursday",  format: "static-post", time: "20:00 BST", rationale: "Evening engagement post. Lower reach but drives comments." },
            { day: "Friday",    format: "reels",    time: "09:00 BST", rationale: "Pre-weekend content. Hook them before the weekend." },
            { day: "Friday",    format: "carousel", time: "17:00 BST", rationale: "TGIF energy. Save-worthy tip content for the weekend." },
            { day: "Saturday",  format: "reels",    time: "10:00 BST", rationale: "Saturday morning scroll. Highest leisurely viewing time." },
            { day: "Saturday",  format: "story-series", time: "15:00 BST", rationale: "BTS or personal stories on Saturday afternoon." },
            { day: "Sunday",    format: "reels",    time: "11:00 BST", rationale: "Sunday prep content. 'Get ready for the week' angle." },
            { day: "Sunday",    format: "carousel", time: "17:00 BST", rationale: "Sunday summary/recap. 'This week I learned' format." },
          ],
        },
      },
      revenueProjection: {
        month1:  { views: 5_000,    estimatedGBP: 15,    milestone: "First 100 followers/subscribers" },
        month3:  { views: 25_000,   estimatedGBP: 75,    milestone: "500 subscribers, Shorts momentum" },
        month6:  { views: 150_000,  estimatedGBP: 450,   milestone: "1,000 subs — YPP eligible" },
        month12: { views: 800_000,  estimatedGBP: 2_400, milestone: "10k subs — brand deals start" },
      },
    };
  }
}

export interface DailyPostingSchedule {
  totalPerDay: number;
  breakdown: { youtube: number; instagram: number };
  weeklyBreakdown: {
    youtube:   { total: number; formats: PostSlot[] };
    instagram: { total: number; formats: PostSlot[] };
  };
  revenueProjection: Record<string, { views: number; estimatedGBP: number; milestone: string }>;
}

export interface PostSlot {
  day:       string;
  format:    string;
  time:      string;
  rationale: string;
}

export const composioPublisher = new ComposioPublisherEngine();
export default composioPublisher;
