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
    
    console.log('🎵 [TikTok INFO] User requested info for URL:', url);
    
    if (!url) {
      console.log('❌ [TikTok INFO] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('tiktok.com')) {
      console.log('❌ [TikTok INFO] Invalid TikTok URL:', url);
      return res.status(400).json({ error: 'Please provide a valid TikTok URL' });
    }

    console.log('📡 [TikTok INFO] Fetching content information...');
    
    const info = await ytdlp.getInfoAsync(url);

    console.log('✅ [TikTok INFO] Successfully fetched content info:', {
      title: info.title || 'TikTok Content',
      uploader: info.uploader || info.channel
    });

    const formatOptions = [
      { format_id: 'best', ext: 'mp4', quality: 'Best Quality', format_note: 'Best available quality' },
      { format_id: 'worst', ext: 'mp4', quality: 'Lower Quality', format_note: 'Smaller file size' },
      { format_id: 'bestaudio', ext: 'mp3', quality: 'Audio Only', format_note: 'Audio Only (MP3)' }
    ];

    console.log('📋 [TikTok INFO] Available formats:', formatOptions.map(f => f.quality));

    res.json({
      title: info.title || 'TikTok Content',
      uploader: info.uploader || info.channel,
      duration: info.duration,
      thumbnail: info.thumbnail,
      description: info.description ? info.description.substring(0, 200) : '',
      formats: formatOptions
    });
  } catch (error) {
    console.error('❌ [TikTok INFO] Error getting TikTok info:', error.message);
    res.status(500).json({ error: 'Failed to get TikTok content information: ' + error.message });
  }
};


exports.download = async (req, res) => {
  try {
    const { url, format_id } = req.body;
    
    console.log('⬇️ [TikTok DOWNLOAD] User requested download:', { url, format_id });
    
    if (!url) {
      console.log('❌ [TikTok DOWNLOAD] No URL provided');
      return res.status(400).json({ error: 'TikTok URL is required' });
    }

    if (!url.includes('tiktok.com')) {
      console.log('❌ [TikTok DOWNLOAD] Invalid TikTok URL:', url);
      return res.status(400).json({ error: 'Please provide a valid TikTok URL' });
    }

    console.log('📡 [TikTok DOWNLOAD] Getting content info...');
    const info = await ytdlp.getInfoAsync(url);

    const safeTitle = (info.title || 'TikTok_Content').replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
    
    console.log('🎵 [TikTok DOWNLOAD] Starting download:', {
      title: info.title,
      format: format_id || 'best'
    });

    // Set appropriate content type based on format
    if (format_id === 'bestaudio') {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
    }

    console.log('🚀 [TikTok DOWNLOAD] Starting download process...');

    try {
      const downloadOptions = format_id === 'bestaudio' ? {
        format: 'bestaudio',
        extractAudio: true,
        audioFormat: 'mp3',
        output: '-'
      } : {
        format: format_id || 'best',
        output: '-'
      };
      
      const childProcess = ytdlp.exec(url, downloadOptions);
      
      childProcess.stdout?.pipe(res);
      
      childProcess.on('close', (code) => {
        console.log(`✅ [TikTok DOWNLOAD] Download completed with code: ${code}`);
      });
      
      childProcess.on('error', (error) => {
        console.error('❌ [TikTok DOWNLOAD] Process error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Download failed: ' + error.message });
        }
      });
      
      childProcess.stderr?.on('data', (data) => {
        console.log('📊 [TikTok DOWNLOAD] Progress:', data.toString().trim());
      });
    } catch (execError) {
      console.error('❌ [TikTok DOWNLOAD] Failed to start download:', execError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start download: ' + execError.message });
      }
    }

  } catch (error) {
    console.error('❌ [TikTok DOWNLOAD] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download TikTok content: ' + error.message });
    }
  }
}


exports.long = async (req, res) => {
  try {
    const { url, format } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'TikTok Long Video URL is required' });
    }

    res.status(200).json({ 
      message: 'TikTok Long download would start here',
      url,
      format: format || 'best'
    });
  } catch (error) {
    console.error('Error downloading TikTok Long:', error);
    res.status(500).json({ error: 'Failed to download TikTok Long video' });
  }
}


exports.general = async (req, res) => {
  try {
    const { url, format } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'TikTok Video URL is required' });
    }

    res.status(200).json({ 
      message: 'TikTok Video download would start here',
      url,
      format: format || 'best'
    });
  } catch (error) {
    console.error('Error downloading TikTok Video:', error);
    res.status(500).json({ error: 'Failed to download TikTok video' });
  }
}


exports.long = async (req, res) => {
  try {
    const { url, format } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'TikTok Long Video URL is required' });
    }

    res.status(200).json({ 
      message: 'TikTok Long download would start here',
      url,
      format: format || 'best'
    });
  } catch (error) {
    console.error('Error downloading TikTok Long:', error);
    res.status(500).json({ error: 'Failed to download TikTok Long video' });
  }
}

exports.audio = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'TikTok URL is required' });
    }

    res.status(200).json({ 
      message: 'TikTok Audio download would start here',
      url
    });
  } catch (error) {
    console.error('Error downloading TikTok Audio:', error);
    res.status(500).json({ error: 'Failed to download TikTok audio' });
  }
}