# Insurance AI Assistant

A full-stack web application for intelligent insurance assistance with policy management, claims processing, and AI-powered customer support.

## 🚀 Setup Guide

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- PostgreSQL (v14+)

### Database Setup
```sql
CREATE DATABASE insure_ai_db;
CREATE USER insure_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE insure_ai_db TO insure_user;
```

### Environment Variables

**Backend (.env in backend/nest-backend/)**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=insure_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=insure_ai_db
JWT_SECRET=your_jwt_secret_key_here
PORT=4000
```

**AI Service (.env in backend/ai-service/)**
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=postgresql://insure_user:your_password@localhost:5432/insure_ai_db
PORT=8000
```

**Frontend (.env in frontend/)**
```env
REACT_APP_API_URL=http://localhost:4000
```

### Installation & Running

**Terminal 1 - Backend:**
```bash
cd backend/nest-backend
npm install
npm start
```

**Terminal 2 - AI Service:**
```bash
cd backend/ai-service
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm install
npm start
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- AI Service: http://localhost:8000
- API Docs Backend: http://localhost:4000/api-docs
- API Docs AI Service: http://127.0.0.1:8000/docs

## 📊 Features

### ✅ Current Features
- **User Authentication** - JWT-based login/register with enhanced error handling
- **Policy Management** - card-based UI displaying policy details, status, and payment info
- **Claims Processing** - View and manage insurance claims with status tracking
- **AI Assistant** - Natural language chat for insurance queries and document processing
- **Document Upload** - PDF processing and analysis capabilities
- **Responsive Design** - Modern, mobile-friendly interface
- **Error Handling** - Comprehensive validation and user-friendly error messages
- **API Documentation** - Swagger/OpenAPI documentation

### 🔧 Tech Stack
- **Frontend:** React 19, TypeScript, JWT Auth, Axios
- **Backend:** NestJS, PostgreSQL, TypeORM, Swagger
- **AI Service:** FastAPI, LangChain, OpenAI, pgvector
