# Social posting

Put a video in `social/outbox/` and it goes out to every account connected on
[Upload-Post](https://www.upload-post.com): Instagram Reels, YouTube Shorts, TikTok, Facebook, X,
LinkedIn, Threads, Pinterest, Bluesky. Connecting another account there is all it takes to add it.

## Posting a video

1. Copy the video to `social/outbox/teaser.mp4`.
2. Add the caption as `social/outbox/teaser.txt`, with the same name. **Add it last**: the caption is
   what says the video is finished and ready to go public.

```
Who took the ring?

Three guests. One lie. Crack it with your friends. #mystery #boardgame
```

The first line is the headline, 100 characters at most. YouTube, X, Bluesky, Threads and Pinterest
use it alone as their title; the whole text goes to the rest, and the part after the first line
becomes the YouTube and Pinterest description.

3. Run one of these. `social:watch` keeps checking the outbox until you press Ctrl+C.

```bash
npm run social:post
```

```bash
npm run social:watch
```

To see what would go out without posting anything:

```bash
npm run social:post -- --dry-run
```

Videos must be vertical, 3 to 90 seconds, and under 300 MB, which is what all the platforms accept.
Anything else stays in the outbox and the script says why.

## Where videos end up

- `social/posted/`: sent, with each platform's result in `result.json`.
- `social/failed/`: every platform failed, or Upload-Post refused it.

If some platforms failed, the script prints the command to retry just those. The same video with the
same caption is never sent twice; `--retry` is the way to do that on purpose.

These folders are git-ignored, so videos stay on this PC.

## Setup

1. Sign up at [Upload-Post](https://www.upload-post.com) and create a profile.
2. Connect the accounts. Instagram needs a Business or Creator account.
3. Create an API key and add it to `.env.local`:

```
UPLOAD_POST_API_KEY=...
```

Optional, also in `.env.local`:

- `UPLOAD_POST_PROFILE`: needed only with more than one profile.
- `UPLOAD_POST_FACEBOOK_PAGE`: the Page ID, needed if several Pages are connected.
- `UPLOAD_POST_PINTEREST_BOARD`: the board ID; without it Pinterest is skipped.

The free plan allows 10 uploads a month and has no TikTok. TikTok needs Basic, $24 a month.
