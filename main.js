var markovc = require("markov-chain-nlg");
var { REST } = require('@discordjs/rest');
var { Routes } = require('discord-api-types/v9');
var fs = require("fs");
var settings = JSON.parse(fs.readFileSync("settings.json").toString("utf8"));
var ws = require("ws");

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
  fs.writeFileSync("private.json", JSON.stringify({ guilds: [], bank: { ncoin: { value: 0, history: [] }, players: [], timers: [] }, xp: { users: [], data: [] }, server: {WebSocketIP: "", WebSocketPort: 0} }));
  console.log("private.json was made. Please, configure it.");
  process.exit(0);
}

var libbank = require("./bank")

var sprivate = JSON.parse(fs.readFileSync("private.json").toString("utf8"));
var isOpen = false;
var serverSocketConnection;
var latestSocketData = "";
var latestRequest = "";

var kazna = 3046;
var roles = {
  player: "927918475878498364",
  bank: {
    base: "927917784732684328",
    main: "927917635113484328"
  },
  police: "950039874180890644",
  bot_admin: "320888908785385472"
}

try {
  serverSocketConnection = new ws(`${sprivate.server.WebSocketIP}:${sprivate.server.WebSocketPort}`);
  if(typeof serverSocketConnection != "undefined"){
    serverSocketConnection.on('open', (ws) => {
      isOpen = true;
      console.log("Successfully connected to the server");
    })
    serverSocketConnection.on('error', (ws, err) => {
      isOpen = false;
      console.log("Unable to connect to the server");
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
    })
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
  sprivate.guilds.forEach(function (g) {
    if (g !== "removed") {
      try {
        rest.put(Routes.applicationGuildCommands(clientid, g), { body: settings.commands });
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
var client = new Client({ intents: [Intents.FLAGS.GUILDS] });

var is_ready = false;

var make_bank_message = (message) => {
  return new MessageEmbed().setColor('#0099ff').addFields({ name: 'Банк', value: message }).setTimestamp();
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

var function0 = (arr = [0, 0, 0]) => {
  var d = 0;
  var res = 0;
  while(d < arr.length) res += arr[d++];
  return Math.round(res / arr.length);
}

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
              
            }
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

  var user_roles = interaction.member.roles.cache;

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
      await interaction.reply({ embeds: [make_bank_message(`
      **Валюта:** <:membrane:931940593179979806> ${settings.bank.currency}
      **Цена NCoin:** \`${sprivate.bank.ncoin.value}\` ${icon}
      **Игроков в банке:** \`${sprivate.bank.players.length}\`
      **Последняя версия структуры аккаунтов:** **\`${settings.bank.version}\`**
      **Курс NCoin не доступен из-за нехватки информации**
      `)]});
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
      //render image properly
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
      await interaction.reply({ embeds: [make_bank_message(`
        **Валюта:** <:membrane:931940593179979806> ${settings.bank.currency}
        **Цена NCoin:** \`${sprivate.bank.ncoin.value}\` ${icon}
        **Игроков в банке:** \`${sprivate.bank.players.length}\`
        **Последняя версия структуры аккаунтов:** **\`${settings.bank.version}\`**
        **Курс NCoin:**
        ${render}
      `)]});
    }
  }

  if (interaction.commandName === "gen") {
    var gen = markovc.generate(300);
    await interaction.reply((gen.length < 4) ? "**Ошибка**" : gen, {ephemeral: true});
  }

  if (interaction.commandName === "xp") {
    await interaction.reply("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {ephemeral: true});
  }
  if (interaction.commandName === "bank-createaccount") {
    if(!roleCheck(roles.bank.base, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
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
      // 6 - is account has been not suspended?
      // 7 - account type
      // 8 - account version
      // 9 - messages
      //10 - last activity
      //11 - default language
      sprivate.bank.players.push([user.id, nick, name, 0, [{bid: `${id}`, did: user.id}], null, true, "personal", settings.bank.version, [], Date(), "en"]);
      save_private();
      if(interaction.user.id == user.id){
        await interaction.reply({embeds: [make_bank_message(`**Ваш аккаунт был успешно создан!**\nID аккаунта: **\`${id}\`**`)]}); 
      } else {
        await interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно создан!**\nID аккаунта: **\`${id}\`**`)]});
      }
    } else {
      await interaction.reply({embeds: [make_bank_message(`Извините!\nДанный аккаунт **уже был создан!**`)]});
    }
  }
  if (interaction.commandName === "bank-changestatus") {
    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }

    var id = interaction.options.getString('id');
    var status = interaction.options.getString('status');
    
    if(libbank.get_bank_account(id, 1).is_valid == false){
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]});
    } else {
      read_private();
      if(status == "professional"){
        if(sprivate.bank.players[libbank.get_bank_account(id, 1).counter][3] >= 24){
          sprivate.bank.players[libbank.get_bank_account(id, 1).counter][3] -= 24;
          sprivate.bank.players[libbank.get_bank_account(kazna, 1).counter][3] += 24;
          sprivate.bank.players[libbank.get_bank_account(kazna, 1).counter][10] = Date()
          sprivate.bank.players[libbank.get_bank_account(id, 1).counter][7] = status;
          sprivate.bank.players[libbank.get_bank_account(id, 1).counter][10] = Date();
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Статус аккаунта был успешно изменён!**`)]});
        } else {
          return await interaction.reply({embeds: [make_bank_message(`Извините!\nДля изменения статуса аккаунта на Профессиональный на балансе **должно быть 24 ${settings.bank.currency}** <:membrane:931940593179979806>`)]});
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
        interaction.reply({embeds: [make_bank_message(`**Статус аккаунта был успешно изменён!**`)]});
      }
    }
  }
  if(interaction.commandName === "bank-changelang"){
    var user = interaction.user;
    var lang = interaction.options.getString("lang", true);
    if(!libbank.get_bank_account(user.id, 0).is_valid){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]});
    }
    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }
    read_private();
    sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][11] = lang;
    sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][10] = Date();
    save_private();
    return await interaction.reply({embeds: [make_norches_message(`**Язык успешно изменён!**`)]});
  }
  if(interaction.commandName === "bank-convert") {
    var user = interaction.options.getUser("user", false);
    if(user != null){
      if(!roleCheck(roles.bank.base, user_roles)){
        return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
      }
    }
    if(user == null) {
      if(!roleCheck(roles.player, user_roles)){
        return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
      }
      user = interaction.user;
    }

    if(libbank.get_bank_account(user.id, 0).is_valid == false){
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]});
    } else {
      read_private();
      switch(sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8]){
        case settings.bank.version: {
          interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **уже был конвертирован**`)]})
          break;
        }
        case "0.1": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][4].unshift({bid: sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5], did: user.id});
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5] = null;
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.2";
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно конвертирован на 0.2!**`)]});
          break;
        }
        case "0.2": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][9] = [];
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.3";
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно конвертирован на 0.3!**`)]});
          break;
        }
        case "0.3": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][10] = Date();
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.4";
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно конвертирован на 0.4!**`)]});
          break;
        }
        case "0.4": {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][11] = "en";
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][10] = Date();
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "1.0";
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно конвертирован на 1.0!**\nРекомендуем **сменить язык аккаунта.** По умолчанию он \`en\``)]});
          break;
        }
        default: {
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5] = `${sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][5]}`;
          sprivate.bank.players[libbank.get_bank_account(user.id, 0).counter][8] = "0.1";
          save_private();
          interaction.reply({embeds: [make_bank_message(`**Аккаунт был успешно конвертирован на 0.1!**`)]});
          break;
        }
      }
    }
  }
  if (interaction.commandName === "bank-getaccount") {
    var user = interaction.options.getUser("user", false);
    if(user == null) user = interaction.user;
    if(libbank.get_bank_account(user.id).is_valid == true && libbank.get_bank_account(user.id).player_object[6] == true){
      var b = libbank.get_bank_account(user.id);
      interaction.reply({embeds: [make_bank_message(`
        ID аккаунта: **\`${b.player_object[5] == null ? b.player_object[4][0].bid : b.player_object[5]}\`**
        Название аккаунта: **\`${b.player_object[2]}\`**
        Тип аккаунта: **${(b.player_object[7] === "personal") ? "Персональный" : "Профессиональный"}**
        Никнейм владельца: **\`${b.player_object[1]}\`**
        Владелец: **<@${b.player_object[0]}>**
        Баланс: **${b.player_object[3]}** <:membrane:931940593179979806> ${settings.bank.currency}
        Соединённых аккаунтов: **${libbank.count_linked(b.player_object[4]) - 1}**
        Оповещения: **${(b.player_object[9] === undefined) ? "Не конвертирован" : ((b.player_object[9].toString().length == 0) ? "Не имеются" : b.player_object[9].toString())}**
        Последняя активность: **\`${(b.player_object[10] === "undefined") ? "Не конвертирован" : b.player_object[10]}\`**

        Версия структуры аккаунта: **\`${(b.player_object[8] === undefined || b.player_object[8] === null) ? "Не конвертирован" : b.player_object[8]}\`**
      `)]});
    } else {
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]})
    }
  }
  if (interaction.commandName === "bank-changebalance") {
    read_private();
    var id1 = interaction.user.id;
    var id2 = interaction.options.getString("id2rem", true);
    var action = interaction.options.getString("action", true);
    var value = interaction.options.getInteger("value", true);

    if(value < 0) value = 0;
    
    if(libbank.get_bank_account(id1, 0).is_valid == false){
      interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]})
    } else {
      id1 = libbank.get_bank_account(interaction.user.id, 0).player_object[4][0].bid;
      switch(action){
        case "set": {
          if(!roleCheck(roles.bank.base, user_roles)){
            return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
          }
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] = value;
          sprivate.bank.ncoin.value += Math.floor(value % 64 / 5);
          sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][10] = Date();
          save_private();
          await interaction.reply({embeds: [make_bank_message(`**Успешно установлено** ${value} <:membrane:931940593179979806> ${settings.bank.currency} аккаунту **\`${id1}\`**!`)]});
          break;
        }
        case "add": {
          if(!roleCheck(roles.bank.base, user_roles)){
            return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
          }

          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] += value;
          sprivate.bank.ncoin.value += Math.floor(value % 64 / 5);
          sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
          sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][10] = Date();
          save_private();
          await interaction.reply({embeds: [make_bank_message(`**Успешно зачислены** ${value} <:membrane:931940593179979806> ${settings.bank.currency} аккаунту **\`${id1}\`**!`)]});
          break;
        }
        case "remove": {
          if(!roleCheck(roles.player, user_roles)){
            return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
          }
          //check access to id2 and id1
          if(libbank.get_bank_account(id2, 1).is_valid == false) {           
             if(libbank.check_access(id1, 1, id2, interaction.user.id) == 0){
              if((sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] - value) < 0){
                return await interaction.reply({embeds: [make_bank_message(`Извините!\nУ Вас **недостаточно средств!**`)]});
              }
              sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][3] -= value;
              sprivate.bank.players[libbank.get_bank_account(id2, 1).counter][3] += value;
              sprivate.bank.ncoin.value -= (sprivate.bank.ncoin.value == 0 || sprivate.bank.ncoin.value < 0) ? -(1) : Math.round(value % 64 / 5);
              if(sprivate.bank.ncoin.value < 0) sprivate.bank.ncoin.value = 0;
              sprivate.bank.ncoin.history.push(sprivate.bank.ncoin.value);
              sprivate.bank.players[libbank.get_bank_account(id1, 1).counter][10] = Date();
              sprivate.bank.players[libbank.get_bank_account(id2, 1).counter][10] = sprivate.bank.players[libbank.get_bank_account(id2, 1).counter][10];
              save_private();
              await interaction.reply({embeds: [make_bank_message(`**Успешно вычислены** ${value} <:membrane:931940593179979806> ${settings.bank.currency} аккаунту **\`${id1}\`** и добавлены аккаунту **\`${id2}\`**!`)]});
            } else {
              await interaction.reply({embeds: [make_bank_message(`Извините!\nУ Вас **нет доступа к запрошенному аккаунту!**`)]});
            }
          }
          break;
        }
      }
    }
  }
  if (interaction.commandName === "bank-schedule") {
    if(!roleCheck(roles.bank.base, user_roles) || !roleCheck(roles.police, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }

    var user = interaction.options.getUser("user", true);
    var action = interaction.options.getString("action", true);
    var value = interaction.options.getInteger("value", true);
    var id2 = interaction.options.getString("id2", true);
    var status = interaction.options.getString("status", true);
    var warn_message = interaction.options.getString("warn-message", true);
    var minutes = interaction.options.getInteger("minutes", true);
    if(user.id == interaction.user.id){
      return await interaction.reply({embeds: [make_bank_message(`Извините!\nВы не можете запланировать действие на **свой же аккаунт!**`)]});
    }

    read_private();
    if(!libbank.get_bank_account(user.id, 0).is_valid) {
      return await interaction.reply({embeds: [make_bank_message(`Извините!\nЗапрошенный аккаунт **не существует!**`)]});
    }
    //{ guilds: [], bank: { ncoin: { value: 0, history: [] }, players: [], timers: [] }, xp: { users: [], data: [] }, server: {WebSocketIP: "", WebSocketPort: 0} }
    var t = Date.now();
    var sid = sprivate.bank.timers.push({
      start_time: t,
      end_time: t += (minutes * 60 * 1000),
      action: action,
      id: 0, //unused
      warn_message: warn_message,
      arguments: [user.id]
    });
    //structure of timer
    //{start_time: unix_time, end_time: unix_time, action: string, id: number, warn_message: string, arguments: []}
    save_private();
    await interaction.reply({embeds: [make_bank_message(`ID запланированной задачи: **\`${sid}\`**`)]});
  }
  if (interaction.commandName === "bank-unschedule") {
    if(!roleCheck(roles.bank.base, user_roles) || !roleCheck(roles.police, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }

    var id = interaction.options.getInteger("id", true);
    read_private();
    if(typeof sprivate.bank.timers[id - 1] == "undefined" || sprivate.bank.timers[id - 1] == null){
      await interaction.reply({embeds: [make_bank_message(`Извините!\nДанная запланированная задача **не существует**!`)]});
    } else {
      sprivate.bank.timers[id - 1] = null;
      save_private();
      await interaction.reply({embeds: [make_bank_message(`**Успешно удалена запланированная задача**`)]});
    }
  }
  if (interaction.commandName === "bank-link"){
    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }
    var user = interaction.options.getUser("user", true);
    if(user.id == interaction.user.id) {
      return await interaction.reply({embeds: [make_bank_message(`Извините!\nВы не можете добавить **самого себя!**`)]});
    }
    if(libbank.get_bank_account(user.id, 0).is_valid && libbank.get_bank_account(interaction.user.id, 0).is_valid){
      read_private();
      if(libbank.get_bank_account(interaction.user.id, 0).player_object[7] == "professional"){
        if(libbank.check_linked(libbank.get_bank_account(user.id, 0).player_object[4][0].bid, libbank.get_bank_account(interaction.user.id, 0).player_object[4]).is_valid){
          await interaction.reply({embeds: [make_bank_message(`Извините!\nДанный аккаунт **уже соединён с вашим!**`)]});
        } else {
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][4].push(libbank.get_bank_account(user.id, 0).player_object[4][0]);
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][10] = Date();
          save_private();
          await interaction.reply({embeds: [make_bank_message(`> **Включайте доступ к вашему аккаунту только игрокам, которым вы доверяете.** Игрок может *проводить транзакции* с *вашим аккаунтом*.\n> В руках злоумышленника такой доступ может *закончиться для вас трагедией.*\n**Успешно добавлен аккаунт к вашему!**`)]});
        }
      } else {
        await interaction.reply({embeds: [make_bank_message(`Извините!\nВаш аккаунт **не является профессиональным!**`)]});
      }
    } else {
      await interaction.reply({embeds: [make_bank_message(`Извините!\nАккаунт **не существует!**`)]});
    }
  }
  if(interaction.commandName === "bank-unlink"){
    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }
    var user = interaction.options.getUser("user", true);
    if(libbank.get_bank_account(user.id, 0).is_valid && libbank.get_bank_account(interaction.user.id, 0).is_valid){
      read_private();
      if(libbank.get_bank_account(interaction.user.id, 0).player_object[7] == "professional"){
        if(libbank.check_linked(libbank.get_bank_account(user.id, 0).player_object[4][0], libbank.get_bank_account(interaction.user.id, 0).player_object[4]).is_valid){
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][4][libbank.check_linked(libbank.get_bank_account(user.id, 0).player_object[4][0], libbank.get_bank_account(interaction.user.id, 0).player_object[4]).counter] = null;
          sprivate.bank.players[libbank.get_bank_account(interaction.user.id, 0).counter][10] = Date();
          save_private();
        } else {
          await interaction.reply({embeds: [make_bank_message(`Извините!\nДанный аккаунт **не был соединён**`)]});
        }
      } else {
        await interaction.reply({embeds: [make_bank_message(`Извините!\nВаш аккаунт **не является профессиональным!**`)]});
      }
    } else {
      await interaction.reply({embeds: [make_bank_message(`Извините!\nАккаунт **не существует!**`)]});
    }
  }
  if (interaction.commandName === "norches-info") {
    var additionalInfo = "";
    if(isOpen){
      latestRequest = "tps";
      serverSocketConnection.send("tps");
      setTimeout(() => {
        additionalInfo += "**ТПС:** " + latestSocketData;
        latestRequest = "list"
        serverSocketConnection.send("list");
        setTimeout(async () => {
          additionalInfo += "\n**Игроков на сервере:** " + latestSocketData;
          await interaction.reply({embeds: [make_norches_message(additionalInfo)]});
        }, 500);
      }, 500);
    } else {
      await interaction.reply({embeds: [make_norches_message("**Извините!**\nНе удалось **получить информацию** от сервера")]});
    }
  }
  if (interaction.commandName === "bank-reset"){
    if(!interaction.user.id == roles.bot_admin) {
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }
    read_private();
    sprivate.bank = JSON.parse("{\"bank\":{\"ncoin\":{\"value\":0,\"history\":[]},\"players\":[],\"timers\":[]}}").bank;
    save_private();
    await interaction.reply({embeds: [make_bank_message("**База данных банка успешно сброшена до изначального состояния**")]});
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
      action: action
    }
    if(isOpen){
      serverSocketConnection.send(JSON.stringify(toSend));
      await interaction.reply({embeds: [make_bank_message(JSON.stringify(toSend))]});
    } else {
      await interaction.reply({embeds: [make_bank_message("Извините!\nНе удалось подключиться к серверу!")]});
    }
  }
  if (interaction.commandName === "bank-deleteaccount") {
    if(!roleCheck(roles.player, user_roles)){
      return await interaction.reply({embeds: [make_norches_message(`Извините!\nУ вас **нет прав на выполнение данной команды!**`)]});
    }

    var counter = libbank.remove_bank_account(interaction.user.id);
    if(counter == -1){
      await interaction.reply({embeds: [make_bank_message(`Извините!\nДанный аккаунт **не существует!**`)]});
    } else {
      sprivate.bank.players[ibbank.get_bank_account(kazna, 1).counter][3] += sprivate.bank.players[counter][3];
      sprivate.bank.players[counter][3] = 0;
      sprivate.bank.players[counter][10] = Date();
      sprivate.bank.players[ibbank.get_bank_account(kazna, 1).counter][10] = sprivate.bank.players[counter][10];

      save_private();
      await interaction.reply({embeds: [make_bank_message(`
        **Аккаунт был успешно удалён!**
        `)]});
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
