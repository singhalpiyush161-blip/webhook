const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/sensor-data', (req, res) => {
  const { pressure, temperature, humidity } = req.body;
  console.log('Received sensor data:', pressure, temperature, humidity);
  // Process the received sensor data as needed
  res.sendStatus(200);
});

module.exports = app;
