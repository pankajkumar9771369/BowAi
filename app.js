const express = require('express');
const mongoose = require('mongoose');
const ejsMate = require("ejs-mate");
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
const path = require('path');

const errorHandler = require('./utils/errorHandler');
// Import models
const User = require('./models/User');
const Project = require('./models/Project');
const ProjectFile = require('./models/ProjectFile');
const ChatHistory = require('./models/ChatHistory');
const authMiddleware = require('./middlewares/auth');



// Import routes
const userRoutes = require('./routes/user');
const projectRoutes = require('./routes/project');
const projectfileRoutes = require('./routes/projectfile');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes=require("./routes/aiRoutes")
// Middleware
app.use(express.static('public'));

app.use(express.json());
app.set('views', path.join(__dirname, 'views'));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
// Set view engine to EJS
app.set('view engine', 'ejs')

dotenv.config();
// In your backend app.js
// app.use(cors({
//     origin: 'http://localhost:5173', // Your frontend URL
//     credentials: true // If you're using cookies/sessions
//   }));
// MongoDB connection
console.log(process.env.MONGO_URI);
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));


// Routes
app.use('/api/auth', userRoutes);
app.use('/api/projects',projectRoutes);
app.use('/api/files',projectfileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai',aiRoutes);


// Error handling middleware

// Error Handling
app.use(errorHandler.handleAIError);
app.use(errorHandler.handleCodeError);
app.use(errorHandler.genericError);
app.get("/",authMiddleware,(req,res)=>{
  res.render("index")
})
 app.get("/login",(req,res)=>{
  res.render("auth")
 })
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});