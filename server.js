
const express = require('express');
const app = express();

// const api = require('./routes/api.route');
var format = require('pg-format');
const pool = require('./db/pgadmin');
// const { auth } = require('express-openid-connect');
// const Zip = require("adm-zip");
// require('dotenv').config();

app.set('view engine', 'ejs');
// to serve static files
app.use(express.static(__dirname));
// da mozemo accessat stvari iz bodya
app.use(express.urlencoded({extended: true}));