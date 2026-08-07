# Future Conquest music library

Drop additional `.mp3` music files in this directory and commit them normally.

The Vite build discovers every MP3 here automatically. No audio-manager code change is required. The filename becomes the track ID and display name, for example:

- `cold-iron-horizon.mp3` → `cold-iron-horizon` → `Cold Iron Horizon`
- `march-of-the-network.mp3` → `march-of-the-network` → `March Of The Network`

The built-in `Black Protocol Dawn` title track is supplied separately by the verified audio build and should not be duplicated in this directory.

Keep filenames unique, descriptive and URL-safe. Hyphens are preferred. New tracks appear automatically in the global Settings music picker after the next build/deployment.
