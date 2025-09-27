const { YtDlp } = require("ytdlp-nodejs");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Determine the correct binary path based on the platform
let binaryPath;
if (os.platform() === 'win32') {
    binaryPath = path.join(__dirname, "..", "bin", "yt-dlp.exe");
} else {
    binaryPath = path.join(__dirname, "..", "bin", "yt-dlp_linux");
}

// Check if binary exists
if (!fs.existsSync(binaryPath)) {
    console.error(`❌ Binary not found at: ${binaryPath}`);
    console.error("Please download the correct binary for your platform and place it in the bin directory");
    process.exit(1);
}

const ytdlp = new YtDlp({
    binaryPath: binaryPath
});

exports.info = async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('🎬 [YouTube INFO] User requested info for URL:', url);
    
    if (!url) {
      console.log('❌ [YouTube INFO] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      console.log('❌ [YouTube INFO] Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Please provide a valid YouTube URL' });
    }

    console.log('📡 [YouTube INFO] Fetching video information...');
    
    // Get video information using ytdlp
    const info = await ytdlp.getInfoAsync(url);

    console.log('✅ [YouTube INFO] Successfully fetched video info:', {
      title: info.title,
      duration: info.duration,
      uploader: info.uploader,
      formats_count: Array.isArray(info.formats) ? info.formats.length : 'N/A'
    });

    // Create format options for user selection
    const formatOptions = [
      { format_id: 'best[height<=1080]', ext: 'mp4', quality: '1080p', format_note: '1080p (Best)' },
      { format_id: 'best[height<=720]', ext: 'mp4', quality: '720p', format_note: '720p (HD)' },
      { format_id: 'best[height<=480]', ext: 'mp4', quality: '480p', format_note: '480p (Standard)' },
      { format_id: 'best[height<=360]', ext: 'mp4', quality: '360p', format_note: '360p (Low)' },
      { format_id: 'bestaudio', ext: 'mp3', quality: 'Audio Only', format_note: 'Audio Only (MP3)' }
    ];

    console.log('📋 [YouTube INFO] Available formats:', formatOptions.map(f => f.quality));

    res.json({
      title: info.title,
      duration: info.duration,
      uploader: info.uploader || info.channel,
      thumbnail: info.thumbnail,
      view_count: info.view_count,
      description: info.description ? info.description.substring(0, 200) + '...' : '',
      formats: formatOptions
    });
  } catch (error) {
    console.error('❌ [YouTube INFO] Error getting video info:', error.message);
    res.status(500).json({ error: 'Failed to get video information: ' + error.message });
  }
};

exports.download = async (req, res) => {
  try {
    const { url, format_id, quality } = req.body;
    
    console.log('⬇️ [YouTube DOWNLOAD] User requested download:', { url, format_id, quality });
    
    if (!url) {
      console.log('❌ [YouTube DOWNLOAD] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      console.log('❌ [YouTube DOWNLOAD] Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Please provide a valid YouTube URL' });
    }

    // First get video info to determine filename
    console.log('📡 [YouTube DOWNLOAD] Getting video info for filename...');
    const info = await ytdlp.getInfoAsync(url);

    const safeTitle = info.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
    
    console.log('🎬 [YouTube DOWNLOAD] Starting download:', {
      title: info.title,
      format: format_id || 'best',
      quality: quality
    });

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

    console.log('🚀 [YouTube DOWNLOAD] Starting ytdlp download process...');

    try {
      // Use exec to pipe directly to response
      const childProcess = ytdlp.exec(url, {
        format: format_id || 'best[height<=1080]/best',
        output: '-' // Output to stdout
      });
      
      childProcess.stdout?.pipe(res);
      
      childProcess.on('close', (code) => {
        console.log(`✅ [YouTube DOWNLOAD] Download completed with code: ${code}`);
      });
      
      childProcess.on('error', (error) => {
        console.error('❌ [YouTube DOWNLOAD] Process error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed: ' + error.message });
        }
      });
      
      childProcess.stderr?.on('data', (data) => {
        console.log('📊 [YouTube DOWNLOAD] Progress:', data.toString().trim());
      });
    } catch (execError) {
      console.error('❌ [YouTube DOWNLOAD] Failed to start download:', execError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start download: ' + execError.message });
      }
    }

  } catch (error) {
    console.error('❌ [YouTube DOWNLOAD] Error downloading video:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download video: ' + error.message });
    }
  }
}

