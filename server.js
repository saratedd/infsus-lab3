const express = require('express');
const app = express();

const format = require('pg-format');
const pool = require('./db/pgadmin');


app.set('view engine', 'ejs');
// to serve static files
app.use(express.static(__dirname));
// da mozemo accessat stvari iz bodya
app.use(express.urlencoded({extended: true}));


const attributes_korisnik = ['oib', 'ime', 'prezime', 'email', 'opiszaduzenja'];
const attributes_narudzbe = ['idnarudzbe', 'idstola', 'datum', 'opisstatusa'];
const attributes_narudzba_id = ['datum', 'ime', 'prezime', 'naziv', 'isvegan', 'kolicina', 'cijena', 'iznos', 'opisstatusa'];


app.get('/', async (req, res) => {
    res.render('index', {})
})

app.get('/narudzbe', async (req, res) => {
    let search_sql = `select * from narudzba inner join statusnarudzbe using (idstatusa) inner join racun using (idracuna)`
    const result = await pool.query(search_sql);

    res.render('orders', {
        rows: result.rows,
        attributes: attributes_narudzbe,
    });
});

/** new order */
app.get('/narudzbe/add', async (req, res) => {
    let search_users_sql = `select * from korisnik`
    const users_result = await pool.query(search_users_sql);

    res.render('order', {
        order: {
            id: null,
            table: null,
            status: null,
        },
        users: users_result.rows,
        error: {},
        isEdit: false,
    });
});

/** edit order */
app.get('/narudzbe/:id', async (req, res) => {
    let search_sql = `select * from narudzba inner join statusnarudzbe using (idstatusa) inner join racun using (idracuna) where idnarudzbe = $1`
    const result = await pool.query(search_sql, [req.params.id]);
    console.log(result.rows)
    if(!result.rows.length) {
        res.status(404).send('Not found');
        return;
    }

    let search_users_sql = `select * from korisnik`
    const users_result = await pool.query(search_users_sql);

    res.render('order', {
        order: {
            id: result.rows[0].idnarudzbe,
            table: result.rows[0].idstola,
            status: result.rows[0].opisstatusa,
            user: result.rows[0].oib,
        },
        users: users_result.rows,
        error: {},
        isEdit: true,
    });
});
/*
app.get('/narudzbe/:id', async (req, res) => {
    const id = req.params.id;
    let search_sql = format(`select datum, ime, prezime, naziv, isvegan, kolicina, cijena, iznos, opisstatusa from narudzba
                        inner join racun using(idracuna)
                        inner join racunproizvod using (idracuna)
                        join proizvod using (idproizvoda)
                        inner join statusnarudzbe using (idstatusa)
                        inner join korisnik using(oib)
                        where idnarudzbe = %s`, id)
    const result = await pool.query(search_sql);

    res.render('order', {
        id: id,
        attributes: attributes_narudzba_id,
        rows: result.rows
    })
})
*/

/** save new/old order */
app.post('/narudzbe', async (req, res) => {
    console.log(req.body);
    let search_users_sql = `select * from korisnik`
    const users_result = await pool.query(search_users_sql);

    let error = {};

    // check if table exists
    if (!req.body.table) {
        error.table = 'Broj stola mora biti odabran';
    } else if (isNaN(req.body.table)) {
        error.table = 'Broj stola mora biti broj';
    }

    // check if status exists
    if (!req.body.status) {
        error.status = 'Status mora biti odabran';
    }

    // check if user exists
    if (!req.body.user) {
        error.user = 'Korisnik mora biti odabran';
    }

    if (Object.keys(error).length) {
        res.render('order', {
            attributes: attributes_narudzba_id,
            error: error,
            order: req.body,
            users: users_result.rows,
            isEdit: false,
        });
        return;
    }

    // insert status if opisstatusa doesn't exist
    let statusId;
    let sql_check_status = `select idstatusa from statusnarudzbe where opisstatusa = $1`
    const check_status_result = await pool.query(sql_check_status, [req.body.status]);
    if (!check_status_result.rows.length) {
        let sql_insert_status = `insert into statusnarudzbe (idstatusa, opisstatusa) values ($1, $2)`
        statusId = Math.floor(Math.random() * 1000000000);
        await pool.query(sql_insert_status, [statusId, req.body.status]);
    } else {
        statusId = check_status_result.rows[0].idstatusa;
    }

    // insert idstola if idstola doesn't exist
    let sql_check_table = `select * from stol where idstola = $1`
    const check_table_result = await pool.query(sql_check_table, [req.body.table]);
    if (!check_table_result.rows.length) {
        let sql_insert_table = `insert into stol (idstola) values ($1)`
        await pool.query(sql_insert_table, [req.body.table]);
    }

    if (req.body.isEdit === 'true') {
        let update_sql = `update narudzba set idstola = $1, idstatusa = $2 where idnarudzbe = $3`
        await pool.query(update_sql, [req.body.table, statusId, req.body.id]);
    } else {
        let racunId = Math.floor(Math.random() * 1000000000);
        let insert_racun_sql = `insert into racun (idracuna, iznos, datum, oib) values ($1, $2, $3, $4)`
        await pool.query(insert_racun_sql, [racunId, 0, new Date(), req.body.user]);

        let insert_sql = `insert into narudzba (idnarudzbe, idstola, idstatusa, idracuna) values ($1, $2, $3, $4)`
        await pool.query(insert_sql, [req.body.id, req.body.table, statusId, racunId]);
    }


    res.redirect(`/narudzbe/${req.body.id}`);
})

