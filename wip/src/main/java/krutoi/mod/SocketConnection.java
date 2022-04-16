package krutoi.mod;

import java.net.InetSocketAddress;
import java.net.UnknownHostException;
import java.nio.ByteBuffer;

import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;

import org.bukkit.Material;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;
import org.bukkit.scheduler.BukkitRunnable;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;


public class SocketConnection extends WebSocketServer {

    public WebSocket client = null;
    public App plugin;
    public boolean isKeySent = false;
    public String userKey;

    public SocketConnection(short port) throws UnknownHostException {
        super(new InetSocketAddress((int)port));
    }
    public SocketConnection(InetSocketAddress address) {
        super(address);
    }
    
    @Override
    public void onOpen(WebSocket connection, ClientHandshake clientObject){
        client = connection;
    }

    @Override
    public void onClose(WebSocket connection, int code, String reason, boolean remote){
        client = null;
    }

    @Override
    public void onMessage(WebSocket connection, String message){
        switch (message){
            case "tps": {
                connection.send("" + plugin.lag.getTPS());
                break;
            }
            case "list": {
                connection.send("" + plugin.getServer().getOnlinePlayers().size());
                break;
            }
            default: {
                try {
                    JsonObject j = JsonParser.parseString(message).getAsJsonObject();
                    switch(j.get("type").getAsString()){
                        case "donationEvent": { //donation
                            int size = j.get("size").getAsInt();
                            String author = j.get("author").getAsString();
                            String contains = j.get("contains").getAsString();
                            String toPlayer = j.get("toPlayer").getAsString();
                            short action = j.get("action").getAsShort();
                            String UKey = j.get("key").getAsString();

                            if(UKey == userKey && isKeySent) {
                                if(plugin.getServer().getPlayerExact(toPlayer) != null){
                                    Player p = plugin.getServer().getPlayerExact(toPlayer);
                                    ConsoleCommandSender c = plugin.getServer().getConsoleSender(); 
                                    
                                    new BukkitRunnable() {
                                        @Override
                                        public void run() {
                                            boolean isCommandSuccessful;
                                            isCommandSuccessful = plugin.getServer().dispatchCommand(c, String.format(new ColorFormatter().colorFormat("title %s actionbar \"<cy>%s<r> - <clp>%d руб<r>: %s\""), toPlayer, author, size, contains));
    
                                            plugin.getLogger().info("isCommandSuccessful state: " + isCommandSuccessful);      
                                        }
                                    }.runTask(plugin);
    
                                    switch(action){
                                        case 0: { //poison effect
                                            p.addPotionEffect(new PotionEffect(PotionEffectType.POISON, plugin.tools.getTicks(16), 1, false, true));
                                            break;
                                        }
                                        case 1: { //give to player a totem of undying
                                            p.getInventory().addItem(new ItemStack(Material.TOTEM_OF_UNDYING, 1));
                                            break;
                                        }
                                        case 2: { //hunger
                                            p.addPotionEffect(new PotionEffect(PotionEffectType.HUNGER, plugin.tools.getTicks(24), 1, false, true));
                                            break;
                                        }
                                        case 3: { //hurt player
                                            p.damage(5);
                                            break;
                                        }
                                        case 4: { //летучие мыши
                                            //TODO Make it later
                                            break;
                                        }
                                    }
                                }   
                            }
                            break;  
                        }
                        case "sendKey": {
                            if(!isKeySent) {
                                isKeySent = true;
                                userKey = j.get("userKey").getAsString();
                            }
                            break;
                        }
                        default: {
                            plugin.getLogger().warning("Unknown message type: " + j.get("type").getAsString());
                            break;
                        }
                    }
                    //donation event
                    
                } catch (JsonParseException e){
                    //something different
                    plugin.getLogger().warning("Cannot parse JSON string!");
                }
                break;
            }
        }
    }

    @Override
    public void onMessage(WebSocket connection, ByteBuffer message){
        switch (message.toString()){
            case "tps": {
                connection.send("TPS command");
                break;
            }
            case "list": {
                connection.send("List command");
                break;
            }
            default: {
                plugin.getLogger().info("WebSocket connection has message for you: " + message.toString());
                break;
            }
        }
    }

    @Override
    public void onError(WebSocket connection, Exception ex){
        ex.printStackTrace();
    }

    @Override
    public void onStart(){
        plugin.getLogger().info("WebSocket server has started on port " + plugin.port);
    }

}
