var markovc = require("markov-chain-nlg");
var { REST } = require('@discordjs/rest');
var { Routes } = require('discord-api-types/v9');
var fs = require("fs");
var settings = JSON.parse(fs.readFileSync("settings.json").toString("utf8"));
var ws = require("ws");
var langlist = require("./lang.json");
const { randomUUID } = require("crypto");

//add string formatting feature
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

var token = process.argv[2];
var clientid = process.argv[3];
var libpaint = require("./libpaint/main")

var uptime = [0, 0, 0];

if(settings.print_token) console.log("token: %s", token);
if(settings.print_appid) console.log("app id: %s", clientid);

var rest = new REST({ version: '9' }).setToken(token);

if (!fs.existsSync("private.json")) {
  fs.writeFileSync("private.json", JSON.stringify({ guilds: [], bank: { ncoin: { value: 0, history: [] }, players: [], timers: [] }, xp: { users: [], data: [] }, server: {WebSocketIP: "", WebSocketPort: 0}, blocklist: [], private_revision: settings.private_revision }));
  console.log("private.json was made. Please, configure it.");
  process.exit(0);
}

var libbank = require("./bank");

var sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"));
if(!Object.keys(sprivate).includes("private_revision")) {
  console.log("Updating private data...");
  fs.writeFileSync("private.json", JSON.stringify({ guilds: sprivate.guilds, bank: sprivate.bank, players: sprivate.players, timers: sprivate.timers, xp: sprivate.xp, server: sprivate.server, blocklist: [], private_revision: settings.private_revision }));
  sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"));
} else if (sprivate.private_revision != settings.private_revision) {
  console.log("Private Revision: %d", sprivate.private_revision)
  switch(sprivate.private_revision) {
    case 1: {
      sprivate.private_revision = settings.private_revision;
      var guild_data = [];
      sprivate.guilds.forEach((gld) => {
        if(gld == "927851863146102804") {
          guild_data.push({id: gld, foreign: false});
        } else {
          guild_data.push({id: gld, foreign: true});
        }
      });
      fs.writeFileSync("private.json", JSON.stringify({ guilds: guild_data, bank: sprivate.bank, players: sprivate.players, timers: sprivate.timers, xp: sprivate.xp, server: sprivate.server, blocklist: sprivate.blocklist, private_revision: settings.private_revision }));
      break;
    }
    case settings.private_revision: {
      console.log("Already updated!");
    }
  }
}
var isOpen = false;
var serverSocketConnection;
var latestSocketData = "";
var latestRequest = "";

var kazna = 2108;
var roles = {
  player: "927918475878498364",
  bank: {
    base: "927917784732684328",
    main: "927917635113484328"
  },
  police: "950039874180890644",
  bot_admin: "320888908785385472"
}

//get translated string formatted
var gtsf = (s = "", l = "", f = ["", 0, true]) => {
  var updlist = [];
  f.forEach((ff) => {
    updlist.push(`"${ff}"`);
  });
  if(!Object.keys(langlist).includes(l)) return "Error\nUnable to **find translation** provided **by `l` argument**";
  if(!Object.keys(langlist[l]).includes(s)) return "Error\nUnable to **find string** provided **by `s` argument**";
  var result = "";
  eval(`result = langlist[l][s].format(${updlist.toString()})`);
  return result;
}
var getCurrency = (lang = "") => {
  if(!Object.keys(settings.bank.currency).includes(lang)) return "Error\nUnable to **find translation** provided **by `lang` argument**";
  
  return settings.bank.currency[lang];
}

var securityLayerKey = "";

