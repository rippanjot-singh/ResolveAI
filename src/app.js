const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes.js');
const aiRoutes = require('./routes/ai.routes.js');
const chatbotRoutes = require('./routes/chatbot.routes.js');
const ticketRoutes = require('./routes/ticket.routes.js');
const chatRoutes = require('./routes/chat.routes.js');
const formRoutes = require('./routes/form.routes.js');
const userRoutes = require('./routes/user.routes.js');
const dashboardRoutes = require('./routes/dashboard.routes.js');
const notionRoutes = require('./routes/notion.routes.js');
const analyticsRoutes = require('./routes/analytics.routes.js');
const leadRoutes = require('./routes/lead.routes.js');
const emailRoutes = require('./routes/email.routes.js');
const googleRoutes = require('./routes/google.routes.js');
const path = require('path');

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        return callback(null, origin);
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/ticket', ticketRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/form', formRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notion', notionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/google', googleRoutes);

app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/widget", express.static(path.join(__dirname, "..", "widget")));

app.get("*name", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});


module.exports = app;