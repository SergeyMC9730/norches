package krutoi.mod;
import java.net.InetSocketAddress;
import java.util.Collection;

import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.command.BlockCommandSender;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;
import org.bukkit.scheduler.BukkitTask;
import org.checkerframework.checker.units.qual.s;

public class App extends JavaPlugin implements Listener {
    // public static void main( String[] args )
    // {
    //     System.out.println( "Hello World!" );
    // }

    public SocketConnection current;
    public TPS tps;
    public Lag lag;
    public boolean isNorchesBuild = false;
    public short port = 25674;
    public Tools tools;
    public BukkitTask playerCheckTask;
    public int uptime_A;
    public int uptime_B;
    public int uptime_C;

    @Override
    public void onEnable(){
        getServer().getPluginManager().registerEvents(this, this);
        current = new SocketConnection(new InetSocketAddress("0.0.0.0", (int)port));
        current.plugin = this;
        tools = new Tools();
        lag = new Lag();
        tools.plugin = this;
        Bukkit.getServer().getScheduler().scheduleSyncRepeatingTask(this, lag, 100L, 1L);

        current.start();
        playerCheckTask = tools.createTimer(new Runnable() {
            @Override
            public void run(){
                uptime_A++;
                if(uptime_A == 60) {
                    uptime_B++;
                    if(uptime_B == 60) {
                        uptime_C++;
                        uptime_B = 0;
                    }
                    uptime_A = 0;
                }

                //getLogger().info("Check player states");
                if(getServer().getOnlinePlayers().size() == 0 || getServer().getAllowFlight()) return;

                Collection<? extends Player> playerList = getServer().getOnlinePlayers();

                for(Player p : playerList){
                    if(!p.hasGravity()){
                        Location l = p.getLocation();
                        l.subtract(0, 1, 0);
                        if(l.getBlock().getType() == Material.AIR) {
                            getLogger().info("Player is flying without gravity mode enabled! Disabling it...");
                            p.setGravity(true);
                            if(p.getGameMode() == GameMode.SURVIVAL) p.removePotionEffect(PotionEffectType.FAST_DIGGING);
                        }
                    }
                }
            }
        }, 20);
        getLogger().info("Loading complete.");
    }

    @Override
    public void onDisable(){
        try {
            if(current != null) current.stop();
            if(playerCheckTask != null) playerCheckTask.cancel();
            getLogger().info("Turned off.");
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent p){
        if(isNorchesBuild){
            p.setJoinMessage(String.format(new ColorFormatter().colorFormat("Добро пожаловать на <cy>Norches<r>, <clp>%s<r>!"), p.getPlayer().getName()));
        } else {
            p.setJoinMessage(String.format(new ColorFormatter().colorFormat("Добро пожаловать на сервер, <clp>%s<r>!"), p.getPlayer().getName()));
        }
        p.getPlayer().addPotionEffect(new PotionEffect(PotionEffectType.GLOWING, tools.getTicks(20), 2, false, false));
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args){
        if (command.getName().equalsIgnoreCase("gravity")) {
            if(sender instanceof Player){
                Player p = (Player)sender;
                if(args.length == 0){
                    p.setGravity(!p.hasGravity());
                    if(p.hasGravity()) {
                        if(p.getGameMode() == GameMode.SURVIVAL) p.removePotionEffect(PotionEffectType.FAST_DIGGING);
                        sender.sendMessage(new ColorFormatter().colorFormat("<cgre>Гравитация включена"));
                    }
                    else {
                        if(p.getGameMode() == GameMode.SURVIVAL){ 
                            boolean k = p.addPotionEffect(new PotionEffect(PotionEffectType.FAST_DIGGING, new Tools().getTicks(99999), 16, false, false));
                            if(!k) {
                                sender.sendMessage(new ColorFormatter().colorFormat("<cr>Не удалось добавить эффект быстрого копания"));
                            }
                        }
                        sender.sendMessage(new ColorFormatter().colorFormat("<cr>Гравитация выключена"));
                    }
                } else {
                    if(Bukkit.getPlayerExact(args[0]) == null){
                        sender.sendMessage(new ColorFormatter().colorFormat("<cr>Не найден игрок " + args[0]));
                        return true;
                    } else {
                        Player pn = Bukkit.getPlayerExact(args[0]);
                        pn.setGravity(!p.hasGravity());
                        if(pn.hasGravity()) {
                            if(pn.getGameMode() == GameMode.SURVIVAL) p.removePotionEffect(PotionEffectType.FAST_DIGGING);
                            sender.sendMessage(new ColorFormatter().colorFormat("<cgre>Гравитация включена для игрока " + pn.getName()));
                        }
                        else {
                            if(pn.getGameMode() == GameMode.SURVIVAL){ 
                                boolean k = pn.addPotionEffect(new PotionEffect(PotionEffectType.FAST_DIGGING, new Tools().getTicks(99999), 16, false, false));
                                if(!k) {
                                    sender.sendMessage(new ColorFormatter().colorFormat("<cr>Не удалось добавить эффект быстрого копания для игрока " + pn.getName()));
                                }
                            }
                            sender.sendMessage(new ColorFormatter().colorFormat("<cr>Гравитация выключена для игрока " + pn.getName()));
                        }
                        return true;
                    }
                }
                return true;
            } else if (sender instanceof ConsoleCommandSender || sender instanceof BlockCommandSender) {
                if(args.length == 0){
                    getLogger().info("Please specify gravity of which player you want to change");
                    return true;
                }
                if(Bukkit.getPlayerExact(args[0]) == null){
                    getLogger().info("Player not found!");
                    return true;
                } else {
                    Player p = Bukkit.getPlayerExact(args[0]);
                    p.setGravity(!p.hasGravity());
                    if(p.hasGravity()) {
                        if(p.getGameMode() == GameMode.SURVIVAL) p.removePotionEffect(PotionEffectType.FAST_DIGGING);
                        getLogger().info("Gravity was succefully enabled for " + p.getName());
                    }
                    else {
                        if(p.getGameMode() == GameMode.SURVIVAL){ 
                            boolean k = p.addPotionEffect(new PotionEffect(PotionEffectType.FAST_DIGGING, new Tools().getTicks(99999), 16, false, false));
                            if(!k) {
                                getLogger().info("Unable to add Haste Poition Effect for " + p.getName());
                            }
                        }
                        getLogger().info("Gravity was succefully disabled for " + p.getName());
                    }
                    return true;
                }
            }
        }
        if(command.getName().equalsIgnoreCase("securitylayerkeyreset")) {
            if(sender instanceof ConsoleCommandSender) {
                current.isKeySent = false;
                getLogger().info("isKeySent flag have been succesfully disabled");
            }
        }
        return true;
    }
}
