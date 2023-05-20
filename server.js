
const express = require('express');
const app = express();

var format = require('pg-format');
const pool = require('./db/pgadmin');


app.set('view engine', 'ejs');
// to serve static files
app.use(express.static(__dirname));
// da mozemo accessat stvari iz bodya
app.use(express.urlencoded({extended: true}));


var attributes_korisnik = ['oib', 'isadmin', 'ime', 'prezime', 'email', 'lozinka', 'idzaduzenja']
var attributes_narudzba = ['idnarudzbe', 'idstola', 'idracuna', 'idstatusa']


app.get('/', async (req, res) => {
    let search = `select * from narudzba`
    var result = await pool.query(search)

    res.render('index', {
        text: 'test',
        rows: result.rows,
        attributes: attributes_narudzba,
    });
});


app.listen(3000);