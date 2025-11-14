# Project Management Dashboard

A full-stack MERN web application for managing and tracking projects with stage-based progress monitoring.

## 🚀 Features

- **Dashboard View**: View all projects in a responsive table with search functionality
- **Project Management**: Add new projects with automatic stage assignment
- **Stage Tracking**: Update project stages with status (Yet to Start, In Progress, Completed, Delayed)
- **Progress Calculation**: Automatic progress percentage calculation based on completed stage weights
- **Status Summary**: Visual status indicators with color coding
- **Dashboard Statistics**: Summary cards showing total, completed, in-progress, and delayed projects

## 🛠 Tech Stack

- **Frontend**: React.js + Tailwind CSS + React Router
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose ORM)
- **API Calls**: Axios
- **Notifications**: React Toastify

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
MONGO_URI=mongodb://localhost:27017/project-management
PORT=5000
```

4. Start the backend server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Or:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000` and the backend on `http://localhost:5000`.

## 📁 Project Structure

```
Project_status/
├── backend/
│   ├── models/
│   │   └── Project.js          # Project schema and model
│   ├── routes/
│   │   └── projectRoutes.js    # API routes
│   ├── server.js               # Express server setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── projectAPI.js   # Axios API functions
│   │   ├── components/
│   │   │   ├── ProjectTable.jsx      # Project table component
│   │   │   └── EditStatusModal.jsx   # Modal for editing stages
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx       # Dashboard page
│   │   │   └── AddProjectPage.jsx    # Add project form
│   │   ├── App.js              # Main app component with routing
│   │   └── index.js            # Entry point
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### GET /api/projects
Fetch all projects

### GET /api/projects/:id
Fetch a single project by ID

### POST /api/projects
Create a new project
- Automatically generates Project ID (PRJ001, PRJ002, etc.)
- Automatically assigns default stages

### PATCH /api/projects/:id/stages
Update project stages and dates

## 📊 Default Project Stages

When a new project is created, the following stages are automatically assigned:

1. **Concept** (Weight: 10%)
2. **Business case approval** (Weight: 5%)
3. **IT Infra and security** (Weight: 15%)
4. **Vendor onboarding** (Weight: 5%)
5. **Execution & Delivery** (Weight: 55%)
6. **UAT** (Weight: 5%)
7. **Go-Live and support** (Weight: 5%)

## 🎨 Status Colors

- 🟢 **Completed**: Green
- 🟡 **In Progress**: Yellow
- 🔴 **Delayed**: Red
- ⚪ **Yet to Start**: Gray

## 📝 Usage

1. **View Projects**: The dashboard displays all projects with their progress and status
2. **Search Projects**: Use the search bar to filter by Project ID or Project Name
3. **Add Project**: Click "Add New Project" to create a new project
4. **Edit Status**: Click "Edit Status" on any project to update stage statuses and dates
5. **Track Progress**: Progress percentage is automatically calculated based on completed stage weights

## 🔧 Configuration

### MongoDB Connection

Update the `MONGO_URI` in the backend `.env` file:
- Local: `mongodb://localhost:27017/project-management`
- MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/project-management`

## 📄 License

ISC

## 👨‍💻 Author

Jagan

