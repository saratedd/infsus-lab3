const {Pool} = require('pg');

const pool2 = new Pool({
    user: 'heidi',
    host: 'localhost',
    database: 'kfdb',
    password: 'heidi',
    port: 5432
});

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'kf',
    password: 'postgres',
    port: 5432
});

module.exports = pool;