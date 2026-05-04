const http = require('http');
const app = require("./src/app.js");
const config = require("./src/config/config.js");
const { connectDB } = require("./src/config/db.js");
const { startEmailPoller } = require("./src/services/emailPoller.service.js");
const socketUtil = require('./src/utils/socket.js');

const { connectRedis } = require("./src/config/redis.js");


if (config.NODE_ENV === 'production') {
  console.log = () => { };
  console.warn = () => { };
}

connectDB();
connectRedis();
startEmailPoller();

const server = http.createServer(app);
socketUtil.init(server);

server.listen(config.PORT, () => {
    console.log(`Server is running on port: ${config.PORT}`);
});
