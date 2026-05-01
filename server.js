const app = require("./src/app.js");
const config = require("./src/config/config.js");
const { connectDB } = require("./src/config/db.js");
const { startEmailPoller } = require("./src/services/emailPoller.service.js");

connectDB();
startEmailPoller();

app.listen(config.PORT, () => {
    console.log(`Server is running on port: ${config.PORT}`);
});
