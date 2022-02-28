var fs = require('fs');

var sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"));

var save_private = () => {
    fs.writeFileSync("private.json", JSON.stringify(sprivate));
}
var read_private = () => {
    sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"))
}

var get_bank_account = (id = "", type = 0) => {
    read_private();
    var res = -1;
    switch(type){
        case 0: { //discord id
            var i = 0;
            sprivate.bank.players.forEach((p) => {
                if(p[0] === id && p[6] == true) res = {player_object: p, is_valid: true, counter: i};
                i++;
            });
        }
        case 1: { //account id
            var i = 0;
            sprivate.bank.players.forEach((p) => {
                if(p[4][0].bid === id && p[6] == true) res = {player_object: p, is_valid: true, counter: i};
                i++;
            });
        }
        default: {
            break;
        }
    }
    if(res == -1){
        return {player_object: null, is_valid: false, counter: null};
    } else {
        return res;
    }
}
var remove_bank_account = (id = "") => {
    var b = get_bank_account(id);
    if(b.is_valid == false) return -1;
    if(b.player_object[6] == false) return -1;
    sprivate.bank.players[b.counter][6] = false;
    save_private();
    return 0;
}
var check_access = (id = "", type = 0, id2 = "", uid = "") => {
    var res = -1;
    if(get_bank_account(id, type).is_valid == true && get_bank_account(id2, type).is_valid == true && get_bank_account(uid, 0).is_valid == true){
        if ((get_bank_account(id, type).player_object[7] == "personal" && get_bank_account(id2, type).player_object[7] == "personal") || (get_bank_account(id, type).player_object[7] == "personal" && get_bank_account(id2, type).player_object[7] == "professional")){
            res = 0;
        } else if ((get_bank_account(id, type).player_object[7] == "professional" && get_bank_account(id2, type).player_object[7] == "personal") || (get_bank_account(id, type).player_object[7] == "professional" && get_bank_account(id2, type).player_object[7] == "professional")){
            var i = 0;
            get_bank_account(id, type).player_object[4].forEach((g) => {
                switch(type){
                    case 0: { //discord id
                        if(g.did == uid) res = 0;
                        break;
                    }
                    case 1: { //account id
                        if(g.did == get_bank_account(uid, 0).player_object[4][0].did) res = 0;
                        break;
                    }
                }
                i++;
            })
        }
    }
    return res;
}
var check_linked = (id = "", links = ["", "", ""]) => {
    var res = {is_valid: 0, counter: 0};
    links.forEach((l) => {
        if(l.bid === id && links[0] != id) res.is_valid = 1;
        res.counter++;
    })
    return res;
}
var count_linked = (links = ["", ""]) => {
    var res = 0;
    links.forEach((l) => {
        if(l != null) res++;
    });
    return res;
}

module.exports = {
    get_bank_account: get_bank_account,
    remove_bank_account: remove_bank_account,
    check_access: check_access,
    check_linked: check_linked,
    count_linked: count_linked
}