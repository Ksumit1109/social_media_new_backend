const {YtDlp} = require("ytdlp-nodejs")
const fetch = require("node-fetch")

// RapidAPI configuration
const RAPIDAPI_KEY = 'fed10327bamsh5b07481a8d4b2d1p1f2993jsne736f5f9efe7';
const RAPIDAPI_HOST = 'instagram-downloader-download-instagram-stories-videos4.p.rapidapi.com';
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}`;

// Initialize ytdlp only when needed to avoid startup issues
let ytdlp = null;
const getYtdlp = () => {
  if (!ytdlp) {
    ytdlp = new YtDlp();
  }
  return ytdlp;
};

// Helper function to make RapidAPI requests for stories/highlights
async function makeRapidAPIRequest(url) {
  const rapidApiUrl = `${RAPIDAPI_BASE_URL}/convert?url=${encodeURIComponent(url)}`;
  
  console.log('🚀 [RapidAPI] Making request to:', rapidApiUrl);
  
  const response = await fetch(rapidApiUrl, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST
    }
  });
  
  if (!response.ok) {
    throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  console.log('✅ [RapidAPI] Response received:', typeof result);
  
  return result;
}

// Helper function to get Instagram profile photo
async function getProfilePhoto(username) {
  console.log('🔍 [Profile Photo] Fetching profile photo for:', username);
  
  // First try: Use Instagram's JSON API endpoint
  try {
    const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      if (apiData && apiData.data && apiData.data.user && apiData.data.user.profile_pic_url_hd) {
        console.log('✅ [Profile Photo] Found profile picture via API:', apiData.data.user.profile_pic_url_hd);
        return apiData.data.user.profile_pic_url_hd;
      } else if (apiData && apiData.data && apiData.data.user && apiData.data.user.profile_pic_url) {
        console.log('✅ [Profile Photo] Found profile picture via API (standard):', apiData.data.user.profile_pic_url);
        return apiData.data.user.profile_pic_url;
      }
    }
  } catch (apiError) {
    console.log('⚠️ [Profile Photo] API method failed:', apiError.message);
  }
  
  // Second try: Use traditional web scraping
  const profileUrl = `https://www.instagram.com/${username}/`;
  
  try {
    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Profile not found');
      }
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract profile picture URL from the HTML
    console.log('📄 [Profile Photo] Page content length:', html.length);
    
    // Try multiple patterns for profile picture URL
    const patterns = [
      /"profile_pic_url":"([^"]+)"/,
      /"profile_pic_url_hd":"([^"]+)"/,
      /"ProfilePicture"[^}]+"url":"([^"]+)"/,
      /<meta property="og:image" content="([^"]+)"/,
      /<meta name="twitter:image" content="([^"]+)"/,
      /"image"[^}]*"url":"([^"]+)"/,
      /https:\/\/[^"]*\.cdninstagram\.com\/v\/[^"]*\.jpg[^"]*(?=")/g,
      /https:\/\/[^"]*instagram[^"]*\.jpg[^"]*(?=")/g
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let profilePicUrl = match[1];
        profilePicUrl = profilePicUrl.replace(/\\u0026/g, '&')
                                   .replace(/\\u003d/g, '=')
                                   .replace(/\\\\/g, '/')
                                   .replace(/\\u002F/g, '/');
        
        if (profilePicUrl.includes('.jpg') || profilePicUrl.includes('.jpeg') || profilePicUrl.includes('.png')) {
          console.log('✅ [Profile Photo] Found profile picture URL:', profilePicUrl);
          return profilePicUrl;
        }
      }
    }
    
    throw new Error('Profile picture URL not found in page content');
    
  } catch (error) {
    console.error('❌ [Profile Photo] Error fetching profile photo:', error.message);
    throw error;
  }
}

