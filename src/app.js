const express = require("express");

const app = express();

// this will only handle get calls to /user with parameters userId, name, and password changes
app.get("/user/:userId/:name/:password", (req, res) => {
  console.log(req.params);
  res.send({ firstName: "John", lastName: "Doe" });
});

app.listen(7777, () => {
  console.log("Server is running on port 7777");
});
