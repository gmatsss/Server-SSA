# SSA Backend Server

The SSA backend server is a Node.js and Express-based application that provides API endpoints, user authentication, file uploads, and database connectivity. It leverages MongoDB for data storage and integrates key technologies for handling sessions, routing, and middleware.

## Technologies Used

- **Node.js**: JavaScript runtime environment for building the server.
- **Express.js**: Web framework for routing and middleware.
- **MongoDB**: NoSQL database for data storage.
- **Mongoose**: ODM for MongoDB to simplify database interactions.
- **Passport.js**: Authentication middleware for user sessions.
- **express-session**: Session handling for users.
- **connect-mongo**: Session store in MongoDB.
- **CORS**: Cross-origin resource sharing for secure API access.
- **Morgan**: HTTP request logger for debugging.
- **dotenv**: Load environment variables from `.env` file.
- **express-fileupload**: Middleware for file uploads.
- **NGINX**: Reverse proxy for serving the backend on production.
- **AWS EC2**: Hosting environment for the production server.

## How It Works

1. **CORS Configuration**:
   The server restricts requests to specific allowed origins for enhanced security.

   - Allowed Origins include local development and production URLs:
     - `http://localhost:3000`, `https://supersmartagents.com`, etc.

2. **MongoDB Connection**:
   The server connects to MongoDB using credentials stored in the `.env` file.

   - Key environment variable:
     ```
     MONGO_URI=<Your MongoDB Connection String>
     ```
   - Connection includes connection pooling for efficient resource management.

3. **Session Management**:

   - Sessions are stored in MongoDB using `connect-mongo`.
   - Session configuration uses secure cookies in production.

4. **Routes**:

   - **`/`**: Test routes.
   - **`/User`**: User-related routes.
   - **`/retune`**: Retune-related API.
   - **`/moonclerk`**: Moonclerk payment routes.
   - **`/bot`**: Bot management routes.
   - **`/Admin`**: Admin dashboard routes.
   - **`/twilio`**: Twilio integration routes.

5. **Passport Authentication**:

   - Passport.js is initialized for user login sessions.
   - Middleware manages protected routes and user state.

6. **File Uploads**:

   - `express-fileupload` handles file uploads with a size limit of 50MB.

7. **Logging**:

   - Morgan logs HTTP requests for debugging purposes.

8. **Production Deployment**:

   - The server is hosted on an **AWS EC2** instance.
   - **NGINX** is used as a reverse proxy to forward requests to the Node.js server.
   - **Production Link**: [https://node.customadesign.info/SSA/](https://node.customadesign.info/SSA/)

   - **NGINX Configuration Example**:

     ```nginx
     server {
         listen 80;
         server_name node.customadesign.info;

         location /SSA/ {
             proxy_pass http://localhost:8001/;
             proxy_http_version 1.1;
             proxy_set_header Upgrade $http_upgrade;
             proxy_set_header Connection 'upgrade';
             proxy_set_header Host $host;
             proxy_cache_bypass $http_upgrade;
         }
     }
     ```

## How to Run Locally

### Prerequisites

- Node.js installed
- MongoDB instance (local or cloud)
- `.env` file with environment variables:
  ```
  MONGO_URI=<Your MongoDB Connection String>
  PORT=8001
  NODE_ENV=development
  ```

### Steps to Run

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-repo/SSA-server.git
   cd SSA-server
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Start the Server**:

   ```bash
   npm start
   ```

   - By default, the server will run on `http://localhost:8001`.

4. **Test API Endpoints**:
   - Use Postman or any API client to test endpoints like:
     - `GET http://localhost:8001/User`
     - `POST http://localhost:8001/retune`

## Key Features

- **Secure Sessions** with MongoDB.
- **Dynamic Routing** for modular API design.
- **File Uploads** with size restrictions.
- **Environment Configuration** for flexible deployments.
- **Cross-Origin Access** with CORS setup.
- **Database Management** with Mongoose ODM.
- **Production Deployment** with AWS EC2 and NGINX.
