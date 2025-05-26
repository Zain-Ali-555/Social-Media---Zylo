const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Load environment variables
require('dotenv').config();

const app = express();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'social-media',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'mov', 'webp'],
    resource_type: 'auto', // This allows both image and video uploads
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' }, // Limit image dimensions
      { quality: 'auto' } // Optimize quality
    ]
  },
});

// Add file filter to multer
const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files (excluding uploads)
app.use(express.static('public'));
// Removed: app.use('/uploads', express.static('public/uploads'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use(flash());

// Global variables
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.messages = {
        success: req.flash('success_msg'),
        error: req.flash('error_msg')
    };
    res.locals.title = 'Social Media App';
    next();
});

// Database connection for the application and setup
const db = mysql.createConnection(process.env.DATABASE_URL || process.env.MYSQL_URL);

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');

    // Create database and tables - Only run migrations/schema creation once
    // You might want to handle schema creation/migrations separately in production
    db.query(`
                                    CREATE TABLE IF NOT EXISTS users (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                                        password VARCHAR(255) NOT NULL,
                                        theme_id INT DEFAULT 1,
            profile_picture VARCHAR(255),
                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                                    )
                                `, (err) => {
                                    if (err) {
                                        console.error('Error creating users table:', err);
                                        return;
                                    }
                                    console.log('Users table created or already exists');
                                    
                // Create themes table
        db.query(`
                    CREATE TABLE IF NOT EXISTS themes (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        name VARCHAR(50) NOT NULL,
                        primary_color VARCHAR(20) NOT NULL,
                        secondary_color VARCHAR(20) NOT NULL,
                        text_color VARCHAR(20) NOT NULL,
                        accent_color VARCHAR(20) NOT NULL,
                        border_color VARCHAR(20) NOT NULL,
                        background_color VARCHAR(20) NOT NULL
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating themes table:', err);
                        return;
                    }
                    console.log('Themes table created or already exists');
                    
                    // Create posts table
            db.query(`
                        CREATE TABLE IF NOT EXISTS posts (
                            id INT PRIMARY KEY AUTO_INCREMENT,
                                            user_id INT NOT NULL,
                                            content TEXT NOT NULL,
                                            media_url VARCHAR(255),
                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                                        )
                                    `, (err) => {
                                        if (err) {
                                            console.error('Error creating posts table:', err);
                                            return;
                                        }
                                        console.log('Posts table created or already exists');
                                        
                        // Create media table
                db.query(`
                            CREATE TABLE IF NOT EXISTS media (
                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                user_id INT NOT NULL,
                                post_id INT NOT NULL,
                                media_type ENUM('image', 'video') NOT NULL,
                                media_url VARCHAR(255) NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
                            )
                        `, (err) => {
                            if (err) {
                                console.error('Error creating media table:', err);
                                return;
                            }
                            console.log('Media table created or already exists');
                            
                            // Create notifications table
                    db.query(`
                                CREATE TABLE IF NOT EXISTS notifications (
                                    id INT PRIMARY KEY AUTO_INCREMENT,
                                    user_id INT NOT NULL,
                                    acting_user_id INT NOT NULL,
                                                post_id INT,
                                    type VARCHAR(50) NOT NULL,
                                    message TEXT NOT NULL,
                                    is_read BOOLEAN DEFAULT FALSE,
                                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                    FOREIGN KEY (acting_user_id) REFERENCES users(id) ON DELETE CASCADE,
                                                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
                                            )
                                        `, (err) => {
                                            if (err) {
                                                console.error('Error creating notifications table:', err);
                                                return;
                                            }
                                            console.log('Notifications table created or already exists');
                                            
                                            // Create likes table
                        db.query(`
                                    CREATE TABLE IF NOT EXISTS likes (
                                        id INT PRIMARY KEY AUTO_INCREMENT,
                                                    user_id INT NOT NULL,
                                                    post_id INT NOT NULL,
                                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                                                    UNIQUE KEY unique_like (user_id, post_id)
                                                )
                                            `, (err) => {
                                                if (err) {
                                                    console.error('Error creating likes table:', err);
                                                    return;
                                                }
                                                console.log('Likes table created or already exists');
                                                
                                                // Create comments table
                            db.query(`
                                        CREATE TABLE IF NOT EXISTS comments (
                                            id INT PRIMARY KEY AUTO_INCREMENT,
                                                        user_id INT NOT NULL,
                                                        post_id INT NOT NULL,
                                                        content TEXT NOT NULL,
                                                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                                        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
                                                    )
                                                `, (err) => {
                                                    if (err) {
                                                        console.error('Error creating comments table:', err);
                                                        return;
                                                    }
                                                    console.log('Comments table created or already exists');
                                                    
                                                    // Create saved_posts table
                                db.query(`
                                            CREATE TABLE IF NOT EXISTS saved_posts (
                                                id INT PRIMARY KEY AUTO_INCREMENT,
                                                            user_id INT NOT NULL,
                                                            post_id INT NOT NULL,
                                                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                                            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                                                            UNIQUE KEY unique_save (user_id, post_id)
                                                        )
                                                    `, (err) => {
                                                        if (err) {
                                                            console.error('Error creating saved_posts table:', err);
                                                            return;
                                                        }
                                                        console.log('Saved posts table created or already exists');
                                            
                                            // Create followers table
                                    db.query(`
                                                CREATE TABLE IF NOT EXISTS followers (
                                                    id INT PRIMARY KEY AUTO_INCREMENT,
                                                    follower_id INT NOT NULL,
                                                    following_id INT NOT NULL,
                                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                                    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                                                    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
                                                    UNIQUE KEY unique_follow (follower_id, following_id)
                                                )
                                            `, (err) => {
                                                if (err) {
                                                    console.error('Error creating followers table:', err);
                                                    return;
                                                }
                                                console.log('Followers table created or already exists');
                                                
                                                // Insert default themes
                                        db.query(`
                                                    INSERT IGNORE INTO themes (name, primary_color, secondary_color, text_color, accent_color, border_color, background_color)
                                                    VALUES 
                                                    ('light', '#007bff', '#6c757d', '#333', '#28a745', '#dee2e6', '#fff'),
                                                    ('dark', '#0d6efd', '#adb5bd', '#f8f9fa', '#198754', '#495057', '#212529')
                                                `, (err) => {
                                                    if (err) {
                                                        console.error('Error inserting default themes:', err);
                                                        return;
                                                    }
                                                    console.log('Default themes inserted or already exist');
                                                        
                                                        // Start the server after database initialization is complete
                                                        const PORT = process.env.PORT || 3002;
                                                        app.listen(PORT, () => {
                                                            console.log(`Server is running on port ${PORT}`);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        if (req.xhr || req.headers.accept.includes('application/json')) {
        res.status(401).json({ error: 'Not authenticated' });
        } else {
            res.redirect('/login');
        }
    }
};

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.render('login', { title: 'Connect with ultimate social media friends' });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

app.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

// Authentication routes
app.post('/login', (req, res) => {
    const { username_or_email, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? OR email = ?';

    db.query(query, [username_or_email, username_or_email], async (err, results) => {
        if (err || results.length === 0) {
            req.flash('error_msg', 'Invalid credentials');
            return res.redirect('/login');
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            // Fetch user details including profile picture after successful login
            db.query('SELECT id, username, email, profile_picture FROM users WHERE id = ?', [user.id], (err, userDetails) => {
                if (err || userDetails.length === 0) {
                    console.error('Error fetching user details after login:', err);
                    // Proceed with basic session info if fetching full details fails
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email
            };
                } else {
                    req.session.user = {
                        id: userDetails[0].id,
                        username: userDetails[0].username,
                        email: userDetails[0].email,
                        profile_picture: userDetails[0].profile_picture // Include profile picture
                    };
                }
            res.redirect('/dashboard');
            });
        } else {
            req.flash('error_msg', 'Invalid credentials');
            res.redirect('/login');
        }
    });
});

app.post('/register', async (req, res) => {
    const { username, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

    db.query(query, [username, email, hashedPassword], (err, result) => {
        if (err) {
            req.flash('error_msg', 'Registration failed. Username or email already exists.');
            return res.redirect('/register');
        }
        req.flash('success_msg', 'Registration successful! Please login');
        res.redirect('/login');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;

    // Query to fetch posts with media information, user details, and logged-in user's follow status for the post author
    const postsQuery = `
        SELECT p.*, u.username, u.profile_picture,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
        EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = ?) as is_saved,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = p.user_id) as is_following_author,
        m.media_url, m.media_type
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN media m ON p.id = m.post_id
        ORDER BY p.created_at DESC
    `;

    // Query to check for unread notifications
    const unreadNotificationsQuery = 'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE';

    // Execute both queries concurrently
    db.query(postsQuery, [userId, userId, userId], (err, posts) => {
        if (err) {
            console.error('Error fetching posts:', err);
            return res.status(500).render('error', { 
                message: 'Failed to load posts',
                error: { status: 500 }
            });
        }

        db.query(unreadNotificationsQuery, [userId], (err, notificationResults) => {
            if (err) {
                console.error('Error fetching unread notifications count:', err);
                // Continue rendering dashboard with posts but without notification status
                return res.render('dashboard', { 
                    title: 'Dashboard',
                    posts,
                    user: req.session.user,
                    hasNewNotifications: false // Assume no new notifications on error
                });
            }

            const unreadCount = notificationResults[0].unread_count;
            const hasNewNotifications = unreadCount > 0;

        console.log('Rendering dashboard with posts data:', JSON.stringify(posts, null, 2));

        res.render('dashboard', { 
            title: 'Dashboard',
            posts,
                user: req.session.user,
                hasNewNotifications // Pass the status to the template
            });
        });
    });
});

// Update post creation route to handle single file upload with dropdown media type
app.post('/post/create', upload.single('media'), async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        console.log('Received post creation request');
        const { content, mediaType } = req.body; // Get content and selected media type
        const userId = req.session.user.id;
        
        console.log('Post content:', content);
        console.log('User ID:', userId);
        console.log('Selected Media Type:', mediaType);
        console.log('Received file:', req.file);

        let mediaUrl = null;
        let finalMediaType = null;

        // Determine the media URL and type based on uploaded file and selected type
        if (req.file && mediaType !== 'none') {
            mediaUrl = req.file.path; // Cloudinary URL
            // Use selected media type, but fallback to Cloudinary's detection if necessary
            finalMediaType = mediaType === 'image' || mediaType === 'video' ? mediaType : req.file.resource_type;
             // Ensure finalMediaType is lowercase
            if (finalMediaType) finalMediaType = finalMediaType.toLowerCase();
        }

        // Check if at least content or media is provided
        if (!content && !mediaUrl) {
            console.log('No content or media provided');
            req.flash('error_msg', 'Please provide content or upload an image/video.');
            return res.redirect('/dashboard'); // Or render an error page
        }

        // Insert the post first
        const insertPostQuery = `
            INSERT INTO posts (user_id, content, media_url, created_at)
            VALUES (?, ?, ?, NOW())
        `;

        const [result] = await db.promise().query(insertPostQuery, [userId, content || null, mediaUrl]); // Insert null for content if empty
        const postId = result.insertId;

        // If media was uploaded, insert into the media table
        if (mediaUrl && finalMediaType) {
            const insertMediaQuery = `
                INSERT INTO media (user_id, post_id, media_type, media_url, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `;
            await db.promise().query(insertMediaQuery, [userId, postId, finalMediaType, mediaUrl]);
        }

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error creating post:', error);
        // Use req.flash for error messages to be displayed as toasts
        req.flash('error_msg', 'Failed to create post: ' + error.message);
        res.redirect('/dashboard'); // Redirect back to dashboard or a relevant page
    }
});

// Theme toggle route
app.post('/theme/toggle', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { theme } = req.body;
    const themeId = theme === 'dark' ? 2 : 1;

    db.query('UPDATE users SET theme_id = ? WHERE id = ?', [themeId, req.session.user.id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update theme' });
        }
        res.json({ success: true });
    });
});

// Like/Unlike post
app.post('/post/:postId/like', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { postId } = req.params;
    const userId = req.session.user.id;

    db.query('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            // User already liked, so unlike
            db.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId], (err) => {
                if (err) {
                    console.error('Error unliking post:', err);
                    return res.status(500).json({ error: 'Failed to unlike post' });
                }
                // No notification needed for unliking in this case, or could add a subtle toast
                res.json({ liked: false }); // Keep JSON response for frontend JS handling
            });
        } else {
            // User hasn't liked, so like
            db.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId], (err) => {
                if (err) {
                    console.error('Error liking post:', err);
                    return res.status(500).json({ error: 'Failed to like post' });
                }

                // Fetch post owner to send notification
                db.query('SELECT user_id FROM posts WHERE id = ?', [postId], (err, postResults) => {
                    if (err || postResults.length === 0) {
                         console.error('Error fetching post owner for like notification:', err);
                         // Proceed without sending notification if error
                         return res.json({ liked: true });
                    }
                    const postOwnerId = postResults[0].user_id;

                    // Only create notification if the liker is not the post owner
                    if (userId !== postOwnerId) {
                        // Fetch liker's username for the notification message
                        db.query('SELECT username FROM users WHERE id = ?', [userId], (err, userResults) => {
                            if (err || userResults.length === 0) {
                                 console.error('Error fetching liker username for notification:', err);
                                 // Proceed without sending notification if error
                                 return res.json({ liked: true });
                            }
                            const likerUsername = userResults[0].username;
                            const notificationMessage = `${likerUsername} liked your post.`;

                            db.query('INSERT INTO notifications (user_id, acting_user_id, post_id, type, message) VALUES (?, ?, ?, ?, ?)', 
                                [postOwnerId, userId, postId, 'like', notificationMessage], (err) => {
                                if (err) {
                                    console.error('Error creating like notification:', err);
                                }
                                // Still send the like success response even if notification fails
                res.json({ liked: true }); // Keep JSON response for frontend JS handling
                            });
                        });
                    } else {
                         // Liker is the post owner, no notification needed
                         res.json({ liked: true }); // Keep JSON response for frontend JS handling
                    }
                });
            });
        }
    });
});

// Add comment
app.post('/post/:postId/comment', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.session.user.id;

    db.query('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)', 
        [userId, postId, content], 
        (err, result) => {
            if (err) {
                console.error('Error adding comment:', err);
                return res.status(500).json({ error: 'Failed to add comment' });
            }

            // Fetch post owner and commenter username for notification
            db.query('SELECT p.user_id as postOwnerId, u.username as commenterUsername FROM posts p JOIN users u ON u.id = ? WHERE p.id = ?', 
                [userId, postId], (err, results) => {
                if (err || results.length === 0) {
                    console.error('Error fetching post owner or commenter for comment notification:', err);
                    // Continue without sending notification if error
                    return res.json({ comment: { id: result.insertId, user_id: userId, post_id: postId, content: content, created_at: new Date(), username: req.session.user.username } });
                }
                
                const { postOwnerId, commenterUsername } = results[0];

                // Only create notification if the commenter is not the post owner
                if (userId !== postOwnerId) {
                    const notificationMessage = `${commenterUsername} commented on your post.`;

                    db.query('INSERT INTO notifications (user_id, acting_user_id, post_id, type, message) VALUES (?, ?, ?, ?, ?)', 
                        [postOwnerId, userId, postId, 'comment', notificationMessage], (err) => {
                if (err) {
                            console.error('Error creating comment notification:', err);
                        }
                        // Still send the comment success response even if notification fails
                        res.json({ comment: { id: result.insertId, user_id: userId, post_id: postId, content: content, created_at: new Date(), username: commenterUsername } });
                    });
                } else {
                    // Commenter is the post owner, no notification needed
                     res.json({ comment: { id: result.insertId, user_id: userId, post_id: postId, content: content, created_at: new Date(), username: commenterUsername } });
                }
            });
        });
});

// Save/Unsave post
app.post('/post/:postId/save', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { postId } = req.params;
    const userId = req.session.user.id;

    db.query('SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            // User already saved, so unsave
            db.query('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId], (err) => {
                if (err) {
                    console.error('Error unsaving post:', err);
                    return res.status(500).json({ error: 'Failed to unsave post' });
                }
                // No notification needed for unsaving in this case, or could add a subtle toast
                res.json({ saved: false }); // Keep JSON response for frontend JS handling
            });
        } else {
            // User hasn't saved, so save
            db.query('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId], (err) => {
                if (err) {
                     console.error('Error saving post:', err);
                    return res.status(500).json({ error: 'Failed to save post' });
                }

                // Fetch post owner and saving user's username for notification
                db.query('SELECT p.user_id as postOwnerId, u.username as savingUsername FROM posts p JOIN users u ON u.id = ? WHERE p.id = ?', 
                    [userId, postId], (err, results) => {
                    if (err || results.length === 0) {
                        console.error('Error fetching post owner or saving user for save notification:', err);
                        // Continue without sending notification if error
                        return res.json({ saved: true });
                    }

                    const { postOwnerId, savingUsername } = results[0];

                    // Only create notification if the saving user is not the post owner
                    if (userId !== postOwnerId) {
                        const notificationMessage = `${savingUsername} saved your post.`;

                        db.query('INSERT INTO notifications (user_id, acting_user_id, post_id, type, message) VALUES (?, ?, ?, ?, ?)', 
                            [postOwnerId, userId, postId, 'save', notificationMessage], (err) => {
                            if (err) {
                                console.error('Error creating save notification:', err);
                            }
                            // Still send the save success response even if notification fails
                res.json({ saved: true });
                        });
                    } else {
                        // Saving user is the post owner, no notification needed
                        res.json({ saved: true });
                    }
                });
            });
        }
    });
});

// Get post comments
app.get('/post/:postId/comments', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { postId } = req.params;

    const query = `
        SELECT c.*, u.username
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at DESC
    `;

    db.query(query, [postId], (err, comments) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to get comments' });
        }
        res.json({ comments });
    });
});

// Share post
app.post('/post/:id/share', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const postId = req.params.id;
    const userId = req.session.user.id; // User performing the share

    // Fetch post owner and sharing user's username for notification
    db.query('SELECT p.user_id as postOwnerId, u.username as sharingUsername FROM posts p JOIN users u ON u.id = ? WHERE p.id = ?', 
        [userId, postId], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error fetching post owner or sharing user for share notification:', err);
            // Continue without sending notification if error
    const shareLink = `${req.protocol}://${req.get('host')}/post/${postId}`;
            return res.json({ success: true, shareLink });
        }

        const { postOwnerId, sharingUsername } = results[0];

        // Only create notification if the sharing user is not the post owner
        if (userId !== postOwnerId) {
            const notificationMessage = `${sharingUsername} shared your post.`;

            db.query('INSERT INTO notifications (user_id, acting_user_id, post_id, type, message) VALUES (?, ?, ?, ?, ?)', 
                [postOwnerId, userId, postId, 'share', notificationMessage], (err) => {
                if (err) {
                    console.error('Error creating share notification:', err);
                }
                // Still send the share success response even if notification fails
                const shareLink = `${req.protocol}://${req.get('host')}/post/${postId}`;
    res.json({ success: true, shareLink });
            });
        } else {
            // Sharing user is the post owner, no notification needed
            const shareLink = `${req.protocol}://${req.get('host')}/post/${postId}`;
            res.json({ success: true, shareLink });
        }
    });
});

