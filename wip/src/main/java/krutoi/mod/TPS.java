package krutoi.mod;

import org.bukkit.scheduler.BukkitTask;

public class TPS {
    public App plugin;
    public double tps;

    public short ticks = 0;


    public BukkitTask a;
    public BukkitTask b;

    public void init()  {
        a = plugin.getServer().getScheduler().runTaskTimer(plugin, new Runnable() {
            @Override
            public void run() {
                tps = ticks;
                ticks = 0;
            }
        },0, 20);
        b = plugin.getServer().getScheduler().runTaskTimer(plugin, new Runnable() {
            @Override
            public void run() {
                ticks++;         
            }    
        },0, 1);
        return;
    }
    public void update() {
        return;
    }
}
