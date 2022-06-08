var libsql = require("mysql2/promise");
var settings = require("./settings.json");

if(settings.sql_support) {
    var sqlInstance = libsql.createConnection({
        host: "localhost",
        user: "root",
        password: "123456",
        database: "norches",
        insecureAuth: true,
        multipleStatements: true,
        supportBigNumbers: true
    });
}
var sqlSuccessConnect = false;

async function init () {
    sqlSuccessConnect = false;
    if(settings.sql_support) {
        (await sqlInstance).connect();
        console.log("Connected to SQL");
        sqlSuccessConnect = true;
    }
}
async function close() {
    if(settings.sql_support) (await sqlInstance).end();
}

var current_table;

var selecttable = (table) => {
    current_table = table;
}
async function getstructure () {
    if(settings.sql_support) {
        var r = (await sqlInstance).query(`SELECT * FROM \`${current_table}\``);
        return r;
    } else {
        return null;
    }
}

module.exports = {
    init: init,
    close: close,
    selecttable: selecttable,
    getstructure: getstructure,
    sqlInstance: (settings.sql_support) ? sqlInstance : null
}