/** delete order */
app.post('/narudzbe/:id/delete', async (req, res) => {
    let sql_get_racunid = `select idracuna from narudzba where idnarudzbe = $1`
    const racun_result = await pool.query(sql_get_racunid, [req.params.id]);

    let delete_sql = `delete from narudzba where idnarudzbe = $1`
    await pool.query(delete_sql, [req.params.id]);

    // delete racun
    let delete_racun_sql = `delete from racun where idracuna = $1`
    await pool.query(delete_racun_sql, [racun_result.rows[0].idracuna]);

    res.redirect('/narudzbe');
});

/** list of users */
app.get('/korisnici', async (req, res) => {
    let search_sql = ` select oib, ime, prezime, email, opiszaduzenja from korisnik inner join zaduzenje using(idzaduzenja)`
    let result = await pool.query(search_sql)

    let searchText = req.query.searchText;
    let result_rows = []
    if (searchText) {
        for (let row of result.rows) {
            if (row.ime.toLowerCase().includes(searchText.toLowerCase()) ||
                row.prezime.toLowerCase().includes(searchText.toLowerCase()) ||
                row.email.toLowerCase().includes(searchText.toLowerCase()) ||
                row.opiszaduzenja.toLowerCase().includes(searchText.toLowerCase())) {
                result_rows.push(row)
            }
        }
    } else {
        result_rows = result.rows
    }

    // <table>
    res.render('users', {
        attributes: attributes_korisnik,
        rows: result_rows,
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
        error: {},
        isEdit: false,
    })
})

/** edit user */
app.get('/korisnici/:oib', async (req, res) => {
    let search_sql = `select * from korisnik inner join zaduzenje using(idzaduzenja) where oib = $1`
    const result = await pool.query(search_sql, [req.params.oib]);
    if (!result.rows.length) {
        res.status(404).send('Not found');
        return;
    }
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
        error: {},
        isEdit: true,
    })
})

/** save new/old user */
app.post('/korisnici', async (req, res) => {
    console.log(req.body);
    // detected validation error (bad oib and so on)
    let error = {};
    let oibExists = false;

    // check oib
    if (!req.body.oib) {
        error.oib = 'OIB je obavezan';
    } else if (req.body.oib.length !== 11 || isNaN(req.body.oib)) {
        error.oib = 'OIB mora imati 11 znamenki';
    } else {
        // check if oib exists in db
        let search_sql = `select oib from korisnik where oib = $1`
        let result = await pool.query(search_sql, [req.body.oib])
        if (result.rows.length > 0) {
            oibExists = true;
            if (!req.body.isEdit) {
                error.oib = 'OIB već postoji';
            }
        }
    }

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
        if (!req.body.isEdit) {
            error.password = 'Lozinka je obavezna';
        }
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
            error: error,
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

    if (oibExists && req.body.isEdit === 'true') {
        if (!req.body.password) {
            // update db
            let update_sql = `update korisnik set ime = $1, prezime = $2, email = $3, idzaduzenja = $4, isadmin = $5 where oib = $6`
            await pool.query(update_sql, [req.body.name, req.body.surname, req.body.email, jobId, 0, req.body.oib]);
        } else {
            // update db
            let update_sql = `update korisnik set ime = $1, prezime = $2, email = $3, lozinka = $4, idzaduzenja = $5, isadmin = $6 where oib = $7`
            await pool.query(update_sql, [req.body.name, req.body.surname, req.body.email, req.body.password, jobId, 0, req.body.oib]);
        }
    } else {
        // insert into db
        let insert_sql = `insert into korisnik (oib, ime, prezime, email, lozinka, idzaduzenja, isadmin) values ($1, $2, $3, $4, $5, $6, $7)`
        await pool.query(insert_sql, [req.body.oib, req.body.name, req.body.surname, req.body.email, req.body.password, jobId, 0]);
    }

    // redirect
    res.redirect(`/korisnici/${req.body.oib}`); // HTTP 303 See Other: https://en.wikipedia.org/wiki/HTTP_303
});

/** delete user */
app.post('/korisnici/:oib/delete', async (req, res) => {
    let delete_sql = `delete from korisnik where oib = $1`
    await pool.query(delete_sql, [req.params.oib])
    // redirect
    res.redirect(`/korisnici`);
});


app.listen(3000);