try {
  serverSocketConnection = new ws(`${sprivate.server.WebSocketIP}:${sprivate.server.WebSocketPort}`);
  if(serverSocketConnection != undefined || serverSocketConnection != null){
    serverSocketConnection.on('open', (ws) => {
      isOpen = true;
      securityLayerKey = randomUUID();
      serverSocketConnection.send(JSON.stringify({
        "type": "sendKey",
        "userKey": securityLayerKey
      }))
      console.log("Successfully connected to the server");
    })
    serverSocketConnection.on('error', (ws, err) => {
      isOpen = false;
      console.log("Unable to connect to the server: %s", err);
      return;
    })
    serverSocketConnection.on("close", (ws, code, reason) => {
      isOpen = false;
      console.log("Server connection closed");
      return;
    })
    serverSocketConnection.on("message", (data, isBinary) => {
      if(latestRequest == "tps"){
        latestSocketData = parseFloat(data.toString()).toPrecision(3)  
      } else {
        latestSocketData = data.toString();
      }
      serverOnMessageTrigger = true;
    })
  } else {
    console.log("Unable to connect to the server");
  }
} catch (e) {
  console.log("Unable to connect to the server: %s", e);
}

//Init libpaint
if(libpaint.extended.isnan(libpaint.user.getuserpaintings("0"))) libpaint.user.createuserdata("0");
//Change ASCII symbols
libpaint.paint.asciidata["na"] = " `";
libpaint.paint.asciidata["30"] = " -";
libpaint.paint.asciidata["31"] = " +";
libpaint.paint.asciidata["32"] = " <";
libpaint.paint.asciidata["33"] = " i";
libpaint.paint.asciidata["34"] = " [";
libpaint.paint.asciidata["35"] = " m";
libpaint.paint.asciidata["36"] = " @";
libpaint.paint.asciidata["0f"] = " .";

var lightinglevel = {
  "7": "na",
  "6": "30",
  "5": "31",
  "4": "32",
  "3": "33",
  "2": "34",
  "1": "35",
  "0": "36"
};

var update_commands = () => {
  sprivate.guilds.forEach((g) => {
    if (g !== "removed") {
      try {
        console.log("Updating on %s", g.id);
        rest.put(Routes.applicationGuildCommands(clientid, g.id), { body: settings.commands });
      } catch (err) {
        console.error(err);
      }
    }
  });
}

update_commands();

var save_private = () => {
  fs.writeFileSync("private.json", JSON.stringify(sprivate));
}
var read_private = () => {
  sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"))
}

markovc.trainTxt("input_result.txt", "\n");

var { Client, Intents, MessageEmbed } = require('discord.js');
var client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});

var is_ready = false;

var make_bank_message = (message, lng) => {
  return new MessageEmbed().setColor('#0099ff').addFields({ name: gtsf("header.bank", lng, []), value: message }).setTimestamp();
}
var make_norches_message = (message) => {
  return new MessageEmbed().setColor('#0099ff').addFields({ name: 'Norches', value: message }).setTimestamp();
}

setInterval(() => {
  if(is_ready){
    client.user.setStatus("dnd");
    var gen = markovc.generate(150);
    client.user.setActivity({name: (gen.length < 4) ? "Ошибка" : gen, type: "COMPETING"})
  }
}, 10 * 1000);

setInterval(() => {
  uptime[0]++;

  if(uptime[0] == 60) {
    uptime[0] = 0;
    uptime[1]++;
  }
  
  if(uptime[1] == 60){
    uptime[1] = 0;
    uptime[2]++;
  }
}, 1000);

client.on('ready', () => {
  is_ready = true;
  console.log(`Logged in as ${client.user.tag}!`);
});

// var function0 = (arr = [0, 0, 0]) => {
//   var d = 0;
//   var res = 0;
//   while(d < arr.length) res += arr[d++];
//   return Math.round(res / arr.length);
// }

//Permissions
//bank-changestatus - Player
//bank-createaccount - Bank
//bank-changebalance (Remove) - Player
//bank-changebalance (Add, Set) - Bank
//bank-schedule - Bank, Police
//gen - Everyone
//xp - Everyone
//bank-info - Everyone
//bank-getaccount - Everyone
//bank-unschedule - Bank, Police
//bank-deleteaccount - Player
//bank-convert (Self) - Player
//bank-convert (Other player) - Bank
//bank-link - Player with Professional status
//bank-unlink - Player with Professional status
//bank-reset - Bot Admin
//bank-changelang - Player
//norches-info - Everyone
//norches-ben - Everyone

var command_list = [];

settings.commands.forEach((cmd) => {
  command_list.push(cmd.name);
});