// View shared post
app.get('/post/:id', (req, res) => {
    const postId = req.params.id;
    
    // Query to fetch post with media information
    const query = `
        SELECT p.*, u.username, 
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        m.media_url, m.media_type
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN media m ON p.id = m.post_id
        WHERE p.id = ?
    `;

    db.query(query, [postId], (err, posts) => {
        if (err || posts.length === 0) {
            return res.status(404).render('error', { 
                message: 'Post not found',
                error: { status: 404 }
            });
        }

        const post = posts[0];
        res.render('shared-post', { 
            title: 'Shared Post',
            post,
            isAuthenticated: !!req.session.user
        });
    });
});

// Profile route
app.get('/profile/:userId?', isAuthenticated, async (req, res) => {
    try {
        const profileUserId = req.params.userId || req.session.user.id; // View logged-in user's profile by default
        const loggedInUserId = req.session.user.id;

        // Fetch user details including profile picture
        const [users] = await db.promise().query(
            'SELECT id, username, email, profile_picture FROM users WHERE id = ?',
            [profileUserId]
        );
        const userDetails = users[0];

        if (!userDetails) {
            return res.status(404).render('error', {
                message: 'User not found',
                error: { status: 404 }
            });
        }

        // Fetch follower count
        const [followerCountResult] = await db.promise().query(
            'SELECT COUNT(*) AS follower_count FROM followers WHERE following_id = ?',
            [profileUserId]
        );
        const followerCount = followerCountResult[0].follower_count;

        // Fetch following count
        const [followingCountResult] = await db.promise().query(
            'SELECT COUNT(*) AS following_count FROM followers WHERE follower_id = ?',
            [profileUserId]
        );
        const followingCount = followingCountResult[0].following_count;

        // Check if logged-in user is following the profile user
        const [isFollowingResult] = await db.promise().query(
            'SELECT COUNT(*) AS is_following FROM followers WHERE follower_id = ? AND following_id = ?',
            [loggedInUserId, profileUserId]
        );
        const isFollowing = isFollowingResult[0].is_following > 0;

        // Fetch user's posts
        const [posts] = await db.promise().query(
            `
        SELECT posts.*, (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) as like_count
        FROM posts
        WHERE user_id = ?
        ORDER BY created_at DESC
            `,
            [profileUserId]
        );

        res.render('profile', { 
            profileOwner: userDetails, // Pass profile owner details as profileOwner
            posts, 
            followerCount, 
            followingCount, 
            isFollowing, 
            isOwnProfile: profileUserId == loggedInUserId // Flag to check if viewing own profile
        });
    } catch (err) {
        console.error('Error fetching profile data:', err);
        res.status(500).render('error', {
            message: 'Failed to load profile',
            error: { status: 500 }
        });
    }
});

