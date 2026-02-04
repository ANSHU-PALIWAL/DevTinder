const express = require("express");

const app = express();

app.use("/user", (req, res, next) => {
  res.send("mdsnfb");
});

// this will only handle get calls to /user
app.get("/user", (req, res) => {
  res.send({ firstName: "John", lastName: "Doe" });
});

app.post("/user", (req, res) => {
  // Saving data to DB
  res.send("Data successfully Saved to Database");
});

app.delete("/user", (req, res) => {
  // Deleting data from DB
  res.send("Data successfully Deleted from Database");
});

// this will match all the http method api calls tp /test
app.use("/test", (req, res) => {
  res.send("Hello from the test server");
});

app.listen(7777, () => {
  console.log("Server is running on port 7777");
});