exports.playListInfo = async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('📋 [YouTube PLAYLIST INFO] User requested playlist info:', { url });
    
    if (!url) {
      console.log('❌ [YouTube PLAYLIST INFO] No URL provided');
      return res.status(400).json({ error: 'Playlist URL is required' });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      console.log('❌ [YouTube PLAYLIST INFO] Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Please provide a valid YouTube URL' });
    }

    console.log('📡 [YouTube PLAYLIST INFO] Getting playlist information...');
    
    // Get playlist information using ytdlp to get all entries
    const info = await ytdlp.getInfoAsync(url);

    const playlistTitle = info.playlist_title || info.title || 'YouTube Playlist';
    const entries = info.entries || [];
    
    console.log('✅ [YouTube PLAYLIST INFO] Successfully fetched playlist info:', {
      title: playlistTitle,
      video_count: entries.length
    });

    // Format entries for frontend
    const formattedEntries = entries.map((entry, index) => ({
      id: entry.id || `video_${index}`,
      title: entry.title || `Video ${index + 1}`,
      url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
      duration: entry.duration,
      uploader: entry.uploader || entry.channel,
      thumbnail: entry.thumbnail,
      view_count: entry.view_count
    }));

    // Create format options for playlist downloads
    const formatOptions = [
      { format_id: 'best[height<=1080]', ext: 'mp4', quality: '1080p', format_note: '1080p (Best)' },
      { format_id: 'best[height<=720]', ext: 'mp4', quality: '720p', format_note: '720p (HD)' },
      { format_id: 'best[height<=480]', ext: 'mp4', quality: '480p', format_note: '480p (Standard)' },
      { format_id: 'best[height<=360]', ext: 'mp4', quality: '360p', format_note: '360p (Low)' },
      { format_id: 'bestaudio', ext: 'mp3', quality: 'Audio Only', format_note: 'Audio Only (MP3)' }
    ];

    console.log('📋 [YouTube PLAYLIST INFO] Available formats:', formatOptions.map(f => f.quality));

    res.json({
      playlist_title: playlistTitle,
      playlist_count: entries.length,
      entries: formattedEntries,
      formats: formatOptions
    });
  } catch (error) {
    console.error('❌ [YouTube PLAYLIST INFO] Error getting playlist info:', error.message);
    res.status(500).json({ error: 'Failed to get playlist information: ' + error.message });
  }
}

exports.playListDownload = async (req, res) => {
  try {
    const { url, format_id, quality, title } = req.body;
    
    console.log('⬇️ [YouTube PLAYLIST DOWNLOAD] User requested video download:', { url, format_id, quality, title });
    
    if (!url) {
      console.log('❌ [YouTube PLAYLIST DOWNLOAD] No URL provided');
      return res.status(400).json({ error: 'Video URL is required' });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      console.log('❌ [YouTube PLAYLIST DOWNLOAD] Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Please provide a valid YouTube URL' });
    }

    const safeTitle = (title || 'YouTube_Video').replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
    
    console.log('🎬 [YouTube PLAYLIST DOWNLOAD] Starting download:', {
      title: title,
      format: format_id || 'best',
      quality: quality
    });

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

    console.log('🚀 [YouTube PLAYLIST DOWNLOAD] Starting ytdlp download process...');

    try {
      // Use exec to pipe directly to response
      const childProcess = ytdlp.exec(url, {
        format: format_id || 'best[height<=1080]/best',
        output: '-' // Output to stdout
      });
      
      childProcess.stdout?.pipe(res);
      
      childProcess.on('close', (code) => {
        console.log(`✅ [YouTube PLAYLIST DOWNLOAD] Download completed with code: ${code}`);
      });
      
      childProcess.on('error', (error) => {
        console.error('❌ [YouTube PLAYLIST DOWNLOAD] Process error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed: ' + error.message });
        }
      });
      
      childProcess.stderr?.on('data', (data) => {
        console.log('📊 [YouTube PLAYLIST DOWNLOAD] Progress:', data.toString().trim());
      });
    } catch (execError) {
      console.error('❌ [YouTube PLAYLIST DOWNLOAD] Failed to start download:', execError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start download: ' + execError.message });
      }
    }

  } catch (error) {
    console.error('❌ [YouTube PLAYLIST DOWNLOAD] Error downloading video:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download video: ' + error.message });
    }
  }
}