// Saved posts route
app.get('/saved', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const query = `
        SELECT p.*, u.username
        FROM saved_posts sp
        JOIN posts p ON sp.post_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE sp.user_id = ?
        ORDER BY sp.created_at DESC
    `;
    db.query(query, [req.session.user.id], (err, posts) => {
        if (err) {
            return res.render('saved', { posts: [] });
        }
        res.render('saved', { posts });
    });
});

// TEMPORARY: Delete all comments for the first post (post_id = 1)
app.get('/admin/delete-comments-first-post', (req, res) => {
    db.query('DELETE FROM comments WHERE post_id = 1', (err, result) => {
        if (err) {
            return res.send('Error deleting comments: ' + err.message);
        }
        res.send('All comments for post_id = 1 have been deleted. You can now remove this route.');
    });
});

// Delete a post (only if user is the owner)
app.post('/post/:postId/delete', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const { postId } = req.params;
    const userId = req.session.user.id;
    // Check ownership
    db.query('SELECT * FROM posts WHERE id = ? AND user_id = ?', [postId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }
        // Delete post (will cascade to likes/comments/saved)
        db.query('DELETE FROM posts WHERE id = ?', [postId], (err) => {
            if (err) {
                console.error('Error deleting post:', err);
                // Use req.flash for error messages to be displayed as toasts
                req.flash('error_msg', 'Failed to delete post.');
                return res.status(500).json({ error: 'Failed to delete post' }); // Keep JSON for frontend handling
            }
            // Use req.flash for success message
            req.flash('success_msg', 'Post deleted successfully!');
            res.json({ success: true }); // Keep JSON for frontend handling
        });
    });
});

