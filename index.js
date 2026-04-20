const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello Node + Express 🚀');
});


app.get('/about', (req , res) =>{
    res.send("this is about page")
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});