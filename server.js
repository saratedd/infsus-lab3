
const express = require('express');
const app = express();

var format = require('pg-format');
const pool = require('./db/pgadmin');


app.set('view engine', 'ejs');
// to serve static files
app.use(express.static(__dirname));
// da mozemo accessat stvari iz bodya
app.use(express.urlencoded({extended: true}));


var attributes_korisnik = ['oib', 'ime', 'prezime', 'email', 'opiszaduzenja']
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
    });
})

/** list of users */
app.get('/korisnici', async (req, res) => {
    let search_sql = ` select oib, ime, prezime, email, opiszaduzenja from korisnik inner join zaduzenje using(idzaduzenja)`

    let searchText = req.query.searchText;
    if(searchText) {
        // modify sql
    }

    var result = await pool.query(search_sql);

    // <table>
    res.render('users', {
        attributes: attributes_korisnik,
        rows: result.rows,
    });
})

/** new user */
app.get('/korisnici/add', async (req, res) => {
    // <form>
    res.render('user', {
        attributes: attributes_korisnik,
        user: {
            oib: null,
            name: null,
            surname: null,
            email: null,
            password: null,
            job: null,
        },
        error : {
            errorName: null,
            errorSurname: null,
            errorEmail: null,
            errorPassword: null,
            errorJob: null,
            errorOib: null,
        },
        isEdit: false,
    })
})

/** edit user */
app.get('/korisnici/:oib', async (req, res) => {
    let search_sql = `select * from korisnik inner join zaduzenje using(idzaduzenja) where oib = $1`
    var result = await pool.query(search_sql, [req.params.oib])
    console.log(result.rows[0]);
    // <form>
    res.render('user', {
        attributes: attributes_korisnik,
        user: {
            oib: req.params.oib,
            name: result.rows[0].ime,
            surname: result.rows[0].prezime,
            email: result.rows[0].email,
            password: result.rows[0].lozinka,
            job: result.rows[0].opiszaduzenja,
        },
        error : {
            errorName: null,
            errorSurname: null,
            errorEmail: null,
            errorPassword: null,
            errorJob: null,
            errorOib: null,
        },
        isEdit: true,
    })
})

/** save new/old user */
app.post('/korisnici', async (req, res) => {
    console.log(req.body);
    // detected validation error (bad oib and so on)
    let error = {};

    // check oib
    if (!req.body.oib) {
        error.oib = 'OIB je obavezan';
    } else if (req.body.oib.length !== 11 || isNaN(req.body.oib)) {
        error.oib = 'OIB mora imati 11 znamenki';
    } /*else {
        // check if oib exists in db
        let search_sql = `select oib from korisnik where oib = $1`
        let result = await pool.query(search_sql, [req.body.oib])
        if (result.rows.length > 0) {
            error.oib = 'OIB već postoji';
        }
    }*/

    // check name
    if (!req.body.name) {
        error.name = 'Ime je obavezno';
    }

    // check surname
    if (!req.body.surname) {
        error.surname = 'Prezime je obavezno';
    }

    // check email
    if (!req.body.email) {
        error.email = 'Email je obavezan';
    }

    // check password
    if (!req.body.password) {
        error.password = 'Lozinka je obavezna';
    }

    // check job
    if (!req.body.job) {
        error.job = 'Zaduženje je obavezno';
    }

    // if not empty error object
    if (Object.keys(error).length > 0) {
        // <form>
        res.render('user', {
            attributes: attributes_korisnik,
            user: req.body,
            error: {
                user: req.body,
                errorOib: error.oib,
                errorName: error.name,
                errorSurname: error.surname,
                errorEmail: error.email,
                errorPassword: error.password,
                errorJob: error.job,
            },
            isEdit: false,
        });
        return;
    }

    // insert into zaduzenje
    let select_sql = `select idzaduzenja from zaduzenje where opiszaduzenja = $1`
    let jobId = await pool.query(select_sql, [req.body.job]);

    if (jobId.rows.length === 0) {
        jobId = Math.floor(Math.random() * 1000000000);
        let insert_sql = `insert into zaduzenje (idZaduzenja, opiszaduzenja) values ($1, $2)`
        await pool.query(insert_sql, [jobId, req.body.job]);
    } else {
        jobId = jobId.rows[0].idzaduzenja;
    }

    let search_sql = `select oib from korisnik where oib = $1`
    let result = await pool.query(search_sql, [req.body.oib])
    if (result.rows.length > 0) {
        // update db
        let update_sql = `update korisnik set ime = $1, prezime = $2, email = $3, lozinka = $4, idzaduzenja = $5, isadmin = $6 where oib = $7`
        await pool.query(update_sql, [req.body.name, req.body.surname, req.body.email, req.body.password, jobId, 0, req.body.oib]);
    } else {
        // insert into db
        let insert_sql = `insert into korisnik (oib, ime, prezime, email, lozinka, idzaduzenja, isadmin) values ($1, $2, $3, $4, $5, $6, $7)`
        await pool.query(insert_sql, [req.body.oib, req.body.name, req.body.surname, req.body.email, req.body.password, jobId, 0]);
    }

    // redirect
    res.redirect(`/korisnici/${req.body.oib}`); // HTTP 303 See Other: https://en.wikipedia.org/wiki/HTTP_303
});



app.listen(3000);