// Liked posts route
app.get('/liked', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const query = `
        SELECT p.*, u.username,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
        EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = ?) as is_saved
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id IN (SELECT post_id FROM likes WHERE user_id = ?)
        ORDER BY p.created_at DESC
    `;
    db.query(query, [req.session.user.id, req.session.user.id, req.session.user.id], (err, posts) => {
        if (err) {
            return res.render('liked', { posts: [] });
        }
        res.render('liked', { posts });
    });
});

// Commented posts route
app.get('/commented', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const query = `
        SELECT DISTINCT p.*, u.username,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
        EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = ?) as is_saved
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id IN (SELECT post_id FROM comments WHERE user_id = ?)
        ORDER BY p.created_at DESC
    `;
    db.query(query, [req.session.user.id, req.session.user.id, req.session.user.id], (err, posts) => {
        if (err) {
            return res.render('commented', { posts: [] });
        }
        res.render('commented', { posts });
    });
});

// Activity page route
app.get('/activity', isAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const baseQuery = `
        SELECT p.*, u.username,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
        EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = ?) as is_saved
        FROM posts p
        JOIN users u ON p.user_id = u.id
    `;

    // Get saved posts
    const savedQuery = baseQuery + `
        WHERE p.id IN (SELECT post_id FROM saved_posts WHERE user_id = ?)
        ORDER BY p.created_at DESC
    `;

    // Get liked posts
    const likedQuery = baseQuery + `
        WHERE p.id IN (SELECT post_id FROM likes WHERE user_id = ?)
        ORDER BY p.created_at DESC
    `;

    // Get commented posts
    const commentedQuery = baseQuery + `
        WHERE p.id IN (SELECT post_id FROM comments WHERE user_id = ?)
        ORDER BY p.created_at DESC
    `;

    // Execute all queries
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(savedQuery, [userId, userId, userId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(likedQuery, [userId, userId, userId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(commentedQuery, [userId, userId, userId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        })
    ]).then(([savedPosts, likedPosts, commentedPosts]) => {
        res.render('activity', {
            title: 'My Activity',
            savedPosts,
            likedPosts,
            commentedPosts
        });
    }).catch(err => {
        console.error('Error fetching activity:', err);
        res.render('activity', {
            title: 'My Activity',
            savedPosts: [],
            likedPosts: [],
            commentedPosts: []
        });
    });
});

// Follow user
app.post('/user/:userId/follow', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const followedUserId = req.params.userId;
    const followerId = req.session.user.id;

    // Prevent a user from following themselves
    if (followedUserId == followerId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    db.query('SELECT * FROM followers WHERE follower_id = ? AND following_id = ?', [followerId, followedUserId], (err, results) => {
        if (err) {
            console.error('Database error checking follow status:', err);
            // Use req.flash for error message
            req.flash('error_msg', 'Database error checking follow status.');
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            // Already following
            // Use req.flash for info/warning message
            req.flash('error_msg', 'You are already following this user.');
            return res.status(400).json({ error: 'Already following this user' }); // Keep JSON for frontend handling
        } else {
            // Not following, so follow
            db.query('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', [followerId, followedUserId], (err) => {
                if (err) {
                    console.error('Error following user:', err);
                    // Use req.flash for error message
                    req.flash('error_msg', 'Failed to follow user.');
                    return res.status(500).json({ error: 'Failed to follow user' }); // Keep JSON for frontend handling
                }

                // Create notification for the followed user
                db.query('SELECT username FROM users WHERE id = ?', [followerId], (err, userResults) => {
                    if (err || userResults.length === 0) {
                        console.error('Error fetching follower username for notification:', err);
                        // Continue without sending notification if error
                        return res.json({ success: true, following: true });
                    }
                    const followerUsername = userResults[0].username;
                    const notificationMessage = `${followerUsername} started following you.`;

                    db.query('INSERT INTO notifications (user_id, acting_user_id, type, message) VALUES (?, ?, ?, ?)', 
                        [followedUserId, followerId, 'follow', notificationMessage], (err) => {
                        if (err) {
                            console.error('Error creating follow notification:', err);
                        }
                        // Still send the follow success response even if notification fails
                        res.json({ success: true, following: true });
                    });
                });
            });
        }
    });
});

// Unfollow user
app.post('/user/:userId/unfollow', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const followedUserId = req.params.userId;
    const followerId = req.session.user.id;

    db.query('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', [followerId, followedUserId], (err) => {
        if (err) {
            console.error('Error unfollowing user:', err);
            // Use req.flash for error message
            req.flash('error_msg', 'Failed to unfollow user.');
            return res.status(500).json({ error: 'Failed to unfollow user' });
        }
        // No notification needed for unfollowing, or could add a subtle toast
        res.json({ success: true, following: false }); // Keep JSON for frontend handling
    });
});

