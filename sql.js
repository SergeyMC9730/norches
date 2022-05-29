var libsql = require("mysql2/promise");

var sqlInstance = libsql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "norches",
    insecureAuth: true,
    multipleStatements: true,
    supportBigNumbers: true
});
var sqlSuccessConnect = false;

async function init () {
    sqlSuccessConnect = false;
    (await sqlInstance).connect();
    console.log("Connected to SQL");
    sqlSuccessConnect = true;
}
async function close() {
    (await sqlInstance).end();
}

var current_table;

var selecttable = (table) => {
    current_table = table;
}
async function getstructure () {
    var r = (await sqlInstance).query(`SELECT * FROM \`${current_table}\``);
    return r;
}

module.exports = {
    init: init,
    close: close,
    selecttable: selecttable,
    getstructure: getstructure,
    sqlInstance: sqlInstance
}