exports.mp3 = async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('🎵 [YouTube MP3] User requested MP3 download for URL:', url);
    
    if (!url) {
      console.log('❌ [YouTube MP3] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      console.log('❌ [YouTube MP3] Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Please provide a valid YouTube URL' });
    }

    // Get video info for filename
    console.log('📡 [YouTube MP3] Getting video info...');
    const info = await ytdlp.getInfoAsync(url);

    const safeTitle = info.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
    
    console.log('🎵 [YouTube MP3] Starting MP3 download:', {
      title: info.title,
      safeTitle: safeTitle
    });

    // Set response headers for MP3 download
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);

    console.log('🚀 [YouTube MP3] Starting ytdlp MP3 extraction...');

    try {
      // Use exec for MP3 extraction
      const childProcess = ytdlp.exec(url, {
        format: 'bestaudio',
        extractAudio: true,
        audioFormat: 'mp3',
        output: '-'
      });
      
      childProcess.stdout?.pipe(res);
      
      childProcess.on('close', (code) => {
        console.log(`✅ [YouTube MP3] Download completed with code: ${code}`);
      });
      
      childProcess.on('error', (error) => {
        console.error('❌ [YouTube MP3] Process error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'MP3 download failed: ' + error.message });
        }
      });
      
      childProcess.stderr?.on('data', (data) => {
        console.log('📊 [YouTube MP3] Progress:', data.toString().trim());
      });
    } catch (execError) {
      console.error('❌ [YouTube MP3] Failed to start MP3 extraction:', execError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start MP3 download: ' + execError.message });
      }
    }

  } catch (error) {
    console.error('❌ [YouTube MP3] Error downloading MP3:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download MP3: ' + error.message });
    }
  }
}

exports.shorts = async (req, res) => {
  try {
    const { url, format_id, quality } = req.body;
    
    console.log('⚡ [YouTube SHORTS] User requested download:', { url, format_id, quality });
    
    if (!url) {
      console.log('❌ [YouTube SHORTS] No URL provided');
      return res.status(400).json({ error: 'Shorts URL is required' });
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      console.log('❌ [YouTube SHORTS] Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Please provide a valid YouTube URL' });
    }

    // First get video info to determine filename
    console.log('📡 [YouTube SHORTS] Getting video info for filename...');
    const info = await ytdlp.getInfoAsync(url);

    const safeTitle = info.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
    
    console.log('⚡ [YouTube SHORTS] Starting download:', {
      title: info.title,
      format: format_id || 'best',
      quality: quality
    });

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);

    console.log('🚀 [YouTube SHORTS] Starting ytdlp download process...');

    try {
      // Use exec to pipe directly to response - same as regular video download
      const childProcess = ytdlp.exec(url, {
        format: format_id || 'best[height<=1080]/best',
        output: '-' // Output to stdout
      });
      
      childProcess.stdout?.pipe(res);
      
      childProcess.on('close', (code) => {
        console.log(`✅ [YouTube SHORTS] Download completed with code: ${code}`);
      });
      
      childProcess.on('error', (error) => {
        console.error('❌ [YouTube SHORTS] Process error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Shorts download failed: ' + error.message });
        }
      });
      
      childProcess.stderr?.on('data', (data) => {
        console.log('📊 [YouTube SHORTS] Progress:', data.toString().trim());
      });
    } catch (execError) {
      console.error('❌ [YouTube SHORTS] Failed to start download:', execError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start Shorts download: ' + execError.message });
      }
    }

  } catch (error) {
    console.error('❌ [YouTube SHORTS] Error downloading Shorts:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Shorts: ' + error.message });
    }
  }
}