// Get notifications for the logged-in user
app.get('/api/notifications', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.user.id;

    const query = `
        SELECT n.*, u.username as acting_username
        FROM notifications n
        JOIN users u ON n.acting_user_id = u.id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50
    `;

    db.query(query, [userId], (err, notifications) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
        res.json({ success: true, notifications });
    });
});

// Mark notifications as read for the logged-in user
app.post('/api/notifications/mark-read', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.session.user.id;

    // Mark all unread notifications for this user as read
    const query = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error marking notifications as read:', err);
            return res.status(500).json({ error: 'Failed to mark notifications as read' });
        }
        // Respond with success message or status
        res.json({ success: true, markedCount: result.changedRows });
    });
});

// Profile picture upload route
app.post('/profile/picture', isAuthenticated, (req, res) => {
    upload.single('profilePicture')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            console.error('Multer error uploading profile picture:', err);
            req.flash('error_msg', 'Error uploading file: ' + err.message);
            return res.redirect('/profile'); // Redirect back to profile on Multer error
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('Unknown error uploading profile picture:', err);
            req.flash('error_msg', 'An unknown error occurred during file upload.');
            return res.redirect('/profile'); // Redirect back to profile on other errors
        }

        // Everything went fine with upload, proceed with database update
    try {
        if (!req.file) {
                req.flash('error_msg', 'No file uploaded.');
                return res.redirect('/profile'); // Redirect if no file was provided
        }

            const filePath = req.file.path; // Cloudinary URL

        // Update user's profile picture in database
        const [result] = await db.promise().query(
            'UPDATE users SET profile_picture = ? WHERE id = ?',
            [filePath, req.session.user.id]
        );

        if (result.affectedRows === 0) {
                // This case should ideally not happen if isAuthenticated passes, but good for safety
                console.error('User not found during profile picture update for user ID:', req.session.user.id);
                req.flash('error_msg', 'Error updating profile: user not found.');
                return res.redirect('/profile');
        }

        // Update the user object in the session with the new profile picture path
        req.session.user.profile_picture = filePath;

            req.flash('success_msg', 'Profile picture updated successfully!');
        res.redirect('/profile'); // Redirect back to profile page after successful upload
    } catch (error) {
            console.error('Error updating profile picture in database:', error);
            req.flash('error_msg', 'Failed to update profile picture in database.');
            res.redirect('/profile'); // Redirect back to profile on DB error
    }
    });
});

// User search API endpoint
app.get('/api/search/users', isAuthenticated, async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.json({ users: [] });
        }

        // Search for users by username (case-insensitive and partial match)
        const [users] = await db.promise().query(
            'SELECT id, username, profile_picture FROM users WHERE username LIKE ? LIMIT 10',
            ['%' + searchTerm + '%']
        );

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error searching for users:', error);
        res.status(500).json({ error: 'Failed to search for users' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).render('error', {
        message: 'An error occurred while processing your request',
        error: { status: 500 }
    });
});