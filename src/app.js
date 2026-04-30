const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes.js');
const aiRoutes = require('./routes/ai.routes.js');
const chatbotRoutes = require('./routes/chatbot.routes.js');
const ticketRoutes = require('./routes/ticket.routes.js');
const chatRoutes = require('./routes/chat.routes.js');
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

app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/widget", express.static(path.join(__dirname, "..", "widget")));

// app.get("*name", (req, res) => {
//     res.sendFile(path.join(__dirname, "..", "public", "index.html"));
// });

app.use('/api/auth', authRoutes)
app.use('/api/ai', aiRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/ticket', ticketRoutes);
app.use('/api/chat', chatRoutes);

module.exports = app;