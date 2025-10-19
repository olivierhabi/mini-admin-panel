# Mini admin panel

## Tech Stack

### Backend
- **NestJS** 
- **Prisma**
- **SQLite**

### Frontend
- **Next.js**

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **npm** or **yarn** package manager
- **Git**

## Setup & Installation

### 1. Backend Setup

Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
```

Update the `.env` file with your configuration:
```env
DATABASE_URL="file:./dev.db"
PORT=3001
```

#### Initialize Database

Run Prisma migrations to set up the database schema:
```bash
npx prisma migrate dev
```

#### Generate Prisma Client
```bash
npx prisma generate
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:
```bash
cd ../frontend
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `frontend` directory:
```bash
cp .env.example .env
```

Update the `.env` file:
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
```

## Running the Application

### Development Mode

You'll need two terminal windows/tabs to run both servers simultaneously.

#### Terminal 1 - Backend Server
```bash
cd backend
npm run start:dev
```

The backend API will be available at `http://localhost:3001`

#### Terminal 2 - Frontend Server
```bash
cd frontend
npm run dev
```

The frontend application will be available at `http://localhost:3000`

### Production Build

#### Backend
```bash
cd backend
npm run build
npm run start:prod
```

#### Frontend
```bash
cd frontend
npm run build
npm run start
```

## Available Scripts

### Backend

- `npm run start:dev` - Start development server with hot-reload
- `npm run start:prod` - Start production server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Management

### View Database

Use Prisma Studio to view and edit your database:
```bash
cd backend
npx prisma studio
```

This opens a GUI at `http://localhost:5555`


## Project Structure
```
.
├── backend/
│   ├── proto/
│   │   └── users.proto
│   ├── keys/
│   │   ├── private.pem
│   │   └── public.pem
│   ├── src/
│   │   ├── modules/
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── app/
    ├── components/
    ├── public/
    │   ├── keys/
    │   │   └── public.pem
    │   └── protos/
    │       └── users.proto
    ├── package.json
    └── .env
```

## API Endpoints

### Users API

Base URL: `/users`

#### 1. Create User
- **Endpoint:** `POST /users`
- **Description:** Creates a new user in the system
- **Request Body:**
```typescript
  {
    email: string;
    role: "ADMIN" | "USER";
    status: "ACTIVE" | "INACTIVE";
  }
```
- **Response:** Returns the created user object
- **Example:**
```bash
  curl -X POST http://localhost:3001/users \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","role":"USER","status":"ACTIVE"}'
```

#### 2. Get All Users
- **Endpoint:** `GET /users`
- **Description:** Retrieves a list of all users
- **Response:** Array of user objects
- **Example:**
```bash
  curl http://localhost:3001/users
```

#### 3. Get User by ID
- **Endpoint:** `GET /users/:id`
- **Description:** Retrieves a specific user by their ID
- **Parameters:**
  - `id` (path parameter) - User ID (number)
- **Response:** User object
- **Example:**
```bash
  curl http://localhost:3001/users/1
```

#### 4. Get Users Statistics
- **Endpoint:** `GET /users/stats`
- **Description:** Retrieves user registration statistics per day
- **Response:** Statistics data grouped by day
- **Example:**
```bash
  curl http://localhost:3001/users/stats
```

#### 5. Export Users (Protocol Buffers)
- **Endpoint:** `GET /users/export`
- **Description:** Exports all users in Protocol Buffers binary format
- **Response Headers:**
  - `Content-Type: application/octet-stream`
- **Response:** Binary data encoded using Protocol Buffers

- **Example:**
```bash
  curl http://localhost:3000/users/export
```

#### 6. Update User
- **Endpoint:** `PATCH /users/:id`
- **Description:** Updates an existing user's information
- **Parameters:**
  - `id` (path parameter) - User ID (number)
- **Request Body:**
```typescript
  {
    email?: string;
    role?: "ADMIN" | "USER";
    status?: "ACTIVE" | "INACTIVE";
  }
```
- **Response:** Updated user object
- **Example:**
```bash
  curl -X PATCH http://localhost:3000/users/1 \
    -H "Content-Type: application/json" \
    -d '{"status":"INACTIVE"}'
```

#### 7. Delete User
- **Endpoint:** `DELETE /users/:id`
- **Description:** Deletes a user from the system
- **Parameters:**
  - `id` (path parameter) - User ID (number)
- **Response:** Confirmation of deletion
- **Example:**
```bash
  curl -X DELETE http://localhost:3000/users/1
```

### Response Schema

**User Object:**
```typescript
{
  id: number;
  email: string;
  role: "ADMIN" | "USER";
  status: "ACTIVE" | "INACTIVE";
  emailHash: string;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Error Responses

All endpoints may return the following error responses:

- `400 Bad Request` - Invalid input data
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

## Notes

- **Database**: The project uses SQLite for simplicity. The database file (`dev.db`) is created automatically in the `backend/prisma` directory on first migration.

- **Protocol Buffers Export**: The `/users/export` endpoint returns user data in Protocol Buffers binary format instead of JSON. To decode this data on the frontend:
  1. The `users.proto` file must be present in `frontend/public/protos/`
  2. Use a Protocol Buffers library (e.g., `protobufjs`) to load and decode the binary data
  3. The proto file defines the message structure that matches the exported data format

- **Email Hashing and Signing**: When creating a user via the `POST /users` endpoint:
  1. The email is hashed using SHA-384 algorithm to create a unique `emailHash`
  2. This hash is then signed using RSA with the backend's private key (`backend/keys/private.pem`)
  3. The resulting `signature` is stored with the user record
  4. This signature can be verified on the frontend using the public key (`frontend/public/keys/public.pem`)
  5. This ensures data integrity and authenticity - the frontend can verify that the email hash was genuinely created by the backend

- **Cryptographic Keys**: 
  - The backend uses a private RSA key to sign email hashes
  - The frontend uses the corresponding public key to verify signatures
  - Keep `private.pem` secure and never expose it to the frontend
  - Only `public.pem` should be accessible to the frontend for verification purposes

- **Verification Flow**:
```
  Backend:  email → SHA-384 hash → RSA sign with private key → signature
  Frontend: emailHash + signature → RSA verify with public key → valid/invalid
```