setInterval(() => {
  if(!settings.scheduler) return;
  read_private();
  var i = 0;
  sprivate.bank.timers.forEach((t) => {
    //structure of timer
    //{start_time: unix_time, end_time: unix_time, action: string, id: number, warn_message: string, arguments: []}
    if(t != null){
      if(Date.now() > t.end_time || Date.now() == t.end_time){
        //handle
        switch(t.action){
          case "delete": {
            libbank.remove_bank_account(t.arguments[0]);
            break;
          }
          case "warn": {
            if(libbank.get_bank_account(t.arguments[0], 0).is_valid){
              sprivate.bank.players[libbank.get_bank_account(t.arguments[0], 0).counter][9].push(t.warn_message);
            }
            break;
          }
          case "add": {
            if(libbank.get_bank_account(t.arguments[0], 0).is_valid){
              read_private();
              
              sprivate.bank.players[libbank.get_bank_account(t.arguments[0], 0).counter][3] = t.arguments[1];
              sprivate.bank.ncoin.value += Math.floor(t.arguments[1] % 64 / 5);
              sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
              sprivate.bank.players(libbank.get_bank_account(t.arguments[0], 0).counter)[10] = Date();
              
              save_private();
            }
            break;
          }
          case "remove": {
            if(libbank.get_bank_account(t.id, 1).is_valid && libbank.get_bank_account(t.arguments[0], 0).is_valid) {
              read_private();

              if((sprivate.bank.players[libbank.get_bank_account(t.arguments[0], 0).counter][3] - t.arguments[1]) > 0){
                sprivate.bank.players[libbank.get_bank_account(t.arguments[0], 0).counter][3] -= t.arguments[1];
                sprivate.bank.players[libbank.get_bank_account(t.id, 1).counter][3] += t.arguments[1];
                sprivate.bank.ncoin.value -= (sprivate.bank.ncoin.value == 0 || sprivate.bank.ncoin.value < 0) ? -(1) : Math.round(t.arguments[1] % 64 / 5);
                if(sprivate.bank.ncoin.value < 0) sprivate.bank.ncoin = 0;
                sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
                sprivate.bank.players[libbank.get_bank_account(t.arguments[0], 0).counter][10] = Date();
                sprivate.bank.players[libbank.get_bank_account(t.id, 1).counter][10] = Date();
              }

              save_private();
            }
            break;
          }
          case "set": {
            if(libbank.get_bank_account(t.arguments[0], 0).is_valid) {
              read_private();

              sprivate.bank.players[libbank.get_bank_account(t.arguments[0], 0).counter][3] = t.arguments[1];
              sprivate.bank.ncoin.value += Math.floor(value % 64 / 5);
              sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
              sprivate.bank.players[libbank.get_bank_account(t.arguments[0], 0).counter][10] = Date();

              save_private();
            }
            break;
          }
          default: {
            console.warn("Action %s not found!", t.action);
            break;
          }
        }        

        sprivate.bank.timers[i] = null;
        save_private();
      }
    }
    i++;
  })
}, 60 * 1000) //scheduler

