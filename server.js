
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
var attributes_narudzbe = ['idnarudzbe', 'idstola', 'idracuna', 'idstatusa', 'opisstatusa']
var attributes_narudzba_id = ['datum', 'ime', 'prezime', 'naziv', 'isvegan', 'kolicina', 'cijena', 'iznos', 'opisstatusa']



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
        attributes: attributes_narudzbe,
        ids: ids,
        // id: result.rows.id
    });
});

app.get('/narudzbe/:id', async (req, res) => {
    var id = req.params.id
    let search_sql = format(`select datum, ime, prezime, naziv, isvegan, kolicina, cijena, iznos, opisstatusa from narudzba
                        inner join racun using(idracuna)
                        inner join racunproizvod using (idracuna)
                        join proizvod using (idproizvoda)
                        inner join statusnarudzbe using (idstatusa)
                        inner join korisnik using(oib)
                        where idnarudzbe = %s`, id)
    var result = await pool.query(search_sql)

    res.render('narudzba', {
        id: id,
        attributes: attributes_narudzba_id,
        rows: result.rows
    })
})

app.post('/narudzbe/:id', async (req, res) => {
    var id = req.params.id
    var searchtext = '%' + req.body.searchterm.toLowerCase() + '%'
    let search_sql = `select datum, ime, prezime, naziv, isvegan, kolicina, cijena, iznos, opisstatusa from narudzba
                        inner join racun using(idracuna)
                        inner join racunproizvod using (idracuna)
                        join proizvod using (idproizvoda)
                        inner join statusnarudzbe using (idstatusa)
                        inner join korisnik using(oib)
                        where idnarudzbe = $1 and lower(naziv) like $2`
    var result = await pool.query(search_sql, [id, searchtext])

    res.render('narudzba', {
        id: id,
        attributes: attributes_narudzba_id,
        rows: result.rows
    })
})

app.listen(3000);