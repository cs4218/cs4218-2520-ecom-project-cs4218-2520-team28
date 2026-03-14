// Foo Chao, A0272024R
// Extracted logic from server.js to app.js to allow testing of components without starting server
// Done with help of Github Copilot (Claude Sonnet 4.6)
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import app from "./app.js";

// configure env
dotenv.config();

//database config
connectDB();

const PORT = process.env.PORT || 6060;

app.listen(PORT, () => {
    console.log(`Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white);
});