// Helper function to download file from URL with timeout
async function downloadFromUrl(fileUrl, res, filename) {
  console.log('📥 [Download] Downloading from URL:', fileUrl);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout for Vercel
  
  try {
    const response = await fetch(fileUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Get the buffer and send it
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
    
    console.log('✅ [Download] File download completed');
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

exports.info = async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('📷 [Instagram INFO] User requested info for URL:', url);
    
    if (!url) {
      console.log('❌ [Instagram INFO] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!url.includes('instagram.com')) {
      console.log('❌ [Instagram INFO] Invalid Instagram URL:', url);
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }

    console.log('📡 [Instagram INFO] Fetching content information...');
    
    const ytdlpInstance = getYtdlp();
    const info = await ytdlpInstance.getInfoAsync(url);

    console.log('✅ [Instagram INFO] Successfully fetched content info:', {
      title: info.title || 'Instagram Content',
      uploader: info.uploader || info.channel
    });

    const formatOptions = [
      { format_id: 'best', ext: 'mp4', quality: 'Best Quality', format_note: 'Best available quality' },
      { format_id: 'worst', ext: 'mp4', quality: 'Lower Quality', format_note: 'Smaller file size' }
    ];

    res.json({
      title: info.title || 'Instagram Content',
      uploader: info.uploader || info.channel,
      duration: info.duration,
      thumbnail: info.thumbnail,
      description: info.description ? info.description.substring(0, 200) : '',
      formats: formatOptions
    });
  } catch (error) {
    console.error('❌ [Instagram INFO] Error getting Instagram info:', error.message);
    res.status(500).json({ error: 'Failed to get Instagram content information: ' + error.message });
  }
};

exports.download = async (req, res) => {
  try {
    const { url, format_id } = req.body;
    
    console.log('⬇️ [Instagram DOWNLOAD] User requested download:', { url, format_id });
    
    if (!url) {
      console.log('❌ [Instagram DOWNLOAD] No URL provided');
      return res.status(400).json({ error: 'Instagram URL is required' });
    }

    if (!url.includes('instagram.com')) {
      console.log('❌ [Instagram DOWNLOAD] Invalid Instagram URL:', url);
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }

    // For Vercel, we need to handle this differently
    // Instead of streaming, we'll get the URL and redirect or provide the direct link
    console.log('📡 [Instagram DOWNLOAD] Getting content info...');
    const ytdlpInstance = getYtdlp();
    const info = await ytdlpInstance.getInfoAsync(url);

    if (info.url) {
      // If we have a direct URL, redirect to it
      console.log('✅ [Instagram DOWNLOAD] Redirecting to direct URL');
      return res.redirect(info.url);
    } else {
      // Try to extract URL from formats
      let downloadUrl = null;
      if (info.formats && Array.isArray(info.formats)) {
        const bestFormat = info.formats.find(f => f.format_id === (format_id || 'best')) || info.formats[0];
        downloadUrl = bestFormat?.url;
      }
      
      if (downloadUrl) {
        console.log('✅ [Instagram DOWNLOAD] Redirecting to format URL');
        return res.redirect(downloadUrl);
      } else {
        throw new Error('No download URL found');
      }
    }

  } catch (error) {
    console.error('❌ [Instagram DOWNLOAD] Error:', error.message);
    res.status(500).json({ error: 'Failed to download Instagram content: ' + error.message });
  }
}

exports.story = async (req, res) => {
  try {
    const { url, format_id } = req.body;
    
    console.log('📷 [Instagram STORY] User requested download:', { url, format_id });
    
    if (!url) {
      console.log('❌ [Instagram STORY] No URL provided');
      return res.status(400).json({ error: 'Instagram Story URL is required' });
    }

    if (!url.includes('instagram.com')) {
      console.log('❌ [Instagram STORY] Invalid Instagram URL:', url);
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }

    if (!url.includes('/stories/')) {
      console.log('❌ [Instagram STORY] URL is not a story URL:', url);
      return res.status(400).json({ 
        error: 'This does not appear to be an Instagram Story URL',
        details: 'Story URLs should contain "/stories/" (e.g., https://www.instagram.com/stories/username/123456789/)'
      });
    }

    console.log('🚀 [Instagram STORY] Getting download info from RapidAPI...');

    const result = await makeRapidAPIRequest(url);
    
    console.log('📊 [Instagram STORY] RapidAPI response:', result);
    
    let downloadUrl = null;
    let filename = `Instagram_Story_${Date.now()}`;
    
    if (result && typeof result === 'object') {
      const apiResult = result;
      
      if (apiResult.media && Array.isArray(apiResult.media) && apiResult.media.length > 0) {
        const videoMedia = apiResult.media.find((media) => media.type === 'mp4');
        if (videoMedia && videoMedia.url) {
          downloadUrl = videoMedia.url;
        }
      }
      
      if (!downloadUrl) {
        downloadUrl = apiResult.download_url || apiResult.url || apiResult.video_url || apiResult.story_url || apiResult.media_url;
      }
      
      if (apiResult.title) {
        filename = apiResult.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50) || filename;
      }
    }
    
    if (!downloadUrl) {
      console.log('❌ [Instagram STORY] No download URL found in RapidAPI response');
      return res.status(404).json({ 
        error: 'Story download URL not found',
        details: 'The story may have expired, been deleted, or is from a private account'
      });
    }
    
    console.log('📥 [Instagram STORY] Downloading from URL:', downloadUrl);
    
    await downloadFromUrl(downloadUrl, res, `${filename}.mp4`);
    
    console.log('✅ [Instagram STORY] Download completed successfully');

  } catch (error) {
    console.error('❌ [Instagram STORY] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Instagram Story: ' + error.message });
    }
  }
}

