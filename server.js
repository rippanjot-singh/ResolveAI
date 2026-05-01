const app = require("./src/app.js");
const config = require("./src/config/config.js");
const { connectDB } = require("./src/config/db.js");

connectDB();

app.listen(config.PORT, () => {
    console.log(`Server is running on port: ${config.PORT}`);
});
