
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
var attributes_narudzba = ['idnarudzbe', 'idstola', 'idracuna', 'idstatusa', 'opisstatusa']


app.get('/narudzbe', async (req, res) => {
    let search_sql = `select * from narudzba inner join statusnarudzbe using (idstatusa)`
    let ids_sql = `select idnarudzbe from narudzba`
    var result = await pool.query(search_sql)
    var ids_old = await pool.query(ids_sql)
    var ids = []

    for (id of ids_old.rows) {
        ids.push(id.idnarudzbe)
    }
    console.log(ids)

    res.render('index', {
        text: 'test',
        rows: result.rows,
        attributes: attributes_narudzba,
        ids: ids,
        // id: result.rows.id
    });
});

app.get('/narudzbe/:id', (req, res) => {
    res.render('nestatic')
})

app.listen(3000);