exports.photo = async (req, res) => {
  try {
    const { url, format_id } = req.body;
    
    console.log('📸 [Instagram PHOTO] User requested download:', { url, format_id });
    
    if (!url) {
      console.log('❌ [Instagram PHOTO] No URL provided');
      return res.status(400).json({ error: 'Instagram Photo URL is required' });
    }

    if (!url.includes('instagram.com')) {
      console.log('❌ [Instagram PHOTO] Invalid Instagram URL:', url);
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }

    console.log('📡 [Instagram PHOTO] Getting content info...');
    const ytdlpInstance = getYtdlp();
    const info = await ytdlpInstance.getInfoAsync(url);

    if (info.url) {
      // If we have a direct URL, use it
      console.log('✅ [Instagram PHOTO] Found direct URL');
      const safeTitle = (info.title || 'Instagram_Photo').replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
      await downloadFromUrl(info.url, res, `${safeTitle}.jpg`);
    } else {
      // Try to extract URL from formats
      let downloadUrl = null;
      if (info.formats && Array.isArray(info.formats)) {
        const bestFormat = info.formats.find(f => f.format_id === (format_id || 'best')) || info.formats[0];
        downloadUrl = bestFormat?.url;
      }
      
      if (downloadUrl) {
        console.log('✅ [Instagram PHOTO] Found format URL');
        const safeTitle = (info.title || 'Instagram_Photo').replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
        await downloadFromUrl(downloadUrl, res, `${safeTitle}.jpg`);
      } else {
        throw new Error('No download URL found');
      }
    }

  } catch (error) {
    console.error('❌ [Instagram PHOTO] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Instagram Photo: ' + error.message });
    }
  }
}

