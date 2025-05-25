# Social Media Application

## Description

This project is a web-based social media application built with Node.js, Express, and MySQL. It allows users to register, log in, create and view posts, interact with posts through likes and comments, save posts, follow other users, receive notifications, and manage their profiles including uploading a profile picture. The application utilizes EJS for templating and Cloudinary for media storage.

## Features

- User Authentication (Registration, Login, Logout)
- Create and View Posts (with optional media uploads)
- Like and Unlike Posts
- Add and View Comments
- Save and Unsave Posts
- Follow and Unfollow Users
- User Activity Feed (Saved, Liked, Commented Posts)
- Notifications (Likes, Comments, Follows, Saves)
- User Profiles (View posts, follower/following counts)
- Profile Picture Upload
- Theme Toggling
- User Search

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MySQL (using `mysql2`)
- **Templating:** EJS (Embedded JavaScript templating)
- **Authentication:** `bcryptjs` (for password hashing), `express-session`
- **File Uploads:** `multer`, `multer-storage-cloudinary`
- **Cloud Storage:** Cloudinary
- **Environment Variables:** `dotenv`
- **Deployment:** Vercel

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd Social-Media---Zylo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Database Setup:**
    -   Ensure you have a MySQL database running.
    -   Create the necessary tables using the `schema.sql` file.
    -   You can run the SQL commands manually or use a database management tool.
    -   The `app.js` file also contains logic to create tables if they don't exist on application startup (primarily for development/initial setup).
    -   Apply `add_profile_picture_column.sql` if you are upgrading from an older schema without profile pictures.

4.  **Environment Variables:**
    -   Create a `.env` file in the root directory.
    -   Add the following environment variables:
        ```env
        PORT=3002
        SESSION_SECRET=your_session_secret
        DATABASE_URL=mysql://user:password@host:port/database
        # OR
        MYSQL_URL=mysql://user:password@host:port/database

        CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
        CLOUDINARY_API_KEY=your_cloudinary_api_key
        CLOUDINARY_API_SECRET=your_cloudinary_api_secret
        ```
    -   Replace the placeholder values with your actual database and Cloudinary credentials.

5.  **Run the application:**
    ```bash
    npm start
    ```
    The server should start on the port specified in your `.env` file (default is 3002).

## Deployment on Vercel

This application is configured for deployment on Vercel. The `vercel.json` file handles the routing for the Node.js serverless function (`app.js`) and serves static files from the `public` directory.

Key configurations in `vercel.json`:
-   Uses `@vercel/node` builder for `app.js`.
-   Uses `@vercel/static` builder for files in `public/**`.
-   Routes static assets from `/css/`, `/images/`, `/js/` to their respective locations within `/public/`.
-   Uses the `filesystem` handle to allow Vercel to serve static files efficiently.
-   Routes all other requests to the `app.js` serverless function.

Ensure your environment variables are configured correctly in your Vercel project settings.

## Implemented Fixes and Improvements

Through recent development and debugging, the following issues have been addressed:

-   **Static File Serving:** Updated `vercel.json` to correctly serve static assets (CSS, images, JS) from the `public` directory, resolving 404 errors for these resources.
-   **Authentication Middleware:** Enhanced the `isAuthenticated` middleware in `app.js` to correctly redirect unauthenticated users to the login page for page requests while returning a 401 JSON response for API requests.
-   **Activity Page Authentication:** Ensured the `/activity` route is protected by the `isAuthenticated` middleware, preventing unauthenticated access.
-   **Profile Picture/Post Media Uploads:** Added `webp` to the allowed file formats in the Cloudinary storage configuration in `app.js`, resolving upload failures for `.webp` images.
-   **Improved Profile Picture Upload Error Handling:** Added specific error handling for `multer` in the `/profile/picture` route to provide more informative error messages to the user in case of upload issues.

## Contributing

**Contributor:** Zain (MalikZain555)

## License

Zylo 2025 by MalikZain555 