var roleCheck = (rid, rc) => {return rc.some(role => role.id == rid);}

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (command_list.includes(interaction.commandName) && sprivate.blocklist.includes(interaction.user.id)) {
    return await interaction.reply({
      embeds: [make_norches_message("+ratio")],
      ephemeral: true
    });
  }

  var user_roles = interaction.member.roles.cache;
  var lng = "en";
  if(libbank.get_bank_account(interaction.user.id, 0).is_valid && libbank.get_bank_account(interaction.user.id, 0).player_object[8] == "1.0") lng = libbank.get_bank_account(interaction.user.id, 0).player_object[11];

  if(settings.debugger){
    console.log(roleCheck(roles.bank.base, user_roles), roleCheck(roles.bank.main, user_roles));
    console.log(roleCheck(roles.player, user_roles));
    console.log(roleCheck(roles.police, user_roles));
    console.log(interaction.user.id == roles.bot_admin);
  }

  if (interaction.commandName === "bank-info") {
    //create image
    var icon = "";
    if(sprivate.bank.ncoin.history[sprivate.bank.ncoin.history.length - 1] == sprivate.bank.ncoin.history[sprivate.bank.ncoin.history.length - 2]) icon = "⏺️"
    else {
      icon = (sprivate.bank.ncoin.history[sprivate.bank.ncoin.history.length - 1] > sprivate.bank.ncoin.history[sprivate.bank.ncoin.history.length - 2]) ? "🔼" : "⬇️";
    }
    if(sprivate.bank.ncoin.history.length < 8){
      await interaction.reply({ embeds: [make_bank_message(gtsf("bank-info.no-ncoin", lng, [
        getCurrency(lng),
        sprivate.bank.ncoin.value,
        icon,
        sprivate.bank.players.length,
        settings.bank.version
      ]), lng)]});
    } else {
      //create image
      var ncoinh = libpaint.paint.createblankimg("Norches Bot", `NCoin history for ${new Date().toString()}`, "0");
      var lasth = sprivate.bank.ncoin.history.slice(-8);
      //get highest
      var tmp2 = lasth;
      tmp2 = tmp2.sort().slice(-1) - 7;

      //generate image
      var p = [];
      var j = 0;
      var copy = [];
      var temp = ncoinh.image.bytearray;
      //prevent drawing pixels by negative y
      while(j < 8){
        copy[j] = (lasth[j] < 0) ? lasth[j] - lasth[j] - lasth[j] : lasth[j];
        j++;
      }
      j = 0;

      var render = "";
      //render image
      while(j < 8) copy[j++] -= tmp2;
      j = 0;
      //limit y
      while(j < 8){
        if(copy[j] >= 7) copy[j] = 7;
        if(copy[j] <= 0) copy[j] = 0;

        p.push([copy[j], j]); //y, x
        j++;
      }
      j = 0;
      //draw image
      while(j < 8){
        temp = libpaint.paint.pixels.draw(p[j], lightinglevel[p[j][0].toString()], temp);
        var yy = 0;
        while(yy < p[j][0]){
          temp = libpaint.paint.pixels.draw([p[j][0] - yy, p[j][1]], lightinglevel[(p[j][0] - yy).toString()], temp);
          yy++;
        }
        j++;
      }
      //render it
      render = libpaint.paint.renderpaint(libpaint.extended.mergebytes(temp).bytestring, [0, 0], true, true);
      //send message
      await interaction.reply({ embeds: [make_bank_message(gtsf("bank-info.ncoin", lng, [
        getCurrency(lng),
        sprivate.bank.ncoin.value,
        icon,
        sprivate.bank.players.length,
        settings.bank.version
      ]) + render, lng)]});
    }
  }

  if (interaction.commandName === "gen") {
    var gen = markovc.generate(300);
    return await interaction.reply({embeds: [make_norches_message((gen.length < 4) ? gtsf("gen.error", lng, []) : gen)], ephemeral: true});
  }

  if (interaction.commandName === "xp") {
    return await interaction.reply("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {ephemeral: true});
  }
  if (interaction.commandName === "norches-ben") {
    var blt_res = settings.benLookupTable[Math.round(Math.random() * 256) % 5];
    return await interaction.reply({embeds: [make_norches_message(blt_res)], ephemeral: true});
  }
  if (interaction.commandName === "bank-createaccount") {
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    if(!roleCheck(roles.bank.base, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(gtsf("norches.access-denied", lng, []), lng)]});
    }

    var user = interaction.options.getUser('user');
    var nick = interaction.options.getString('nick');
    var name = interaction.options.getString('name');
    var id = Math.round(Math.random() * 8192);
    if(libbank.get_bank_account(user.id).is_valid == false || libbank.get_bank_account(user.id).player_object[6] == false) {


      // 0 - discord id
      // 1 - mc nickname
      // 2 - account name
      // 3 - balance
      // 4 - linked bank and discord ids (only supports Professional account)
      // 5 - placeholder
      // 6 - is account has not been suspended?
      // 7 - account type
      // 8 - account version
      // 9 - messages
      //10 - last activity
      //11 - default language
      sprivate.bank.players.push([user.id, nick, name, 0, [{bid: `${id}`, did: user.id}], null, true, "personal", settings.bank.version, [], Date(), "en"]);
      save_private();
      if(interaction.user.id == user.id){ 
        await interaction.reply({embeds: [make_bank_message(gtsf("bank-createaccount.own.success", lng, [id]), lng)]}); 
      } else {
        await interaction.reply({embeds: [make_bank_message(gtsf("bank-createaccount.success", lng, [id]), lng)]}); 
      }
    } else {
      await interaction.reply({embeds: [make_bank_message(gtsf("bank-createaccount.exists", lng, []), lng)]}); 
    }
  }
  if (interaction.commandName === "bank-changestatus") {
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
    }

    var id = interaction.options.getString('id');
    var status = interaction.options.getString('status');
    
    if(libbank.get_bank_account(id, 1).is_valid == false){
      await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]}); 
    } else {
      read_private();
      if(status == "professional"){
        if(sprivate.bank.players[libbank.get_bank_account(id, 1).counter][3] >= 24){
          sprivate.bank.players[libbank.get_bank_account(id, 1).counter][3] -= 24;
          sprivate.bank.players[libbank.get_bank_account(kazna, 1).counter][3] += 24;
          sprivate.bank.players[libbank.get_bank_account(id, 1).counter][7] = status;
          sprivate.bank.players[libbank.get_bank_account(kazna, 1).counter][10] = Date();
          sprivate.bank.players[libbank.get_bank_account(id, 1).counter][10] = Date();
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-changestatus.success", lng, []), lng)]});
        } else {
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-changestatus.money", lng, [getCurrency(lng)]), lng)]});
        }
      } else {
        sprivate.bank.players[libbank.get_bank_account(id, 1).counter][7] = status;
        var i = 0;
        while(i < sprivate.bank.players[libbank.get_bank_account(id, 1).counter][4].length - 1){
          sprivate.bank.players[libbank.get_bank_account(id, 1).counter][4][1 + i] = null;
          i++;
        }
        sprivate.bank.players[libbank.get_bank_account(id, 1).counter][10] = Date();
        save_private();
        return await interaction.reply({embeds: [make_bank_message(gtsf("bank-changestatus.success", lng, []), lng)]});
      }
    }
  }
  if(interaction.commandName === "bank-changelang"){
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    var user = interaction.user;
    var lang = interaction.options.getString("lang", true);
    if(!libbank.get_bank_account(user.id, 0).is_valid){
      return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexist", lang, []), lang)]});
    }
    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lang, []), lng)]});
    }
    read_private();
    sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][11] = lang;
    sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][10] = Date();
    save_private();
    return await interaction.reply({embeds: [make_bank_message(gtsf("bank-changelang.success", lang, []), lang)]});
  }

  if(interaction.commandName === "bank-convert") {
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    var user = interaction.options.getUser("user", false);
    if(user != null){
      if(!roleCheck(roles.bank.base, user_roles)){
        return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
      }
    }
    if(user == null) {
      if(!roleCheck(roles.player, user_roles)){
        return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
      }
      user = interaction.user;
    }

    if(libbank.get_bank_account(user.id, 0).is_valid == false){
      return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]}); 
    } else {
      read_private();
      switch(sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8]){
        case settings.bank.version: {
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-convert.already-converted", lng, []), lng)]}); 
        }
        case "0.1": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][4].unshift({bid: sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5], did: user.id});
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5] = null;
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.2";
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-convert.success", lng, ["0.2"]), lng)]}); 
        }
        case "0.2": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][9] = [];
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.3";
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-convert.success", lng, ["0.3"]), lng)]}); 
        }
        case "0.3": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][10] = Date();
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.4";
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-convert.success", lng, ["0.4"]), lng)]}); 
        }
        case "0.4": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][11] = "en";
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][10] = Date();
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "1.0";
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-convert.success.lang", lng, ["1.0"]), lng)]}); 
        }
        default: {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5] = `${sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5]}`;
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.1";
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-convert.success", lng, ["0.1"]), lng)]}); 
        }
      }
    }
  }
  if (interaction.commandName === "bank-getaccount") {
    var user = interaction.options.getUser("user", false);
    if(user == null) user = interaction.user;
    if(libbank.get_bank_account(user.id).is_valid == true && libbank.get_bank_account(user.id).player_object[6] == true){
      var b = libbank.get_bank_account(user.id);
      interaction.reply({embeds: [make_bank_message(gtsf("bank-getaccount.success", lng, [
        (b.player_object[5] === null) ? b.player_object[4][0].bid : b.player_object[5],
        b.player_object[2],
        (b.player_object[7] === "personal") ? gtsf("bank.account.type.personal", lng, []) : gtsf("bank.account.type.personal", lng, []),
        b.player_object[1],
        b.player_object[0],
        b.player_object[3],
        getCurrency(lng),
        libbank.count_linked(b.player_object[4]) - 1,
        (typeof b.player_object[9] == "undefined") ? gtsf("bank.account.not-converted", lng, []) : ((b.player_object[9].toString().length == 0) ? gtsf("bank.account.messages.not-exists", lng, []) : b.player_object[9].toString()),
        (typeof b.player_object[10] == "undefined") ? gtsf("bank.account.not-converted", lng, []) : b.player_object[10],
        b.player_object[8]
      ]), lng)]});
    } else {
      return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]}); 
    }
  }
  if (interaction.commandName === "bank-changebalance") {
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    read_private();
    var id1 = interaction.user.id;
    var id2 = interaction.options.getString("id2rem", true);
    var action = interaction.options.getString("action", true);
    var value = interaction.options.getInteger("value", true);

    if(value < 0) value = 0;
    
    if(libbank.get_bank_account(id1, 0).is_valid == false){
      return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]}); 
    } else {
      id1 = libbank.get_bank_account(interaction.user.id, 0).player_object[4][0].bid;
      switch(action){
        case "set": {
          if(!roleCheck(roles.bank.base, user_roles)){
            return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
          }
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] = value;
          sprivate.bank.ncoin.value += Math.floor(value % 64 / 5);
          sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][10] = Date();
          save_private();
          await interaction.reply({embeds: [make_bank_message(gtsf("bank-changebalance.set.success", lng, [value, getCurrency(lng), id1]), lng)]});
          break;
        }
        case "add": {
          if(!roleCheck(roles.bank.base, user_roles)){
            return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
          }

          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] += value;
          sprivate.bank.ncoin.value += Math.floor(value % 64 / 5);
          sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][10] = Date();
          save_private();
          await interaction.reply({embeds: [make_bank_message(gtsf("bank-changebalance.add.success", lng, [value, getCurrency(lng), id1]), lng)]});
          break;
        }
        case "remove": {
          if(!roleCheck(roles.player, user_roles)){
            return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
          }
          //check access to id2 and id1
          if(libbank.get_bank_account(id2, 1).is_valid) {           
             if(libbank.check_access(id1, 1, id2, interaction.user.id) == 0){
              if((sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] - value) < 0){
                return await interaction.reply({embeds: [make_bank_message(gtsf("bank-changebalance.money", lng, []), lng)]}); 
              }
              sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] -= value;
              sprivate.bank.players[libbank.get_bank_account(id2, 1).counter][3] += value;
              sprivate.bank.ncoin.value -= (sprivate.bank.ncoin.value == 0 || sprivate.bank.ncoin.value < 0) ? -(1) : Math.round(value % 64 / 5);
              if(sprivate.bank.ncoin.value < 0) sprivate.bank.ncoin.value = 0;
              sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
              sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][10] = Date();
              sprivate.bank.players[libbank.get_bank_account(id2, 1).counter][10] = sprivate.bank.players[libbank.get_bank_account(id2, 1).counter][10];
              save_private();
              await interaction.reply({embeds: [make_bank_message(gtsf("bank-changebalance.remove.success", lng, [value, getCurrency(lng), id1]), lng)]});
            } else {
              await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.access-denied", lng, []), lng)]});
            }
          }
          break;
        }
      }
    }
  }
  if (interaction.commandName === "bank-schedule") {
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    if(roleCheck(roles.bank.base, user_roles) || roleCheck(roles.police, user_roles)){
      var user = interaction.options.getUser("user", true);
      var action = interaction.options.getString("action", true);
      var value = interaction.options.getInteger("value", true);
      var id2 = interaction.options.getString("id2", true);
      var status = interaction.options.getString("status", true);
      var warn_message = interaction.options.getString("warn-message", true);
      var minutes = interaction.options.getInteger("minutes", true);
      if(user.id == interaction.user.id){
        return await interaction.reply({embeds: [make_bank_message(gtsf("bank-schedule.error.myself", lng, []), lng)]});
      }

      read_private();
      if(!libbank.get_bank_account(user.id, 0).is_valid) {
        return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]});
      }
      //{ guilds: [], bank: { ncoin: { value: 0, history: [] }, players: [], timers: [] }, xp: { users: [], data: [] }, server: {WebSocketIP: "", WebSocketPort: 0} }
      var t = Date.now();
      var sid = sprivate.bank.timers.push({
        start_time: t,
        end_time: t += (minutes * 60 * 1000),
        action: action,
        id: id2,
        warn_message: warn_message,
        arguments: [user.id, value]
      });
      //structure of timer
      //{start_time: unix_time, end_time: unix_time, action: string, id: number, warn_message: string, arguments: []}
      save_private();
      await interaction.reply({embeds: [make_bank_message("bank-schedule.success", lng, [sid])]});
    } else {
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
    }
  }
  if (interaction.commandName === "bank-unschedule") {
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    if(roleCheck(roles.bank.base, user_roles) || roleCheck(roles.police, user_roles)){
      var id = interaction.options.getInteger("id", true);
      read_private();
      if(typeof sprivate.bank.timers[id - 1] == "undefined" || sprivate.bank.timers[id - 1] == null){
        await interaction.reply({embeds: [make_bank_message(gtsf("bank-unschedule.error", lng, []), lng)]});
      } else {
        sprivate.bank.timers[id - 1] = null;
        save_private();
        await interaction.reply({embeds: [make_bank_message(gtsf("bank-unschedule.success", lng, []), lng)]});
      }
    } else {
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
    }
  }
  if (interaction.commandName === "bank-link"){
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
    }
    var user = interaction.options.getUser("user", true);
    if(user.id == interaction.user.id) {
      return await interaction.reply({embeds: [make_bank_message(gtsf("bank-link.error.myself", lng, []), lng)]});
    }
    if(libbank.get_bank_account(user.id, 0).is_valid && libbank.get_bank_account(interaction.user.id, 0).is_valid){
      read_private();
      if(libbank.get_bank_account(interaction.user.id, 0).player_object[7] == "professional"){
        if(libbank.check_linked(libbank.get_bank_account(user.id, 0).player_object[4][0].bid, libbank.get_bank_account(interaction.user.id, 0).player_object[4]).is_valid){
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-link.error.linked", lng, []), lng)]});
        } else {
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][4].push(libbank.get_bank_account(user.id, 0).player_object[4][0]);
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][10] = Date();
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-link.success", lng, []), lng)]});
        }
      } else {
        return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.not-professional", lng, []), lng)]});
      }
    } else {
      return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]});
    }
  }
  if(interaction.commandName === "bank-unlink"){
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
    }
    var user = interaction.options.getUser("user", true);
    if(libbank.get_bank_account(user.id, 0).is_valid && libbank.get_bank_account(interaction.user.id, 0).is_valid){
      read_private();
      if(libbank.get_bank_account(interaction.user.id, 0).player_object[7] == "professional"){
        if(libbank.check_linked(libbank.get_bank_account(user.id, 0).player_object[4][0], libbank.get_bank_account(interaction.user.id, 0).player_object[4]).is_valid){
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][4][libbank.check_linked(libbank.get_bank_account(user.id, 0).player_object[4][0], libbank.get_bank_account(interaction.user.id, 0).player_object[4]).counter] = null;
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][10] = Date();
          save_private();
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-unlink.success", lng, []), lng)]});
        } else {
          return await interaction.reply({embeds: [make_bank_message(gtsf("bank-unlink.error.unlinked", lng, []), lng)]});
        }
      } else {
        return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.not-professional", lng, []), lng)]});
      }
    } else {
      return await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]});
    }
  }
  if (interaction.commandName === "norches-info") {
    var additionalInfo = "";
    if(isOpen){
      latestRequest = "tps";
      serverSocketConnection.send("tps");
      setTimeout(() => {
        additionalInfo += gtsf("norches-info.success.tps", lng, []) + latestSocketData;
        latestRequest = "list"
        serverSocketConnection.send("list");
        setTimeout(async () => {
          additionalInfo += gtsf("norches-info.success.list", lng, []) + latestSocketData;
          await interaction.reply({embeds: [make_norches_message(additionalInfo)]});
        }, 500);
      }, 500);
    } else {
      return await interaction.reply({embeds: [make_norches_message(gtsf("norches-info.error.na", lng, []), lng)]});
    }
  }
  if (interaction.commandName === "bank-reset"){
    if(!interaction.user.id == roles.bot_admin) {
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
    }
    read_private();
    sprivate.bank = JSON.parse("{\"bank\":{\"ncoin\":{\"value\":0,\"history\":[]},\"players\":[],\"timers\":[]}}").bank;
    save_private();
    return await interaction.reply({embeds: [make_bank_message(gtsf("bank-reset.success", lng, []), lng)]});
  }
  if (interaction.commandName === "norches-donationevent-test"){
    var action = interaction.options.getInteger("action", true);
    var size = interaction.options.getInteger("size", true);
    var author = interaction.options.getString("author", true);
    var contains = interaction.options.getString("contains", true);
    var player = interaction.options.getString("player", true);

    var toSend = {
      type: "donationEvent",
      size: size,
      author: author,
      contains: contains,
      toPlayer: player,
      action: action,
      key: securityLayerKey
    }
    if(isOpen){
      serverSocketConnection.send(JSON.stringify(toSend));
      await interaction.reply({embeds: [make_bank_message(JSON.stringify(toSend), lng)]});
    } else {
      await interaction.reply({embeds: [make_bank_message(gtsf("norches.server.na", lng, []), lng)]});
    }
  }
  if (interaction.commandName === "bank-deleteaccount") {
    if(interaction.guild.id != "927851863146102804") return await interaction.reply({embeds: [make_norches_message("**Ошибка!**\nЗа пределами сервера разрешены **лишь команды без возможности записи данных**, чтобы не допустить *несанкционированного доступа к данным приватного сервера!*")]});

    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_bank_message(gtsf("norches.access-denied", lng, []), lng)]}); 
    }

    var counter = libbank.remove_bank_account(interaction.user.id);
    if(counter == -1){
      await interaction.reply({embeds: [make_bank_message(gtsf("bank.account.doesnotexists", lng, []), lng)]});
    } else {
      sprivate.bank.players[libbank.get_bank_account(kazna, 1).counter][3] += sprivate.bank.players[counter][3];
      sprivate.bank.players[counter][3] = 0;
      sprivate.bank.players[counter][10] = Date();
      sprivate.bank.players[libbank.get_bank_account(kazna, 1).counter][10] = sprivate.bank.players[counter][10];

      save_private();
      await interaction.reply({embeds: [make_bank_message(gtsf("bank-deleteaccount.success", lng, []), lng)]});
    }
  }
});
client.on("guildCreate", async (guild) => {
  sprivate.guilds.push(guild.id);
  fs.writeFileSync("private.json", JSON.stringify(sprivate));
  update_commands();
});
client.on("guildDelete", async (guild) => {
  var i = 0;
  sprivate.guilds.forEach(function (g) {
    if (g == guild.id) sprivate.guilds[i] = "removed";
    i++
  });
  fs.writeFileSync("private.json", JSON.stringify(sprivate));
});

client.login(token);

module.exports = {
  getTraslatedString: gtsf,
  settings: settings,
  sprivate: sprivate,
  token: process.argv[2],
  clientid: process.argv[3]
}