exports.highlights = async (req, res) => {
  try {
    const { url, format_id } = req.body;
    
    console.log('🌟 [Instagram HIGHLIGHTS] User requested download:', { url, format_id });
    
    if (!url) {
      console.log('❌ [Instagram HIGHLIGHTS] No URL provided');
      return res.status(400).json({ error: 'Instagram Story Highlights URL is required' });
    }

    if (!url.includes('instagram.com')) {
      console.log('❌ [Instagram HIGHLIGHTS] Invalid Instagram URL:', url);
      return res.status(400).json({ error: 'Please provide a valid Instagram URL' });
    }

    if (!url.includes('/highlights/') && !url.includes('stories/highlights/')) {
      console.log('❌ [Instagram HIGHLIGHTS] URL is not a highlights URL:', url);
      return res.status(400).json({ 
        error: 'This does not appear to be an Instagram Highlights URL',
        details: 'Highlights URLs should contain "/highlights/" or "stories/highlights/"'
      });
    }

    console.log('🚀 [Instagram HIGHLIGHTS] Getting download info from RapidAPI...');

    const result = await makeRapidAPIRequest(url);
    
    console.log('📊 [Instagram HIGHLIGHTS] RapidAPI response:', result);
    
    let downloadUrl = null;
    let filename = `Instagram_Highlights_${Date.now()}`;
    
    if (result && typeof result === 'object') {
      const apiResult = result;
      
      if (apiResult.media && Array.isArray(apiResult.media) && apiResult.media.length > 0) {
        const videoMedia = apiResult.media.find((media) => media.type === 'mp4');
        if (videoMedia && videoMedia.url) {
          downloadUrl = videoMedia.url;
        }
      }
      
      if (!downloadUrl) {
        downloadUrl = apiResult.download_url || apiResult.url || apiResult.video_url || apiResult.highlights_url || apiResult.media_url;
      }
      
      if (apiResult.title) {
        filename = apiResult.title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50) || filename;
      }
    }
    
    if (!downloadUrl) {
      console.log('❌ [Instagram HIGHLIGHTS] No download URL found in RapidAPI response');
      return res.status(404).json({ 
        error: 'Highlights download URL not found',
        details: 'The highlights may have been removed, deleted, or are from a private account'
      });
    }
    
    console.log('📥 [Instagram HIGHLIGHTS] Downloading from URL:', downloadUrl);
    
    await downloadFromUrl(downloadUrl, res, `${filename}.mp4`);
    
    console.log('✅ [Instagram HIGHLIGHTS] Download completed successfully');

  } catch (error) {
    console.error('❌ [Instagram HIGHLIGHTS] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download Instagram Highlights: ' + error.message });
    }
  }
}

exports.profile = async (req, res) => {
  try {
    const { username } = req.body;
    
    console.log('📸 [Instagram PROFILE] User requested profile photo download:', { username });
    
    if (!username) {
      console.log('❌ [Instagram PROFILE] No username provided');
      return res.status(400).json({ error: 'Instagram username is required' });
    }

    let cleanUsername = username;
    if (username.includes('instagram.com/')) {
      const match = username.match(/instagram\.com\/([^/]+)/);
      if (match) cleanUsername = match[1];
    }
    
    cleanUsername = cleanUsername.replace('@', '');
    
    console.log('🚀 [Instagram PROFILE] Getting profile photo for:', cleanUsername);

    const downloadUrl = await getProfilePhoto(cleanUsername);
    
    const safeUsername = cleanUsername.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50);
    
    console.log('📥 [Instagram PROFILE] Downloading profile photo from URL:', downloadUrl);
    
    await downloadFromUrl(downloadUrl, res, `${safeUsername}_profile_photo.jpg`);
    
    console.log('✅ [Instagram PROFILE] Profile photo download completed successfully');

  } catch (error) {
    console.error('❌ [Instagram PROFILE] Error:', error.message);
    if (!res.headersSent) {
      if (error.message.includes('Profile not found') || error.message.includes('404')) {
        res.status(404).json({ 
          error: 'Instagram profile not found',
          details: `The username does not exist or has been deactivated.`
        });
      } else if (error.message.includes('403') || error.message.includes('private')) {
        res.status(403).json({ 
          error: 'This Instagram profile is private',
          details: 'Private Instagram profiles cannot be accessed.'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to download profile photo: ' + error.message
        });
      }
    }
  }
}